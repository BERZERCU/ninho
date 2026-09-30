# Ninho — checklist de lançamento

Atualizado em 30/09/2026.

## Já validado

- [x] Aplicação inicializa sem erro de sintaxe.
- [x] Deploy mais recente no Vercel com status `success`.
- [x] GitHub `main` sincronizado com as migrations aplicadas no Supabase.
- [x] Supabase em estado `ACTIVE_HEALTHY`.
- [x] RLS habilitado nas tabelas expostas.
- [x] Criança não pode criar, editar ou excluir conteúdo compartilhado.
- [x] Criança só pode concluir tarefa atribuída a ela.
- [x] Criança pode marcar item de compras.
- [x] Criança não recebe o código de convite da família.
- [x] Adulto pode criar, editar e excluir conteúdo compartilhado.
- [x] Adulto não pode administrar papéis da família.
- [x] Admin pode administrar membros e papéis.
- [x] Transferência de administração validada no backend.
- [x] Remoção de membro validada no backend.
- [x] Isolamento de membros por família validado.
- [x] Realtime configurado para tarefas, eventos, compras e membros.
- [x] Agenda mostra eventos do mês selecionado.
- [x] Edição e exclusão de tarefas, compromissos e compras implementadas.
- [x] Botões Ajuda e Privacidade funcionais.
- [x] Ninho+ marcado explicitamente como recurso em desenvolvimento e sem cobrança.
- [x] Política pública de privacidade disponível em `privacy.html`.
- [x] PWA possui ícones PNG 192x192, 512x512 e Apple Touch Icon 180x180.
- [x] Manifest referencia ícones PNG e SVG.
- [x] Service Worker atualizado para `ninho-mobile-v24`.
- [x] Shell, manifest, política e ícones incluídos no cache do PWA.
- [x] Helper interno `is_family_member` movido do schema público para `private`.
- [x] Dados temporários `QA E2E` removidos.
- [x] Nenhuma Criança temporária permaneceu na família real.

## Testes finais que dependem de ambiente real

- [x] Instalar o Ninho em um celular e confirmar ícone, nome e abertura em modo standalone.
- [x] Fechar e reabrir o PWA instalado.
- [x] Abrir o PWA sem internet e confirmar que a interface carregada em cache aparece.
- [x] Fazer recuperação de senha real: solicitar e-mail, abrir link e definir nova senha.
- [x] Confirmar login com a nova senha.
- [x] E2E visual em sessões reais cobrindo os perfis Admin, Adulto e Criança.
- [x] Pela interface: convite/reentrada, mudança de papel, transferência de Admin e remoção de membro.
- [x] Pela interface: criar/editar/excluir tarefa, compromisso e compra, validar persistência e confirmar sincronização entre sessões.
- [x] Pela interface: confirmar controles ocultos e limitações da Criança.
- [ ] Habilitar `Leaked Password Protection` no Supabase Auth, se disponível no plano atual.

## Critério para v1.0

Os gates funcionais da v1.0 foram concluídos sem bloqueantes. `Leaked Password Protection` permanece como hardening manual recomendado no Supabase Auth, condicionado à disponibilidade no plano atual.
