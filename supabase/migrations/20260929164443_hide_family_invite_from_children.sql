create or replace function public.my_family()
returns table(family_id uuid, family_name text, invite_code text, plan text, role text, payload jsonb)
language sql stable security definer set search_path = ''
as $$
  select f.id, f.name,
         case when m.role = 'child' then null::text else f.invite_code end,
         f.plan, m.role, s.payload
  from public.family_members m
  join public.families f on f.id = m.family_id
  left join public.family_snapshots s on s.family_id = f.id
  where m.user_id = auth.uid()
  order by m.joined_at desc
  limit 1
$$;
revoke all privileges on table public.families from anon, authenticated;
