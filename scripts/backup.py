"""Read-only Supabase export. Only the encrypted bundle may leave the runner."""
import argparse
import datetime as dt
import hashlib
import json
import os
from pathlib import Path
import shutil
import subprocess
import tarfile
import tempfile
import urllib.parse
import urllib.request
from backup_crypto import encrypt_file,decrypt_file

SOURCE_REF = 'cspwqboqchwdsknfdakh'
CLI = ['npx', '--yes', 'supabase@2.119.0']
TABLES = ['events','families','family_activity','family_members','family_snapshots','profiles','push_subscriptions','shopping_items','tasks']

class BackupError(Exception):
    pass

def run(command, *, stdin=None, env=None, label='command'):
    result = subprocess.run(command, input=stdin, text=True, capture_output=True, env=env, timeout=1800)
    if result.returncode:
        # Tool stderr may contain connection strings. Keep logs free of credentials/data.
        diagnostic = 'check credentials, network and tool versions'
        stderr = result.stderr.lower()
        for marker, message in [
            ('unsupported startup parameter', 'pooler rejected a startup parameter'),
            ('no password supplied', 'database connection has no usable password'),
            ('maxclients', 'pooler session connection limit reached'),
            ('wrong password', 'database password rejected; check password and URI encoding'),
            ('authentication error', 'pooler authentication failed; check database password, project user and pooler address'),
            ('authentication failed', 'database authentication failed; check database password and project user'),
            ('invalid connection option', 'database connection URL contains an invalid connection option'),
            ('missing "="', 'database connection URL format was not recognized'),
            ('password authentication failed', 'database password rejected; check password and URI encoding'),
            ('tenant or user not found', 'pooler project/user not found; recopy the project Session pooler URL'),
            ('could not translate host name', 'database hostname could not be resolved'),
            ('connection timed out', 'database network connection timed out'),
            ('connection refused', 'database server refused the connection'),
            ('invalid percent-encoded token', 'database URL contains invalid password percent encoding'),
            ('invalid uri query parameter', 'database URL contains an invalid query parameter'),
            ('ssl', 'database TLS connection failed'),
        ]:
            if marker in stderr:
                diagnostic = message
                break
        if diagnostic == 'check credentials, network and tool versions':
            # Emit only fixed vocabulary, never arbitrary stderr or credential substrings.
            vocabulary = ['reset by peer', 'reset', 'peer', 'eof', 'end of file', 'terminated', 'broken pipe',
                'gssapi', 'fe_sendauth', 'synchronization', 'socket', 'resource', 'temporary',
                'service', 'failure', 'failed', 'error', 'no such', 'file', 'directory',
                'cannot', 'couldn', 'not', 'support', 'access', 'connect', 'refuse',
                'fatal', 'password', 'authentication', 'sasl', 'scram', 'tenant', 'user',
                'database', 'does not exist', 'connection', 'server', 'closed', 'unexpectedly',
                'timeout', 'timed out', 'resolve', 'name', 'address', 'network', 'unreachable',
                'refused', 'certificate', 'ssl', 'tls', 'invalid', 'port', 'integer',
                'option', 'parameter', 'unsupported', 'circuit breaker', 'upstream',
                'permission', 'denied', 'pg_hba', 'no password', 'no route', 'could not',
                'remaining', 'reserved', 'too many', 'maxclients', 'not found']
            matches = [word for word in vocabulary if word in stderr]
            diagnostic += '; safe error keywords: ' + ', '.join(matches or ['none'])
        raise BackupError(f'{label} failed (exit {result.returncode}); {diagnostic}')
    return result.stdout

def sql(db_url, query):
    env = {**os.environ, 'PGDATABASE':db_url, 'PGSSLMODE':'require', 'PGOPTIONS':''}
    return json.loads(run(['psql','-X','-q','-A','-t','-v','ON_ERROR_STOP=1'],stdin="SET default_transaction_read_only=on; SET statement_timeout=120000;\n"+query,env=env,label='database inventory'))

def fingerprint_query():
    parts = [f"SELECT '{t}' AS name,count(*) AS rows,md5(coalesce(string_agg(md5(to_jsonb(x)::text),'' ORDER BY to_jsonb(x)::text),'')) AS digest FROM public.{t} x" for t in TABLES]
    parts.append("SELECT 'auth.users',count(*),md5(coalesce(string_agg(md5(to_jsonb(x)::text),'' ORDER BY id),'')) FROM auth.users x")
    return "SELECT jsonb_agg(to_jsonb(t) ORDER BY name) FROM ("+' UNION ALL '.join(parts)+") t;"

def write_json(path, value):
    path.write_text(json.dumps(value,ensure_ascii=False,indent=2)+'\n')

def quoted_identifier(value):
    return '"'+value.replace('"','""')+'"'

def policy_sql(policies):
    lines=[]
    for p in policies:
        target=quoted_identifier(p['schemaname'])+'.'+quoted_identifier(p['tablename'])
        name=quoted_identifier(p['policyname'])
        roles=', '.join('PUBLIC' if role=='public' else quoted_identifier(role) for role in p['roles'])
        statement=f'CREATE POLICY {name} ON {target} AS {p["permissive"]} FOR {p["cmd"]} TO {roles}'
        if p.get('qual'):statement+=' USING ('+p['qual']+')'
        if p.get('with_check'):statement+=' WITH CHECK ('+p['with_check']+')'
        lines.extend([f'DROP POLICY IF EXISTS {name} ON {target};',statement+';'])
    return '\n'.join(lines)+'\n'

def storage_bytes(project_url, key, bucket, name):
    path = urllib.parse.quote(bucket,safe='')+'/'+urllib.parse.quote(name,safe='/')
    request = urllib.request.Request(project_url+'/storage/v1/object/'+path,headers={'apikey':key,'Authorization':'Bearer '+key})
    try:
        with urllib.request.urlopen(request,timeout=90) as response:
            return response.read()
    except Exception:
        raise BackupError('A Storage download failed; no partial backup will be published') from None

def encrypt_bundle(payload, output, passphrase):
    output = Path(output)
    output.parent.mkdir(parents=True,exist_ok=True)
    with tempfile.TemporaryDirectory(prefix='ninho-encrypt-') as tmp:
        archive = Path(tmp)/'backup.tar.gz'
        with tarfile.open(archive,'w:gz') as tar:
            tar.add(payload,arcname='backup')
        encrypt_file(archive,output,passphrase)
        # Decrypt and compare the entire compressed bundle before accepting it.
        check = Path(tmp)/'check.tar.gz'
        decrypt_file(output,check,passphrase)
        if hashlib.sha256(check.read_bytes()).digest()!=hashlib.sha256(archive.read_bytes()).digest():
            output.unlink(missing_ok=True)
            raise BackupError('Encrypted bundle verification failed')

def backup(output):
    required = ['NINHO_BACKUP_DB_URL','NINHO_BACKUP_SERVICE_KEY','NINHO_BACKUP_PASSPHRASE']
    if any(not os.environ.get(name) for name in required):
        raise BackupError('Configure the three NINHO_BACKUP_* repository secrets before running')
    db_url,key,passphrase = [os.environ[name] for name in required]
    if len(passphrase)<32 or '\n' in passphrase or '\r' in passphrase:
        raise BackupError('The backup passphrase must have at least 32 characters and no line breaks')
    parsed = urllib.parse.urlparse(db_url)
    if parsed.scheme not in ('postgres','postgresql') or not parsed.hostname or SOURCE_REF not in (parsed.hostname+' '+urllib.parse.unquote(parsed.username or '')):
        raise BackupError('Use the Ninho project direct/session-pooler Postgres connection string')
    if not shutil.which('psql'):
        raise BackupError('Install the PostgreSQL client')
    project_url = 'https://'+SOURCE_REF+'.supabase.co'
    started = dt.datetime.now(dt.timezone.utc).isoformat()
    with tempfile.TemporaryDirectory(prefix='ninho-backup-') as tmp:
        root = Path(tmp);payload=root/'payload';payload.mkdir(mode=0o700)
        work=root/'cli';(work/'supabase').mkdir(parents=True)
        (work/'supabase/config.toml').write_text('project_id = "ninho-backup"\n')
        # Discover flags on the exact pinned CLI before using them.
        help_text=run(CLI+['db','dump','--help'],label='Supabase CLI help')
        if any(flag not in help_text for flag in ['--schema','--data-only','--role-only','--use-copy']):
            raise BackupError('Supabase CLI flags changed; review the backup script')
        before=sql(db_url,fingerprint_query())
        inventory=sql(db_url,"SELECT jsonb_build_object('buckets',(SELECT coalesce(jsonb_agg(to_jsonb(b)),'[]') FROM storage.buckets b),'objects',(SELECT coalesce(jsonb_agg(jsonb_build_object('bucket',bucket_id,'name',name,'metadata',metadata) ORDER BY bucket_id,name),'[]') FROM storage.objects),'proof_paths',(SELECT coalesce(jsonb_agg(proof_path),'[]') FROM public.tasks WHERE proof_path IS NOT NULL),'storage_policies',(SELECT coalesce(jsonb_agg(to_jsonb(p)),'[]') FROM pg_policies p WHERE schemaname='storage'),'extensions',(SELECT jsonb_agg(extname) FROM pg_extension),'cron',(SELECT coalesce(jsonb_agg(jsonb_build_object('name',jobname,'schedule',schedule,'command',command,'active',active)),'[]') FROM cron.job));")
        for name,flags in [('roles.sql',['--role-only']),('schema.sql',['--schema','public,private']),('data.sql',['--data-only','--use-copy','--schema','public,private,auth,supabase_migrations','--exclude','private.push_deliveries'])]:
            run(CLI+['--workdir',str(work),'db','dump','--db-url',db_url,'--file',str(payload/name)]+flags,label=name)
            if not (payload/name).is_file():
                raise BackupError('A database dump was not created')
        secrets=sql(db_url,"SELECT coalesce(jsonb_agg(jsonb_build_object('name',name,'secret',decrypted_secret)),'[]') FROM vault.decrypted_secrets WHERE name IN ('ninho_push_public','ninho_push_private','ninho_push_dispatch');")
        if len(secrets)!=3:
            raise BackupError('The three Push secrets must be present in Vault')
        write_json(payload/'vault-push.json',secrets)
        (payload/'storage-policies.sql').write_text(policy_sql(inventory['storage_policies']))
        files=[]
        for obj in inventory['objects']:
            # Hash filenames to prevent traversal from object names or bucket names.
            blob=storage_bytes(project_url,key,obj['bucket'],obj['name'])
            digest=hashlib.sha256(blob).hexdigest()
            relative='storage/'+digest
            path=payload/relative;path.parent.mkdir(exist_ok=True);path.write_bytes(blob)
            files.append({**obj,'file':relative,'bytes':len(blob),'sha256':digest})
        available={obj['name'] for obj in files if obj['bucket']=='task-proofs'}
        if any(name not in available for name in inventory['proof_paths']):
            raise BackupError('A referenced task photo is missing from Storage')
        if before!=sql(db_url,fingerprint_query()):
            raise BackupError('Application data changed during export. Retry during a quiet period')
        inventory['objects']=files
        write_json(payload/'inventory.json',inventory)
        checksums={str(p.relative_to(payload)):hashlib.sha256(p.read_bytes()).hexdigest() for p in payload.rglob('*') if p.is_file()}
        write_json(payload/'manifest.json',{'format':1,'project_ref':SOURCE_REF,'started_at':started,'completed_at':dt.datetime.now(dt.timezone.utc).isoformat(),'commit':os.environ.get('GITHUB_SHA'),'cli_version':'2.119.0','row_fingerprints':before,'sha256':checksums,'limitations':['SMTP, Turnstile secrets, Auth dashboard settings and API keys require separate secure recovery records','No automatic restore; first restoration drill still required','Pending Push deliveries are deliberately excluded']})
        encrypt_bundle(payload,output,passphrase)
    Path(str(output)+'.sha256').write_text(hashlib.sha256(Path(output).read_bytes()).hexdigest()+'  '+Path(output).name+'\n')
    print('Encrypted backup created and verified. No plaintext uploaded.')

if __name__=='__main__':
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--output',default='backup-output/ninho-backup.tar.gz.enc')
    args=parser.parse_args()
    os.umask(0o077)
    if Path(args.output).exists():
        raise SystemExit('Output already exists. Choose a new path; existing backups are never overwritten.')
    try:
        backup(args.output)
    except BackupError as error:
        Path(args.output).unlink(missing_ok=True)
        raise SystemExit('Backup failed: '+str(error))
    except subprocess.TimeoutExpired:
        Path(args.output).unlink(missing_ok=True)
        raise SystemExit('Backup timed out. No backup is accepted; rerun during a quiet period.')
