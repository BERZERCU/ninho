# Ninho — checklist de lançamento

Atualizado em 01/10/2026.

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
- [x] Transferência de administração validada no backend e pela interface real.
- [x] Remoção de membro validada no backend e pela interface real.
- [x] Isolamento de membros por família validado.
- [x] Realtime configurado e validado para tarefas, eventos, compras e membros.
- [x] Agenda mostra eventos do mês selecionado.
- [x] Edição e exclusão de tarefas, compromissos e compras implementadas e validadas.
- [x] Botões Ajuda e Privacidade funcionais.
- [x] Ninho+ marcado explicitamente como recurso em desenvolvimento e sem cobrança.
- [x] Política pública de privacidade disponível em `privacy.html`.
- [x] Página pública de instruções de exclusão disponível em `delete-account.html`.
- [x] Exclusão de conta validada E2E: exclusão pela interface, logout automático e login posterior bloqueado.
- [x] SMTP customizado configurado e entrega real de e-mail validada.
- [x] Template de confirmação de cadastro personalizado e validado em e-mail real.
- [x] Confirmação de e-mail abre a produção e permite login.
- [x] Template de recuperação de senha personalizado e validado em e-mail real.
- [x] Recuperação de senha real concluída e login com a nova senha validado.
- [x] Notificação `Password changed` ativada e recebida após alteração real de senha.
- [x] Template de alteração de e-mail personalizado no Supabase.
- [x] PWA possui ícones PNG 192x192, 512x512 e Apple Touch Icon 180x180.
- [x] Manifest referencia ícones PNG e SVG.
- [x] Service Worker atualizado para `ninho-mobile-v27`.
- [x] Shell, manifest, política, instruções de exclusão e ícones incluídos no cache do PWA.
- [x] Helper interno `is_family_member` movido do schema público para `private`.
- [x] Dados temporários `QA E2E` removidos.
- [x] Nenhuma Criança temporária permaneceu na família real.

## Testes finais em ambiente real

- [x] Instalar o Ninho em um celular e confirmar ícone, nome e abertura em modo standalone.
- [x] Fechar e reabrir o PWA instalado.
- [x] Abrir o PWA sem internet e confirmar que a interface carregada em cache aparece.
- [x] E2E visual em sessões reais cobrindo os perfis Admin, Adulto e Criança.
- [x] Pela interface: convite/reentrada, mudança de papel, transferência de Admin e remoção de membro.
- [x] Pela interface: criar/editar/excluir tarefa, compromisso e compra, validar persistência e confirmar sincronização entre sessões.
- [x] Pela interface: confirmar controles ocultos e limitações da Criança.
- [x] Cadastro externo: receber confirmação, confirmar endereço e entrar.
- [x] Recuperação externa: receber e-mail, definir nova senha, entrar e receber aviso de senha alterada.
- [x] Exclusão de conta de teste: excluir, encerrar sessão e confirmar que as credenciais antigas não autenticam mais.
- [ ] Habilitar `Leaked Password Protection` no Supabase Auth, se disponível no plano atual.

## Critério para v1.0

Os gates funcionais da v1.0 foram concluídos sem bloqueantes. Os fluxos reais de cadastro, confirmação, recuperação de senha, notificação de alteração de senha e exclusão de conta também foram validados. `Leaked Password Protection` permanece como hardening manual recomendado no Supabase Auth, condicionado à disponibilidade no plano atual.
