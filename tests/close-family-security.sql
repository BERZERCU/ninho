begin;
do $$
declare uid uuid:=extensions.gen_random_uuid(); other_uid uuid:=extensions.gen_random_uuid(); fid uuid; blocked boolean;
begin
 insert into auth.users(id,email,raw_app_meta_data,raw_user_meta_data) values(uid,uid::text||'@qa.invalid','{}','{}'),(other_uid,other_uid::text||'@qa.invalid','{}','{}');
 insert into public.profiles(id,name) values(uid,'QA owner'),(other_uid,'QA other') on conflict(id) do nothing;
 perform set_config('request.jwt.claim.sub',uid::text,true);
 fid:=(public.create_family('QA close family')->>'family_id')::uuid;
 insert into public.tasks(family_id,title,created_by) values(fid,'QA task',uid);
 insert into public.shopping_items(family_id,title,created_by) values(fid,'QA item',uid);
 blocked:=false;begin perform public.close_single_member_family(fid,'yes');exception when others then blocked:=true;end;
 if not blocked then raise exception 'TEST FAILED: confirmation';end if;
 perform set_config('request.jwt.claim.sub',other_uid::text,true);
 blocked:=false;begin perform public.close_single_member_family(fid,'ENCERRAR');exception when others then blocked:=true;end;
 if not blocked then raise exception 'TEST FAILED: ownership';end if;
 insert into public.family_members(family_id,user_id,role) values(fid,other_uid,'adult');
 perform set_config('request.jwt.claim.sub',uid::text,true);
 blocked:=false;begin perform public.close_single_member_family(fid,'ENCERRAR');exception when others then blocked:=true;end;
 if not blocked then raise exception 'TEST FAILED: multi member';end if;
 delete from public.family_members where family_id=fid and user_id=other_uid;
 perform public.close_single_member_family(fid,'ENCERRAR');
 if exists(select 1 from public.families where id=fid) or exists(select 1 from public.tasks where family_id=fid) or exists(select 1 from public.family_members where family_id=fid) then raise exception 'TEST FAILED: closure cleanup';end if;
 if not exists(select 1 from auth.users where id=uid) or not exists(select 1 from public.profiles where id=uid) then raise exception 'TEST FAILED: account preservation';end if;
 if not exists(select 1 from public.my_pending_family_closures() p where p=fid) then raise exception 'TEST FAILED: durable cleanup';end if;
 perform public.close_single_member_family(fid,'ENCERRAR'); -- idempotent retry
 perform public.family_closure_cleanup(fid,uid,true);
 if exists(select 1 from public.my_pending_family_closures() p where p=fid) then raise exception 'TEST FAILED: completion';end if;
 if has_function_privilege('anon','public.close_single_member_family(uuid,text)','execute') or has_function_privilege('authenticated','public.family_closure_cleanup(uuid,uuid,boolean)','execute') then raise exception 'TEST FAILED: service grants';end if;
end $$;
rollback;
select 'family closure checks passed; fixtures rolled back' as result;
