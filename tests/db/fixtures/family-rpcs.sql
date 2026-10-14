CREATE OR REPLACE FUNCTION public.create_family(family_name text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare fid uuid; code text;
begin
 if auth.uid() is null then raise exception 'Não autenticado'; end if;
 loop
   code := upper(substr(encode(extensions.gen_random_bytes(5),'hex'),1,6));
   exit when not exists(select 1 from public.families where invite_code=code);
 end loop;
 insert into public.families(name,invite_code,owner_id)
 values(coalesce(nullif(trim(family_name),''),'Minha família'),code,auth.uid())
 returning id into fid;
 insert into public.family_members(family_id,user_id,role) values(fid,auth.uid(),'admin');
 insert into public.family_snapshots(family_id) values(fid);
 return jsonb_build_object('family_id',fid,'invite_code',code);
end
$function$;

CREATE OR REPLACE FUNCTION public.join_family(join_code text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
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
$function$;

CREATE OR REPLACE FUNCTION public.my_family()
 RETURNS TABLE(family_id uuid, family_name text, invite_code text, plan text, role text, payload jsonb)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  select f.id, f.name,
         case when m.role = 'child' then null::text else f.invite_code end,
         f.plan, m.role, s.payload
  from public.family_members m
  join public.families f on f.id = m.family_id
  left join public.family_snapshots s on s.family_id = f.id
  where m.user_id = auth.uid()
  order by m.joined_at desc
  limit 1
$function$;

CREATE OR REPLACE FUNCTION public.set_family_member_role(target_user uuid, new_role text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare uid uuid:=auth.uid(); fid uuid;
begin
 if uid is null then raise exception 'Sessão expirada'; end if;
 select fm.family_id into fid from public.family_members fm where fm.user_id=uid and fm.role='admin' order by fm.joined_at desc limit 1;
 if fid is null then raise exception 'Apenas administradores podem alterar papéis'; end if;
 if target_user=uid then raise exception 'O administrador não pode alterar o próprio papel'; end if;
 if new_role not in ('adult','child') then raise exception 'Papel inválido'; end if;
 update public.family_members set role=new_role where family_id=fid and user_id=target_user;
 if not found then raise exception 'Membro não encontrado'; end if;
end $function$

