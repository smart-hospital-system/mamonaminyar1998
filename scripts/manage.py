"""Local setup/backup/restore CLI. Never pass passwords through command arguments."""
import argparse
import getpass
import os
from pathlib import Path
import sqlite3
from sqlalchemy import inspect, select
from backend.app.backups import SCHEMA_VERSION, restore_to_new, snapshot
from backend.app.database import open_database
from backend.app.models import Base, Setting, User, Doctor
from backend.app.routers.system import DEFAULT_HOSPITAL
from backend.app.security import hash_password
import json

ROOT = Path(__file__).resolve().parents[1]


def initialize(path, username, name, password, hospital=None, activation=None, physician_owner=False):
    from backend.app.provisioning import provision
    engine,_=open_database(path)
    try:
        provision(engine,username,name,password,hospital or DEFAULT_HOSPITAL,activation,physician_owner)
        try:
            os.chmod(path,0o600)
        except OSError:
            pass
    finally:
        engine.dispose()


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--db', type=Path, default=Path(os.environ.get('ASH_DB_PATH', ROOT / '.data' / 'ash.sqlite3')))
    sub = parser.add_subparsers(dest='command', required=True)
    init = sub.add_parser('init')
    init.add_argument('--username', default='admin')
    init.add_argument('--name', default='مدیر سیستم')
    init.add_argument('--physician-owner', action='store_true', help='Explicitly grant the initial administrator clinical duties')
    owner = sub.add_parser('enable-owner-doctor', help='Local-only grant; stop server and back up first')
    owner.add_argument('--username', required=True)
    backup = sub.add_parser('backup')
    backup.add_argument('destination', type=Path)
    restore = sub.add_parser('restore')
    restore.add_argument('source', type=Path)
    restore.add_argument('destination', type=Path, help='NEW path, must not exist')
    migration = sub.add_parser('upgrade-v1', help='Additive upgrade to a NEW database file')
    migration.add_argument('source', type=Path)
    migration.add_argument('destination', type=Path)
    args = parser.parse_args()
    try:
        if args.command == 'init':
            password = getpass.getpass('New administrator password (12+ characters): ')
            if password != getpass.getpass('Repeat password: '):
                raise ValueError('Passwords do not match.')
            initialize(args.db.resolve(), args.username, args.name, password, physician_owner=args.physician_owner)
            print('Initialized. Start: python -m uvicorn backend.app.main:app --host 127.0.0.1 --port 8000')
        elif args.command == 'enable-owner-doctor':
            if not args.db.is_file():
                raise ValueError('Database does not exist')
            from backend.app.backups import validate_snapshot
            from backend.app.security import audit
            validate_snapshot(args.db)
            engine, sessions = open_database(args.db)
            try:
                with sessions() as db:
                    user=db.scalar(select(User).where(User.username==args.username,User.role=='admin',User.active.is_(True)))
                    if not user:
                        raise ValueError('Active administrator not found')
                    if not db.scalar(select(Doctor).where(Doctor.user_id==user.id)):
                        db.add(Doctor(user_id=user.id))
                        audit(db,user,'physician_owner_enabled',user.id)
                    db.commit()
                print('Explicit physician-owner privileges enabled. No other administrator changed.')
            finally:
                engine.dispose()
        elif args.command == 'backup':
            if not args.db.is_file():
                raise ValueError('Source database does not exist.')
            args.destination.parent.mkdir(parents=True, exist_ok=True)
            fd = os.open(args.destination, os.O_CREAT | os.O_EXCL | os.O_WRONLY, 0o600)
            os.close(fd)
            engine, _ = open_database(args.db)
            try:
                snapshot(engine, args.destination)
            finally:
                engine.dispose()
            print('Backup created. Contains sensitive records; encrypt before moving.')
        elif args.command == 'upgrade-v1':
            from scripts.upgrade_database import upgrade
            upgrade(args.source, args.destination)
            print('Schema 2 created at NEW path. Original preserved. Stop old server; explicitly select new DB.')
        else:
            restore_to_new(args.source, args.destination)
            print('Restored to NEW path; sessions invalidated. Stop the server, set ASH_DB_PATH, then restart.')
    except (ValueError, OSError, sqlite3.DatabaseError) as error:
        parser.exit(1, f'ERROR: {error}\n')


if __name__ == '__main__':
    main()
