-- Save the assigned display name in the same transaction as child registration.
create or replace function public.register_managed_child(p_child uuid, p_guardian uuid, p_family uuid, p_code text)
returns void language plpgsql security definer set search_path='' as $$
begin
 -- Serialize registrations for the guardian across all of their families.
 perform 1 from auth.users where id=p_guardian for update;
 perform 1 from public.family_members where user_id=p_guardian and family_id=p_family for update;
 if not exists(select 1 from public.family_members where user_id=p_guardian and family_id=p_family and role in ('admin','adult'))
 or exists(select 1 from private.managed_children where child_id=p_guardian)
 or not exists(select 1 from auth.users where id=p_guardian and email_confirmed_at is not null)
 then raise exception 'Responsável não autorizado'; end if;
 if (select count(*) from private.managed_children where guardian_id=p_guardian) >= 5 then raise exception 'Limite de cinco contas infantis'; end if;
 if not exists(select 1 from auth.users where id=p_child and raw_app_meta_data->>'managed_child'='true') then raise exception 'Conta inválida'; end if;
 insert into private.managed_children(child_id,guardian_id,family_id,login_code,consent_version) values(p_child,p_guardian,p_family,p_code,'2026-10-08');
 insert into public.profiles(id,name)
 select id, nullif(btrim(raw_user_meta_data->>'name'),'') from auth.users where id=p_child
 on conflict (id) do update set name=excluded.name
 where public.profiles.name is null or btrim(public.profiles.name)='';
 insert into public.family_members(family_id,user_id,role) values(p_family,p_child,'child');
end $$;
revoke all on function public.register_managed_child(uuid,uuid,uuid,text) from public,anon,authenticated;
grant execute on function public.register_managed_child(uuid,uuid,uuid,text) to service_role;

-- Recover names only for managed children with a missing or blank profile.
insert into public.profiles(id,name)
select u.id, btrim(u.raw_user_meta_data->>'name')
from auth.users u join private.managed_children c on c.child_id=u.id
where nullif(btrim(u.raw_user_meta_data->>'name'),'') is not null
on conflict (id) do update set name=excluded.name
where public.profiles.name is null or btrim(public.profiles.name)='';
