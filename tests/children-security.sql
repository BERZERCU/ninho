-- Run only against the isolated QA project. All fixtures are rolled back.
begin;
do $$
declare guardian uuid:=extensions.gen_random_uuid(); child uuid:=extensions.gen_random_uuid(); stranger uuid:=extensions.gen_random_uuid(); fid uuid; other uuid; blocked boolean;
begin
 insert into auth.users(id,email,email_confirmed_at,raw_app_meta_data,raw_user_meta_data) values
 (guardian,guardian::text||'@qa.invalid',now(),'{}','{"name":"QA Guardian"}'),
 (child,child::text||'@child.ninho.invalid',now(),'{"managed_child":true}','{"name":"QA Child"}'),
 (stranger,stranger::text||'@qa.invalid',now(),'{}','{"name":"QA Stranger"}');
 perform set_config('request.jwt.claim.sub',guardian::text,true);
 fid:=(public.create_family('QA managed child')->>'family_id')::uuid;
 perform public.register_managed_child(child,guardian,fid,'N1234567890ABCDEF');
 if (select role from public.family_members where user_id=child)<>'child' then raise exception 'TEST FAILED: initial role'; end if;
 if public.managed_child_lookup('N1234567890ABCDEF')<>child then raise exception 'TEST FAILED: lookup'; end if;
 if (select count(*) from public.managed_children_for_guardian(stranger))<>0 then raise exception 'TEST FAILED: stranger list'; end if;
 blocked:=false;begin perform public.set_family_member_role(child,'adult');exception when others then blocked:=true;end;
 if not blocked then raise exception 'TEST FAILED: role escalation';end if;
 blocked:=false;begin delete from auth.users where id=guardian;exception when others then blocked:=true;end;
 if not blocked then raise exception 'TEST FAILED: orphan guardian';end if;
 perform set_config('request.jwt.claim.sub',stranger::text,true);
 other:=(public.create_family('QA other family')->>'family_id')::uuid;
 perform set_config('request.jwt.claim.sub',child::text,true);
 if exists(select 1 from public.my_family() where invite_code is not null) then raise exception 'TEST FAILED: invite disclosure';end if;
 blocked:=false;begin perform public.create_family('QA child escalation');exception when others then blocked:=true;end;
 if not blocked then raise exception 'TEST FAILED: create family';end if;
 blocked:=false;begin perform public.join_family((select invite_code from public.families where id=other));exception when others then blocked:=true;end;
 if not blocked then raise exception 'TEST FAILED: join family';end if;
 perform set_config('request.jwt.claim.sub',guardian::text,true);
 blocked:=false;begin delete from public.family_members where user_id=guardian;exception when others then blocked:=true;end;
 if not blocked then raise exception 'TEST FAILED: guardian leave';end if;
 if has_function_privilege('anon','public.managed_child_lookup(text)','execute') or has_function_privilege('authenticated','public.register_managed_child(uuid,uuid,uuid,text)','execute') then raise exception 'TEST FAILED: function grants';end if;
 delete from auth.users where id=child;
 if exists(select 1 from private.managed_children where child_id=child) then raise exception 'TEST FAILED: child deletion';end if;
end $$;
rollback;
select 'managed child database checks passed; fixtures rolled back' as result;
