-- QA ONLY: mqpjujirwooqzzirzwrr. No production migration or retroactive points.
create table private.qa_challenge_scores(
 family_id uuid references public.families(id) on delete cascade,
 week_on date not null check(extract(isodow from week_on)=1),
 user_id uuid references auth.users(id) on delete cascade,
 points bigint not null check(points>0),primary key(family_id,week_on,user_id)
);
create table private.qa_challenge_rounds(
 family_id uuid references public.families(id) on delete cascade,
 week_on date not null,closed_at timestamptz not null default now(),primary key(family_id,week_on)
);
create table private.qa_challenge_winners(
 family_id uuid,week_on date,user_id uuid references auth.users(id) on delete cascade,
 points bigint not null check(points>0),
 choice text check(choice in ('movie','dinner','outing')),chosen_at timestamptz,
 confirmed_at timestamptz,primary key(family_id,week_on,user_id),
 foreign key(family_id,week_on) references private.qa_challenge_rounds(family_id,week_on) on delete cascade
);
create index qa_challenge_scores_user on private.qa_challenge_scores(user_id);
create index qa_challenge_winners_user on private.qa_challenge_winners(user_id);
alter table private.qa_challenge_scores enable row level security;
alter table private.qa_challenge_rounds enable row level security;
alter table private.qa_challenge_winners enable row level security;
revoke all on private.qa_challenge_scores,private.qa_challenge_rounds,private.qa_challenge_winners from public,anon,authenticated;
create function private.qa_challenge_week() returns date
language sql stable set search_path='' as $$select date_trunc('week',now() at time zone 'America/Sao_Paulo')::date$$;
revoke all on function private.qa_challenge_week() from public,anon,authenticated;
-- This observes the existing single-use reward ledger, never task toggles or wallet spending.
create function private.qa_challenge_credit() returns trigger
language plpgsql security definer set search_path='' as $$
begin
 if new.points>0 and exists(select 1 from public.family_members where family_id=new.family_id and user_id=new.user_id and role='child') then
  insert into private.qa_challenge_scores(family_id,week_on,user_id,points)
  values(new.family_id,private.qa_challenge_week(),new.user_id,new.points)
  on conflict(family_id,week_on,user_id) do update set points=private.qa_challenge_scores.points+excluded.points;
 end if;
 return new;
end $$;
revoke all on function private.qa_challenge_credit() from public,anon,authenticated;
create trigger qa_challenge_credit after insert on private.qa_avatar_rewards for each row execute function private.qa_challenge_credit();
-- Only the server clock closes weeks. Serialize snapshots and choices per family.
create function private.qa_challenge_close(p_family uuid) returns void
language plpgsql security definer set search_path='' as $$
declare w date;
begin
 perform 1 from public.families where id=p_family for update;
 for w in select distinct s.week_on from private.qa_challenge_scores s where s.family_id=p_family and s.week_on<private.qa_challenge_week() and not exists(select 1 from private.qa_challenge_rounds r where r.family_id=p_family and r.week_on=s.week_on) order by s.week_on loop
  insert into private.qa_challenge_rounds(family_id,week_on) values(p_family,w);
  insert into private.qa_challenge_winners(family_id,week_on,user_id,points)
  select p_family,w,s.user_id,s.points from private.qa_challenge_scores s
  join public.family_members m on m.family_id=s.family_id and m.user_id=s.user_id and m.role='child'
  where s.family_id=p_family and s.week_on=w and s.points=(
   select max(s2.points) from private.qa_challenge_scores s2 join public.family_members m2 on m2.family_id=s2.family_id and m2.user_id=s2.user_id and m2.role='child' where s2.family_id=p_family and s2.week_on=w
  );
 end loop;
end $$;
revoke all on function private.qa_challenge_close(uuid) from public,anon,authenticated;
create function public.qa_challenge_state(p_family uuid) returns jsonb
language plpgsql security definer set search_path='' as $$
declare uid uuid;w date:=private.qa_challenge_week();result jsonb;
begin
 uid:=private.qa_avatar_require_family(p_family);perform private.qa_challenge_close(p_family);
 select jsonb_build_object('week_on',w,'ends_on',w+6,'user_id',uid,
 'adult',exists(select 1 from public.family_members where family_id=p_family and user_id=uid and role in ('admin','adult')),
 'ranking',coalesce((select jsonb_agg(x order by x.points desc,x.name,x.user_id) from (
  select m.user_id,coalesce(nullif(p.name,''),'Membro') as name,coalesce(s.points,0) as points
  from public.family_members m left join public.profiles p on p.id=m.user_id left join private.qa_challenge_scores s on s.family_id=m.family_id and s.user_id=m.user_id and s.week_on=w
  where m.family_id=p_family and m.role='child'
 ) x),'[]'::jsonb),
 'winners',coalesce((select jsonb_agg(x order by x.week_on desc,x.name,x.user_id) from (
  select a.week_on,a.user_id,coalesce(nullif(p.name,''),'Membro') as name,a.points,a.choice,a.confirmed_at
  from private.qa_challenge_winners a join public.family_members m on m.family_id=a.family_id and m.user_id=a.user_id and m.role='child'
  left join public.profiles p on p.id=a.user_id where a.family_id=p_family
  and (a.week_on>=w-364 or a.confirmed_at is null)
 ) x),'[]'::jsonb)) into result;
 return result;
end $$;
revoke all on function public.qa_challenge_state(uuid) from public,anon;
grant execute on function public.qa_challenge_state(uuid) to authenticated;
create function public.qa_challenge_choose(p_family uuid,p_week date,p_choice text) returns jsonb
language plpgsql security definer set search_path='' as $$
declare uid uuid;previous text;
begin
 uid:=private.qa_avatar_require_family(p_family);perform private.qa_challenge_close(p_family);
 if p_choice is null or p_choice not in ('movie','dinner','outing') then raise exception 'Escolha filme, jantar ou passeio';end if;
 if not exists(select 1 from public.family_members where family_id=p_family and user_id=uid and role='child') then raise exception 'A escolha pertence à criança vencedora';end if;
 select choice into previous from private.qa_challenge_winners where family_id=p_family and week_on=p_week and user_id=uid;
 if not found then raise exception 'A escolha fica disponível para os vencedores após o fim da semana';end if;
 if previous is not null and previous<>p_choice then raise exception 'Sua escolha já foi registrada';end if;
 update private.qa_challenge_winners set choice=p_choice,chosen_at=coalesce(chosen_at,now()) where family_id=p_family and week_on=p_week and user_id=uid;
 return public.qa_challenge_state(p_family);
end $$;
revoke all on function public.qa_challenge_choose(uuid,date,text) from public,anon;
grant execute on function public.qa_challenge_choose(uuid,date,text) to authenticated;
create function public.qa_challenge_confirm(p_family uuid,p_week date,p_child uuid) returns jsonb
language plpgsql security definer set search_path='' as $$
declare uid uuid;
begin
 uid:=private.qa_avatar_require_family(p_family);perform private.qa_challenge_close(p_family);
 if not exists(select 1 from public.family_members where family_id=p_family and user_id=uid and role in ('admin','adult')) then raise exception 'Peça a um responsável para confirmar o combinado';end if;
 update private.qa_challenge_winners a set confirmed_at=coalesce(a.confirmed_at,now()) where family_id=p_family and week_on=p_week and user_id=p_child and choice is not null
 and exists(select 1 from public.family_members m where m.family_id=p_family and m.user_id=p_child and m.role='child');
 if not found then raise exception 'Não há escolha disponível para confirmar';end if;
 return public.qa_challenge_state(p_family);
end $$;
revoke all on function public.qa_challenge_confirm(uuid,date,uuid) from public,anon;
grant execute on function public.qa_challenge_confirm(uuid,date,uuid) to authenticated;
