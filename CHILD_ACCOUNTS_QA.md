# Contas infantis — QA, 8 outubro 2026

Este branch é exclusivamente de teste: js/config.js aponta para mqpjujirwooqzzirzwrr e não deve ser integrado na produção dessa forma.

O responsável adulto com e-mail confirmado cria até cinco contas por nome/apelido, senha e autorização explícita versionada. A criança entra com código aleatório e senha, sem e-mail próprio. Um identificador interno no domínio reservado .invalid é usado apenas pelo Auth, sem envio de e-mail. A senha não é armazenada no cadastro de responsáveis nem retornada pelas APIs.

O vínculo privado registra conta, responsável, família, data e versão da autorização. Somente endpoints de serviço acessam esse vínculo. Triggers impedem promoção de criança gerenciada, adesão a outras famílias e criação de família própria. O responsável consegue listar somente suas contas, redefinir senha e excluir conta. A remoção do responsável fica bloqueada enquanto houver contas sob sua responsabilidade.

Verificado: sete testes de handlers e testes SQL com rollback passaram no projeto isolado; regressão Push passou. Smoke test de API real passou: responsável cria conta, criança entra por código, role/convite restritos, reset rejeita senha antiga e aceita nova, exclusão impede novo login. Dados temporários desse smoke test foram removidos e a contagem final foi zero. RLS do vínculo privado intencionalmente sem políticas públicas. Durante QA, foram reaplicadas ao projeto restaurado as restrições de EXECUTE existentes em produção (o dump/restauração tinha conservado grants padrão PUBLIC em funções antigas). Não foram lidos valores do Vault nem alteradas permissões em produção.

Preview publicado com sucesso e static-checks aprovado. Conferência visual bloqueada pela proteção Vercel: conexão atual não autoriza projeto ninho-app (prj_BFRwxYsHo5FGamX1CHE9VJw5jdI0). Nenhuma proteção foi desativada.

Ainda precisa: refresh e isolamento entre dois responsáveis; validação real de CAPTCHA em produção; integração das contas antigas com autorização; procedimento para morte/indisponibilidade do responsável ou perda de sua conta; idade/responsabilidade legal verificadas por mecanismos adequados (checkbox e e-mail confirmado são declarações, não verificação); privacidade infantil e condições de retenção revisadas. A recuperação de senha não promete revogar imediatamente access tokens anteriores.

Antes de promover: restaurar config de produção, aplicar e registrar migration revisada e deploy das duas funções no projeto de produção, retestar o build final. Não habilitar cron, Push ou e-mails de produção neste ambiente de teste.

## Teste guiado pela interface — 8 outubro 2026

O usuário confirmou os resultados na versão de teste:

- Opção Contas infantis apareceu; criação de Criança Teste retornou código.
- Login por código e senha abriu a família com papel Criança.
- Concluiu a própria tarefa; tarefa do responsável bloqueada; botão de criar tarefa oculto.
- Recuperação pelo responsável: senha antiga rejeitada e nova aceita após sair.
- Exclusão: conta infantil deixou de aparecer entre membros e novo login foi bloqueado.

Esses resultados foram informados pelo usuário durante teste guiado; não são observações diretas do navegador do agente. A conexão Vercel continua bloqueando o acesso do agente. Não houve publicação em produção. Não foram confirmados refresh, isolamento entre dois responsáveis, revogação imediata de uma sessão já aberta ou limpeza das tarefas fictícias criadas pelo usuário.
