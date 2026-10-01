# Ninho — checklist para lançamento público

Atualizado em 01/10/2026.

Este documento separa a v1.0 funcional, que já passou pelo E2E, dos controles adicionais recomendados antes de uma divulgação pública maior.

## Pronto e validado

- [x] E2E real de Admin, Adulto e Criança.
- [x] Cadastro, confirmação de e-mail, login e recuperação de senha.
- [x] SMTP customizado entregando e-mails reais.
- [x] Notificação de senha alterada.
- [x] Exclusão permanente de conta e bloqueio de exclusão do Admin antes da transferência.
- [x] PWA instalado e aberto offline em dispositivo real.
- [x] RLS em todas as tabelas públicas do Ninho.
- [x] Grants explícitos e de menor privilégio na Data API.
- [x] Usuário não autenticado (`anon`) sem grants diretos nas tabelas do Ninho.
- [x] Transferência de Admin protegida no backend: destino precisa ser Adulto.
- [x] RPCs públicas limitadas a `authenticated` e com validações internas de usuário/família/papel.
- [x] Supabase JS fixado em versão exata no frontend.
- [x] Headers básicos de segurança no Vercel.
- [x] CI `Ninho QA` verificando sintaxe JS/JSON e pin da dependência.
- [x] Nenhum `service_role`, secret key ou senha SMTP encontrado no repositório.
- [x] Supabase `ACTIVE_HEALTHY`.
- [x] Edge Function `delete-account` ativa e chamada real concluída com sucesso.
- [x] `Leaked Password Protection` verificado como indisponível no plano Free atual.

## Antes de divulgação pública ampla

- [ ] Ativar CAPTCHA/Cloudflare Turnstile no Supabase Auth. O frontend já envia tokens nos fluxos de cadastro, login, recuperação de senha e reenvio de confirmação; falta cadastrar a Secret Key no Supabase, ativar a proteção e concluir o E2E real.
- [ ] Revisar `Authentication > Rate Limits`. Durante o QA houve respostas `429 over_email_send_rate_limit`; dimensionar o limite de e-mails para o volume esperado.
- [ ] Configurar política de senha no Supabase com mínimo de 8 caracteres ou mais e requisitos adequados ao público do Ninho.
- [ ] Proteger a branch `main` no GitHub/ruleset e exigir os checks `Ninho QA` e Vercel antes de mudanças de produção.
- [ ] Confirmar 2FA/MFA nas contas administrativas do GitHub e Supabase e manter acesso de recuperação seguro.
- [ ] Migrar o remetente temporário Gmail para domínio próprio + provedor transacional antes de uma divulgação maior; configurar SPF, DKIM e DMARC.
- [ ] Fazer revisão jurídica da Política de Privacidade/LGPD e dos textos de exclusão antes de distribuição pública em lojas.
- [ ] Definir estratégia de backup/recuperação e disponibilidade. O projeto está no Supabase Free; avaliar Pro antes de depender do Ninho como serviço público crítico.
- [ ] Fazer um pequeno teste de carga/staging antes de campanha ou pico de cadastros.

## Observações técnicas

O Security Advisor ainda lista as 10 RPCs `SECURITY DEFINER` acessíveis a `authenticated`. Elas são endpoints intencionais do aplicativo; cada uma precisa continuar sendo tratada como API privilegiada, com validação de `auth.uid()`, família e papel no backend. O alerta de leaked password permanece enquanto o projeto estiver no plano Free.

O Performance Advisor reporta apenas índices ainda não utilizados. Com a base atual pequena, isso não é motivo para removê-los; revisar novamente quando houver tráfego real suficiente para produzir estatísticas representativas.

O changelog do Supabase anuncia que, em 30/10/2026, a exposição automática de novas tabelas pela Data API será desativada para projetos existentes. Os grants usados atualmente pelo Ninho já foram tornados explícitos para reduzir o risco dessa mudança.
