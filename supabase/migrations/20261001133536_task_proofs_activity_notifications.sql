-- Task proof photos, family activity feed and realtime notifications.
-- Applied to production as Supabase migration 20261001133536.

alter table public.tasks
  add column if not exists proof_path text,
  add column if not exists proof_by uuid references auth.users(id) on delete set null,
  add column if not exists proof_at timestamptz;

create table if not exists public.family_activity (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families(id) on delete cascade,
  actor_id uuid references auth.users(id) on delete set null,
  action text not null,
  entity_type text not null,
  entity_id uuid,
  title text not null default '',
  created_at timestamptz not null default now()
);

alter table public.family_activity enable row level security;

create index if not exists family_activity_family_created_idx
  on public.family_activity(family_id, created_at desc);

revoke all on table public.family_activity from anon, authenticated;
grant select on table public.family_activity to authenticated;

drop policy if exists "family_activity_select" on public.family_activity;
create policy "family_activity_select"
on public.family_activity
for select
to authenticated
using ((select private.is_family_member(family_id)));

create or replace function private.log_family_activity()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_family uuid;
  v_entity uuid;
  v_title text := '';
  v_action text;
begin
  if tg_table_name = 'family_members' then
    v_family := case when tg_op='DELETE' then old.family_id else new.family_id end;
    v_entity := case when tg_op='DELETE' then old.user_id else new.user_id end;
    select coalesce(p.name,'Membro') into v_title
    from public.profiles p
    where p.id=v_entity;

    if tg_op='INSERT' then
      v_action := 'member_joined';
    elsif tg_op='DELETE' then
      v_action := 'member_removed';
    elsif old.role is distinct from new.role then
      v_action := 'member_role_changed';
    else
      return new;
    end if;
  else
    v_family := case when tg_op='DELETE' then old.family_id else new.family_id end;
    v_entity := case when tg_op='DELETE' then old.id else new.id end;
    v_title := case when tg_op='DELETE' then old.title else new.title end;

    if tg_op='INSERT' then
      v_action := 'created';
    elsif tg_op='DELETE' then
      v_action := 'deleted';
    elsif tg_table_name in ('tasks','shopping_items')
      and old.done is distinct from new.done then
      v_action := case when new.done then 'completed' else 'reopened' end;
    elsif tg_table_name='tasks'
      and old.proof_path is distinct from new.proof_path
      and old.done is not distinct from new.done then
      v_action := 'proof_updated';
    else
      v_action := 'updated';
    end if;
  end if;

  insert into public.family_activity(
    family_id, actor_id, action, entity_type, entity_id, title
  )
  values (
    v_family,
    auth.uid(),
    v_action,
    case tg_table_name
      when 'tasks' then 'task'
      when 'events' then 'event'
      when 'shopping_items' then 'shopping'
      else 'member'
    end,
    v_entity,
    coalesce(v_title,'')
  );

  return case when tg_op='DELETE' then old else new end;
end
$$;

drop trigger if exists log_task_activity on public.tasks;
create trigger log_task_activity
after insert or update or delete on public.tasks
for each row execute function private.log_family_activity();

drop trigger if exists log_event_activity on public.events;
create trigger log_event_activity
after insert or update or delete on public.events
for each row execute function private.log_family_activity();

drop trigger if exists log_shopping_activity on public.shopping_items;
create trigger log_shopping_activity
after insert or update or delete on public.shopping_items
for each row execute function private.log_family_activity();

drop trigger if exists log_member_activity on public.family_members;
create trigger log_member_activity
after insert or update or delete on public.family_members
for each row execute function private.log_family_activity();

create or replace function public.complete_task_with_proof(
  task_id uuid,
  proof_path text default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  fid uuid;
  assignee uuid;
  r text;
begin
  if auth.uid() is null then
    raise exception 'Sessão expirada';
  end if;

  select t.family_id,t.assignee_id
  into fid,assignee
  from public.tasks t
  where t.id=task_id;

  if fid is null then
    raise exception 'Tarefa não encontrada';
  end if;

  select private.family_role(fid) into r;

  if r is null then
    raise exception 'Sem acesso à família';
  end if;

  if r='child' and assignee is distinct from auth.uid() then
    raise exception 'Criança só pode concluir tarefas atribuídas a ela';
  end if;

  if proof_path is not null then
    if proof_path not like fid::text || '/' || task_id::text || '/%' then
      raise exception 'Comprovante inválido';
    end if;

    if not exists (
      select 1
      from storage.objects o
      where o.bucket_id='task-proofs'
        and o.name=proof_path
        and o.owner_id=auth.uid()::text
    ) then
      raise exception 'Comprovante não encontrado';
    end if;
  end if;

  update public.tasks
  set done=true,
      proof_path=proof_path,
      proof_by=case when proof_path is null then null else auth.uid() end,
      proof_at=case when proof_path is null then null else now() end,
      updated_at=now()
  where id=task_id;
end
$$;

revoke execute on function public.complete_task_with_proof(uuid,text)
from public, anon;
grant execute on function public.complete_task_with_proof(uuid,text)
to authenticated;

create or replace function public.set_task_done(task_id uuid, is_done boolean)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  fid uuid;
  assignee uuid;
  r text;
begin
  if auth.uid() is null then
    raise exception 'Sessão expirada';
  end if;

  select t.family_id,t.assignee_id
  into fid,assignee
  from public.tasks t
  where t.id=task_id;

  if fid is null then
    raise exception 'Tarefa não encontrada';
  end if;

  select private.family_role(fid) into r;

  if r is null then
    raise exception 'Sem acesso à família';
  end if;

  if r='child' and assignee is distinct from auth.uid() then
    raise exception 'Criança só pode concluir tarefas atribuídas a ela';
  end if;

  update public.tasks
  set done=is_done,
      proof_path=case when is_done then proof_path else null end,
      proof_by=case when is_done then proof_by else null end,
      proof_at=case when is_done then proof_at else null end,
      updated_at=now()
  where id=task_id;
end
$$;

insert into storage.buckets(
  id, name, public, file_size_limit, allowed_mime_types
)
values (
  'task-proofs',
  'task-proofs',
  false,
  5242880,
  array['image/jpeg','image/png','image/webp']
)
on conflict (id) do update
set public=false,
    file_size_limit=excluded.file_size_limit,
    allowed_mime_types=excluded.allowed_mime_types;

drop policy if exists "task_proofs_select_family" on storage.objects;
create policy "task_proofs_select_family"
on storage.objects
for select
to authenticated
using (
  bucket_id='task-proofs'
  and exists (
    select 1
    from public.family_members fm
    where fm.user_id=(select auth.uid())
      and fm.family_id::text=(storage.foldername(name))[1]
  )
);

drop policy if exists "task_proofs_insert_allowed" on storage.objects;
create policy "task_proofs_insert_allowed"
on storage.objects
for insert
to authenticated
with check (
  bucket_id='task-proofs'
  and owner_id=(select auth.uid()::text)
  and exists (
    select 1
    from public.tasks t
    join public.family_members fm
      on fm.family_id=t.family_id
     and fm.user_id=(select auth.uid())
    where t.id::text=(storage.foldername(name))[2]
      and t.family_id::text=(storage.foldername(name))[1]
      and (
        fm.role in ('admin','adult')
        or t.assignee_id=(select auth.uid())
      )
  )
);

drop policy if exists "task_proofs_delete_allowed" on storage.objects;
create policy "task_proofs_delete_allowed"
on storage.objects
for delete
to authenticated
using (
  bucket_id='task-proofs'
  and exists (
    select 1
    from public.family_members fm
    where fm.user_id=(select auth.uid())
      and fm.family_id::text=(storage.foldername(name))[1]
      and (
        fm.role in ('admin','adult')
        or owner_id=(select auth.uid()::text)
      )
  )
);

alter publication supabase_realtime
add table public.family_activity;
