"""Consistent SQLite snapshots. Restore only to a NEW database, never over a live DB."""
import os
from contextlib import closing
from pathlib import Path
import sqlite3
import time

SCHEMA_VERSION = '2'


def snapshot(engine, destination: Path):
    if engine.dialect.name!='sqlite':
        raise ValueError('SQLite snapshot is unavailable for PostgreSQL; use the PostgreSQL operational backup tool.')
    raw = engine.raw_connection()
    try:
        with sqlite3.connect(destination) as target:
            raw.driver_connection.backup(target)
            target.execute('DELETE FROM sessions')
            target.execute('DELETE FROM login_attempts')
            target.commit()
    finally:
        raw.close()
    os.chmod(destination, 0o600)
    # Record creation, not proof that the downloaded file reached secure storage.
    import json
    with engine.begin() as connection:
        from sqlalchemy import text
        connection.execute(text("INSERT INTO settings(key,value) VALUES('maintenance_last_backup',:value) ON CONFLICT(key) DO UPDATE SET value=excluded.value"),
                           {'value':json.dumps({'created_at':int(time.time())})})


def validate_snapshot(path: Path, allowed_versions=('2',), *, immutable=False):
    if not path.is_file():
        raise ValueError('Backup file does not exist')
    with path.open('rb') as stream:
        if stream.read(16) != b'SQLite format 3\x00':
            raise ValueError('Not a SQLite snapshot')
    uri = path.resolve().as_uri() + '?mode=ro'
    if immutable:
        uri+='&immutable=1'
    with closing(sqlite3.connect(uri, uri=True)) as db:
        if db.execute('PRAGMA integrity_check').fetchone()[0] != 'ok':
            raise ValueError('Backup integrity check failed')
        if db.execute('PRAGMA foreign_key_check').fetchone():
            raise ValueError('Backup foreign keys are invalid')
        version = db.execute("SELECT value FROM settings WHERE key='schema_version'").fetchone()
        if not version or version[0] not in allowed_versions:
            raise ValueError('Unsupported schema version; do not restore')
        expected = {'users', 'doctors', 'patients', 'prescriptions', 'prescription_items', 'sessions', 'settings', 'audit_logs', 'login_attempts', 'admissions', 'work_orders', 'medicines'}
        if version[0] == '2':
            expected |= {'print_designs','user_preferences','work_tasks','appointments','visit_notes'}
        actual = {r[0] for r in db.execute("SELECT name FROM sqlite_master WHERE type='table'")}
        if not expected.issubset(actual):
            raise ValueError('Incomplete snapshot')
        from .models import Base
        for table in expected:
            columns = {row[1] for row in db.execute(f'PRAGMA table_info("{table}")')}
            if not set(Base.metadata.tables[table].columns.keys()).issubset(columns):
                raise ValueError('Incomplete snapshot columns')


def restore_to_new(source: Path, destination: Path):
    validate_snapshot(source)
    destination = destination.resolve()
    destination.parent.mkdir(parents=True, exist_ok=True)
    # Exclusive creation refuses existing or active databases, even under races.
    fd = os.open(destination, os.O_CREAT | os.O_EXCL | os.O_WRONLY, 0o600)
    os.close(fd)
    try:
        with sqlite3.connect(source.resolve().as_uri() + '?mode=ro', uri=True) as src, sqlite3.connect(destination) as dst:
            src.backup(dst)
            dst.execute('DELETE FROM sessions')
            dst.execute('DELETE FROM login_attempts')
            dst.execute('INSERT INTO audit_logs(actor, action, resource, created) VALUES(NULL, ?, ?, ?)', ('database_restored', 'offline-restore', int(time.time())))
            dst.commit()
        validate_snapshot(destination)
    except Exception:
        destination.unlink(missing_ok=True)
        raise
