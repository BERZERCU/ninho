-- QA ONLY: avatar experiment for mqpjujirwooqzzirzwrr. Never apply to the original project.
create table private.qa_avatar_wallets(
 user_id uuid primary key references auth.users(id) on delete cascade,
 balance integer not null default 0 check(balance between 0 and 1000000000),
 earned integer not null default 0 check(earned between 0 and 1000000000)
);
create table private.qa_avatar_catalog(
 id text primary key, slot text not null check(slot in ('top','hair','accessory')),
 name text not null, price integer not null check(price between 0 and 1000)
);
insert into private.qa_avatar_catalog(id,slot,name,price) values
 ('top_sage','top','Camiseta Ninho',0),('hair_brown','hair','Cabelo castanho',0),('accessory_none','accessory','Sem acessório',0),
 ('top_sun','top','Camiseta Sol',2),('top_ocean','top','Camiseta Oceano',4),('top_berry','top','Camiseta Amora',6),
 ('hair_curls','hair','Cachos',3),('hair_dark','hair','Cabelo escuro',3),
 ('accessory_cap','accessory','Boné da turma',5),('accessory_glasses','accessory','Óculos redondos',4),('accessory_star','accessory','Estrela do Ninho',8);
create table private.qa_avatar_owned(
 user_id uuid references auth.users(id) on delete cascade,
 item_id text references private.qa_avatar_catalog(id),
 primary key(user_id,item_id)
);
create table private.qa_avatar_styles(
 user_id uuid primary key references auth.users(id) on delete cascade,
 skin text not null default 'medium' check(skin in ('light','medium','deep')),
 top text not null default 'top_sage' references private.qa_avatar_catalog(id),
 hair text not null default 'hair_brown' references private.qa_avatar_catalog(id),
 accessory text not null default 'accessory_none' references private.qa_avatar_catalog(id)
);
create table private.qa_avatar_plans(
 family_id uuid primary key references public.families(id) on delete cascade,
 mode text not null check(mode in ('free','plus'))
);
-- No task foreign key: deleting/recreating a task or reopening it cannot mint points twice.
create table private.qa_avatar_rewards(
 task_id uuid primary key, family_id uuid not null,
 user_id uuid references auth.users(id) on delete cascade,
 points integer not null check(points in (0,1,2)), created_at timestamptz not null default now()
);
create index qa_avatar_rewards_user on private.qa_avatar_rewards(user_id);
create index qa_avatar_owned_item on private.qa_avatar_owned(item_id);
alter table private.qa_avatar_wallets enable row level security;
alter table private.qa_avatar_catalog enable row level security;
alter table private.qa_avatar_owned enable row level security;
alter table private.qa_avatar_styles enable row level security;
alter table private.qa_avatar_plans enable row level security;
alter table private.qa_avatar_rewards enable row level security;
revoke all on private.qa_avatar_wallets,private.qa_avatar_catalog,private.qa_avatar_owned,private.qa_avatar_styles,private.qa_avatar_plans,private.qa_avatar_rewards from public,anon,authenticated;
-- Already-completed tasks are consumed without granting retroactive rewards.
insert into private.qa_avatar_rewards(task_id,family_id,points)
select id,family_id,0 from public.tasks where done;

create function private.qa_avatar_require_family(p_family uuid) returns uuid
language plpgsql security definer set search_path='' as $$
declare uid uuid:=auth.uid();
begin
 if uid is null or not exists(select 1 from auth.users where id=uid)
 or not exists(select 1 from public.family_members where family_id=p_family and user_id=uid)
 then raise exception 'Entre em uma família para usar seu avatar';end if;
 return uid;
end $$;
revoke all on function private.qa_avatar_require_family(uuid) from public,anon,authenticated;
create function private.qa_avatar_init(p_user uuid) returns void
language plpgsql security definer set search_path='' as $$
begin
 insert into private.qa_avatar_wallets(user_id) values(p_user) on conflict do nothing;
 insert into private.qa_avatar_styles(user_id) values(p_user) on conflict do nothing;
 insert into private.qa_avatar_owned(user_id,item_id)
 select p_user,id from private.qa_avatar_catalog where price=0 on conflict do nothing;
end $$;
revoke all on function private.qa_avatar_init(uuid) from public,anon,authenticated;

create function private.qa_avatar_reward_task() returns trigger
language plpgsql security definer set search_path='' as $$
declare recipient uuid; amount integer; credited uuid; simulated text;
begin
 if tg_op='INSERT' then
  if new.done then insert into private.qa_avatar_rewards(task_id,family_id,points) values(new.id,new.family_id,0) on conflict do nothing;end if;
  return new;
 end if;
 if new.done is not true or old.done is true then return new;end if;
 if auth.uid() is null or not exists(select 1 from public.family_members where family_id=new.family_id and user_id=auth.uid()) then return new;end if;
 recipient:=coalesce(new.assignee_id,auth.uid());
 if not exists(select 1 from public.family_members where family_id=new.family_id and user_id=recipient) then return new;end if;
 select mode into simulated from private.qa_avatar_plans where family_id=new.family_id;
 select case when coalesce(simulated,plan)='plus' then 2 else 1 end into amount from public.families where id=new.family_id;
 insert into private.qa_avatar_rewards(task_id,family_id,user_id,points)
 values(new.id,new.family_id,recipient,amount) on conflict do nothing returning user_id into credited;
 if credited is not null then
  perform private.qa_avatar_init(recipient);
  update private.qa_avatar_wallets set balance=balance+amount,earned=earned+amount where user_id=recipient;
 end if;
 return new;
end $$;
revoke all on function private.qa_avatar_reward_task() from public,anon,authenticated;
create trigger qa_avatar_reward_task after insert or update of done on public.tasks
for each row execute function private.qa_avatar_reward_task();

create function public.qa_avatar_state(p_family uuid) returns jsonb
language plpgsql security definer set search_path='' as $$
declare uid uuid; result jsonb;
begin
 uid:=private.qa_avatar_require_family(p_family);perform private.qa_avatar_init(uid);
 select jsonb_build_object(
 'balance',w.balance,'earned',w.earned,'skin',s.skin,'equipped',jsonb_build_object('top',s.top,'hair',s.hair,'accessory',s.accessory),
 'mode',coalesce((select mode from private.qa_avatar_plans where family_id=p_family),(select plan from public.families where id=p_family)),
 'can_simulate',exists(select 1 from public.family_members where family_id=p_family and user_id=uid and role='admin'),
 'catalog',(select jsonb_agg(jsonb_build_object('id',c.id,'slot',c.slot,'name',c.name,'price',c.price,'owned',exists(select 1 from private.qa_avatar_owned o where o.user_id=uid and o.item_id=c.id)) order by c.price,c.id) from private.qa_avatar_catalog c),
 'members',(select jsonb_agg(jsonb_build_object('id',m.user_id,'name',coalesce(p.name,'Membro'),'skin',coalesce(a.skin,'medium'),'equipped',jsonb_build_object('top',coalesce(a.top,'top_sage'),'hair',coalesce(a.hair,'hair_brown'),'accessory',coalesce(a.accessory,'accessory_none')))) from public.family_members m left join public.profiles p on p.id=m.user_id left join private.qa_avatar_styles a on a.user_id=m.user_id where m.family_id=p_family)
 ) into result from private.qa_avatar_wallets w join private.qa_avatar_styles s on s.user_id=w.user_id where w.user_id=uid;
 return result;
end $$;
revoke all on function public.qa_avatar_state(uuid) from public,anon;
grant execute on function public.qa_avatar_state(uuid) to authenticated;

create function public.qa_avatar_buy(p_family uuid,p_item text) returns jsonb
language plpgsql security definer set search_path='' as $$
declare uid uuid; cost integer; funds integer;
begin
 uid:=private.qa_avatar_require_family(p_family);perform private.qa_avatar_init(uid);
 select balance into funds from private.qa_avatar_wallets where user_id=uid for update;
 select price into cost from private.qa_avatar_catalog where id=p_item;
 if cost is null then raise exception 'Item indisponível';end if;
 if exists(select 1 from private.qa_avatar_owned where user_id=uid and item_id=p_item) then return public.qa_avatar_state(p_family);end if;
 if funds<cost then raise exception 'Você ainda não tem pontos suficientes';end if;
 insert into private.qa_avatar_owned(user_id,item_id) values(uid,p_item);
 update private.qa_avatar_wallets set balance=balance-cost where user_id=uid;
 return public.qa_avatar_state(p_family);
end $$;
revoke all on function public.qa_avatar_buy(uuid,text) from public,anon;
grant execute on function public.qa_avatar_buy(uuid,text) to authenticated;

create function public.qa_avatar_equip(p_family uuid,p_item text) returns jsonb
language plpgsql security definer set search_path='' as $$
declare uid uuid; item_slot text;
begin
 uid:=private.qa_avatar_require_family(p_family);perform private.qa_avatar_init(uid);
 select c.slot into item_slot from private.qa_avatar_catalog c join private.qa_avatar_owned o on o.item_id=c.id where o.user_id=uid and c.id=p_item;
 if item_slot is null then raise exception 'Conquiste este item primeiro';end if;
 update private.qa_avatar_styles set top=case when item_slot='top' then p_item else top end,
 hair=case when item_slot='hair' then p_item else hair end,accessory=case when item_slot='accessory' then p_item else accessory end where user_id=uid;
 return public.qa_avatar_state(p_family);
end $$;
revoke all on function public.qa_avatar_equip(uuid,text) from public,anon;
grant execute on function public.qa_avatar_equip(uuid,text) to authenticated;

create function public.qa_avatar_skin(p_family uuid,p_skin text) returns jsonb
language plpgsql security definer set search_path='' as $$
declare uid uuid;
begin
 uid:=private.qa_avatar_require_family(p_family);perform private.qa_avatar_init(uid);
 if p_skin is null or p_skin not in ('light','medium','deep') then raise exception 'Tom indisponível';end if;
 update private.qa_avatar_styles set skin=p_skin where user_id=uid;
 return public.qa_avatar_state(p_family);
end $$;
revoke all on function public.qa_avatar_skin(uuid,text) from public,anon;
grant execute on function public.qa_avatar_skin(uuid,text) to authenticated;

-- QA simulation only: does not change the family subscription, billing or entitlement.
create function public.qa_avatar_simulate_plan(p_family uuid,p_mode text) returns jsonb
language plpgsql security definer set search_path='' as $$
declare uid uuid;
begin
 uid:=private.qa_avatar_require_family(p_family);
 if not exists(select 1 from public.family_members where family_id=p_family and user_id=uid and role='admin') then raise exception 'Só o Admin pode simular o plano';end if;
 if p_mode is null or p_mode not in ('free','plus') then raise exception 'Plano inválido';end if;
 insert into private.qa_avatar_plans(family_id,mode) values(p_family,p_mode) on conflict(family_id) do update set mode=excluded.mode;
 return public.qa_avatar_state(p_family);
end $$;
revoke all on function public.qa_avatar_simulate_plan(uuid,text) from public,anon;
grant execute on function public.qa_avatar_simulate_plan(uuid,text) to authenticated;
