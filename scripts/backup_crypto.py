"""Versioned AES-256-GCM envelope using scrypt; no application secrets in the header."""
import os
from pathlib import Path
import tempfile
from cryptography.hazmat.primitives.ciphers import Cipher, algorithms, modes
from cryptography.hazmat.primitives.kdf.scrypt import Scrypt

MAGIC=b'NINHOBK1'
HEADER_SIZE=8+16+12
CHUNK=1024*1024

def key_for(password,salt):
    return Scrypt(salt=salt,length=32,n=2**15,r=8,p=1).derive(password.encode('utf8'))

def encrypt_file(source,target,password):
    salt=os.urandom(16);nonce=os.urandom(12);header=MAGIC+salt+nonce
    encryptor=Cipher(algorithms.AES(key_for(password,salt)),modes.GCM(nonce)).encryptor()
    encryptor.authenticate_additional_data(header)
    with open(source,'rb') as src,open(target,'xb') as dst:
        dst.write(header)
        while chunk:=src.read(CHUNK):dst.write(encryptor.update(chunk))
        dst.write(encryptor.finalize());dst.write(encryptor.tag)

def decrypt_file(source,target,password):
    target=Path(target)
    if target.exists():raise ValueError('Refusing to overwrite decrypted output')
    size=Path(source).stat().st_size
    if size<HEADER_SIZE+16:raise ValueError('Invalid backup envelope')
    with open(source,'rb') as src:
        header=src.read(HEADER_SIZE)
        if header[:8]!=MAGIC:raise ValueError('Unsupported backup envelope')
        src.seek(-16,os.SEEK_END);tag=src.read(16);src.seek(HEADER_SIZE)
        decryptor=Cipher(algorithms.AES(key_for(password,header[8:24])),modes.GCM(header[24:36],tag)).decryptor()
        decryptor.authenticate_additional_data(header)
        # Do not expose decrypted output until GCM authenticates the entire archive.
        with tempfile.TemporaryDirectory(prefix='ninho-decrypt-',dir=target.parent) as tmp:
            pending=Path(tmp)/'verified'
            with pending.open('wb') as dst:
                remaining=size-HEADER_SIZE-16
                while remaining:
                    chunk=src.read(min(CHUNK,remaining))
                    if not chunk:raise ValueError('Truncated backup')
                    dst.write(decryptor.update(chunk));remaining-=len(chunk)
                dst.write(decryptor.finalize())
            pending.replace(target)

if __name__=='__main__':
    import argparse
    import getpass
    from cryptography.exceptions import InvalidTag
    parser=argparse.ArgumentParser(description='Decrypt a Ninho backup locally; password is never a command-line argument')
    parser.add_argument('source');parser.add_argument('target');args=parser.parse_args()
    os.umask(0o077)
    try:decrypt_file(args.source,args.target,getpass.getpass('Backup password: '))
    except (InvalidTag,ValueError,OSError):raise SystemExit('Decryption failed: wrong password, damaged file, or output already exists. No plaintext accepted.')
