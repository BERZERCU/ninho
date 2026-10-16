-- Production: additive avatar, household and weekly challenge features. No test credits or simulated plans.
create table private.ninho_avatar_wallets(
 user_id uuid primary key references auth.users(id) on delete cascade,
 balance integer not null default 0 check(balance between 0 and 1000000000),
 earned integer not null default 0 check(earned between 0 and 1000000000)
);
create table private.ninho_avatar_catalog(
 id text primary key, slot text not null check(slot in ('top','hair','accessory')),
 name text not null, price integer not null check(price between 0 and 1000)
);
insert into private.ninho_avatar_catalog(id,slot,name,price) values
 ('top_sage','top','Camiseta Ninho',0),('hair_brown','hair','Cabelo castanho',0),('accessory_none','accessory','Sem acessório',0),
 ('top_sun','top','Camiseta Sol',2),('top_ocean','top','Camiseta Oceano',4),('top_berry','top','Camiseta Amora',6),
 ('hair_curls','hair','Cachos',3),('hair_dark','hair','Cabelo escuro',3),
 ('accessory_cap','accessory','Boné da turma',5),('accessory_glasses','accessory','Óculos redondos',4),('accessory_star','accessory','Estrela do Ninho',8);
create table private.ninho_avatar_owned(
 user_id uuid references auth.users(id) on delete cascade,
 item_id text references private.ninho_avatar_catalog(id),
 primary key(user_id,item_id)
);
create table private.ninho_avatar_styles(
 user_id uuid primary key references auth.users(id) on delete cascade,
 skin text not null default 'medium' check(skin in ('light','medium','deep')),
 top text not null default 'top_sage' references private.ninho_avatar_catalog(id),
 hair text not null default 'hair_brown' references private.ninho_avatar_catalog(id),
 accessory text not null default 'accessory_none' references private.ninho_avatar_catalog(id)
);
-- No task foreign key: deleting/recreating a task or reopening it cannot mint points twice.
create table private.ninho_avatar_rewards(
 task_id uuid primary key, family_id uuid not null,
 user_id uuid references auth.users(id) on delete cascade,
 points integer not null check(points in (0,1,2)), created_at timestamptz not null default now()
);
create index ninho_avatar_rewards_user on private.ninho_avatar_rewards(user_id);
create index ninho_avatar_owned_item on private.ninho_avatar_owned(item_id);
alter table private.ninho_avatar_wallets enable row level security;
alter table private.ninho_avatar_catalog enable row level security;
alter table private.ninho_avatar_owned enable row level security;
alter table private.ninho_avatar_styles enable row level security;
alter table private.ninho_avatar_rewards enable row level security;
revoke all on private.ninho_avatar_wallets,private.ninho_avatar_catalog,private.ninho_avatar_owned,private.ninho_avatar_styles,private.ninho_avatar_rewards from public,anon,authenticated;
-- Already-completed tasks are consumed without granting retroactive rewards.
insert into private.ninho_avatar_rewards(task_id,family_id,points)
select id,family_id,0 from public.tasks where done;

create function private.ninho_avatar_require_family(p_family uuid) returns uuid
language plpgsql security definer set search_path='' as $$
declare uid uuid:=auth.uid();
begin
 if uid is null or not exists(select 1 from auth.users where id=uid)
 or not exists(select 1 from public.family_members where family_id=p_family and user_id=uid)
 then raise exception 'Entre em uma família para usar seu avatar';end if;
 return uid;
end $$;
revoke all on function private.ninho_avatar_require_family(uuid) from public,anon,authenticated;
create function private.ninho_avatar_init(p_user uuid) returns void
language plpgsql security definer set search_path='' as $$
begin
 insert into private.ninho_avatar_wallets(user_id) values(p_user) on conflict do nothing;
 insert into private.ninho_avatar_styles(user_id) values(p_user) on conflict do nothing;
 insert into private.ninho_avatar_owned(user_id,item_id)
 select p_user,id from private.ninho_avatar_catalog where price=0 on conflict do nothing;
end $$;
revoke all on function private.ninho_avatar_init(uuid) from public,anon,authenticated;

create function private.ninho_avatar_reward_task() returns trigger
language plpgsql security definer set search_path='' as $$
declare recipient uuid; amount integer; credited uuid;
begin
 if tg_op='INSERT' then
  if new.done then insert into private.ninho_avatar_rewards(task_id,family_id,points) values(new.id,new.family_id,0) on conflict do nothing;end if;
  return new;
 end if;
 if new.done is not true or old.done is true then return new;end if;
 if auth.uid() is null or not exists(select 1 from public.family_members where family_id=new.family_id and user_id=auth.uid()) then return new;end if;
 recipient:=coalesce(new.assignee_id,auth.uid());
 if not exists(select 1 from public.family_members where family_id=new.family_id and user_id=recipient) then return new;end if;
 select case when plan='plus' then 2 else 1 end into amount from public.families where id=new.family_id;
 insert into private.ninho_avatar_rewards(task_id,family_id,user_id,points)
 values(new.id,new.family_id,recipient,amount) on conflict do nothing returning user_id into credited;
 if credited is not null then
  perform private.ninho_avatar_init(recipient);
  update private.ninho_avatar_wallets set balance=balance+amount,earned=earned+amount where user_id=recipient;
 end if;
 return new;
end $$;
revoke all on function private.ninho_avatar_reward_task() from public,anon,authenticated;
create trigger ninho_avatar_reward_task after insert or update of done on public.tasks
for each row execute function private.ninho_avatar_reward_task();

create function public.ninho_avatar_state(p_family uuid) returns jsonb
language plpgsql security definer set search_path='' as $$
declare uid uuid; result jsonb;
begin
 uid:=private.ninho_avatar_require_family(p_family);perform private.ninho_avatar_init(uid);
 select jsonb_build_object(
 'balance',w.balance,'earned',w.earned,'skin',s.skin,'equipped',jsonb_build_object('top',s.top,'hair',s.hair,'accessory',s.accessory),
 'mode',(select plan from public.families where id=p_family),
 'can_simulate',false,
 'catalog',(select jsonb_agg(jsonb_build_object('id',c.id,'slot',c.slot,'name',c.name,'price',c.price,'owned',exists(select 1 from private.ninho_avatar_owned o where o.user_id=uid and o.item_id=c.id)) order by c.price,c.id) from private.ninho_avatar_catalog c),
 'members',(select jsonb_agg(jsonb_build_object('id',m.user_id,'name',coalesce(p.name,'Membro'),'skin',coalesce(a.skin,'medium'),'equipped',jsonb_build_object('top',coalesce(a.top,'top_sage'),'hair',coalesce(a.hair,'hair_brown'),'accessory',coalesce(a.accessory,'accessory_none')))) from public.family_members m left join public.profiles p on p.id=m.user_id left join private.ninho_avatar_styles a on a.user_id=m.user_id where m.family_id=p_family)
 ) into result from private.ninho_avatar_wallets w join private.ninho_avatar_styles s on s.user_id=w.user_id where w.user_id=uid;
 return result;
end $$;
revoke all on function public.ninho_avatar_state(uuid) from public,anon;
grant execute on function public.ninho_avatar_state(uuid) to authenticated;

create function public.ninho_avatar_buy(p_family uuid,p_item text) returns jsonb
language plpgsql security definer set search_path='' as $$
declare uid uuid; cost integer; funds integer;
begin
 uid:=private.ninho_avatar_require_family(p_family);perform private.ninho_avatar_init(uid);
 select balance into funds from private.ninho_avatar_wallets where user_id=uid for update;
 select price into cost from private.ninho_avatar_catalog where id=p_item;
 if cost is null then raise exception 'Item indisponível';end if;
 if exists(select 1 from private.ninho_avatar_owned where user_id=uid and item_id=p_item) then return public.ninho_avatar_state(p_family);end if;
 if funds<cost then raise exception 'Você ainda não tem pontos suficientes';end if;
 insert into private.ninho_avatar_owned(user_id,item_id) values(uid,p_item);
 update private.ninho_avatar_wallets set balance=balance-cost where user_id=uid;
 return public.ninho_avatar_state(p_family);
end $$;
revoke all on function public.ninho_avatar_buy(uuid,text) from public,anon;
grant execute on function public.ninho_avatar_buy(uuid,text) to authenticated;

create function public.ninho_avatar_equip(p_family uuid,p_item text) returns jsonb
language plpgsql security definer set search_path='' as $$
declare uid uuid; item_slot text;
begin
 uid:=private.ninho_avatar_require_family(p_family);perform private.ninho_avatar_init(uid);
 select c.slot into item_slot from private.ninho_avatar_catalog c join private.ninho_avatar_owned o on o.item_id=c.id where o.user_id=uid and c.id=p_item;
 if item_slot is null then raise exception 'Conquiste este item primeiro';end if;
 update private.ninho_avatar_styles set top=case when item_slot='top' then p_item else top end,
 hair=case when item_slot='hair' then p_item else hair end,accessory=case when item_slot='accessory' then p_item else accessory end where user_id=uid;
 return public.ninho_avatar_state(p_family);
end $$;
revoke all on function public.ninho_avatar_equip(uuid,text) from public,anon;
grant execute on function public.ninho_avatar_equip(uuid,text) to authenticated;

create function public.ninho_avatar_skin(p_family uuid,p_skin text) returns jsonb
language plpgsql security definer set search_path='' as $$
declare uid uuid;
begin
 uid:=private.ninho_avatar_require_family(p_family);perform private.ninho_avatar_init(uid);
 if p_skin is null or p_skin not in ('light','medium','deep') then raise exception 'Tom indisponível';end if;
 update private.ninho_avatar_styles set skin=p_skin where user_id=uid;
 return public.ninho_avatar_state(p_family);
end $$;
revoke all on function public.ninho_avatar_skin(uuid,text) from public,anon;
grant execute on function public.ninho_avatar_skin(uuid,text) to authenticated;


create function private.ninho_plus_mode(p_family uuid) returns text language sql stable security definer set search_path='' as $$
 select f.plan from public.families f where f.id=p_family
$$;
revoke all on function private.ninho_plus_mode(uuid) from public,anon,authenticated;
create function private.ninho_plus_require_adult(p_family uuid,p_write boolean default false) returns uuid
language plpgsql security definer set search_path='' as $$
declare uid uuid;
begin
 uid:=private.ninho_avatar_require_family(p_family);
 if not exists(select 1 from public.family_members where family_id=p_family and user_id=uid and role in ('admin','adult')) then raise exception 'Somente Admins e Adultos podem acessar este recurso';end if;
 if p_write and private.ninho_plus_mode(p_family)<>'plus' then raise exception 'Este recurso requer Ninho+';end if;
 return uid;
end $$;
revoke all on function private.ninho_plus_require_adult(uuid,boolean) from public,anon,authenticated;

create function private.ninho_guard_member_capacity() returns trigger language plpgsql security definer set search_path='' as $$
declare capacity integer;
begin
 if tg_op='UPDATE' then if new.family_id=old.family_id then return new;end if;end if;
 perform 1 from public.families where id=new.family_id for update;
 if exists(select 1 from public.family_members where family_id=new.family_id and user_id=new.user_id) then return new;end if;
 capacity:=case when private.ninho_plus_mode(new.family_id)='plus' then 12 else 4 end;
 if (select count(*) from public.family_members where family_id=new.family_id)>=capacity then
  raise exception 'Limite de % membros neste plano. Ninguém foi removido',capacity;
 end if;
 return new;
end $$;
revoke all on function private.ninho_guard_member_capacity() from public,anon,authenticated;
create trigger ninho_guard_member_capacity before insert or update of family_id on public.family_members for each row execute function private.ninho_guard_member_capacity();

create table private.ninho_routines(
 id uuid primary key default extensions.gen_random_uuid(),family_id uuid not null references public.families(id) on delete cascade,
 title text not null check(length(btrim(title)) between 1 and 140),frequency text not null check(frequency in ('daily','weekly','monthly')),
 starts_on date not null,next_on date not null,assignee_id uuid references auth.users(id) on delete set null,
 created_by uuid references auth.users(id) on delete set null,active boolean not null default true,created_at timestamptz not null default now()
);
create index ninho_routines_family on private.ninho_routines(family_id);
create index ninho_routines_due on private.ninho_routines(next_on) where active;
create table private.ninho_routine_occurrences(
 routine_id uuid references private.ninho_routines(id) on delete cascade,occurs_on date not null,
 task_id uuid references public.tasks(id) on delete set null,primary key(routine_id,occurs_on)
);
create index ninho_routine_occurrence_task on private.ninho_routine_occurrences(task_id);
create table private.ninho_expenses(
 id uuid primary key default extensions.gen_random_uuid(),family_id uuid not null references public.families(id) on delete cascade,
 title text not null check(length(btrim(title)) between 1 and 140),amount_cents integer not null check(amount_cents between 1 and 1000000000),
 category text not null check(category in ('groceries','housing','transport','health','leisure','other')),spent_on date not null,
 created_by uuid references auth.users(id) on delete set null,deleted_at timestamptz,created_at timestamptz not null default now()
);
create index ninho_expenses_month on private.ninho_expenses(family_id,spent_on) where deleted_at is null;
create table private.ninho_savings_goals(
 id uuid primary key default extensions.gen_random_uuid(),family_id uuid not null references public.families(id) on delete cascade,
 title text not null check(length(btrim(title)) between 1 and 140),target_cents integer not null check(target_cents between 1 and 1000000000),
 saved_cents integer not null default 0 check(saved_cents between 0 and 1000000000),created_by uuid references auth.users(id) on delete set null,
 deleted_at timestamptz,created_at timestamptz not null default now()
);
create index ninho_goals_family on private.ninho_savings_goals(family_id) where deleted_at is null;
alter table private.ninho_routines enable row level security;
alter table private.ninho_routine_occurrences enable row level security;
alter table private.ninho_expenses enable row level security;
alter table private.ninho_savings_goals enable row level security;
revoke all on private.ninho_routines,private.ninho_routine_occurrences,private.ninho_expenses,private.ninho_savings_goals from public,anon,authenticated;

-- First scheduled day on/after a date. Monthly routines retain their original day anchor.
create function private.ninho_routine_day(p_start date,p_frequency text,p_from date) returns date
language plpgsql immutable set search_path='' as $$
declare base date; candidate date; day_number integer;
begin
 if p_from<=p_start then return p_start;end if;
 if p_frequency='daily' then return p_from;end if;
 if p_frequency='weekly' then return p_start+(((p_from-p_start+6)/7)*7);end if;
 if p_frequency<>'monthly' then raise exception 'Frequência inválida';end if;
 day_number:=extract(day from p_start)::integer;
 base:=date_trunc('month',p_from)::date;
 candidate:=base+(least(day_number,extract(day from (base+interval '1 month - 1 day'))::integer)-1);
 if candidate<p_from then base:=(base+interval '1 month')::date;candidate:=base+(least(day_number,extract(day from (base+interval '1 month - 1 day'))::integer)-1);end if;
 return candidate;
end $$;
revoke all on function private.ninho_routine_day(date,text,date) from public,anon,authenticated;

create function private.ninho_materialize_routines(p_today date,p_family uuid default null) returns integer
language plpgsql security definer set search_path='' as $$
declare routine record; task uuid; reserved date; made integer:=0; count_per integer;
begin
 for routine in select r.* from private.ninho_routines r where r.active and r.next_on<=p_today
 and (p_family is null or r.family_id=p_family) and private.ninho_plus_mode(r.family_id)='plus'
 order by r.next_on limit 100 for update of r skip locked loop
  if routine.assignee_id is not null and not exists(select 1 from public.family_members where family_id=routine.family_id and user_id=routine.assignee_id) then
   update private.ninho_routines set active=false where id=routine.id;continue;
  end if;
  count_per:=0;
  while routine.next_on<=p_today and count_per<7 loop
   task:=extensions.gen_random_uuid();reserved:=null;
   insert into private.ninho_routine_occurrences(routine_id,occurs_on) values(routine.id,routine.next_on) on conflict do nothing returning occurs_on into reserved;
   if reserved is not null then
    insert into public.tasks(id,family_id,title,assignee_id,done,created_by)
    values(task,routine.family_id,routine.title||' · '||to_char(routine.next_on,'DD/MM'),routine.assignee_id,false,routine.created_by);
    update private.ninho_routine_occurrences set task_id=task where routine_id=routine.id and occurs_on=routine.next_on;
    made:=made+1;
   end if;
   routine.next_on:=private.ninho_routine_day(routine.starts_on,routine.frequency,routine.next_on+1);count_per:=count_per+1;
  end loop;
  update private.ninho_routines set next_on=routine.next_on where id=routine.id;
 end loop;
 return made;
end $$;
revoke all on function private.ninho_materialize_routines(date,uuid) from public,anon,authenticated;

create function public.ninho_plus_state(p_family uuid,p_month date default null) returns jsonb
language plpgsql security definer set search_path='' as $$
declare uid uuid; month_start date; adult boolean; result jsonb;
begin
 uid:=private.ninho_avatar_require_family(p_family);
 month_start:=date_trunc('month',coalesce(p_month,(now() at time zone 'America/Sao_Paulo')::date))::date;
 adult:=exists(select 1 from public.family_members where family_id=p_family and user_id=uid and role in ('admin','adult'));
 result:=jsonb_build_object('mode',private.ninho_plus_mode(p_family),'member_limit',case when private.ninho_plus_mode(p_family)='plus' then 12 else 4 end,
 'member_count',(select count(*) from public.family_members where family_id=p_family),'adult',adult,'month',month_start,
 'can_simulate',false);
 if adult then
  result:=result||jsonb_build_object('routines',coalesce((select jsonb_agg(to_jsonb(r) order by r.created_at desc) from private.ninho_routines r where r.family_id=p_family),'[]'::jsonb),
  'expenses',coalesce((select jsonb_agg(to_jsonb(e) order by e.spent_on desc,e.created_at desc) from private.ninho_expenses e where e.family_id=p_family and e.deleted_at is null and e.spent_on>=month_start and e.spent_on<(month_start+interval '1 month')),'[]'::jsonb),
  'goals',coalesce((select jsonb_agg(to_jsonb(g) order by g.created_at desc) from private.ninho_savings_goals g where g.family_id=p_family and g.deleted_at is null),'[]'::jsonb));
 end if;
 return result;
end $$;
revoke all on function public.ninho_plus_state(uuid,date) from public,anon;
grant execute on function public.ninho_plus_state(uuid,date) to authenticated;

create function public.ninho_routine_save(p_family uuid,p_title text,p_frequency text,p_start date,p_assignee uuid,p_id uuid default null) returns uuid
language plpgsql security definer set search_path='' as $$
declare uid uuid; rid uuid; today date:=(now() at time zone 'America/Sao_Paulo')::date;
begin
 uid:=private.ninho_plus_require_adult(p_family,true);
 if p_title is null or length(btrim(p_title)) not between 1 and 140 or p_frequency is null or p_frequency not in ('daily','weekly','monthly') or p_start is null then raise exception 'Preencha os dados da rotina';end if;
 if p_assignee is not null and not exists(select 1 from public.family_members where family_id=p_family and user_id=p_assignee) then raise exception 'Responsável não pertence à família';end if;
 if p_id is null then
  perform 1 from public.families where id=p_family for update;
  if (select count(*) from private.ninho_routines where family_id=p_family)>=100 then raise exception 'Limite de 100 rotinas por família';end if;
  insert into private.ninho_routines(family_id,title,frequency,starts_on,next_on,assignee_id,created_by)
  values(p_family,btrim(p_title),p_frequency,p_start,private.ninho_routine_day(p_start,p_frequency,greatest(p_start,today)),p_assignee,uid) returning id into rid;
 else
  update private.ninho_routines set title=btrim(p_title),frequency=p_frequency,starts_on=p_start,next_on=private.ninho_routine_day(p_start,p_frequency,greatest(p_start,today)),assignee_id=p_assignee where id=p_id and family_id=p_family returning id into rid;
  if rid is null then raise exception 'Rotina indisponível';end if;
 end if;
 perform private.ninho_materialize_routines(today,p_family);
 return rid;
end $$;
revoke all on function public.ninho_routine_save(uuid,text,text,date,uuid,uuid) from public,anon;
grant execute on function public.ninho_routine_save(uuid,text,text,date,uuid,uuid) to authenticated;

create function public.ninho_routine_toggle(p_family uuid,p_id uuid,p_active boolean) returns void
language plpgsql security definer set search_path='' as $$
begin
 perform private.ninho_plus_require_adult(p_family,true);
 if p_active is null then raise exception 'Ação inválida';end if;
 update private.ninho_routines set active=p_active,next_on=case when p_active then private.ninho_routine_day(starts_on,frequency,(now() at time zone 'America/Sao_Paulo')::date) else next_on end where id=p_id and family_id=p_family;
 if not found then raise exception 'Rotina indisponível';end if;
end $$;
revoke all on function public.ninho_routine_toggle(uuid,uuid,boolean) from public,anon;
grant execute on function public.ninho_routine_toggle(uuid,uuid,boolean) to authenticated;

create function public.ninho_expense_save(p_family uuid,p_title text,p_amount integer,p_category text,p_date date,p_id uuid default null) returns uuid
language plpgsql security definer set search_path='' as $$
declare uid uuid; eid uuid;
begin
 uid:=private.ninho_plus_require_adult(p_family,true);
 if p_title is null or length(btrim(p_title)) not between 1 and 140 or p_amount is null or p_amount not between 1 and 1000000000 or p_category is null or p_category not in ('groceries','housing','transport','health','leisure','other') or p_date is null then raise exception 'Confira os dados do gasto';end if;
 if p_id is null then
  insert into private.ninho_expenses(family_id,title,amount_cents,category,spent_on,created_by) values(p_family,btrim(p_title),p_amount,p_category,p_date,uid) returning id into eid;
 else
  update private.ninho_expenses set title=btrim(p_title),amount_cents=p_amount,category=p_category,spent_on=p_date where id=p_id and family_id=p_family and deleted_at is null returning id into eid;
  if eid is null then raise exception 'Gasto indisponível';end if;
 end if;
 return eid;
end $$;
revoke all on function public.ninho_expense_save(uuid,text,integer,text,date,uuid) from public,anon;
grant execute on function public.ninho_expense_save(uuid,text,integer,text,date,uuid) to authenticated;

create function public.ninho_goal_save(p_family uuid,p_title text,p_target integer,p_saved integer,p_id uuid default null) returns uuid
language plpgsql security definer set search_path='' as $$
declare uid uuid; gid uuid;
begin
 uid:=private.ninho_plus_require_adult(p_family,true);
 if p_title is null or length(btrim(p_title)) not between 1 and 140 or p_target is null or p_target not between 1 and 1000000000 or p_saved is null or p_saved not between 0 and 1000000000 then raise exception 'Confira os valores da meta';end if;
 if p_id is null then
  insert into private.ninho_savings_goals(family_id,title,target_cents,saved_cents,created_by) values(p_family,btrim(p_title),p_target,p_saved,uid) returning id into gid;
 else
  update private.ninho_savings_goals set title=btrim(p_title),target_cents=p_target,saved_cents=p_saved where id=p_id and family_id=p_family and deleted_at is null returning id into gid;
  if gid is null then raise exception 'Meta indisponível';end if;
 end if;
 return gid;
end $$;
revoke all on function public.ninho_goal_save(uuid,text,integer,integer,uuid) from public,anon;
grant execute on function public.ninho_goal_save(uuid,text,integer,integer,uuid) to authenticated;

create function public.ninho_finance_archive(p_family uuid,p_id uuid,p_kind text) returns void
language plpgsql security definer set search_path='' as $$
begin
 perform private.ninho_plus_require_adult(p_family,true);
 if p_kind='expense' then update private.ninho_expenses set deleted_at=now() where id=p_id and family_id=p_family and deleted_at is null;
 elsif p_kind='goal' then update private.ninho_savings_goals set deleted_at=now() where id=p_id and family_id=p_family and deleted_at is null;
 else raise exception 'Tipo inválido';end if;
 if not found then raise exception 'Registro indisponível';end if;
end $$;
revoke all on function public.ninho_finance_archive(uuid,uuid,text) from public,anon;
grant execute on function public.ninho_finance_archive(uuid,uuid,text) to authenticated;


create table private.ninho_challenge_scores(
 family_id uuid references public.families(id) on delete cascade,
 week_on date not null check(extract(isodow from week_on)=1),
 user_id uuid references auth.users(id) on delete cascade,
 points bigint not null check(points>0),primary key(family_id,week_on,user_id)
);
create table private.ninho_challenge_rounds(
 family_id uuid references public.families(id) on delete cascade,
 week_on date not null,closed_at timestamptz not null default now(),primary key(family_id,week_on)
);
create table private.ninho_challenge_winners(
 family_id uuid,week_on date,user_id uuid references auth.users(id) on delete cascade,
 points bigint not null check(points>0),
 choice text check(choice in ('movie','dinner','outing')),chosen_at timestamptz,
 confirmed_at timestamptz,primary key(family_id,week_on,user_id),
 foreign key(family_id,week_on) references private.ninho_challenge_rounds(family_id,week_on) on delete cascade
);
create index ninho_challenge_scores_user on private.ninho_challenge_scores(user_id);
create index ninho_challenge_winners_user on private.ninho_challenge_winners(user_id);
alter table private.ninho_challenge_scores enable row level security;
alter table private.ninho_challenge_rounds enable row level security;
alter table private.ninho_challenge_winners enable row level security;
revoke all on private.ninho_challenge_scores,private.ninho_challenge_rounds,private.ninho_challenge_winners from public,anon,authenticated;
create function private.ninho_challenge_week() returns date
language sql stable set search_path='' as $$select date_trunc('week',now() at time zone 'America/Sao_Paulo')::date$$;
revoke all on function private.ninho_challenge_week() from public,anon,authenticated;
-- This observes the existing single-use reward ledger, never task toggles or wallet spending.
create function private.ninho_challenge_credit() returns trigger
language plpgsql security definer set search_path='' as $$
begin
 if new.points>0 and exists(select 1 from public.family_members where family_id=new.family_id and user_id=new.user_id and role='child') then
  insert into private.ninho_challenge_scores(family_id,week_on,user_id,points)
  values(new.family_id,private.ninho_challenge_week(),new.user_id,new.points)
  on conflict(family_id,week_on,user_id) do update set points=private.ninho_challenge_scores.points+excluded.points;
 end if;
 return new;
end $$;
revoke all on function private.ninho_challenge_credit() from public,anon,authenticated;
create trigger ninho_challenge_credit after insert on private.ninho_avatar_rewards for each row execute function private.ninho_challenge_credit();
-- Only the server clock closes weeks. Serialize snapshots and choices per family.
create function private.ninho_challenge_close(p_family uuid) returns void
language plpgsql security definer set search_path='' as $$
declare w date;
begin
 perform 1 from public.families where id=p_family for update;
 for w in select distinct s.week_on from private.ninho_challenge_scores s where s.family_id=p_family and s.week_on<private.ninho_challenge_week() and not exists(select 1 from private.ninho_challenge_rounds r where r.family_id=p_family and r.week_on=s.week_on) order by s.week_on loop
  insert into private.ninho_challenge_rounds(family_id,week_on) values(p_family,w);
  insert into private.ninho_challenge_winners(family_id,week_on,user_id,points)
  select p_family,w,s.user_id,s.points from private.ninho_challenge_scores s
  join public.family_members m on m.family_id=s.family_id and m.user_id=s.user_id and m.role='child'
  where s.family_id=p_family and s.week_on=w and s.points=(
   select max(s2.points) from private.ninho_challenge_scores s2 join public.family_members m2 on m2.family_id=s2.family_id and m2.user_id=s2.user_id and m2.role='child' where s2.family_id=p_family and s2.week_on=w
  );
 end loop;
end $$;
revoke all on function private.ninho_challenge_close(uuid) from public,anon,authenticated;
create function public.ninho_challenge_state(p_family uuid) returns jsonb
language plpgsql security definer set search_path='' as $$
declare uid uuid;w date:=private.ninho_challenge_week();result jsonb;
begin
 uid:=private.ninho_avatar_require_family(p_family);perform private.ninho_challenge_close(p_family);
 select jsonb_build_object('week_on',w,'ends_on',w+6,'user_id',uid,
 'adult',exists(select 1 from public.family_members where family_id=p_family and user_id=uid and role in ('admin','adult')),
 'ranking',coalesce((select jsonb_agg(x order by x.points desc,x.name,x.user_id) from (
  select m.user_id,coalesce(nullif(p.name,''),'Membro') as name,coalesce(s.points,0) as points
  from public.family_members m left join public.profiles p on p.id=m.user_id left join private.ninho_challenge_scores s on s.family_id=m.family_id and s.user_id=m.user_id and s.week_on=w
  where m.family_id=p_family and m.role='child'
 ) x),'[]'::jsonb),
 'winners',coalesce((select jsonb_agg(x order by x.week_on desc,x.name,x.user_id) from (
  select a.week_on,a.user_id,coalesce(nullif(p.name,''),'Membro') as name,a.points,a.choice,a.confirmed_at
  from private.ninho_challenge_winners a join public.family_members m on m.family_id=a.family_id and m.user_id=a.user_id and m.role='child'
  left join public.profiles p on p.id=a.user_id where a.family_id=p_family
  and (a.week_on>=w-364 or a.confirmed_at is null)
 ) x),'[]'::jsonb)) into result;
 return result;
end $$;
revoke all on function public.ninho_challenge_state(uuid) from public,anon;
grant execute on function public.ninho_challenge_state(uuid) to authenticated;
create function public.ninho_challenge_choose(p_family uuid,p_week date,p_choice text) returns jsonb
language plpgsql security definer set search_path='' as $$
declare uid uuid;previous text;
begin
 uid:=private.ninho_avatar_require_family(p_family);perform private.ninho_challenge_close(p_family);
 if p_choice is null or p_choice not in ('movie','dinner','outing') then raise exception 'Escolha filme, jantar ou passeio';end if;
 if not exists(select 1 from public.family_members where family_id=p_family and user_id=uid and role='child') then raise exception 'A escolha pertence à criança vencedora';end if;
 select choice into previous from private.ninho_challenge_winners where family_id=p_family and week_on=p_week and user_id=uid;
 if not found then raise exception 'A escolha fica disponível para os vencedores após o fim da semana';end if;
 if previous is not null and previous<>p_choice then raise exception 'Sua escolha já foi registrada';end if;
 update private.ninho_challenge_winners set choice=p_choice,chosen_at=coalesce(chosen_at,now()) where family_id=p_family and week_on=p_week and user_id=uid;
 return public.ninho_challenge_state(p_family);
end $$;
revoke all on function public.ninho_challenge_choose(uuid,date,text) from public,anon;
grant execute on function public.ninho_challenge_choose(uuid,date,text) to authenticated;
create function public.ninho_challenge_confirm(p_family uuid,p_week date,p_child uuid) returns jsonb
language plpgsql security definer set search_path='' as $$
declare uid uuid;
begin
 uid:=private.ninho_avatar_require_family(p_family);perform private.ninho_challenge_close(p_family);
 if not exists(select 1 from public.family_members where family_id=p_family and user_id=uid and role in ('admin','adult')) then raise exception 'Peça a um responsável para confirmar o combinado';end if;
 update private.ninho_challenge_winners a set confirmed_at=coalesce(a.confirmed_at,now()) where family_id=p_family and week_on=p_week and user_id=p_child and choice is not null
 and exists(select 1 from public.family_members m where m.family_id=p_family and m.user_id=p_child and m.role='child');
 if not found then raise exception 'Não há escolha disponível para confirmar';end if;
 return public.ninho_challenge_state(p_family);
end $$;
revoke all on function public.ninho_challenge_confirm(uuid,date,uuid) from public,anon;
grant execute on function public.ninho_challenge_confirm(uuid,date,uuid) to authenticated;

-- Existing pieces, inventory, wallets and chosen custom styles remain intact.
alter table private.ninho_avatar_catalog drop constraint ninho_avatar_catalog_slot_check;
alter table private.ninho_avatar_catalog add constraint ninho_avatar_catalog_slot_check check(slot in ('top','hair','accessory','set'));
alter table private.ninho_avatar_styles add column set_id text references private.ninho_avatar_catalog(id);
create index ninho_avatar_styles_set on private.ninho_avatar_styles(set_id);
insert into private.ninho_avatar_catalog(id,slot,name,price) values
 ('set_lisbon','set','Lisbon',20),('set_jane','set','Patrick Jane',20);
create or replace function public.ninho_avatar_state(p_family uuid) returns jsonb
language plpgsql security definer set search_path='' as $$
declare uid uuid; result jsonb;
begin
 uid:=private.ninho_avatar_require_family(p_family);perform private.ninho_avatar_init(uid);
 select jsonb_build_object(
 'balance',w.balance,'earned',w.earned,'skin',s.skin,'equipped',jsonb_build_object('top',s.top,'hair',s.hair,'accessory',s.accessory,'set',s.set_id),
 'mode',(select plan from public.families where id=p_family),
 'can_simulate',false,
 'catalog',(select jsonb_agg(jsonb_build_object('id',c.id,'slot',c.slot,'name',c.name,'price',c.price,'owned',exists(select 1 from private.ninho_avatar_owned o where o.user_id=uid and o.item_id=c.id)) order by c.price,c.id) from private.ninho_avatar_catalog c),
 'members',(select jsonb_agg(jsonb_build_object('id',m.user_id,'name',coalesce(p.name,'Membro'),'skin',coalesce(a.skin,'medium'),'equipped',jsonb_build_object('top',coalesce(a.top,'top_sage'),'hair',coalesce(a.hair,'hair_brown'),'accessory',coalesce(a.accessory,'accessory_none'),'set',a.set_id))) from public.family_members m left join public.profiles p on p.id=m.user_id left join private.ninho_avatar_styles a on a.user_id=m.user_id where m.family_id=p_family)
 ) into result from private.ninho_avatar_wallets w join private.ninho_avatar_styles s on s.user_id=w.user_id where w.user_id=uid;
 return result;
end $$;
revoke all on function public.ninho_avatar_state(uuid) from public,anon;
grant execute on function public.ninho_avatar_state(uuid) to authenticated;


create or replace function public.ninho_avatar_equip(p_family uuid,p_item text) returns jsonb
language plpgsql security definer set search_path='' as $$
declare uid uuid; item_slot text;
begin
 uid:=private.ninho_avatar_require_family(p_family);perform private.ninho_avatar_init(uid);
 select c.slot into item_slot from private.ninho_avatar_catalog c join private.ninho_avatar_owned o on o.item_id=c.id where o.user_id=uid and c.id=p_item;
 if item_slot is null then raise exception 'Conquiste este item primeiro';end if;
 update private.ninho_avatar_styles set top=case when item_slot='top' then p_item else top end,
 hair=case when item_slot='hair' then p_item else hair end,accessory=case when item_slot='accessory' then p_item else accessory end,
 set_id=case when item_slot='set' then p_item else null end where user_id=uid;
 return public.ninho_avatar_state(p_family);
end $$;
revoke all on function public.ninho_avatar_equip(uuid,text) from public,anon;
grant execute on function public.ninho_avatar_equip(uuid,text) to authenticated;

insert into private.ninho_avatar_catalog(id,slot,name,price) values
 ('set_deku','set','Deku',20),('set_heisenberg','set','Heisenberg',20),('set_gus','set','Gus Fring',20)
on conflict(id) do nothing;
-- Trusted plan changes resume the current schedule without unpaid backlog.
create function private.ninho_plan_changed() returns trigger language plpgsql security definer set search_path='' as $$
declare today date:=(now() at time zone 'America/Sao_Paulo')::date;
begin
 if new.plan='plus' and old.plan is distinct from 'plus' then
  update private.ninho_routines set next_on=private.ninho_routine_day(starts_on,frequency,greatest(starts_on,today)) where family_id=new.id and active;
  perform private.ninho_materialize_routines(today,new.id);
 end if;
 return new;
end $$;
revoke all on function private.ninho_plan_changed() from public,anon,authenticated;
create trigger ninho_plan_changed after update of plan on public.families for each row execute function private.ninho_plan_changed();
select cron.schedule('ninho-recurring','*/10 * * * *', $$select private.ninho_materialize_routines((now() at time zone 'America/Sao_Paulo')::date);$$);
