create extension if not exists pg_net with schema extensions;
create extension if not exists pg_cron;
create table public.push_subscriptions (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
 endpoint text not null unique check (length(endpoint)<4096 and endpoint ~ '^https://(fcm\.googleapis\.com|updates\.push\.services\.mozilla\.com|[a-z0-9.-]*push\.apple\.com|[a-z0-9.-]*notify\.windows\.com)/'),
 p256dh text not null check (p256dh ~ '^[A-Za-z0-9_-]{87}={0,1}$'),
 auth text not null check (auth ~ '^[A-Za-z0-9_-]{22}={0,2}$'),
 enabled boolean not null default true,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);
alter table public.push_subscriptions enable row level security;
revoke all on public.push_subscriptions from anon, authenticated;
grant select,insert,update,delete on public.push_subscriptions to authenticated;
grant all on public.push_subscriptions to service_role;
create policy push_own_select on public.push_subscriptions for select to authenticated using (user_id=(select auth.uid()));
create policy push_own_insert on public.push_subscriptions for insert to authenticated with check (user_id=(select auth.uid()));
create policy push_own_update on public.push_subscriptions for update to authenticated using (user_id=(select auth.uid())) with check (user_id=(select auth.uid()));
create policy push_own_delete on public.push_subscriptions for delete to authenticated using (user_id=(select auth.uid()));
create index push_subscriptions_user_idx on public.push_subscriptions(user_id);
create table private.push_deliveries (
 id uuid primary key default gen_random_uuid(),
 activity_id uuid not null references public.family_activity(id) on delete cascade,
 subscription_id uuid not null references public.push_subscriptions(id) on delete cascade,
 attempts int not null default 0,
 available_at timestamptz not null default now(),
 delivered_at timestamptz,
 last_status int,
 unique(activity_id,subscription_id)
);
alter table private.push_deliveries enable row level security;
revoke all on private.push_deliveries from public,anon,authenticated;
create index push_pending_idx on private.push_deliveries(available_at) where delivered_at is null and attempts<5;

-- The Edge worker alone can read these secrets. No client role can execute this RPC.
create function public.push_worker_config() returns jsonb language sql security definer set search_path='' as $$
 select jsonb_object_agg(name,decrypted_secret) from vault.decrypted_secrets
 where name in ('ninho_push_public','ninho_push_private','ninho_push_dispatch');
$$;
revoke all on function public.push_worker_config() from public,anon,authenticated;
grant execute on function public.push_worker_config() to service_role;

create function private.kick_push() returns void language plpgsql security definer set search_path='' as $$
declare token text;
begin
 if not exists(select 1 from private.push_deliveries where delivered_at is null and attempts<5 and available_at<=now()) then return; end if;
 select decrypted_secret into token from vault.decrypted_secrets where name='ninho_push_dispatch';
 if token is null then return; end if;
 perform net.http_post(url:='https://cspwqboqchwdsknfdakh.supabase.co/functions/v1/family-push',
 headers:=jsonb_build_object('Content-Type','application/json','x-ninho-push-token',token),
 body:='{}'::jsonb,timeout_milliseconds:=15000);
end; $$;
revoke all on function private.kick_push() from public,anon,authenticated;

create function private.queue_family_push() returns trigger language plpgsql security definer set search_path='' as $$
begin
 insert into private.push_deliveries(activity_id,subscription_id)
 select new.id,s.id from public.push_subscriptions s join public.family_members m on m.user_id=s.user_id
 where m.family_id=new.family_id and s.enabled and s.user_id is distinct from new.actor_id;
 perform private.kick_push();
 return new;
end; $$;
revoke all on function private.queue_family_push() from public,anon,authenticated;
create trigger queue_family_push after insert on public.family_activity for each row execute function private.queue_family_push();

create function public.claim_family_push() returns jsonb language plpgsql security definer set search_path='' as $$
declare result jsonb;
begin
 with pending as (
 select d.id from private.push_deliveries d where d.delivered_at is null and d.attempts<5 and d.available_at<=now()
 order by d.available_at limit 25 for update skip locked
 ), claimed as (
 update private.push_deliveries d set attempts=d.attempts+1,available_at=now()+interval '2 minutes'
 from pending p where d.id=p.id returning d.*
 )
 select coalesce(jsonb_agg(jsonb_build_object('delivery_id',c.id,'attempts',c.attempts,
 'subscription_id',s.id,'user_id',s.user_id,'endpoint',s.endpoint,'keys',jsonb_build_object('p256dh',s.p256dh,'auth',s.auth),
 'activity',to_jsonb(a),'actor_name',coalesce(pr.name,'Alguém da família'),
 'eligible',s.enabled and s.user_id is distinct from a.actor_id and exists(select 1 from public.family_members m where m.family_id=a.family_id and m.user_id=s.user_id))), '[]'::jsonb)
 into result from claimed c join public.push_subscriptions s on s.id=c.subscription_id
 join public.family_activity a on a.id=c.activity_id left join public.profiles pr on pr.id=a.actor_id;
 return result;
end; $$;
revoke all on function public.claim_family_push() from public,anon,authenticated;
grant execute on function public.claim_family_push() to service_role;

create function public.finish_family_push(p_delivery uuid,p_status int,p_done boolean) returns void language sql security definer set search_path='' as $$
 update private.push_deliveries set last_status=p_status,delivered_at=case when p_done then now() else null end,
 available_at=now()+interval '1 minute'*least(30,power(2,attempts)::int) where id=p_delivery;
$$;
revoke all on function public.finish_family_push(uuid,int,boolean) from public,anon,authenticated;
grant execute on function public.finish_family_push(uuid,int,boolean) to service_role;
select cron.schedule('ninho-push-retry','* * * * *','select private.kick_push()');

