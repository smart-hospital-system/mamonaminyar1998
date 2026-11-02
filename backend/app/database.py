"""Explicit SQLite/offline or PostgreSQL/server configuration. No schema creation on import."""
import os
from pathlib import Path
from sqlalchemy import create_engine, event, text, inspect
from sqlalchemy.engine import make_url
from sqlalchemy.orm import sessionmaker

# All first-time setup/import tools cooperate on this lock; it does not lock out arbitrary SQL clients.
PROVISION_LOCK=0x41534802


def configured_target(default, explicit=None):
    if explicit is not None:
        return explicit
    keys=[key for key in ('ASH_DATABASE_URL','ASH_DATABASE_URL_FILE','ASH_DB_PATH') if key in os.environ]
    if len(keys)>1:
        raise ValueError('Ambiguous database configuration; choose URL, URL_FILE or DB_PATH, not multiple sources.')
    if not keys:
        return default
    key=keys[0]
    value=os.environ[key].strip()
    if not value:
        raise ValueError('Explicit database configuration is empty; no fallback is allowed.')
    if key=='ASH_DATABASE_URL_FILE':
        value=Path(value).read_text(encoding='utf-8').strip()
        if not value:
            raise ValueError('Database URL secret file is empty.')
    return Path(value) if key=='ASH_DB_PATH' else postgres_url(value)


def postgres_url(value):
    try:
        url=make_url(value)
        if url.drivername not in ('postgresql','postgresql+psycopg') or not url.host or not url.database or not url.username:
            raise ValueError()
        if set(url.query)-{'sslmode','sslrootcert','sslcert','sslkey','connect_timeout','application_name'}:
            raise ValueError()
        return url.set(drivername='postgresql+psycopg')
    except Exception:
        # Never include a URL/password in a configuration error.
        raise ValueError('Use an explicit PostgreSQL psycopg URL with host, database and user; unsupported URL/options.') from None


def open_database(target):
    if not isinstance(target,Path) and (hasattr(target,'drivername') or '://' in str(target)):
        url=postgres_url(target)
        engine=create_engine(url,pool_pre_ping=True,pool_size=5,max_overflow=5,pool_timeout=5,
                             connect_args={'connect_timeout':5},hide_parameters=True)
    else:
        path=Path(target).resolve()
        path.parent.mkdir(parents=True,exist_ok=True)
        engine=create_engine(f'sqlite:///{path.as_posix()}',connect_args={'check_same_thread':False,'timeout':20},hide_parameters=True)

        @event.listens_for(engine,'connect')
        def configure(connection,_):
            connection.execute('PRAGMA foreign_keys=ON')
            connection.execute('PRAGMA busy_timeout=20000')
            connection.execute('PRAGMA journal_mode=WAL')
    return engine,sessionmaker(bind=engine,expire_on_commit=False)


def require_empty_postgres(connection):
    if connection.dialect.name!='postgresql':
        raise ValueError('A PostgreSQL destination is required.')
    connection.execute(text('SELECT pg_advisory_xact_lock(:key)'),{'key':PROVISION_LOCK})
    if connection.scalar(text('SELECT current_schema()'))!='public':
        raise ValueError('Use a dedicated PostgreSQL database with public as its current schema.')
    occupied=connection.scalar(text("SELECT count(*) FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relkind IN ('r','p','v','m','S','f')"))
    other=[s for s in inspect(connection).get_schema_names() if s not in ('public','information_schema') and not s.startswith('pg_')]
    if occupied or other:
        raise ValueError('Destination is not empty. No existing schema/data will be overwritten or merged.')


def get_db(request):
    with request.app.state.sessions() as db:
        yield db
