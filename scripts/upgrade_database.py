"""Version-1 -> version-2 ADDITIVE migration, to a NEW file only. Original is untouched."""
import argparse
import os
from pathlib import Path
import sqlite3
import time
from backend.app.backups import validate_snapshot
from backend.app.database import open_database
from backend.app.models import Base


def upgrade(source:Path,destination:Path):
    validate_snapshot(source,allowed_versions=('1',))
    destination=destination.resolve()
    destination.parent.mkdir(parents=True,exist_ok=True)
    fd=os.open(destination,os.O_CREAT|os.O_EXCL|os.O_WRONLY,0o600)
    os.close(fd)
    try:
        with sqlite3.connect(source.resolve().as_uri()+'?mode=ro',uri=True) as src,sqlite3.connect(destination) as dst:
            src.backup(dst)
        validate_snapshot(destination,allowed_versions=('1',))
        engine,_=open_database(destination)
        try:
            # Only new tables are added. Legacy prescription constraints remain intact;
            # extended design IDs live in print_designs, so no medical table rebuild occurs.
            Base.metadata.create_all(engine)
        finally:
            engine.dispose()
        with sqlite3.connect(destination) as db:
            db.execute('DELETE FROM sessions')
            db.execute('DELETE FROM login_attempts')
            db.execute("UPDATE settings SET value='2' WHERE key='schema_version'")
            db.execute('INSERT INTO audit_logs(actor,action,resource,created) VALUES(NULL,?,?,?)',
                       ('schema_upgraded','v1-to-v2',int(time.time())))
            db.commit()
        validate_snapshot(destination)
    except Exception:
        destination.unlink(missing_ok=True)
        raise


if __name__=='__main__':
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('source',type=Path)
    parser.add_argument('destination',type=Path)
    args=parser.parse_args()
    try:
        upgrade(args.source,args.destination)
        print('Upgraded to NEW file. Original preserved, sessions revoked. Set ASH_DB_PATH only after verification.')
    except (ValueError,OSError,sqlite3.DatabaseError) as error:
        parser.exit(1,f'ERROR: {error}\n')
