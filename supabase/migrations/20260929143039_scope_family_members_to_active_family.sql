create or replace function public.family_members_list()
returns table(user_id uuid, name text, role text)
language sql security definer set search_path = ''
as $$
  select fm.user_id,
         coalesce(nullif(p.name, ''), 'Membro')::text,
         fm.role::text
  from public.family_members fm
  left join public.profiles p on p.id = fm.user_id
  where fm.family_id = (
    select mine.family_id
    from public.family_members mine
    where mine.user_id = auth.uid()
    order by mine.joined_at desc
    limit 1
  )
  order by case when fm.user_id = auth.uid() then 0 else 1 end,
           coalesce(p.name, '')
$$;
