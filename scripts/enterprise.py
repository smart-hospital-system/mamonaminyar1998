"""Explicit first-time PostgreSQL initialization; no schema change on normal startup."""
import argparse
import getpass
import sys
from backend.app.database import open_database
from backend.app.provisioning import provision
from backend.app.routers.system import DEFAULT_HOSPITAL
from scripts.migrate_postgres import enterprise_target


def main():
    parser=argparse.ArgumentParser(description=__doc__)
    sub=parser.add_subparsers(dest='command',required=True)
    init=sub.add_parser('init')
    init.add_argument('--username',default='owner')
    init.add_argument('--name',default='مدیر شفاخانه')
    init.add_argument('--physician-owner',action='store_true')
    init.add_argument('--password-stdin',action='store_true',help='Controlled automation only; never a password in argv/env')
    args=parser.parse_args()
    engine=None
    try:
        from backend.app.schemas import UserInput
        password=sys.stdin.read(202).removesuffix('\n') if args.password_stdin else getpass.getpass('New administrator password (12+): ')
        if not args.password_stdin and password!=getpass.getpass('Repeat password: '):
            raise ValueError('Passwords differ')
        # Validate before opening the target or creating any table.
        from typing import Literal
        class OwnerInput(UserInput):
            role:Literal['admin']='admin'
        user=OwnerInput(username=args.username,name=args.name,password=password)
        engine,_=open_database(enterprise_target())
        provision(engine,user.username,user.name,password,DEFAULT_HOSPITAL,physician_owner=args.physician_owner)
        print('PostgreSQL initialized explicitly; no existing schema was overwritten.')
    except Exception:
        parser.exit(1,'Initialization refused/failed. Verify unique credentials, empty target, secret configuration and connectivity. No password or URL is printed.\n')
    finally:
        if engine is not None:
            engine.dispose()


if __name__=='__main__':
    main()
