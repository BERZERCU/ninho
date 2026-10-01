-- Fix ambiguous PL/pgSQL parameter name in complete_task_with_proof.

drop function if exists public.complete_task_with_proof(uuid,text);

create function public.complete_task_with_proof(
  task_id uuid,
  p_proof_path text default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  fid uuid;
  assignee uuid;
  r text;
begin
  if auth.uid() is null then
    raise exception 'Sessão expirada';
  end if;

  select t.family_id,t.assignee_id
  into fid,assignee
  from public.tasks t
  where t.id=task_id;

  if fid is null then
    raise exception 'Tarefa não encontrada';
  end if;

  select private.family_role(fid) into r;

  if r is null then
    raise exception 'Sem acesso à família';
  end if;

  if r='child' and assignee is distinct from auth.uid() then
    raise exception 'Criança só pode concluir tarefas atribuídas a ela';
  end if;

  if p_proof_path is not null then
    if p_proof_path not like fid::text || '/' || task_id::text || '/%' then
      raise exception 'Comprovante inválido';
    end if;

    if not exists (
      select 1
      from storage.objects o
      where o.bucket_id='task-proofs'
        and o.name=p_proof_path
        and o.owner_id=auth.uid()::text
    ) then
      raise exception 'Comprovante não encontrado';
    end if;
  end if;

  update public.tasks
  set done=true,
      proof_path=p_proof_path,
      proof_by=case when p_proof_path is null then null else auth.uid() end,
      proof_at=case when p_proof_path is null then null else now() end,
      updated_at=now()
  where id=task_id;
end
$$;

revoke execute on function public.complete_task_with_proof(uuid,text)
from public, anon;
grant execute on function public.complete_task_with_proof(uuid,text)
to authenticated;
