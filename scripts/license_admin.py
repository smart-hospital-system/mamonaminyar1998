"""Issuer-only utility. Never include a private key in an online/offline release."""
import argparse
import base64
import getpass
import json
from pathlib import Path
import time
import uuid
from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.primitives.asymmetric.ed25519 import Ed25519PrivateKey
from backend.app.activation import PRODUCT, canonical


def write_exclusive(path, data, mode=0o600):
    import os
    fd = os.open(path, os.O_WRONLY | os.O_CREAT | os.O_EXCL, mode)
    with os.fdopen(fd, 'wb') as file:
        file.write(data)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    sub = parser.add_subparsers(dest='command', required=True)
    keygen = sub.add_parser('keygen')
    keygen.add_argument('--private', type=Path, required=True)
    keygen.add_argument('--public', type=Path, required=True)
    issue = sub.add_parser('issue')
    issue.add_argument('--private', type=Path, required=True)
    issue.add_argument('--organization', required=True)
    issue.add_argument('--output', type=Path, required=True)
    issue.add_argument('--installation-id')
    issue.add_argument('--days', type=int, default=365)
    args = parser.parse_args()
    password = getpass.getpass('Issuer private-key passphrase: ')
    if len(password) < 12:
        parser.error('Use a private-key passphrase of at least 12 characters.')
    if args.command == 'keygen':
        if password != getpass.getpass('Repeat passphrase: '):
            parser.error('Passphrases differ.')
        if args.private.exists() or args.public.exists():
            parser.error('Output exists; never overwrite an issuer key.')
        key = Ed25519PrivateKey.generate()
        private = key.private_bytes(serialization.Encoding.PEM, serialization.PrivateFormat.PKCS8,
                                    serialization.BestAvailableEncryption(password.encode()))
        public = key.public_key().public_bytes(serialization.Encoding.Raw, serialization.PublicFormat.Raw)
        write_exclusive(args.private, private)
        write_exclusive(args.public, base64.b64encode(public) + b'\n', 0o644)
        print('Keys created. Keep the encrypted private key and its passphrase offline and separate.')
    else:
        if not 1 <= args.days <= 3650 or not 1 <= len(args.organization) <= 200:
            parser.error('Invalid organization or validity period.')
        key = serialization.load_pem_private_key(args.private.read_bytes(), password.encode())
        if not isinstance(key, Ed25519PrivateKey):
            parser.error('An Ed25519 key is required.')
        now = int(time.time())
        payload = dict(version=1, product=PRODUCT, license_id=str(uuid.uuid4()), organization=args.organization,
                       issued_at=now, expires_at=now + args.days * 86400, installation_id=args.installation_id)
        envelope = {'payload': payload, 'signature': base64.b64encode(key.sign(canonical(payload))).decode()}
        write_exclusive(args.output, json.dumps(envelope, ensure_ascii=False, indent=2).encode())
        print('Signed activation file created. Only send this file, never the issuer private key.')


if __name__ == '__main__':
    main()
