"""Always-run safety checks plus opt-in real PostgreSQL 17 integration on disposable DBs."""
import hashlib
import json
import os
import secrets
from pathlib import Path
import uuid
from unittest.mock import patch
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine,inspect,select,text
from backend.app.database import configured_target,open_database,postgres_url
from backend.app.main import create_app
from backend.app.models import Base,Patient,Setting,User,VisitNote
from backend.app.provisioning import provision
from backend.app.routers.system import DEFAULT_HOSPITAL
from scripts.manage import initialize
from scripts.migrate_postgres import migrate,inspect_source,file_hash
from test_hospital import system,login,patient,rx_body,staff,PASSWORD


def test_configuration_refuses_ambiguous_or_unsupported_urls(tmp_path,monkeypatch):
    for name in ('ASH_DB_PATH','ASH_DATABASE_URL','ASH_DATABASE_URL_FILE'):
        monkeypatch.delenv(name,raising=False)
    monkeypatch.setenv('ASH_DATABASE_URL','postgresql://owner:private@db/ash')
    assert configured_target(tmp_path/'local').drivername=='postgresql+psycopg'
    assert configured_target(None,explicit=tmp_path/'test')==tmp_path/'test'
    monkeypatch.setenv('ASH_DB_PATH','other')
    with pytest.raises(ValueError,match='Ambiguous'):
        configured_target(None)
    with pytest.raises(ValueError) as exc:
        postgres_url('mysql://owner:NEVER_LOG_THIS@db/ash')
    assert 'NEVER_LOG_THIS' not in str(exc.value)
    with pytest.raises(ValueError):
        postgres_url('postgresql://owner:secret@db/ash?options=-csearch_path=other')


def test_source_inspection_is_read_only_and_reports_metadata_only(tmp_path):
    path=tmp_path/'source.sqlite3'
    initialize(path,'owner','Test owner',PASSWORD)
    before=file_hash(path)
    report=inspect_source(path)
    assert not report['destination_touched'] and report['source_sha256']==before
    assert file_hash(path)==before
    Path(str(path)+'-wal').touch()
    with pytest.raises(ValueError,match='offline snapshot'):
        inspect_source(path)


def test_ops_metrics_redact_queries_ids_and_require_admin(system):
    app,admin,_=system
    p=patient(admin)
    r=admin.get('/api/patients?q=DO_NOT_LOG_THIS_PATIENT')
    assert len(r.headers['X-Request-ID'])==32
    assert admin.get('/readyz').status_code==200
    assert admin.get('/api/ops/status').json()['database']=='sqlite'
    metrics=admin.get('/api/ops/metrics')
    assert metrics.status_code==200
    assert 'ash_database_ready 1' in metrics.text
    assert 'DO_NOT_LOG_THIS_PATIENT' not in metrics.text
    assert staff(app,admin,'lab').get('/api/ops/metrics').status_code==403
    with patch('backend.app.main.ready',return_value=False):
        assert admin.get('/readyz').status_code==503
        assert admin.get('/healthz').status_code==200


@pytest.fixture
def postgres():
    value=os.environ.get('ASH_TEST_DATABASE_URL')
    if not value:
        pytest.skip('Set ASH_TEST_DATABASE_URL for a dedicated disposable PostgreSQL test cluster.')
    url=postgres_url(value)
    admin=create_engine(url,isolation_level='AUTOCOMMIT',hide_parameters=True)
    name='ash_test_'+uuid.uuid4().hex
    with admin.connect() as connection:
        connection.exec_driver_sql(f'CREATE DATABASE "{name}"')
    engine,_=open_database(url.set(database=name))
    try:
        yield engine
    finally:
        engine.dispose()
        with admin.connect() as connection:
            connection.exec_driver_sql(f'DROP DATABASE "{name}" WITH (FORCE)')
        admin.dispose()


def init_pg(engine):
    provision(engine,'owner','Postgres TEST owner',PASSWORD,DEFAULT_HOSPITAL,physician_owner=True)


def test_postgres_real_clinical_workflow_and_ops(postgres):
    init_pg(postgres)
    with TestClient(create_app(postgres.url)) as client:
        login(client,'owner')
        p=patient(client)
        draft=client.post('/api/prescriptions',json=rx_body(p['id'],template_id=200))
        assert draft.status_code==201,draft.text
        confirmed=client.post(f"/api/prescriptions/{draft.json()['id']}/confirm",json={'revision':1,'reviewed':True})
        assert confirmed.status_code==200,confirmed.text
        assert confirmed.json()['template_config']['studio']['family']=='surgical'
        for kind in ('lab','radiology'):
            order=client.post('/api/orders',json={'patient_id':p['id'],'kind':kind,'title':'TEST ONLY'}).json()
            assert client.post(f"/api/orders/{order['id']}/result",json={'result':'Synthetic result'}).status_code==200
        for _ in range(2):
            admit=client.post('/api/admissions',json={'patient_id':p['id'],'bed':1,'reason':'TEST ONLY'})
            assert admit.status_code==201,admit.text
            assert client.post(f"/api/admissions/{admit.json()['id']}/discharge",json={'note':'Synthetic discharge'}).status_code==200
        assert client.get('/readyz').status_code==200
        assert client.get('/api/ops/status').json()['database']=='postgresql'
        assert 'ash_database_ready 1' in client.get('/api/ops/metrics').text
        assert client.post('/api/professional/health/check').status_code==200
        assert client.post('/api/backups').status_code==409


def stopped_source(tmp_path):
    source=tmp_path/'stopped.sqlite3'
    initialize(source,'owner','SQLite TEST owner',PASSWORD,physician_owner=True)
    with TestClient(create_app(source)) as client:
        login(client,'owner');p=patient(client)
        draft=client.post('/api/prescriptions',json=rx_body(p['id'],template_id=177)).json()
        r=client.post(f"/api/prescriptions/{draft['id']}/confirm",json={'revision':1,'reviewed':True})
        assert r.status_code==200
        frozen=r.json()
    return source,frozen


def test_postgres_import_preserves_ids_hashes_snapshots_revokes_sessions_and_sequences(postgres,tmp_path):
    source,frozen=stopped_source(tmp_path);before=file_hash(source)
    report=migrate(source,postgres)
    assert file_hash(source)==before
    assert report['verified_tables']['patients']['rows']==1
    with postgres.connect() as connection:
        assert connection.scalar(text('SELECT count(*) FROM sessions'))==0
        assert connection.scalar(text('SELECT count(*) FROM login_attempts'))==0
        assert connection.scalar(text("SELECT count(*) FROM settings WHERE key='maintenance_last_backup'"))==0
        assert connection.scalar(text("SELECT count(*) FROM settings WHERE key='enterprise_import_receipt'"))==1
    with TestClient(create_app(postgres.url)) as client:
        login(client,'owner')
        imported=client.get(f"/api/prescriptions/{frozen['id']}").json()
        assert imported==frozen
        assert patient(client)['id']>frozen['patient_id']
        assert staff(client.app,client,'doctor','new-doctor').get('/api/auth/me').status_code==200


def test_postgres_import_refuses_nonempty_target_without_changing_records(postgres,tmp_path):
    init_pg(postgres)
    source,_=stopped_source(tmp_path)
    with pytest.raises(ValueError,match='not empty'):
        migrate(source,postgres)
    with postgres.connect() as connection:
        assert connection.scalar(text('SELECT count(*) FROM patients'))==0
        assert connection.scalar(text('SELECT count(*) FROM users'))==1


def test_postgres_import_verification_failure_rolls_back_schema_and_data(postgres,tmp_path):
    source,_=stopped_source(tmp_path);before=file_hash(source)
    from scripts import migrate_postgres
    actual=migrate_postgres.digest_rows
    count=0
    def corrupt(rows):
        nonlocal count
        result=actual(rows);count+=1
        if count==2:result['sha256']='force-verification-failure'
        return result
    with patch.object(migrate_postgres,'digest_rows',side_effect=corrupt),pytest.raises(ValueError,match='verification failed'):
        migrate(source,postgres)
    assert inspect(postgres).get_table_names()==[]
    assert file_hash(source)==before


def test_postgres_runtime_role_can_use_app_but_cannot_create_tables(postgres):
    init_pg(postgres)
    role='ash_runtime_'+uuid.uuid4().hex[:12]
    password=secrets.token_urlsafe(32)
    with postgres.begin() as connection:
        connection.exec_driver_sql(f"CREATE ROLE \"{role}\" LOGIN PASSWORD '{password}'")
        connection.exec_driver_sql(f'GRANT USAGE ON SCHEMA public TO "{role}"')
        connection.exec_driver_sql(f'GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO "{role}"')
        connection.exec_driver_sql(f'GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO "{role}"')
    runtime=create_app(postgres.url.set(username=role,password=password))
    try:
        with TestClient(runtime) as client:
            login(client,'owner')
            assert patient(client)['id']==1
            assert client.get('/readyz').status_code==200
            with pytest.raises(Exception):
                with runtime.state.engine.begin() as connection:
                    connection.exec_driver_sql('CREATE TABLE forbidden_runtime_ddl(id int)')
    finally:
        runtime.state.engine.dispose()
        with postgres.begin() as connection:
            connection.exec_driver_sql(f'DROP OWNED BY "{role}"')
            connection.exec_driver_sql(f'DROP ROLE "{role}"')


def test_pg_client_never_puts_password_in_argv_or_inherits_libpq_overrides(monkeypatch):
    from scripts.postgres_ops import client_environment
    monkeypatch.setenv('PGPASSWORD','SHOULD_NOT_PROPAGATE')
    monkeypatch.setenv('PGSERVICE','untrusted-service')
    value=postgres_url('postgresql://owner:PRIVATE_SECRET@db/ash')
    with client_environment(value) as (dsn,env):
        path=Path(env['PGPASSFILE'])
        assert 'PRIVATE_SECRET' not in dsn
        assert 'PGPASSWORD' not in env and 'PGSERVICE' not in env
        assert path.stat().st_mode & 0o777==0o600
        assert 'PRIVATE_SECRET' in path.read_text()
    assert not path.exists()


def test_secret_generation_is_private_and_never_overwrites(tmp_path):
    from scripts.enterprise_secrets import generate
    directory=tmp_path/'private'
    generate(directory)
    before=(directory/'app_url').read_bytes()
    assert directory.stat().st_mode & 0o777==0o700
    assert b'ash_app:' in before and b'@db:5432/ash' in before
    with pytest.raises(ValueError,match='never overwrite'):
        generate(directory)
    assert (directory/'app_url').read_bytes()==before


def test_postgres_init_cli_accepts_stdin_and_refuses_reinitialization(postgres,monkeypatch,tmp_path):
    import subprocess,sys
    file=tmp_path/'database-url'
    file.write_text(postgres.url.render_as_string(hide_password=False))
    env={k:v for k,v in os.environ.items() if k not in ('ASH_DB_PATH','ASH_DATABASE_URL','ASH_DATABASE_URL_FILE')}
    env['ASH_DATABASE_URL_FILE']=str(file)
    command=[sys.executable,'-m','scripts.enterprise','init','--password-stdin','--physician-owner']
    result=subprocess.run(command,input=PASSWORD+'\n',text=True,capture_output=True,env=env)
    assert result.returncode==0,result.stdout+result.stderr
    again=subprocess.run(command,input=PASSWORD+'\n',text=True,capture_output=True,env=env)
    assert again.returncode!=0
    assert PASSWORD not in result.stdout+result.stderr+again.stdout+again.stderr
    with TestClient(create_app(postgres.url)) as client:
        assert login(client,'owner').json()['user']['physician_owner']


@pytest.mark.skipif(os.environ.get('ASH_RUN_PG_CLIENT_TESTS')!='1',reason='Optional matching-major pg_dump/pg_restore integration.')
def test_real_postgres_backup_and_restore_into_empty_database(postgres,tmp_path):
    from scripts.postgres_ops import backup,restore_to_empty
    init_pg(postgres)
    with TestClient(create_app(postgres.url)) as client:
        login(client,'owner');p=patient(client)
    target=tmp_path/'protected.dump'
    digest=backup(postgres,target)
    assert len(digest)==64 and target.stat().st_mode & 0o777==0o600
    with pytest.raises(FileExistsError):backup(postgres,target)
    with pytest.raises(ValueError,match='not empty'):restore_to_empty(postgres,target)
    admin=create_engine(postgres.url.set(database='postgres'),isolation_level='AUTOCOMMIT')
    name='ash_test_restore_'+uuid.uuid4().hex
    with admin.connect() as connection:connection.exec_driver_sql(f'CREATE DATABASE "{name}"')
    recovered,_=open_database(postgres.url.set(database=name))
    try:
        restore_to_empty(recovered,target)
        with recovered.connect() as connection:
            assert connection.scalar(text('SELECT count(*) FROM patients'))==1
            assert connection.scalar(text('SELECT count(*) FROM sessions'))==0
        with TestClient(create_app(recovered.url)) as client:
            login(client,'owner')
            assert client.get('/api/patients').json()[0]['id']==p['id']
    finally:
        recovered.dispose()
        with admin.connect() as connection:connection.exec_driver_sql(f'DROP DATABASE "{name}" WITH (FORCE)')
        admin.dispose()


@pytest.mark.parametrize('ddl',[
    'ALTER TABLE patients ADD COLUMN private_extra_information TEXT',
    'CREATE TABLE unmapped_clinical_records(id INTEGER PRIMARY KEY, note TEXT)',
    'CREATE VIEW custom_patient_view AS SELECT id FROM patients',
    'CREATE INDEX custom_patient_index ON patients(first_name)',
])
def test_migration_never_silently_discards_unknown_source_schema(tmp_path,ddl):
    import sqlite3
    path=tmp_path/'source.sqlite3';initialize(path,'owner','Test owner',PASSWORD)
    db=sqlite3.connect(path)
    try:
        db.execute(ddl);db.commit()
    finally:
        db.close()
    before=file_hash(path)
    with pytest.raises(ValueError,match='unmapped|unknown|custom'):inspect_source(path)
    assert file_hash(path)==before


def test_explicit_empty_database_url_never_falls_back(tmp_path,monkeypatch):
    for key in ('ASH_DATABASE_URL','ASH_DATABASE_URL_FILE','ASH_DB_PATH'):
        monkeypatch.delenv(key,raising=False)
    monkeypatch.setenv('ASH_DATABASE_URL','')
    with pytest.raises(ValueError,match='empty'):
        configured_target(tmp_path/'existing-hospital.sqlite3')
