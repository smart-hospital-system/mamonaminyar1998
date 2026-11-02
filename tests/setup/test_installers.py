import base64
import json
from pathlib import Path
import subprocess
import threading
import time
from types import SimpleNamespace
from urllib.error import HTTPError
from urllib.request import Request, urlopen
from zipfile import ZipFile

from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.primitives.asymmetric.ed25519 import Ed25519PrivateKey
import pytest
from sqlalchemy import select

from backend.app.activation import PRODUCT, activation_status, canonical, verify_license
from backend.app.database import open_database
from backend.app.models import Setting, User
from backend.app.security import verify_password
from scripts.distribution import load_manifest, make_manifest, verify_files
from scripts.package_releases import build_release
from scripts.setup_finalize import provision
from scripts.setup_wizard import SetupState, check_target, make_server

PASSWORD = 'synthetic-setup-test-password'


def minimal_source(tmp_path):
    root = tmp_path / 'package'
    root.mkdir()
    entries = {'requirements.txt':'fastapi==0.120.0\n', 'requirements-tested.txt':'',
               'backend/app/main.py':'# TEST ONLY', 'scripts/setup_finalize.py':'# TEST ONLY',
               'Start-Hospital.cmd':'@echo off', 'Setup.cmd':'@echo off',
               'installer/index.html':'<!doctype html><h1>Setup</h1>',
               'installer/setup.css':'body{margin:0}', 'installer/setup.js':'"use strict";'}
    for name, content in entries.items():
        path = root / name
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(content)
    return root


def payload(target):
    return {'target':str(target), 'username':'setup-admin','admin_name':'مدیر آزمایشی',
            'password':PASSWORD, 'password_repeat':PASSWORD,
            'hospital':{'name':'شفاخانهٔ آزمایشی ویزارد','template_id':3},
            'desktop_shortcut':False,'license':''}


def key_and_license(installation_id=None, expiry=None):
    key = Ed25519PrivateKey.generate()
    public = base64.b64encode(key.public_key().public_bytes(serialization.Encoding.Raw, serialization.PublicFormat.Raw)).decode()
    issued = int(time.time()) - 10
    value = {'version':1,'product':PRODUCT,'license_id':'test-id','organization':'TEST ONLY',
             'issued_at':issued,'expires_at':expiry,'installation_id':installation_id}
    envelope = {'payload':value, 'signature':base64.b64encode(key.sign(canonical(value))).decode()}
    return key, public, envelope


def test_local_setup_creates_hashed_admin_hospital_and_activation(tmp_path):
    target = tmp_path/'installed'
    target.mkdir()
    result = provision(target,payload(target),{'activation_mode':'local'},'test-install-id')
    assert result == {'ok':True,'activation_mode':'local'}
    engine, sessions = open_database(target/'.data/ash.sqlite3')
    try:
        with sessions() as db:
            user = db.scalar(select(User))
            assert user.username == 'setup-admin'
            assert user.password_hash != PASSWORD and verify_password(PASSWORD,user.password_hash)
            assert json.loads(db.get(Setting,'hospital').value)['template_id'] == 3
            state = activation_status(json.loads(db.get(Setting,'activation').value))
            assert state['status'] == 'ready' and not state['commercial_license']
    finally:
        engine.dispose()
    with pytest.raises(ValueError):
        provision(target,payload(target),{'activation_mode':'local'},'another-id')


@pytest.mark.parametrize('change',[{'password_repeat':'different'},{'username':'bad name'},{'admin_name':'a'},{'password':'short'}])
def test_invalid_activation_does_not_create_database(tmp_path,change):
    target=tmp_path/'invalid'
    value={**payload(target),**change}
    with pytest.raises(ValueError):
        provision(target,value,{'activation_mode':'local'},'id')
    assert not (target/'.data/ash.sqlite3').exists()


def test_signed_license_checks_signature_expiry_product_and_binding(tmp_path):
    key,public,envelope=key_and_license('test-install')
    assert verify_license(envelope,public,'test-install')['organization']=='TEST ONLY'
    mutated=json.loads(json.dumps(envelope))
    mutated['payload']['organization']='tampered'
    with pytest.raises(ValueError): verify_license(mutated,public,'test-install')
    with pytest.raises(ValueError): verify_license(envelope,public,'other-install')
    _,wrong_public,_=key_and_license()
    with pytest.raises(ValueError): verify_license(envelope,wrong_public,'test-install')
    for values in [{'expires_at':int(time.time())-1},{'product':'OTHER'},{'issued_at':int(time.time())+1000}]:
        body={**envelope['payload'],**values}
        signed={'payload':body,'signature':base64.b64encode(key.sign(canonical(body))).decode()}
        with pytest.raises(ValueError):verify_license(signed,public,'test-install')
    target=tmp_path/'signed'
    target.mkdir()
    data={**payload(target),'license':json.dumps(envelope)}
    assert provision(target,data,{'activation_mode':'signed','license_public_key':public},'test-install')['ok']


def test_unsigned_or_expired_license_never_blocks_existing_records():
    _,public,envelope=key_and_license('i',int(time.time())-1)
    status=activation_status({'mode':'signed','installation_id':'i','public_key':public,'license':envelope})
    assert status['status']=='needs_review' and 'قطع نشده' in status['message']


def test_two_releases_are_separate_and_never_include_runtime_data(tmp_path):
    root=minimal_source(tmp_path)
    (root/'.data').mkdir()
    (root/'.data'/'patients.sqlite3').write_bytes(b'SECRET')
    (root/'scripts'/'issuer.pem').write_bytes(b'PRIVATE KEY')
    wheels=tmp_path/'wheels'
    wheels.mkdir()
    (wheels/'test-0.0.1-py3-none-any.whl').write_bytes(b'TEST')
    for mode in ('online','offline'):
        output=tmp_path/f'{mode}.zip'
        build_release(root,output,mode,wheels)
        with ZipFile(output) as archive:
            names=archive.namelist()
            assert not any('.data' in n or 'issuer.pem' in n or '.venv' in n for n in names)
            assert any(n.endswith('Setup.cmd') for n in names)
            assert any(n.endswith('.whl') for n in names)==(mode=='offline')
            manifest=json.loads(archive.read(f'ASH-Nexus-{mode.capitalize()}/release-manifest.json'))
            assert manifest['mode']==mode and manifest['activation_mode']=='local'
            assert 'Python runtime installer' in archive.read(f'ASH-Nexus-{mode.capitalize()}/START-HERE.txt').decode()
        assert output.with_suffix('.zip.sha256.txt').exists()


def test_tampered_or_missing_sources_are_rejected(tmp_path):
    root=minimal_source(tmp_path)
    manifest=make_manifest(root,'online')
    verify_files(root,manifest)
    (root/'requirements.txt').write_text('tampered')
    with pytest.raises(ValueError):verify_files(root,manifest)
    manifest['files']['../outside.txt']='anything'
    with pytest.raises(ValueError):verify_files(root,manifest)


def test_path_checks_never_overwrite_existing_data(tmp_path):
    root=minimal_source(tmp_path)
    for value in (str(root),str(root/'inside'),str(tmp_path),str(Path(tmp_path.anchor))):
        with pytest.raises(ValueError):check_target(root,value)
    destination=tmp_path/'installed'
    destination.mkdir()
    (destination/'important.txt').write_text('keep')
    with pytest.raises(ValueError):check_target(root,str(destination))
    assert (destination/'important.txt').read_text()=='keep'
    empty=tmp_path/'empty'
    empty.mkdir()
    assert check_target(root,str(empty))==empty


def test_installer_online_and_offline_commands_and_secret_handling(tmp_path):
    root=minimal_source(tmp_path)
    for mode in ('online','offline'):
        # Development test manifest permits Linux, but install commands match Windows packaging mode.
        manifest=make_manifest(root,'online')
        manifest.update(mode=mode,runtime='development')
        (root/'release-manifest.json').write_text(json.dumps(manifest))
        calls=[]
        def runner(command,**kwargs):
            calls.append((command,kwargs))
            if 'scripts.setup_finalize' in command:
                body=json.loads(kwargs['input'])
                response=provision(Path(kwargs['cwd']),body['payload'],body['manifest'],body['installation_id'])
                return SimpleNamespace(returncode=0,stdout=json.dumps(response),stderr='')
            return SimpleNamespace(returncode=0,stdout='OK',stderr='')
        state=SetupState(root,runner)
        data=payload(tmp_path/f'installed-{mode}')
        state.begin(data).join(timeout=10)
        assert state.phase=='ready',state.public()
        assert data=={}  # Credential request is discarded.
        assert PASSWORD not in json.dumps(state.public())
        assert PASSWORD not in str([command for command,_ in calls])
        pip=next(command for command,_ in calls if 'install' in command)
        assert ('--no-index' in pip)==(mode=='offline')
        assert ('--index-url' in pip)==(mode=='online')
        assert '--isolated' in pip
        assert (state.target/'.ash-install.json').is_file()


def test_dependency_failure_never_reports_ready_or_creates_database(tmp_path):
    root=minimal_source(tmp_path)
    def fail(command,**kwargs):
        return SimpleNamespace(returncode=1,stdout='',stderr='potentially sensitive subprocess output')
    state=SetupState(root,fail)
    state.begin(payload(tmp_path/'failed')).join(timeout=10)
    assert state.phase=='failed'
    assert not (state.target/'.data/ash.sqlite3').exists()
    assert 'sensitive' not in json.dumps(state.public())
    assert not (state.target/'.ash-install.json').exists()


def test_wizard_http_is_loopback_only_authenticated_and_origin_guarded(tmp_path):
    root=minimal_source(tmp_path)
    state=SetupState(root)
    server=make_server(state)
    thread=threading.Thread(target=server.serve_forever,daemon=True)
    thread.start()
    base=f'http://127.0.0.1:{server.server_port}'
    def request(path,headers=None,body=None):
        return urlopen(Request(base+path,headers=headers or {},data=json.dumps(body).encode() if body is not None else None),timeout=3)
    try:
        with request('/') as response:
            assert state.token.encode() not in response.read()
            assert "frame-ancestors 'none'" in response.headers['Content-Security-Policy']
        with pytest.raises(HTTPError) as error:request('/api/status')
        assert error.value.code==401
        auth={'Authorization':'Bearer '+state.token}
        with request('/api/status',auth) as response:assert json.load(response)['phase']=='idle'
        for values in ({'Host':'evil.example'},{'Origin':'https://evil.example'},{'Sec-Fetch-Site':'cross-site'}):
            with pytest.raises(HTTPError) as error:request('/api/status',{**auth,**values})
            assert error.value.code==403
        with pytest.raises(HTTPError) as error:request('/../requirements.txt',auth)
        assert error.value.code==404
    finally:
        server.shutdown()
        server.server_close()
        thread.join(timeout=5)


def test_failed_signed_activation_retries_without_reinstalling_or_overwriting_db(tmp_path):
    root=minimal_source(tmp_path)
    manifest=make_manifest(root,'online')
    _,public,_=key_and_license()
    manifest.update(runtime='development',activation_mode='signed',license_public_key=public)
    (root/'release-manifest.json').write_text(json.dumps(manifest))
    calls=[]
    state=None
    def runner(command,**kwargs):
        calls.append(command)
        if 'scripts.setup_finalize' in command:
            body=json.loads(kwargs['input'])
            try:
                result=provision(Path(kwargs['cwd']),body['payload'],body['manifest'],body['installation_id'])
                return SimpleNamespace(returncode=0,stdout=json.dumps(result),stderr='')
            except ValueError:
                return SimpleNamespace(returncode=2,stdout=json.dumps({'ok':False,'message':'Invalid test license'}),stderr='')
        return SimpleNamespace(returncode=0,stdout='OK',stderr='')
    state=SetupState(root,runner)
    target=tmp_path/'retry'
    state.begin(payload(target)).join(timeout=10)
    assert state.phase=='needs_activation'
    assert not (target/'.data/ash.sqlite3').exists()
    pip_count=len([c for c in calls if 'install' in c])
    # Issue a valid file for the same installation and keep its public key.
    key,public,envelope=key_and_license(state.installation_id)
    state.manifest['license_public_key']=public
    retry={**payload(target),'license':json.dumps(envelope)}
    state.begin(retry).join(timeout=10)
    assert state.phase=='ready'
    assert len([c for c in calls if 'install' in c])==pip_count
    assert (target/'.data/ash.sqlite3').exists()
