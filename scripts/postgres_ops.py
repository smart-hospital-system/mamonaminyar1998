"""Protected pg_dump/pg_restore wrappers. No passwords in argv, no overwrite/merge restore."""
import argparse
from contextlib import contextmanager
import hashlib
import json
import os
from pathlib import Path
import subprocess
import tempfile
import time
from sqlalchemy import text
from sqlalchemy.orm import Session
from backend.app.database import open_database,require_empty_postgres
from backend.app.models import Setting,AuditLog
from backend.app.observability import ready
from scripts.migrate_postgres import enterprise_target, file_hash


@contextmanager
def client_environment(url):
    # Temporary libpq password file is 0600. Clear inherited libpq overrides.
    env={k:v for k,v in os.environ.items() if not k.startswith('PG')}
    env.pop('ASH_DATABASE_URL',None)
    with tempfile.TemporaryDirectory(prefix='ash-pg-') as directory:
        password_file=Path(directory)/'pgpass'
        values=[url.host,str(url.port or 5432),url.database,url.username,url.password or '']
        if any('\n' in value or '\r' in value for value in values):
            raise ValueError('Unsupported newline in libpq credentials.')
        escaped=[value.replace('\\','\\\\').replace(':','\\:') for value in values]
        fd=os.open(password_file,os.O_CREAT|os.O_EXCL|os.O_WRONLY,0o600)
        with os.fdopen(fd,'w') as stream:
            stream.write(':'.join(escaped)+'\n')
        env['PGPASSFILE']=str(password_file)
        dsn=url._replace(drivername='postgresql',password=None).render_as_string(hide_password=False)
        yield dsn,env


def run_client(command,env):
    result=subprocess.run(command,env=env,capture_output=True,timeout=3600)
    if result.returncode:
        raise ValueError('PostgreSQL client failed. Verify client/server major versions, permissions and connectivity; raw stderr is withheld.')


def backup(engine,destination:Path):
    destination=destination.resolve()
    fd=os.open(destination,os.O_CREAT|os.O_EXCL|os.O_WRONLY,0o600);os.close(fd)
    valid_archive=False
    try:
        with client_environment(engine.url) as (dsn,env):
            run_client(['pg_dump','--dbname',dsn,'--format=custom','--no-owner','--no-privileges',
                        '--exclude-table-data=public.sessions','--exclude-table-data=public.login_attempts',
                        '--file',str(destination)],env)
        digest=file_hash(destination)
        with destination.open('rb') as stream:
            valid=stream.read(5)==b'PGDMP'
        if not valid:
            raise ValueError('Not a custom-format PostgreSQL backup.')
        valid_archive=True
        with Session(engine) as db:
            row=db.get(Setting,'maintenance_last_backup')
            value=json.dumps({'created_at':int(time.time()),'format':'pg_dump_custom','sha256':digest})
            if row:row.value=value
            else:db.add(Setting(key='maintenance_last_backup',value=value))
            db.add(AuditLog(actor=None,action='postgres_backup_created',resource='operational-tool'))
            db.commit()
        return digest
    except Exception:
        if not valid_archive:
            destination.unlink(missing_ok=True)
        raise


def restore_to_empty(engine,source:Path):
    if not source.is_file():
        raise ValueError('Backup does not exist.')
    with source.open('rb') as stream:
        if stream.read(5)!=b'PGDMP':
            raise ValueError('Use a trusted PostgreSQL custom-format archive.')
    # Hold the same cooperative provisioning lock throughout restore. Arbitrary external
    # SQL writers are NOT controlled by this lock: keep the destination isolated/offline.
    with engine.begin() as connection:
        require_empty_postgres(connection)
        with client_environment(engine.url) as (dsn,env):
            run_client(['pg_restore','--dbname',dsn,'--single-transaction','--exit-on-error',
                        '--no-owner','--no-privileges',str(source.resolve())],env)
    if not ready(engine):
        raise ValueError('Restored archive is not a compatible application schema; keep isolated for review.')
    with Session(engine) as db:
        # Invalidate sessions even if an operator supplied an archive made without our exclusions.
        db.execute(text('DELETE FROM sessions'));db.execute(text('DELETE FROM login_attempts'))
        db.execute(text("DELETE FROM settings WHERE key IN ('maintenance_last_backup','maintenance_state')"))
        db.add(AuditLog(actor=None,action='postgres_restored',resource='isolated-empty-target'))
        db.commit()


def main():
    parser=argparse.ArgumentParser(description=__doc__)
    sub=parser.add_subparsers(dest='command',required=True)
    b=sub.add_parser('backup');b.add_argument('--output',type=Path,required=True)
    r=sub.add_parser('restore');r.add_argument('--source',type=Path,required=True);r.add_argument('--confirm-empty-target',action='store_true')
    args=parser.parse_args();engine=None
    try:
        engine,_=open_database(enterprise_target())
        if args.command=='backup':
            print('Backup created. SHA256:',backup(engine,args.output))
        else:
            if not args.confirm_empty_target:raise ValueError('Explicit empty-target confirmation is required.')
            restore_to_empty(engine,args.source)
            print('Restored to isolated empty destination. Validate records before cutover; no active database was overwritten.')
    except Exception:
        parser.exit(1,'Operation refused/failed. Check trusted archive, NEW output/empty destination, PostgreSQL client version, configuration and privileges. No URL, password or raw SQL is printed.\n')
    finally:
        if engine is not None:engine.dispose()


if __name__=='__main__':
    main()
