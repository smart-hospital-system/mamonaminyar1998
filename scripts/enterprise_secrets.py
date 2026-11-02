"""Generate local Compose secrets without defaults or overwriting existing files."""
import argparse
import os
from pathlib import Path
import secrets
from urllib.parse import quote


def generate(directory):
    directory=directory.resolve()
    directory.mkdir(mode=0o700,parents=True,exist_ok=True)
    if any(directory.iterdir()):
        raise ValueError('Use a new empty secret directory; never overwrite existing credentials.')
    directory.chmod(0o700)
    values={name:secrets.token_urlsafe(36) for name in ('bootstrap_password','owner_password','app_password')}
    for role in ('owner','app'):
        values[role+'_url']=f'postgresql+psycopg://ash_{role}:{quote(values[role+"_password"],safe="")}@db:5432/ash?sslmode=disable'
    for name,value in values.items():
        # The host directory is private (0700); readable files support non-root Docker
        # Compose bind-mounted secrets, whose uid/mode remapping is not portable.
        fd=os.open(directory/name,os.O_CREAT|os.O_EXCL|os.O_WRONLY,0o644)
        with os.fdopen(fd,'w') as stream:stream.write(value+'\n')
        (directory/name).chmod(0o644)
    print('Local development secrets generated. Protect this directory/Windows ACLs; nothing was printed or uploaded.')


def main():
    p=argparse.ArgumentParser(description=__doc__);p.add_argument('--directory',type=Path,default=Path('.secrets'))
    args=p.parse_args()
    try:generate(args.directory)
    except Exception:p.exit(1,'Secret generation refused/failed; use an empty protected directory and review permissions.\n')


if __name__=='__main__':main()
