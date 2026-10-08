-- Guardian-created child accounts; reviewed in the isolated test project first.
create table private.managed_children (
 child_id uuid primary key references auth.users(id) on delete cascade,
 guardian_id uuid not null references auth.users(id) on delete restrict,
 family_id uuid not null references public.families(id) on delete restrict,
 login_code text not null unique check (login_code ~ '^N[0-9A-F]{16}$'),
 consent_version text not null check (consent_version = '2026-10-08'),
 consent_at timestamptz not null default now(),
 check (child_id <> guardian_id)
);
alter table private.managed_children enable row level security;
revoke all on private.managed_children from public, anon, authenticated;

-- Authenticated users cannot invoke these service-only entry points directly.
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
 insert into public.family_members(family_id,user_id,role) values(p_family,p_child,'child');
end $$;
revoke all on function public.register_managed_child(uuid,uuid,uuid,text) from public,anon,authenticated;
grant execute on function public.register_managed_child(uuid,uuid,uuid,text) to service_role;

create function public.managed_child_lookup(p_code text)
returns uuid language sql security definer set search_path='' as $$
 select child_id from private.managed_children where login_code=p_code;
$$;
revoke all on function public.managed_child_lookup(text) from public,anon,authenticated;
grant execute on function public.managed_child_lookup(text) to service_role;

create function public.managed_children_for_guardian(p_guardian uuid)
returns table(child_id uuid,login_code text,name text,family_id uuid)
language sql security definer set search_path='' as $$
 select c.child_id,c.login_code,coalesce(p.name,'Criança'),c.family_id
 from private.managed_children c left join public.profiles p on p.id=c.child_id
 where c.guardian_id=p_guardian and exists(select 1 from public.family_members m where m.user_id=p_guardian and m.family_id=c.family_id and m.role in ('admin','adult'));
$$;
revoke all on function public.managed_children_for_guardian(uuid) from public,anon,authenticated;
grant execute on function public.managed_children_for_guardian(uuid) to service_role;

-- Protect managed accounts even when RPCs bypass RLS. App metadata is server-owned.
create function private.guard_managed_membership() returns trigger language plpgsql security definer set search_path='' as $$
declare target uuid; managed boolean;
begin
 target:=case when tg_op='DELETE' then old.user_id else new.user_id end;
 select coalesce(raw_app_meta_data->>'managed_child'='true',false) into managed from auth.users where id=target;
 if tg_op<>'DELETE' and managed then
  if new.role<>'child' or not exists(select 1 from private.managed_children c where c.child_id=target and c.family_id=new.family_id) then
   raise exception 'Contas infantis só podem acessar a família autorizada como Criança';
  end if;
 end if;
 if tg_op='DELETE' and exists(select 1 from private.managed_children where guardian_id=old.user_id and family_id=old.family_id) then
  raise exception 'Exclua primeiro as contas infantis sob sua responsabilidade';
 end if;
 if tg_op='UPDATE' and new.role='child' and exists(select 1 from private.managed_children where guardian_id=new.user_id) then
  raise exception 'Um responsável por contas infantis precisa manter papel Adulto';
 end if;
 return case when tg_op='DELETE' then old else new end;
end $$;
revoke all on function private.guard_managed_membership() from public,anon,authenticated;
create trigger guard_managed_membership before insert or update or delete on public.family_members for each row execute function private.guard_managed_membership();

-- Prevent an unassigned managed account from creating a new family as its owner.
create function private.guard_managed_family_owner() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if exists(select 1 from auth.users where id=new.owner_id and raw_app_meta_data->>'managed_child'='true') then raise exception 'Contas infantis não podem administrar famílias'; end if;
 return new;
end $$;
revoke all on function private.guard_managed_family_owner() from public,anon,authenticated;
create trigger guard_managed_family_owner before insert or update of owner_id on public.families for each row execute function private.guard_managed_family_owner();
