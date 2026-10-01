# Ninho — backup e recuperação

Status em 01/10/2026: rotina preparada; credenciais, primeira execução real e ensaio de restauração PENDENTES. Não considerar o backup operacional até concluir os três.

## Cobertura e metas

- Exportação diária às 03:17 de Brasília (06:17 UTC); o agendamento do GitHub pode atrasar. Retenção configurada em 30 dias, limitada também pelas políticas/quota de Actions da conta.
- Banco: papéis customizados, esquema public/private, dados public/private/auth, histórico de migrations, políticas customizadas de Storage.
- Arquivos: conteúdo de TODOS os objetos de Storage, manifesto de buckets e hash SHA-256 por arquivo. O banco sozinho não contém as fotos.
- Push: as três chaves do Vault são incluídas dentro do pacote criptografado. A fila transitória de entregas fica excluída para evitar repetir notificações durante a recuperação.
- AES-256-GCM autenticado e derivação de chave scrypt, com senha fornecida pelo administrador; só o arquivo .enc e seu checksum são enviados ao GitHub Actions. SQL, fotos e chaves permanecem temporariamente no runner e são descartados.
- Meta inicial de perda máxima: aproximadamente 24 horas, desde que o backup diário esteja saudável. Tempo de recuperação ainda não medido: depende do primeiro ensaio.
- Não estão incluídos: senha SMTP/Gmail, segredo Turnstile, configurações do painel Auth, chaves de API, DNS e credenciais administrativas. Guardar essas informações em um gerenciador de senhas, separado do backup.
- O snapshot do banco é consistente durante cada dump. Antes/depois comparamos as tabelas do aplicativo e auth.users; mudanças durante a janela fazem a rotina falhar. Fazer a primeira execução em horário de pouco uso e verificar fotos. Não substitui PITR.

## Ativar com segurança

1. No repositório BERZERCU/ninho, abrir **Settings → Secrets and variables → Actions → Secrets**.
2. Criar três Repository secrets (nunca colar os valores em chat, código, issues ou prints):

| Nome | Valor |
|---|---|
| NINHO_BACKUP_DB_URL | Connection string do Ninho em Supabase → Connect → Session pooler, porta 5432, com a senha de banco percent-encoded. Usar TLS. |
| NINHO_BACKUP_SERVICE_KEY | Chave secret/service_role do projeto, usada apenas no runner para ler arquivos privados. Não usar anon/publishable. |
| NINHO_BACKUP_PASSPHRASE | Senha aleatória de pelo menos 32 caracteres sem quebras de linha; guardar cópia em gerenciador de senhas. Sem ela os backups são irrecuperáveis. |

3. Revisar administradores do GitHub, confirmar 2FA e proteger main antes de habilitar secrets de produção em Actions. Alterações maliciosas no workflow podem acessar secrets; restringir quem pode mudar o código.
4. Abrir **Actions → Ninho encrypted backup → Run workflow**, escolhendo main. Conferir execução verde e artefato `ninho-encrypted-backup-<run_id>`. Uma execução apenas ignorada/skipped não é backup.
5. Baixar o artefato. Verificar checksum e integridade com a senha correta conforme abaixo; não extrair em pasta pública/sincronizada.
6. Somente após a primeira execução validada, em **Variables** criar `NINHO_BACKUP_ENABLED` com valor `true`. Até então o agendamento fica desabilitado; o disparo manual continua disponível.
7. Ativar alertas do GitHub Actions para workflows com falha e conferir diariamente a última execução concluída. Os logs não exibem dados nem valores de credenciais.

O destino inicial é o artefato criptografado do GitHub Actions, fora do Supabase. Manter também uma cópia criptografada independente e a senha fora do GitHub protege contra perda da conta do GitHub. Mudanças na senha não recriptografam backups antigos: conservar as senhas antigas até terminar a retenção correspondente.

## Verificar uma cópia

Em um computador confiável com Python, entrar na pasta baixada:

```sh
sha256sum -c ninho-backup.tar.gz.enc.sha256
python3 -m pip install -r scripts/requirements-backup.txt
python3 scripts/backup_crypto.py ninho-backup.tar.gz.enc ninho-backup.tar.gz
tar -xzf ninho-backup.tar.gz
python3 scripts/verify_backup.py backup
```

O script solicita a senha localmente e só libera a saída depois de autenticar o arquivo inteiro. Conferir todos os hashes prova a integridade do pacote; não prova a capacidade de restauração. Apagar os arquivos descriptografados quando terminar.

## Primeiro ensaio de recuperação — projeto separado

Não restaurar nem resetar a produção para testar. Usar projeto Supabase de teste vazio, na mesma versão principal de Postgres/Auth/Storage. A criação de projeto/plano pago exige escolha explícita do administrador.

1. Validar o pacote e anotar commit, horário, contagens e extensões no manifesto.
2. Habilitar as extensões necessárias no destino antes da importação, especialmente pg_net, pg_cron e Vault. Manter qualquer cron/worker de Push desligado durante TODO o ensaio.
3. Revisar `schema.sql`: `private.kick_push` contém URL do projeto original. Substituir essa URL pela do destino na definição da função antes de importar. Nunca deixar a restauração de teste chamar produção.
4. Seguir a ordem oficial: roles.sql, schema.sql, data.sql, em uma transação, com ON_ERROR_STOP=1 e triggers desativados durante a carga. Antes do schema, revogar defaults de tabelas públicas para anon/authenticated; confirmar grants e RLS depois. Rodar apenas no destino vazio, conferindo cuidadosamente a connection string.

```sh
# NINHO_RESTORE_DB_URL aponta SOMENTE para o projeto separado escolhido.
psql "$NINHO_RESTORE_DB_URL" --single-transaction --variable ON_ERROR_STOP=1 \
  --command 'ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON TABLES FROM anon, authenticated' \
  --file backup/roles.sql --file backup/schema.sql \
  --command 'SET session_replication_role = replica' --file backup/data.sql \
  --command 'SET session_replication_role = origin' \
  --command 'UPDATE public.push_subscriptions SET enabled = false'
```

5. Usar inventory.json para recriar buckets com o mesmo id, privacidade, limite e tipos permitidos. Reenviar cada arquivo pelo Storage API, usando bucket/nome original e o conteúdo apontado por `file`; validar SHA-256. Não escrever diretamente em storage.objects: o upload deve passar pelo Storage API.
6. Reaplicar storage-policies.sql no destino após recriar buckets. Conferir isolamento entre famílias e permissões de upload/leitura/exclusão.
7. Recriar as três chaves de vault-push.json usando vault.create_secret no destino, em sessão segura. Nunca copiar somente o ciphertext de vault.secrets: a chave de criptografia do projeto pode ser diferente.
8. Reconfigurar Auth, URLs permitidas, SMTP e CAPTCHA usando registros seguros; redeployar as Edge Functions e frontend do commit identificado no manifesto com URL/chave pública do destino. Não habilitar SMTP/Push de teste para usuários reais.
9. Conferir contagens/dados, login de uma conta de teste, recuperação de senha controlada, acesso das três funções familiares e abertura de foto. Realtime publications e cron exigem verificação/recriação específica; conferir o agendamento `ninho-push-retry` apenas quando apropriado ao destino.
10. Medir duração, registrar diferenças e corrigir o procedimento. Só marcar **restauração validada** após o ensaio passar; hashes sozinhos não bastam.

## Em um incidente real

Preservar evidências e uma cópia do estado atual. Selecionar o backup anterior ao incidente, verificar integridade, restaurar primeiro no destino isolado e conferir autorização/RLS/Storage. Planejar a troca de configuração de produção e comunicar eventual indisponibilidade pelo canal aprovado. Reativar cron e inscrições Push somente após validação; nunca reproduzir a fila antiga de notificações. Se houve vazamento de credenciais, rotacioná-las de forma coordenada.

## Evidência atual

- Testes locais com conteúdo sintético: criptografia/descriptografia, senha incorreta, detecção de arquivo alterado, rejeição de caminho fora do pacote e preservação das condições de políticas de Storage.
- Exportação real: pendente de credentials nos Repository secrets.
- Backup automático: desabilitado até definir NINHO_BACKUP_ENABLED=true.
- Ensaio de restauração: pendente, sem alterações na produção.

Referências oficiais:
- https://supabase.com/docs/guides/platform/backups
- https://supabase.com/docs/guides/platform/migrating-within-supabase/backup-restore
- https://supabase.com/docs/reference/cli/supabase-db-dump
