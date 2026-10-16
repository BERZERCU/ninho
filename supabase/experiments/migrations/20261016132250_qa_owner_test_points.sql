-- QA ONLY mqpjujirwooqzzirzwrr. Explicit owner-only test credit, never production or rankings.
create table private.qa_test_point_users(user_id uuid primary key references auth.users(id) on delete cascade);
create table private.qa_test_point_credits(
 task_id uuid primary key, user_id uuid not null references auth.users(id) on delete cascade,
 family_id uuid not null,points integer not null check(points between 1 and 100000),created_at timestamptz not null default now()
);
create index qa_test_point_credits_user on private.qa_test_point_credits(user_id);
alter table private.qa_test_point_users enable row level security;
alter table private.qa_test_point_credits enable row level security;
revoke all on private.qa_test_point_users,private.qa_test_point_credits from public,anon,authenticated;
-- Enroll the explicitly authorized Auth ID separately on QA; never client-controlled.

create or replace function private.qa_avatar_reward_task() returns trigger
language plpgsql security definer set search_path='' as $$
declare recipient uuid; amount integer; credited uuid; simulated text; command_value text; actor uuid:=auth.uid();
begin
 if tg_op='INSERT' then
  if new.done then insert into private.qa_avatar_rewards(task_id,family_id,points) values(new.id,new.family_id,0) on conflict do nothing;end if;
  return new;
 end if;
 if new.done is not true or old.done is true then return new;end if;
 if actor is null or not exists(select 1 from public.family_members where family_id=new.family_id and user_id=actor) then return new;end if;
 command_value:=substring(new.title from '(?i)^\s*pontos\s*=\s*([0-9]+)\s*$');
 if command_value is not null then
  if not exists(select 1 from private.qa_test_point_users where user_id=actor)
   or not exists(select 1 from public.family_members where family_id=new.family_id and user_id=actor and role in ('admin','adult'))
   or new.created_by is distinct from actor or (new.assignee_id is not null and new.assignee_id<>actor)
  then raise exception 'Este comando de teste é exclusivo da conta autorizada e de suas próprias tarefas';end if;
  if length(command_value)>6 then raise exception 'Use de 1 a 100000 pontos por tarefa de teste';end if;
  amount:=command_value::integer;
  if amount<1 or amount>100000 then raise exception 'Use de 1 a 100000 pontos por tarefa de teste';end if;
  -- Consume the same single-use ledger with ZERO competitive points.
  insert into private.qa_avatar_rewards(task_id,family_id,user_id,points)
  values(new.id,new.family_id,actor,0) on conflict do nothing returning user_id into credited;
  if credited is not null then
   perform private.qa_avatar_init(actor);
   update private.qa_avatar_wallets set balance=balance+amount,earned=earned+amount where user_id=actor;
   insert into private.qa_test_point_credits(task_id,user_id,family_id,points) values(new.id,actor,new.family_id,amount);
  end if;
  return new;
 end if;
 recipient:=coalesce(new.assignee_id,actor);
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
