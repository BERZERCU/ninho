-- QA ONLY. Provisional limits and simulated entitlements; no real billing.
create function private.qa_plus_mode(p_family uuid) returns text language sql stable security definer set search_path='' as $$
 select coalesce((select mode from private.qa_avatar_plans where family_id=p_family),f.plan) from public.families f where f.id=p_family
$$;
revoke all on function private.qa_plus_mode(uuid) from public,anon,authenticated;
create function private.qa_plus_require_adult(p_family uuid,p_write boolean default false) returns uuid
language plpgsql security definer set search_path='' as $$
declare uid uuid;
begin
 uid:=private.qa_avatar_require_family(p_family);
 if not exists(select 1 from public.family_members where family_id=p_family and user_id=uid and role in ('admin','adult')) then raise exception 'Somente Admins e Adultos podem acessar este recurso';end if;
 if p_write and private.qa_plus_mode(p_family)<>'plus' then raise exception 'Ative o Ninho+ simulado para usar este recurso';end if;
 return uid;
end $$;
revoke all on function private.qa_plus_require_adult(uuid,boolean) from public,anon,authenticated;

create function private.qa_guard_member_capacity() returns trigger language plpgsql security definer set search_path='' as $$
declare capacity integer;
begin
 if tg_op='UPDATE' then if new.family_id=old.family_id then return new;end if;end if;
 perform 1 from public.families where id=new.family_id for update;
 if exists(select 1 from public.family_members where family_id=new.family_id and user_id=new.user_id) then return new;end if;
 capacity:=case when private.qa_plus_mode(new.family_id)='plus' then 12 else 4 end;
 if (select count(*) from public.family_members where family_id=new.family_id)>=capacity then
  raise exception 'Limite de % membros neste plano de teste. Ninguém foi removido',capacity;
 end if;
 return new;
end $$;
revoke all on function private.qa_guard_member_capacity() from public,anon,authenticated;
create trigger qa_guard_member_capacity before insert or update of family_id on public.family_members for each row execute function private.qa_guard_member_capacity();

create table private.qa_routines(
 id uuid primary key default extensions.gen_random_uuid(),family_id uuid not null references public.families(id) on delete cascade,
 title text not null check(length(btrim(title)) between 1 and 140),frequency text not null check(frequency in ('daily','weekly','monthly')),
 starts_on date not null,next_on date not null,assignee_id uuid references auth.users(id) on delete set null,
 created_by uuid references auth.users(id) on delete set null,active boolean not null default true,created_at timestamptz not null default now()
);
create index qa_routines_family on private.qa_routines(family_id);
create index qa_routines_due on private.qa_routines(next_on) where active;
create table private.qa_routine_occurrences(
 routine_id uuid references private.qa_routines(id) on delete cascade,occurs_on date not null,
 task_id uuid references public.tasks(id) on delete set null,primary key(routine_id,occurs_on)
);
create index qa_routine_occurrence_task on private.qa_routine_occurrences(task_id);
create table private.qa_expenses(
 id uuid primary key default extensions.gen_random_uuid(),family_id uuid not null references public.families(id) on delete cascade,
 title text not null check(length(btrim(title)) between 1 and 140),amount_cents integer not null check(amount_cents between 1 and 1000000000),
 category text not null check(category in ('groceries','housing','transport','health','leisure','other')),spent_on date not null,
 created_by uuid references auth.users(id) on delete set null,deleted_at timestamptz,created_at timestamptz not null default now()
);
create index qa_expenses_month on private.qa_expenses(family_id,spent_on) where deleted_at is null;
create table private.qa_savings_goals(
 id uuid primary key default extensions.gen_random_uuid(),family_id uuid not null references public.families(id) on delete cascade,
 title text not null check(length(btrim(title)) between 1 and 140),target_cents integer not null check(target_cents between 1 and 1000000000),
 saved_cents integer not null default 0 check(saved_cents between 0 and 1000000000),created_by uuid references auth.users(id) on delete set null,
 deleted_at timestamptz,created_at timestamptz not null default now()
);
create index qa_goals_family on private.qa_savings_goals(family_id) where deleted_at is null;
alter table private.qa_routines enable row level security;
alter table private.qa_routine_occurrences enable row level security;
alter table private.qa_expenses enable row level security;
alter table private.qa_savings_goals enable row level security;
revoke all on private.qa_routines,private.qa_routine_occurrences,private.qa_expenses,private.qa_savings_goals from public,anon,authenticated;

-- First scheduled day on/after a date. Monthly routines retain their original day anchor.
create function private.qa_routine_day(p_start date,p_frequency text,p_from date) returns date
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
revoke all on function private.qa_routine_day(date,text,date) from public,anon,authenticated;

create function private.qa_materialize_routines(p_today date,p_family uuid default null) returns integer
language plpgsql security definer set search_path='' as $$
declare routine record; task uuid; reserved date; made integer:=0; count_per integer;
begin
 for routine in select r.* from private.qa_routines r where r.active and r.next_on<=p_today
 and (p_family is null or r.family_id=p_family) and private.qa_plus_mode(r.family_id)='plus'
 order by r.next_on limit 100 for update of r skip locked loop
  if routine.assignee_id is not null and not exists(select 1 from public.family_members where family_id=routine.family_id and user_id=routine.assignee_id) then
   update private.qa_routines set active=false where id=routine.id;continue;
  end if;
  count_per:=0;
  while routine.next_on<=p_today and count_per<7 loop
   task:=extensions.gen_random_uuid();reserved:=null;
   insert into private.qa_routine_occurrences(routine_id,occurs_on) values(routine.id,routine.next_on) on conflict do nothing returning occurs_on into reserved;
   if reserved is not null then
    insert into public.tasks(id,family_id,title,assignee_id,done,created_by)
    values(task,routine.family_id,routine.title||' · '||to_char(routine.next_on,'DD/MM'),routine.assignee_id,false,routine.created_by);
    update private.qa_routine_occurrences set task_id=task where routine_id=routine.id and occurs_on=routine.next_on;
    made:=made+1;
   end if;
   routine.next_on:=private.qa_routine_day(routine.starts_on,routine.frequency,routine.next_on+1);count_per:=count_per+1;
  end loop;
  update private.qa_routines set next_on=routine.next_on where id=routine.id;
 end loop;
 return made;
end $$;
revoke all on function private.qa_materialize_routines(date,uuid) from public,anon,authenticated;

create function public.qa_plus_state(p_family uuid,p_month date default null) returns jsonb
language plpgsql security definer set search_path='' as $$
declare uid uuid; month_start date; adult boolean; result jsonb;
begin
 uid:=private.qa_avatar_require_family(p_family);
 month_start:=date_trunc('month',coalesce(p_month,(now() at time zone 'America/Sao_Paulo')::date))::date;
 adult:=exists(select 1 from public.family_members where family_id=p_family and user_id=uid and role in ('admin','adult'));
 result:=jsonb_build_object('mode',private.qa_plus_mode(p_family),'member_limit',case when private.qa_plus_mode(p_family)='plus' then 12 else 4 end,
 'member_count',(select count(*) from public.family_members where family_id=p_family),'adult',adult,'month',month_start,
 'can_simulate',exists(select 1 from public.family_members where family_id=p_family and user_id=uid and role='admin'));
 if adult then
  result:=result||jsonb_build_object('routines',coalesce((select jsonb_agg(to_jsonb(r) order by r.created_at desc) from private.qa_routines r where r.family_id=p_family),'[]'::jsonb),
  'expenses',coalesce((select jsonb_agg(to_jsonb(e) order by e.spent_on desc,e.created_at desc) from private.qa_expenses e where e.family_id=p_family and e.deleted_at is null and e.spent_on>=month_start and e.spent_on<(month_start+interval '1 month')),'[]'::jsonb),
  'goals',coalesce((select jsonb_agg(to_jsonb(g) order by g.created_at desc) from private.qa_savings_goals g where g.family_id=p_family and g.deleted_at is null),'[]'::jsonb));
 end if;
 return result;
end $$;
revoke all on function public.qa_plus_state(uuid,date) from public,anon;
grant execute on function public.qa_plus_state(uuid,date) to authenticated;

create function public.qa_routine_save(p_family uuid,p_title text,p_frequency text,p_start date,p_assignee uuid,p_id uuid default null) returns uuid
language plpgsql security definer set search_path='' as $$
declare uid uuid; rid uuid; today date:=(now() at time zone 'America/Sao_Paulo')::date;
begin
 uid:=private.qa_plus_require_adult(p_family,true);
 if p_title is null or length(btrim(p_title)) not between 1 and 140 or p_frequency is null or p_frequency not in ('daily','weekly','monthly') or p_start is null then raise exception 'Preencha os dados da rotina';end if;
 if p_assignee is not null and not exists(select 1 from public.family_members where family_id=p_family and user_id=p_assignee) then raise exception 'Responsável não pertence à família';end if;
 if p_id is null then
  perform 1 from public.families where id=p_family for update;
  if (select count(*) from private.qa_routines where family_id=p_family)>=100 then raise exception 'Limite de 100 rotinas no teste';end if;
  insert into private.qa_routines(family_id,title,frequency,starts_on,next_on,assignee_id,created_by)
  values(p_family,btrim(p_title),p_frequency,p_start,private.qa_routine_day(p_start,p_frequency,greatest(p_start,today)),p_assignee,uid) returning id into rid;
 else
  update private.qa_routines set title=btrim(p_title),frequency=p_frequency,starts_on=p_start,next_on=private.qa_routine_day(p_start,p_frequency,greatest(p_start,today)),assignee_id=p_assignee where id=p_id and family_id=p_family returning id into rid;
  if rid is null then raise exception 'Rotina indisponível';end if;
 end if;
 perform private.qa_materialize_routines(today,p_family);
 return rid;
end $$;
revoke all on function public.qa_routine_save(uuid,text,text,date,uuid,uuid) from public,anon;
grant execute on function public.qa_routine_save(uuid,text,text,date,uuid,uuid) to authenticated;

create function public.qa_routine_toggle(p_family uuid,p_id uuid,p_active boolean) returns void
language plpgsql security definer set search_path='' as $$
begin
 perform private.qa_plus_require_adult(p_family,true);
 if p_active is null then raise exception 'Ação inválida';end if;
 update private.qa_routines set active=p_active,next_on=case when p_active then private.qa_routine_day(starts_on,frequency,(now() at time zone 'America/Sao_Paulo')::date) else next_on end where id=p_id and family_id=p_family;
 if not found then raise exception 'Rotina indisponível';end if;
end $$;
revoke all on function public.qa_routine_toggle(uuid,uuid,boolean) from public,anon;
grant execute on function public.qa_routine_toggle(uuid,uuid,boolean) to authenticated;

create function public.qa_expense_save(p_family uuid,p_title text,p_amount integer,p_category text,p_date date,p_id uuid default null) returns uuid
language plpgsql security definer set search_path='' as $$
declare uid uuid; eid uuid;
begin
 uid:=private.qa_plus_require_adult(p_family,true);
 if p_title is null or length(btrim(p_title)) not between 1 and 140 or p_amount is null or p_amount not between 1 and 1000000000 or p_category is null or p_category not in ('groceries','housing','transport','health','leisure','other') or p_date is null then raise exception 'Confira os dados do gasto';end if;
 if p_id is null then
  insert into private.qa_expenses(family_id,title,amount_cents,category,spent_on,created_by) values(p_family,btrim(p_title),p_amount,p_category,p_date,uid) returning id into eid;
 else
  update private.qa_expenses set title=btrim(p_title),amount_cents=p_amount,category=p_category,spent_on=p_date where id=p_id and family_id=p_family and deleted_at is null returning id into eid;
  if eid is null then raise exception 'Gasto indisponível';end if;
 end if;
 return eid;
end $$;
revoke all on function public.qa_expense_save(uuid,text,integer,text,date,uuid) from public,anon;
grant execute on function public.qa_expense_save(uuid,text,integer,text,date,uuid) to authenticated;

create function public.qa_goal_save(p_family uuid,p_title text,p_target integer,p_saved integer,p_id uuid default null) returns uuid
language plpgsql security definer set search_path='' as $$
declare uid uuid; gid uuid;
begin
 uid:=private.qa_plus_require_adult(p_family,true);
 if p_title is null or length(btrim(p_title)) not between 1 and 140 or p_target is null or p_target not between 1 and 1000000000 or p_saved is null or p_saved not between 0 and 1000000000 then raise exception 'Confira os valores da meta';end if;
 if p_id is null then
  insert into private.qa_savings_goals(family_id,title,target_cents,saved_cents,created_by) values(p_family,btrim(p_title),p_target,p_saved,uid) returning id into gid;
 else
  update private.qa_savings_goals set title=btrim(p_title),target_cents=p_target,saved_cents=p_saved where id=p_id and family_id=p_family and deleted_at is null returning id into gid;
  if gid is null then raise exception 'Meta indisponível';end if;
 end if;
 return gid;
end $$;
revoke all on function public.qa_goal_save(uuid,text,integer,integer,uuid) from public,anon;
grant execute on function public.qa_goal_save(uuid,text,integer,integer,uuid) to authenticated;

create function public.qa_finance_archive(p_family uuid,p_id uuid,p_kind text) returns void
language plpgsql security definer set search_path='' as $$
begin
 perform private.qa_plus_require_adult(p_family,true);
 if p_kind='expense' then update private.qa_expenses set deleted_at=now() where id=p_id and family_id=p_family and deleted_at is null;
 elsif p_kind='goal' then update private.qa_savings_goals set deleted_at=now() where id=p_id and family_id=p_family and deleted_at is null;
 else raise exception 'Tipo inválido';end if;
 if not found then raise exception 'Registro indisponível';end if;
end $$;
revoke all on function public.qa_finance_archive(uuid,uuid,text) from public,anon;
grant execute on function public.qa_finance_archive(uuid,uuid,text) to authenticated;

-- Extend the existing simulated plan control; no billing or families.plan mutation.
create or replace function public.qa_avatar_simulate_plan(p_family uuid,p_mode text) returns jsonb
language plpgsql security definer set search_path='' as $$
declare uid uuid; was text; today date:=(now() at time zone 'America/Sao_Paulo')::date;
begin
 uid:=private.qa_avatar_require_family(p_family);
 if not exists(select 1 from public.family_members where family_id=p_family and user_id=uid and role='admin') then raise exception 'Só o Admin pode simular o plano';end if;
 if p_mode is null or p_mode not in ('free','plus') then raise exception 'Plano inválido';end if;
 perform 1 from public.families where id=p_family for update;
 was:=private.qa_plus_mode(p_family);
 insert into private.qa_avatar_plans(family_id,mode) values(p_family,p_mode) on conflict(family_id) do update set mode=excluded.mode;
 if p_mode='plus' then
  if was is distinct from 'plus' then update private.qa_routines set next_on=private.qa_routine_day(starts_on,frequency,greatest(starts_on,today)) where family_id=p_family and active;end if;
  perform private.qa_materialize_routines(today,p_family);
 end if;
 return public.qa_avatar_state(p_family);
end $$;
