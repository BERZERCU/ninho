-- A detached managed child may rejoin by code, retaining their guardian and child role.
create or replace function public.join_family(join_code text)
returns uuid language plpgsql security definer set search_path='' as $$
declare uid uuid:=auth.uid(); fid uuid; guardian uuid; managed boolean;
begin
 if uid is null then raise exception 'Não autenticado'; end if;
 select coalesce(raw_app_meta_data->>'managed_child'='true',false) into managed
 from auth.users where id=uid for update;
 if not found then raise exception 'Conta indisponível. Entre novamente'; end if;
 select id into fid from public.families where invite_code=upper(trim(join_code));
 if fid is null then raise exception 'Código inválido'; end if;
 if managed then
  select guardian_id into guardian from private.managed_children where child_id=uid for update;
  if guardian is null then raise exception 'Conta infantil indisponível'; end if;
  if exists(select 1 from public.family_members where user_id=uid) then
   raise exception 'Saia da família atual antes de entrar em outra';
  end if;
  -- Lock the guardian membership: it cannot disappear while the child joins.
  perform 1 from public.family_members where user_id=guardian and family_id=fid and role in ('admin','adult') for update;
  if not found then raise exception 'Seu responsável precisa entrar nesta família primeiro'; end if;
  update private.managed_children set family_id=fid where child_id=uid;
  insert into public.family_members(family_id,user_id,role) values(fid,uid,'child');
 else
  insert into public.family_members(family_id,user_id,role) values(fid,uid,'adult') on conflict do nothing;
 end if;
 return fid;
end $$;
revoke all on function public.join_family(text) from public,anon;
grant execute on function public.join_family(text) to authenticated;
