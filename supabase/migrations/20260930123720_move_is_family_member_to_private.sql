create or replace function private.is_family_member(fid uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists(
    select 1
    from public.family_members
    where family_id = fid
      and user_id = auth.uid()
  )
$$;

grant usage on schema private to authenticated;
revoke all on function private.is_family_member(uuid) from public, anon;
grant execute on function private.is_family_member(uuid) to authenticated;

alter policy "events_family_select"
on public.events
using (private.is_family_member(family_id));

alter policy "family read members"
on public.families
using (private.is_family_member(id));

alter policy "membership read members"
on public.family_members
using (private.is_family_member(family_id));

alter policy "snapshot insert members"
on public.family_snapshots
with check (private.is_family_member(family_id));

alter policy "snapshot read members"
on public.family_snapshots
using (private.is_family_member(family_id));

alter policy "snapshot update members"
on public.family_snapshots
using (private.is_family_member(family_id))
with check (private.is_family_member(family_id));

alter policy "shopping_family_select"
on public.shopping_items
using (private.is_family_member(family_id));

alter policy "tasks_family_select"
on public.tasks
using (private.is_family_member(family_id));

revoke all on function public.is_family_member(uuid) from public, anon, authenticated;
drop function public.is_family_member(uuid);
