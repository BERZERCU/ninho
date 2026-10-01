"""Verify a locally DECRYPTED backup without restoring or connecting to any database."""
import argparse
import hashlib
import json
from pathlib import Path

def verify(root):
    root=Path(root).resolve()
    manifest=json.loads((root/'manifest.json').read_text())
    if manifest.get('format')!=1:
        raise ValueError('Unknown backup format')
    for name,expected in manifest['sha256'].items():
        path=(root/name).resolve()
        if not path.is_relative_to(root) or not path.is_file() or path.is_symlink():
            raise ValueError('Missing or unsafe backup file')
        if hashlib.sha256(path.read_bytes()).hexdigest()!=expected:
            raise ValueError('Backup integrity mismatch')
    inventory=json.loads((root/'inventory.json').read_text())
    for item in inventory['objects']:
        path=(root/item['file']).resolve()
        if not path.is_relative_to(root) or not path.is_file() or len(path.read_bytes())!=item['bytes']:
            raise ValueError('Storage file missing or wrong size')
        if hashlib.sha256(path.read_bytes()).hexdigest()!=item['sha256']:
            raise ValueError('Photo checksum mismatch')
    for required in ['roles.sql','schema.sql','data.sql','storage-policies.sql','vault-push.json','inventory.json']:
        if required not in manifest['sha256']:
            raise ValueError('Required component missing')
    secrets=json.loads((root/'vault-push.json').read_text())
    if {s['name'] for s in secrets}!={'ninho_push_public','ninho_push_private','ninho_push_dispatch'}:
        raise ValueError('Push secrets missing')
    return len(inventory['objects'])

if __name__=='__main__':
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('folder')
    args=parser.parse_args()
    try:
        count=verify(args.folder)
        print(f'Integrity passed: database components, Push secrets and {count} Storage files. This is not a restoration test.')
    except (ValueError,OSError,KeyError):
        raise SystemExit('Backup integrity failed. Do not restore this bundle.')
