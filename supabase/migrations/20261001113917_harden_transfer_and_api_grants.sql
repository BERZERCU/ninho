-- Production hardening: restore Adult-only admin transfer, tighten search_path,
-- and make Data API grants explicit/least-privilege before the 2026-10-30
-- Supabase auto-exposure change.

create or replace function public.transfer_family_admin(target_user uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
  fid uuid;
begin
  if uid is null then
    raise exception 'Sessão expirada';
  end if;

  select fm.family_id
    into fid
  from public.family_members fm
  join public.families f on f.id = fm.family_id
  where fm.user_id = uid
    and fm.role = 'admin'
    and f.owner_id = uid
  order by fm.joined_at desc
  limit 1;

  if fid is null then
    raise exception 'Apenas o administrador proprietário pode transferir a família';
  end if;

  if target_user = uid then
    raise exception 'Escolha outro membro';
  end if;

  if not exists (
    select 1
    from public.family_members fm
    where fm.family_id = fid
      and fm.user_id = target_user
      and fm.role = 'adult'
  ) then
    raise exception 'A administração só pode ser transferida para um Adulto';
  end if;

  update public.family_members
  set role = 'adult'
  where family_id = fid and user_id = uid;

  update public.family_members
  set role = 'admin'
  where family_id = fid and user_id = target_user;

  update public.families
  set owner_id = target_user
  where id = fid;
end;
$$;

create or replace function public.join_family(join_code text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  fid uuid;
begin
  if auth.uid() is null then
    raise exception 'Não autenticado';
  end if;

  select f.id
    into fid
  from public.families f
  where f.invite_code = upper(trim(join_code));

  if fid is null then
    raise exception 'Código inválido';
  end if;

  insert into public.family_members(family_id, user_id, role)
  values(fid, auth.uid(), 'adult')
  on conflict do nothing;

  return fid;
end;
$$;

revoke all privileges on table
  public.profiles,
  public.families,
  public.family_members,
  public.family_snapshots,
  public.tasks,
  public.events,
  public.shopping_items
from anon;

revoke all privileges on table
  public.profiles,
  public.families,
  public.family_members,
  public.family_snapshots,
  public.tasks,
  public.events,
  public.shopping_items
from authenticated;

grant select, insert, update on table public.profiles to authenticated;
grant select on table public.families to authenticated;
grant select on table public.family_members to authenticated;
grant select on table public.family_snapshots to authenticated;
grant select, insert, update, delete on table public.tasks to authenticated;
grant select, insert, update, delete on table public.events to authenticated;
grant select, insert, update, delete on table public.shopping_items to authenticated;

revoke execute on function public.create_family(text) from public, anon;
revoke execute on function public.family_members_list() from public, anon;
revoke execute on function public.join_family(text) from public, anon;
revoke execute on function public.leave_family() from public, anon;
revoke execute on function public.my_family() from public, anon;
revoke execute on function public.remove_family_member(uuid) from public, anon;
revoke execute on function public.set_family_member_role(uuid, text) from public, anon;
revoke execute on function public.set_shopping_done(uuid, boolean) from public, anon;
revoke execute on function public.set_task_done(uuid, boolean) from public, anon;
revoke execute on function public.transfer_family_admin(uuid) from public, anon;

grant execute on function public.create_family(text) to authenticated;
grant execute on function public.family_members_list() to authenticated;
grant execute on function public.join_family(text) to authenticated;
grant execute on function public.leave_family() to authenticated;
grant execute on function public.my_family() to authenticated;
grant execute on function public.remove_family_member(uuid) to authenticated;
grant execute on function public.set_family_member_role(uuid, text) to authenticated;
grant execute on function public.set_shopping_done(uuid, boolean) to authenticated;
grant execute on function public.set_task_done(uuid, boolean) to authenticated;
grant execute on function public.transfer_family_admin(uuid) to authenticated;
