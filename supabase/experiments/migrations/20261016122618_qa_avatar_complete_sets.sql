-- QA ONLY mqpjujirwooqzzirzwrr: complete sets sold as a single catalog item.
-- Existing pieces, inventory, wallets and chosen custom styles remain intact.
alter table private.qa_avatar_catalog drop constraint qa_avatar_catalog_slot_check;
alter table private.qa_avatar_catalog add constraint qa_avatar_catalog_slot_check check(slot in ('top','hair','accessory','set'));
alter table private.qa_avatar_styles add column set_id text references private.qa_avatar_catalog(id);
create index qa_avatar_styles_set on private.qa_avatar_styles(set_id);
insert into private.qa_avatar_catalog(id,slot,name,price) values
 ('set_lisbon','set','Lisbon',20),('set_jane','set','Patrick Jane',20);
create or replace function public.qa_avatar_state(p_family uuid) returns jsonb
language plpgsql security definer set search_path='' as $$
declare uid uuid; result jsonb;
begin
 uid:=private.qa_avatar_require_family(p_family);perform private.qa_avatar_init(uid);
 select jsonb_build_object(
 'balance',w.balance,'earned',w.earned,'skin',s.skin,'equipped',jsonb_build_object('top',s.top,'hair',s.hair,'accessory',s.accessory,'set',s.set_id),
 'mode',coalesce((select mode from private.qa_avatar_plans where family_id=p_family),(select plan from public.families where id=p_family)),
 'can_simulate',exists(select 1 from public.family_members where family_id=p_family and user_id=uid and role='admin'),
 'catalog',(select jsonb_agg(jsonb_build_object('id',c.id,'slot',c.slot,'name',c.name,'price',c.price,'owned',exists(select 1 from private.qa_avatar_owned o where o.user_id=uid and o.item_id=c.id)) order by c.price,c.id) from private.qa_avatar_catalog c),
 'members',(select jsonb_agg(jsonb_build_object('id',m.user_id,'name',coalesce(p.name,'Membro'),'skin',coalesce(a.skin,'medium'),'equipped',jsonb_build_object('top',coalesce(a.top,'top_sage'),'hair',coalesce(a.hair,'hair_brown'),'accessory',coalesce(a.accessory,'accessory_none'),'set',a.set_id))) from public.family_members m left join public.profiles p on p.id=m.user_id left join private.qa_avatar_styles a on a.user_id=m.user_id where m.family_id=p_family)
 ) into result from private.qa_avatar_wallets w join private.qa_avatar_styles s on s.user_id=w.user_id where w.user_id=uid;
 return result;
end $$;
revoke all on function public.qa_avatar_state(uuid) from public,anon;
grant execute on function public.qa_avatar_state(uuid) to authenticated;


create or replace function public.qa_avatar_equip(p_family uuid,p_item text) returns jsonb
language plpgsql security definer set search_path='' as $$
declare uid uuid; item_slot text;
begin
 uid:=private.qa_avatar_require_family(p_family);perform private.qa_avatar_init(uid);
 select c.slot into item_slot from private.qa_avatar_catalog c join private.qa_avatar_owned o on o.item_id=c.id where o.user_id=uid and c.id=p_item;
 if item_slot is null then raise exception 'Conquiste este item primeiro';end if;
 update private.qa_avatar_styles set top=case when item_slot='top' then p_item else top end,
 hair=case when item_slot='hair' then p_item else hair end,accessory=case when item_slot='accessory' then p_item else accessory end,
 set_id=case when item_slot='set' then p_item else null end where user_id=uid;
 return public.qa_avatar_state(p_family);
end $$;
revoke all on function public.qa_avatar_equip(uuid,text) from public,anon;
grant execute on function public.qa_avatar_equip(uuid,text) to authenticated;
