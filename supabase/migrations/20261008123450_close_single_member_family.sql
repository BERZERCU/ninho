-- Durable cleanup requests keep file deletion retryable after the family is gone.
create table private.family_closures (
 family_id uuid primary key,
 owner_id uuid references auth.users(id) on delete set null,
 proof_paths text[] not null default '{}',
 closed_at timestamptz not null default now(),
 cleaned_at timestamptz
);
alter table private.family_closures enable row level security;
revoke all on private.family_closures from public,anon,authenticated;

create function public.close_single_member_family(p_family uuid,p_confirmation text)
returns void language plpgsql security definer set search_path='' as $$
declare uid uuid:=auth.uid(); owner uuid; paths text[];
begin
 if uid is null then raise exception 'Sessão expirada'; end if;
 if p_confirmation is distinct from 'ENCERRAR' then raise exception 'Digite ENCERRAR para confirmar'; end if;
 select owner_id into owner from public.families where id=p_family for update;
 if not found then
  if exists(select 1 from private.family_closures where family_id=p_family and owner_id=uid) then return; end if;
  raise exception 'Família indisponível';
 end if;
 if owner is distinct from uid or not exists(select 1 from public.family_members where family_id=p_family and user_id=uid and role='admin') then raise exception 'Apenas o Administrador proprietário pode encerrar'; end if;
 if (select count(*) from public.family_members where family_id=p_family)<>1 then raise exception 'Há outros membros. Transfira a administração antes de sair'; end if;
 select coalesce(array_agg(name),'{}'::text[]) into paths from storage.objects where bucket_id='task-proofs' and name like p_family::text||'/%';
 insert into private.family_closures(family_id,owner_id,proof_paths) values(p_family,uid,paths);
 -- Delete dependents while the parent still exists: activity triggers need it.
 delete from public.tasks where family_id=p_family;
 delete from public.events where family_id=p_family;
 delete from public.shopping_items where family_id=p_family;
 delete from public.family_members where family_id=p_family;
 delete from public.family_snapshots where family_id=p_family;
 delete from public.family_activity where family_id=p_family;
 delete from public.families where id=p_family;
end $$;
revoke all on function public.close_single_member_family(uuid,text) from public,anon;
grant execute on function public.close_single_member_family(uuid,text) to authenticated;

create function public.family_closure_cleanup(p_family uuid,p_owner uuid,p_complete boolean default false)
returns text[] language plpgsql security definer set search_path='' as $$
declare paths text[];
begin
 select proof_paths into paths from private.family_closures where family_id=p_family and owner_id=p_owner;
 if not found then raise exception 'Encerramento não autorizado'; end if;
 if p_complete then update private.family_closures set cleaned_at=now() where family_id=p_family and owner_id=p_owner; end if;
 return paths;
end $$;
revoke all on function public.family_closure_cleanup(uuid,uuid,boolean) from public,anon,authenticated;
grant execute on function public.family_closure_cleanup(uuid,uuid,boolean) to service_role;

create function public.my_pending_family_closures() returns setof uuid
language sql security definer set search_path='' as $$
 select family_id from private.family_closures where owner_id=auth.uid() and cleaned_at is null;
$$;
revoke all on function public.my_pending_family_closures() from public,anon;
grant execute on function public.my_pending_family_closures() to authenticated;
