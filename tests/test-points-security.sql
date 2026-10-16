begin;
do $$
declare a uuid:=extensions.gen_random_uuid();b uuid:=extensions.gen_random_uuid();c uuid:=extensions.gen_random_uuid();o uuid:=extensions.gen_random_uuid();f uuid;t uuid:=extensions.gen_random_uuid();x uuid;blocked boolean;
begin
 insert into auth.users(id,email) values(a,a::text||'@qa.invalid'),(b,b::text||'@qa.invalid'),(c,c::text||'@qa.invalid'),(o,o::text||'@qa.invalid');
 perform set_config('request.jwt.claim.sub',a::text,true);f:=(public.create_family('QA owner test points')->>'family_id')::uuid;
 insert into public.family_members(family_id,user_id,role) values(f,b,'adult'),(f,c,'child');
 insert into private.qa_test_point_users(user_id) values(a);
 insert into public.tasks(id,family_id,title,assignee_id,created_by) values(t,f,'pontos = 100',a,a);
 update public.tasks set done=true where id=t;
 if (select balance from private.qa_avatar_wallets where user_id=a)<>100 then raise exception 'TEST FAILED: test credit';end if;
 if (select points from private.qa_avatar_rewards where task_id=t)<>0 or exists(select 1 from private.qa_challenge_scores where family_id=f) then raise exception 'TEST FAILED: competitive points';end if;
 update public.tasks set done=false where id=t;update public.tasks set done=true where id=t;
 if (select balance from private.qa_avatar_wallets where user_id=a)<>100 then raise exception 'TEST FAILED: repeat credit';end if;
 update public.tasks set done=false,title='pontos = 500' where id=t;update public.tasks set done=true where id=t;
 if (select balance from private.qa_avatar_wallets where user_id=a)<>100 then raise exception 'TEST FAILED: edited command';end if;
 delete from public.tasks where id=t;
 insert into public.tasks(id,family_id,title,assignee_id,created_by) values(t,f,'pontos = 100',a,a);
 update public.tasks set done=true where id=t;
 if (select balance from private.qa_avatar_wallets where user_id=a)<>100 then raise exception 'TEST FAILED: recreated command';end if;
 -- Normal tasks still earn the regular reward, including children's weekly score.
 x:=extensions.gen_random_uuid();insert into public.tasks(id,family_id,title,assignee_id,created_by) values(x,f,'Normal task',c,a);update public.tasks set done=true where id=x;
 if (select balance from private.qa_avatar_wallets where user_id=c)<>1 or (select points from private.qa_challenge_scores where family_id=f and user_id=c)<>1 then raise exception 'TEST FAILED: normal child reward';end if;
 -- Even owner commands cannot credit children.
 x:=extensions.gen_random_uuid();insert into public.tasks(id,family_id,title,assignee_id,created_by) values(x,f,'pontos = 100',c,a);
 blocked:=false;begin update public.tasks set done=true where id=x;exception when others then blocked:=true;end;
 if not blocked then raise exception 'TEST FAILED: assigned child command';end if;
 -- Other adults cannot opt in through editable metadata or profiles.
 perform set_config('request.jwt.claim.sub',b::text,true);update auth.users set raw_user_meta_data=jsonb_build_object('email',a::text||'@qa.invalid','admin',true) where id=b;
 x:=extensions.gen_random_uuid();insert into public.tasks(id,family_id,title,assignee_id,created_by) values(x,f,'pontos = 100',b,b);
 blocked:=false;begin update public.tasks set done=true where id=x;exception when others then blocked:=true;end;
 if not blocked then raise exception 'TEST FAILED: unauthorized adult';end if;
 perform set_config('request.jwt.claim.sub',a::text,true);
 foreach x in array array[extensions.gen_random_uuid(),extensions.gen_random_uuid()] loop
  insert into public.tasks(id,family_id,title,assignee_id,created_by) values(x,f,case when not exists(select 1 from public.tasks where family_id=f and title='pontos = 0') then 'pontos = 0' else 'pontos = 100001' end,a,a);
  blocked:=false;begin update public.tasks set done=true where id=x;exception when others then blocked:=true;end;
  if not blocked then raise exception 'TEST FAILED: range limit';end if;
 end loop;
 if has_table_privilege('authenticated','private.qa_test_point_users','insert') or has_table_privilege('authenticated','private.qa_test_point_credits','insert') then raise exception 'TEST FAILED: public test grants';end if;
 if (select count(*) from private.qa_test_point_credits where family_id=f)<>1 then raise exception 'TEST FAILED: audit ledger';end if;
end $$;
rollback;
select 'owner test point checks passed' as result;
