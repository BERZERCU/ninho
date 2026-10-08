# Contas infantis — QA, 8 outubro 2026

Este branch é exclusivamente de teste: js/config.js aponta para mqpjujirwooqzzirzwrr e não deve ser integrado na produção dessa forma.

O responsável adulto com e-mail confirmado cria até cinco contas por nome/apelido, senha e autorização explícita versionada. A criança entra com código aleatório e senha, sem e-mail próprio. Um identificador interno no domínio reservado .invalid é usado apenas pelo Auth, sem envio de e-mail. A senha não é armazenada no cadastro de responsáveis nem retornada pelas APIs.

O vínculo privado registra conta, responsável, família, data e versão da autorização. Somente endpoints de serviço acessam esse vínculo. Triggers impedem promoção de criança gerenciada, adesão a outras famílias e criação de família própria. O responsável consegue listar somente suas contas, redefinir senha e excluir conta. A remoção do responsável fica bloqueada enquanto houver contas sob sua responsabilidade.

Verificado: sete testes de handlers e testes SQL com rollback passaram no projeto isolado; regressão Push passou. RLS do vínculo privado intencionalmente sem políticas públicas. Durante QA, foram reaplicadas ao projeto restaurado as restrições de EXECUTE existentes em produção (o dump/restauração tinha conservado grants padrão PUBLIC em funções antigas). Não foram lidos valores do Vault nem alteradas permissões em produção.

Ainda precisa: teste real pela interface de criar conta, entrar no dispositivo infantil, redefinir senha, excluir, refresh e dois responsáveis; validação real de CAPTCHA em produção; integração das contas antigas com autorização; procedimento para morte/indisponibilidade do responsável ou perda de sua conta; idade/responsabilidade legal verificadas por mecanismos adequados (checkbox e e-mail confirmado são declarações, não verificação); privacidade infantil e condições de retenção revisadas. A recuperação de senha não promete revogar imediatamente access tokens anteriores.

Antes de promover: restaurar config de produção, aplicar e registrar migration revisada e deploy das duas funções no projeto de produção, retestar o build final. Não habilitar cron, Push ou e-mails de produção neste ambiente de teste.
