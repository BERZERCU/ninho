# Monitoramento do Ninho

Workflow: `.github/workflows/monitor.yml` (Ninho health monitor). Verifica a produção a cada 15 minutos previstos, podendo haver atraso do GitHub. Manual: Actions → Ninho health monitor → Run workflow.

Verificações: HTML e scripts essenciais, configuração publicada de produção, Supabase Auth, Data API/banco (aceita bloqueio SQL 42501 esperado para perfis anônimos), endpoint público VAPID, última execução de backup não ignorada, sucesso há no máximo 36h e artefato criptografado não expirado/não vazio. Não lê dados de usuários, não usa service_role/senha de banco e não envia notificações Push.

Resultados ficam em Summary e logs estruturados com nome da checagem, duração e categoria de falha. Falhas deixam o workflow vermelho. GitHub Settings → Notifications → System → Actions: habilitar Email/On GitHub e Only notify for failed workflows; conferir assinatura/watch do repositório e testar recebimento. A entrega depende dessas preferências; ainda não foi confirmada pelo administrador.

IMPORTANTE: `NINHO_BACKUP_ENABLED=true` deve existir em Settings → Secrets and variables → Actions → Variables, como Repository variable. Um Secret de mesmo nome não habilita o cron nem o monitor.

Limites: não captura erros JavaScript de usuários, não valida login real, entrega de e-mail/Push, Realtime ponta a ponta ou restauração. Os testes E2E e ensaio de recuperação continuam necessários. Se o GitHub estiver indisponível, o monitor pode não executar/notificar; não há garantia de detecção em 15min. Avaliar futuramente error tracking e um monitor externo independente.
