"""Offline SQLite snapshot -> exclusively empty PostgreSQL/public, atomic import, never merge.

Default CLI mode is source-only inspection. URLs come from environment/secret files,
never command arguments. Stop writers and use a reviewed, consistent schema-2 snapshot.
"""
from contextlib import closing
import argparse
import hashlib
import json
import os
from pathlib import Path
import sqlite3
import sys
import time
from decimal import Decimal
from sqlalchemy import Boolean,create_engine,func,inspect,select,text
from backend.app.backups import validate_snapshot,SCHEMA_VERSION
from backend.app.database import configured_target,open_database,postgres_url,require_empty_postgres
from backend.app.models import Base,Setting,AuditLog

SKIP_TABLES={'sessions','login_attempts'}
RESET_SETTINGS={'maintenance_state','maintenance_last_backup'}


def file_hash(path):
    h=hashlib.sha256()
    with path.open('rb') as stream:
        for block in iter(lambda:stream.read(1024*1024),b''):
            h.update(block)
    return h.hexdigest()


def validate_source(path):
    path=path.resolve()
    if Path(str(path)+'-wal').exists() or Path(str(path)+'-journal').exists():
        raise ValueError('Use an offline snapshot without WAL/journal sidecars; do not import a live database file.')
    validate_snapshot(path,immutable=True)
    # A SQLite column can contain out-of-domain values; never silently cast 2/3 into True.
    with closing(sqlite3.connect(path.as_uri()+'?mode=ro&immutable=1',uri=True)) as db:
        tables={r[0] for r in db.execute("SELECT name FROM sqlite_master WHERE type='table'") if not r[0].startswith('sqlite_')}
        if tables!=set(Base.metadata.tables):
            raise ValueError('Source has unknown/missing tables; no unmapped data may be silently discarded.')
        if db.execute("SELECT name FROM sqlite_master WHERE type IN ('trigger','view')").fetchone():
            raise ValueError('Source has custom triggers/views; explicit migration review required.')
        known_indexes={index.name for t in Base.metadata.tables.values() for index in t.indexes}
        indexes={r[0] for r in db.execute("SELECT name FROM sqlite_master WHERE type='index'") if not r[0].startswith('sqlite_')}
        if indexes-known_indexes:
            raise ValueError('Source has custom indexes; explicit migration review required.')
        for table in Base.metadata.tables.values():
            columns={r[1] for r in db.execute(f'PRAGMA table_info("{table.name}")')}
            if columns!=set(table.columns.keys()):
                raise ValueError('Source has unmapped columns; explicit migration review required.')
            for column in table.columns:
                if isinstance(column.type,Boolean):
                    if db.execute(f'SELECT count(*) FROM "{table.name}" WHERE "{column.name}" NOT IN (0,1)').fetchone()[0]:
                        raise ValueError('Invalid boolean source data; manual review required before migration.')
    return path


def source_engine(path):
    # Do not call the normal SQLite opener: it enables WAL and is intentionally writable.
    return create_engine(f'sqlite:///{path.as_uri()}?mode=ro&immutable=1&uri=true',hide_parameters=True)


def query_for(table):
    query=select(table)
    if table.name=='settings':
        query=query.where(table.c.key.not_in(RESET_SETTINGS))
    return query.order_by(*table.primary_key.columns).execution_options(yield_per=500)


def digest_rows(rows):
    h=hashlib.sha256();count=0
    for row in rows:
        encoded=json.dumps(dict(row),sort_keys=True,ensure_ascii=False,separators=(',',':'),
                           default=lambda x:str(x) if isinstance(x,Decimal) else (_ for _ in ()).throw(TypeError()),allow_nan=False)
        h.update(encoded.encode('utf-8')+b'\n');count+=1
    return {'rows':count,'sha256':h.hexdigest()}


def inspect_source(path):
    path=validate_source(path);engine=source_engine(path)
    try:
        with engine.connect() as connection:
            connection.exec_driver_sql('BEGIN')
            return {'source_sha256':file_hash(path),'schema_version':SCHEMA_VERSION,
                    'tables':{t.name:connection.scalar(select(func.count()).select_from(t)) for t in Base.metadata.sorted_tables},
                    'revoked_tables':sorted(SKIP_TABLES),'reset_settings':sorted(RESET_SETTINGS),'destination_touched':False}
    finally:
        engine.dispose()


def migrate(path,target_engine):
    path=validate_source(path);original=file_hash(path);src=source_engine(path)
    try:
        with src.connect() as source,target_engine.begin() as destination:
            source.exec_driver_sql('BEGIN')
            require_empty_postgres(destination)
            Base.metadata.create_all(destination)
            # A valid legacy self-reference can point to a higher ID. Defer only this
            # new PG constraint while copying; force all constraints before validation.
            quote=destination.dialect.identifier_preparer.quote
            for fk in inspect(destination).get_foreign_keys('visit_notes'):
                if fk['constrained_columns']==['amends_id']:
                    destination.exec_driver_sql(f'ALTER TABLE visit_notes ALTER CONSTRAINT {quote(fk["name"])} DEFERRABLE INITIALLY DEFERRED')
            verified={}
            for table in Base.metadata.sorted_tables:
                if table.name in SKIP_TABLES:
                    continue
                statement=query_for(table)
                for batch in source.execute(statement).mappings().partitions(500):
                    destination.execute(table.insert(),[dict(row) for row in batch])
                expected=digest_rows(source.execute(statement).mappings())
                actual=digest_rows(destination.execute(statement).mappings())
                if expected!=actual:
                    raise ValueError('Import verification failed; destination transaction will roll back.')
                verified[table.name]=expected
            destination.exec_driver_sql('SET CONSTRAINTS ALL IMMEDIATE')
            for table in Base.metadata.sorted_tables:
                if 'id' not in table.c:
                    continue
                sequence=destination.scalar(text("SELECT pg_get_serial_sequence(:table,'id')"),{'table':'public.'+table.name})
                if sequence:
                    maximum=destination.scalar(select(func.max(table.c.id)))
                    destination.execute(text('SELECT setval(CAST(:sequence AS regclass),:value,:called)'),
                                        {'sequence':sequence,'value':maximum if maximum is not None else 1,'called':maximum is not None})
            validate_source(path)
            if file_hash(path)!=original:
                raise ValueError('Source changed during import; destination transaction will roll back.')
            report={'format':1,'schema_version':SCHEMA_VERSION,'source_sha256':original,'verified_tables':verified,
                    'revoked_tables':sorted(SKIP_TABLES),'reset_settings':sorted(RESET_SETTINGS),
                    'committed_at':int(time.time()),'additional_audit_rows':1}
            destination.execute(Setting.__table__.insert().values(key='enterprise_import_receipt',value=json.dumps(report)))
            destination.execute(AuditLog.__table__.insert().values(actor=None,action='sqlite_import_verified',resource='enterprise-phase1',created=int(time.time())))
        # Only return success after PostgreSQL has committed the entire schema+data transaction.
        return report
    finally:
        src.dispose()


def enterprise_target():
    target=configured_target(None)
    if target is None or isinstance(target,Path):
        raise ValueError('Set exactly one ASH_DATABASE_URL or ASH_DATABASE_URL_FILE for the PostgreSQL destination.')
    return postgres_url(target)


def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('source',type=Path)
    parser.add_argument('--apply',action='store_true')
    parser.add_argument('--confirm-empty-target',action='store_true')
    parser.add_argument('--report',type=Path,required=True,help='NEW protected metadata report; no clinical row values')
    args=parser.parse_args()
    fd=None
    try:
        # Fail before contacting a destination if the report already exists.
        fd=os.open(args.report,os.O_CREAT|os.O_EXCL|os.O_WRONLY,0o600)
        if args.apply:
            if not args.confirm_empty_target:
                raise ValueError('Explicit --confirm-empty-target is required.')
            engine,_=open_database(enterprise_target())
            try:
                report=migrate(args.source,engine)
            finally:
                engine.dispose()
        else:
            report=inspect_source(args.source)
        with os.fdopen(fd,'w',encoding='utf-8') as stream:
            fd=None;json.dump(report,stream,ensure_ascii=False,indent=2)
        print('Import committed and verified.' if args.apply else 'Source inspected only; destination was not contacted.')
    except Exception:
        if fd is not None:
            os.close(fd)
            args.report.unlink(missing_ok=True)
        parser.exit(1,'Operation failed safely. No raw SQL, clinical values or database URL is printed. Check source/schema, empty target, privileges and connectivity. After an ambiguous commit/network failure, inspect the protected target receipt before retrying.\n')


if __name__=='__main__':
    main()
