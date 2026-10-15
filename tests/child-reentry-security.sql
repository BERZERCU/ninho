begin;
do $$
declare g uuid:=extensions.gen_random_uuid(); c uuid:=extensions.gen_random_uuid(); s uuid:=extensions.gen_random_uuid(); f uuid; target uuid; code text; blocked boolean;
begin
 insert into auth.users(id,email,email_confirmed_at,raw_app_meta_data,raw_user_meta_data) values
 (g,g::text||'@qa.invalid',now(),'{}','{"name":"Guardian"}'),
 (c,c::text||'@child.ninho.invalid',now(),'{"managed_child":true}','{"name":"Child"}'),
 (s,s::text||'@qa.invalid',now(),'{}','{}');
 perform set_config('request.jwt.claim.sub',g::text,true);
 f:=(public.create_family('Original test')->>'family_id')::uuid;
 insert into private.managed_children(child_id,guardian_id,family_id,login_code,consent_version) values(c,g,f,'N1111111111111111','2026-10-08');
 perform set_config('request.jwt.claim.sub',s::text,true);
 target:=(public.create_family('Destination test')->>'family_id')::uuid;
 select invite_code into code from public.families where id=target;
 perform set_config('request.jwt.claim.sub',c::text,true);
 blocked:=false;begin perform public.join_family(code);exception when others then blocked:=true;end;
 if not blocked then raise exception 'TEST FAILED: child joined without guardian';end if;
 blocked:=false;begin perform public.create_family('Forbidden');exception when others then blocked:=true;end;
 if not blocked then raise exception 'TEST FAILED: detached child created family';end if;
 perform set_config('request.jwt.claim.sub',g::text,true);
 perform public.join_family(code);
 perform set_config('request.jwt.claim.sub',c::text,true);
 perform public.join_family(code);
 blocked:=false;begin perform public.join_family(code);exception when others then blocked:=true;end;
 if not blocked then raise exception 'TEST FAILED: attached child switched families';end if;
 if not exists(select 1 from public.family_members where user_id=c and family_id=target and role='child') then raise exception 'TEST FAILED: destination child role';end if;
 if not exists(select 1 from private.managed_children where child_id=c and family_id=target and guardian_id=g) then raise exception 'TEST FAILED: guardian retained';end if;
 if (select count(*) from public.managed_children_for_guardian(g))<>1 then raise exception 'TEST FAILED: guardian management lost';end if;
 blocked:=false;begin perform public.set_family_member_role(c,'adult');exception when others then blocked:=true;end;
 if not blocked then raise exception 'TEST FAILED: child escalation';end if;
 perform set_config('request.jwt.claim.sub',extensions.gen_random_uuid()::text,true);
 blocked:=false;begin perform public.join_family(code);exception when others then blocked:=true;end;
 if not blocked then raise exception 'TEST FAILED: deleted user joined';end if;
end $$;
rollback;
select 'child reentry checks passed; fixtures rolled back' as result;
