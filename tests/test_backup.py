import hashlib
import importlib.util
import json
from pathlib import Path
import subprocess
import tempfile
import unittest
import sys
from unittest.mock import patch
from cryptography.exceptions import InvalidTag

ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT/'scripts'))
def module(name):
    spec=importlib.util.spec_from_file_location(name,ROOT/'scripts'/f'{name}.py')
    obj=importlib.util.module_from_spec(spec);spec.loader.exec_module(obj);return obj
backup=module('backup');verifier=module('verify_backup')

class BackupTests(unittest.TestCase):
    def fixture(self,root):
        names=['roles.sql','schema.sql','data.sql','storage-policies.sql']
        for name in names:(root/name).write_text('-- synthetic QA only\n')
        backup.write_json(root/'vault-push.json',[{'name':name,'secret':'synthetic-test-secret'} for name in ['ninho_push_public','ninho_push_private','ninho_push_dispatch']])
        photo=b'synthetic photo bytes';digest=hashlib.sha256(photo).hexdigest()
        (root/'storage').mkdir();(root/'storage'/digest).write_bytes(photo)
        backup.write_json(root/'inventory.json',{'objects':[{'file':'storage/'+digest,'bytes':len(photo),'sha256':digest}]})
        hashes={str(p.relative_to(root)):hashlib.sha256(p.read_bytes()).hexdigest() for p in root.rglob('*') if p.is_file()}
        backup.write_json(root/'manifest.json',{'format':1,'sha256':hashes})

    def test_encrypted_roundtrip_and_corruption(self):
        with tempfile.TemporaryDirectory() as tmp:
            root=Path(tmp)/'payload';root.mkdir();self.fixture(root)
            self.assertEqual(verifier.verify(root),1)
            encrypted=Path(tmp)/'test.enc';phrase='synthetic-test-passphrase-32-characters'
            backup.encrypt_bundle(root,encrypted,phrase)
            self.assertNotIn(b'synthetic photo bytes',encrypted.read_bytes())
            failed_output=Path(tmp)/'wrong.tar.gz'
            with self.assertRaises(InvalidTag):backup.decrypt_file(encrypted,failed_output,'wrong')
            self.assertFalse(failed_output.exists())
            corrupted=Path(tmp)/'damaged.enc';data=bytearray(encrypted.read_bytes());data[40]^=1;corrupted.write_bytes(data)
            with self.assertRaises(InvalidTag):backup.decrypt_file(corrupted,failed_output,phrase)
            self.assertFalse(failed_output.exists())
            (root/'data.sql').write_text('corrupt')
            with self.assertRaises(ValueError):verifier.verify(root)

    def test_path_traversal_is_rejected(self):
        with tempfile.TemporaryDirectory() as tmp:
            root=Path(tmp)/'payload';root.mkdir();self.fixture(root)
            manifest=json.loads((root/'manifest.json').read_text());manifest['sha256']['../outside']='0'*64
            backup.write_json(root/'manifest.json',manifest)
            with self.assertRaises(ValueError):verifier.verify(root)

    def test_sql_policy_preserves_checks_and_quotes_identifiers(self):
        sql=backup.policy_sql([{'schemaname':'storage','tablename':'objects','policyname':'a"b','permissive':'PERMISSIVE','cmd':'UPDATE','roles':['authenticated'],'qual':'owner = auth.uid()','with_check':'owner = auth.uid()'}])
        self.assertIn('"a""b"',sql)
        self.assertIn('USING (owner = auth.uid()) WITH CHECK (owner = auth.uid())',sql)

    def test_full_export_pipeline_with_private_photo(self):
        inventory={'objects':[{'bucket':'task-proofs','name':'family/task/photo.jpg','metadata':{}}],'buckets':[{'id':'task-proofs','public':False}],'proof_paths':['family/task/photo.jpg'],'storage_policies':[],'extensions':[],'cron':[]}
        secrets=[{'name':name,'secret':'synthetic-test-secret'} for name in ['ninho_push_public','ninho_push_private','ninho_push_dispatch']]
        def fake_sql(url,query):
            if 'decrypted_secrets' in query:return secrets
            if 'proof_paths' in query:return inventory
            return [{'name':'tasks','rows':1,'digest':'stable'}]
        def fake_run(command,**kwargs):
            if '--help' in command:return '--schema --data-only --role-only --use-copy'
            Path(command[command.index('--file')+1]).write_text('-- synthetic dump\n')
            return ''
        env={'NINHO_BACKUP_DB_URL':'postgresql://postgres.cspwqboqchwdsknfdakh:test@session.pooler.supabase.com:5432/postgres','NINHO_BACKUP_SERVICE_KEY':'synthetic','NINHO_BACKUP_PASSPHRASE':'synthetic-long-passphrase-32-characters'}
        with tempfile.TemporaryDirectory() as tmp,patch.dict(backup.os.environ,env),patch.object(backup,'sql',side_effect=fake_sql),patch.object(backup,'run',side_effect=fake_run),patch.object(backup.shutil,'which',return_value='/bin/psql'),patch.object(backup,'storage_bytes',return_value=b'private synthetic photo'):
            target=Path(tmp)/'backup.enc';backup.backup(target)
            self.assertTrue(target.is_file());self.assertTrue(Path(str(target)+'.sha256').is_file())
            self.assertNotIn(b'synthetic-test-secret',target.read_bytes())
            archive=Path(tmp)/'verified.tar.gz';backup.decrypt_file(target,archive,env['NINHO_BACKUP_PASSPHRASE'])
            import tarfile
            with tarfile.open(archive) as tar:tar.extractall(Path(tmp)/'restored',filter='data')
            self.assertEqual(verifier.verify(Path(tmp)/'restored/backup'),1)

if __name__=='__main__':unittest.main()
