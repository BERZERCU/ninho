create or replace function private.log_family_activity()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_family uuid;
  v_entity uuid;
  v_title text := '';
  v_action text;
begin
  if tg_table_name = 'family_members' then
    v_family := case when tg_op='DELETE' then old.family_id else new.family_id end;
    v_entity := case when tg_op='DELETE' then old.user_id else new.user_id end;
    select coalesce(p.name,'Membro') into v_title
    from public.profiles p
    where p.id=v_entity;

    if tg_op='INSERT' then
      v_action := 'member_joined';
    elsif tg_op='DELETE' then
      v_action := 'member_removed';
    elsif old.role is distinct from new.role then
      v_action := 'member_role_changed';
    else
      return new;
    end if;
  else
    v_family := case when tg_op='DELETE' then old.family_id else new.family_id end;
    v_entity := case when tg_op='DELETE' then old.id else new.id end;
    v_title := case when tg_op='DELETE' then old.title else new.title end;

    if tg_op='INSERT' then
      v_action := 'created';
    elsif tg_op='DELETE' then
      v_action := 'deleted';
    else
      v_action := 'updated';
      -- Test the table before touching fields that are absent from events.
      if tg_table_name in ('tasks','shopping_items') then
        if old.done is distinct from new.done then
          v_action := case when new.done then 'completed' else 'reopened' end;
        elsif tg_table_name='tasks' then
          if old.proof_path is distinct from new.proof_path then
            v_action := 'proof_updated';
          end if;
        end if;
      end if;
    end if;
  end if;

  insert into public.family_activity(
    family_id, actor_id, action, entity_type, entity_id, title
  )
  values (
    v_family,
    auth.uid(),
    v_action,
    case tg_table_name
      when 'tasks' then 'task'
      when 'events' then 'event'
      when 'shopping_items' then 'shopping'
      else 'member'
    end,
    v_entity,
    coalesce(v_title,'')
  );

  return case when tg_op='DELETE' then old else new end;
end
$$;
