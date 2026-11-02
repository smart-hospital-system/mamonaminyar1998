"""Integration tests use only generated test records and temporary databases."""
import sqlite3
import time
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import select
from backend.app.backups import restore_to_new, validate_snapshot
from backend.app.main import create_app
from backend.app.models import LoginSession, Patient, User
from scripts.manage import initialize

PASSWORD = 'test-only-password-123456'
PATIENT = {'first_name': 'آزمایشی', 'last_name': 'نمونه', 'age': 32, 'sex': 'female', 'allergies': 'حساسیت آزمایشی'}


def login(client, username='admin', password=PASSWORD):
    response = client.post('/api/auth/login', json={'username': username, 'password': password}, headers={'X-ASH-Client': 'web'})
    assert response.status_code == 200, response.text
    client.headers['X-CSRF-Token'] = response.json()['csrf']
    return response


@pytest.fixture
def system(tmp_path):
    path = tmp_path / 'ash.sqlite3'
    initialize(path, 'admin', 'مدیر آزمایشی', PASSWORD)
    app = create_app(path, secure_cookie=False)
    with TestClient(app) as admin:
        login(admin)
        yield app, admin, path


def staff(app, admin, role, username=None):
    name = username or role
    response = admin.post('/api/auth/users', json={'name': f'کارمند {name}', 'username': name, 'password': PASSWORD, 'role': role})
    assert response.status_code == 201, response.text
    client = TestClient(app)
    login(client, name)
    return client


def patient(client):
    r = client.post('/api/patients', json=PATIENT)
    assert r.status_code == 201, r.text
    return r.json()


def rx_body(patient_id, **values):
    return {'patient_id': patient_id, 'complaint': 'شکایت آزمایشی', 'diagnosis': 'تشخیص نوشته‌شدهٔ داکتر', 'template_id': 7, 'items': [], **values}


def test_no_auth_and_csrf_are_enforced(system):
    app, admin, _ = system
    guest = TestClient(app)
    assert guest.get('/api/patients').status_code == 401
    assert guest.post('/api/backups').status_code == 401
    assert admin.post('/api/patients', json=PATIENT, headers={'X-CSRF-Token': 'wrong'}).status_code == 403
    assert guest.post('/api/auth/login', json={'username':'admin','password':PASSWORD}).status_code == 403


def test_password_is_hashed_and_sessions_are_not_raw_tokens(system):
    app, admin, _ = system
    with app.state.sessions() as db:
        user = db.scalar(select(User))
        assert user.password_hash.startswith('scrypt$')
        assert PASSWORD not in user.password_hash
        row = db.scalar(select(LoginSession))
        assert row.digest != admin.cookies.get('ash_session')
    cookie = login(admin).headers['set-cookie'].lower()
    assert 'httponly' in cookie and 'samesite=strict' in cookie


def test_logout_invalidates_copied_cookie(system):
    app, admin, _ = system
    stolen = admin.cookies.get('ash_session')
    assert admin.post('/api/auth/logout').status_code == 200
    other = TestClient(app)
    other.cookies.set('ash_session', stolen)
    assert other.get('/api/auth/me').status_code == 401


def test_expired_session_rejected(system):
    app, admin, _ = system
    with app.state.sessions() as db:
        session = db.scalar(select(LoginSession))
        session.expires = int(time.time()) - 1
        db.commit()
    assert admin.get('/api/auth/me').status_code == 401


def test_failed_login_limiter(system):
    app, _, _ = system
    client = TestClient(app)
    for _ in range(10):
        assert client.post('/api/auth/login', json={'username':'nonexistent','password':'wrong'}, headers={'X-ASH-Client':'web'}).status_code == 401
    assert client.post('/api/auth/login', json={'username':'nonexistent','password':'wrong'}, headers={'X-ASH-Client':'web'}).status_code == 429


@pytest.mark.parametrize('role', ['doctor','reception','pharmacy','lab','radiology'])
def test_staff_cannot_manage_users_or_backup(system, role):
    app, admin, _ = system
    client = staff(app, admin, role)
    assert client.get('/api/auth/users').status_code == 403
    assert client.post('/api/backups').status_code == 403
    assert client.get('/api/audit').status_code == 403
    if role in ('pharmacy','lab','radiology'):
        assert client.get('/api/patients').status_code == 403


def test_patient_validation_update_and_literal_search(system):
    _, admin, _ = system
    p = patient(admin)
    second = patient(admin)
    assert p['mrn'] != second['mrn']
    assert admin.post('/api/patients', json={**PATIENT, 'age':-1}).status_code == 422
    assert admin.post('/api/patients', json={**PATIENT, 'unknown_field':1}).status_code == 422
    assert admin.put(f"/api/patients/{p['id']}", json={**PATIENT, 'phone':'test-phone'}).status_code == 200
    assert admin.get('/api/patients', params={'q':p['mrn']}).json()[0]['phone'] == 'test-phone'
    assert admin.get('/api/patients', params={'q':'%'}).json() == []


def test_rx_requires_doctor_review_and_never_forces_medicine(system):
    app, admin, _ = system
    p = patient(admin)
    body = rx_body(p['id'])
    assert admin.post('/api/prescriptions', json=body).status_code == 403
    doctor = staff(app, admin, 'doctor')
    r = doctor.post('/api/prescriptions', json=body)
    assert r.status_code == 201, r.text
    assert r.json()['status'] == 'draft' and r.json()['items'] == []
    rx_id = r.json()['id']
    assert doctor.post(f'/api/prescriptions/{rx_id}/confirm', json={'reviewed':False,'revision':1}).status_code == 422
    second = staff(app, admin, 'doctor', 'doctor2')
    assert second.post(f'/api/prescriptions/{rx_id}/confirm', json={'reviewed':True,'revision':1}).status_code == 403
    assert doctor.post(f'/api/prescriptions/{rx_id}/confirm', json={'reviewed':True,'revision':1}).json()['status'] == 'confirmed'
    assert doctor.post(f'/api/prescriptions/{rx_id}/confirm', json={'reviewed':True,'revision':1}).status_code == 409


def test_all_two_hundred_templates_and_hospital_update(system):
    _, admin, _ = system
    templates = admin.get('/api/templates').json()
    assert len(templates) == 200
    assert len({(t['header'],t['border'],t['table'],t['footer'],t['density']) for t in templates[:20]}) == 20
    hospital = admin.get('/api/hospital').json()
    result = admin.put('/api/hospital', json={**hospital,'name':'نام جدید آزمایشی','template_id':200})
    assert result.status_code == 200, result.text
    assert admin.get('/api/hospital').json()['template_id'] == 200
    assert admin.put('/api/hospital', json={**hospital,'template_id':201}).status_code == 422


def test_medical_support_declares_limits_and_does_not_dose(system):
    app, admin, _ = system
    p = patient(admin)
    doctor = staff(app, admin, 'doctor')
    item = dict(name='Warfarin', form='test', dose='manual', frequency='manual', duration='manual', quantity=1)
    data = rx_body(p['id'], items=[item, {**item,'name':'Aspirin'}])
    r = doctor.post('/api/knowledge/review', json=data).json()
    assert r['auto_dosing'] is False and r['mandatory_injections'] is False
    assert len(r['warnings']) >= 2 and r['disclaimer']
    suggestions = doctor.get('/api/knowledge/symptoms', params={'q':'س'}).json()
    assert suggestions['matches'] and suggestions['diagnosis_engine'] is False
    assert admin.get('/api/knowledge/symptoms', params={'q':'س'}).status_code == 403


def test_stock_is_atomic_and_never_negative(system):
    app, admin, _ = system
    pharmacist = staff(app, admin, 'pharmacy')
    item = pharmacist.post('/api/medicines', json={'name':'TEST ONLY','form':'test','strength':'test','stock':5,'reorder':1}).json()
    def withdraw(_):
        return pharmacist.post(f"/api/medicines/{item['id']}/stock", json={'delta':-4,'reason':'test withdrawal'}).status_code
    with ThreadPoolExecutor(2) as pool:
        assert sorted(pool.map(withdraw, range(2))) == [200,409]
    assert pharmacist.get('/api/medicines').json()[0]['stock'] == 1
    assert admin.post('/api/medicines', json={'name':'X','form':'X','strength':'X','stock':-1}).status_code == 422


def test_order_department_permissions_and_result_immutability(system):
    app, admin, _ = system
    p = patient(admin)
    doctor = staff(app, admin, 'doctor')
    lab = staff(app, admin, 'lab')
    radio = staff(app, admin, 'radiology')
    order = doctor.post('/api/orders',json={'patient_id':p['id'],'kind':'lab','title':'TEST ONLY'}).json()
    assert radio.get('/api/orders?kind=lab').status_code == 403
    assert radio.post(f"/api/orders/{order['id']}/result",json={'result':'test'}).status_code == 403
    assert lab.post(f"/api/orders/{order['id']}/result",json={'result':'test result'}).status_code == 200
    assert lab.post(f"/api/orders/{order['id']}/result",json={'result':'overwrite'}).status_code == 409
    assert doctor.get('/api/orders?kind=lab').json()[0]['result'] == 'test result'


def test_bed_capacity_unique_patient_and_discharge(system):
    app, admin, _ = system
    p, p2 = patient(admin), patient(admin)
    doctor = staff(app, admin, 'doctor')
    r = doctor.post('/api/admissions',json={'patient_id':p['id'],'bed':1,'reason':'test admission'})
    assert r.status_code == 201
    assert doctor.post('/api/admissions',json={'patient_id':p2['id'],'bed':1,'reason':'test'}).status_code == 409
    assert doctor.post('/api/admissions',json={'patient_id':p['id'],'bed':2,'reason':'test'}).status_code == 409
    assert doctor.post('/api/admissions',json={'patient_id':p2['id'],'bed':11,'reason':'test'}).status_code == 422
    assert doctor.post(f"/api/admissions/{r.json()['id']}/discharge",json={'note':'test discharge'}).status_code == 200
    assert doctor.post('/api/admissions',json={'patient_id':p2['id'],'bed':1,'reason':'test'}).status_code == 201


def test_deactivation_revokes_sessions(system):
    app, admin, _ = system
    doctor = staff(app, admin, 'doctor')
    user_id = doctor.get('/api/auth/me').json()['user']['id']
    assert admin.post(f'/api/auth/users/{user_id}/deactivate').status_code == 200
    assert doctor.get('/api/auth/me').status_code == 401


def test_backup_restore_integrity_and_no_live_overwrite(system, tmp_path):
    app, admin, path = system
    p = patient(admin)
    doctor = staff(app, admin, 'doctor')
    doctor.post('/api/prescriptions',json=rx_body(p['id']))
    backup = admin.post('/api/backups')
    assert backup.status_code == 200, backup.text
    source = tmp_path / 'backup.sqlite3'
    source.write_bytes(backup.content)
    validate_snapshot(source)
    restored = tmp_path / 'restored.sqlite3'
    restore_to_new(source, restored)
    with sqlite3.connect(restored) as db:
        assert db.execute('SELECT COUNT(*) FROM patients').fetchone()[0] == 1
        assert db.execute('SELECT COUNT(*) FROM prescriptions').fetchone()[0] == 1
        assert db.execute('SELECT COUNT(*) FROM sessions').fetchone()[0] == 0
        assert db.execute("SELECT COUNT(*) FROM audit_logs WHERE action='database_restored'").fetchone()[0] == 1
    with pytest.raises(FileExistsError):
        restore_to_new(source, path)
    assert admin.get('/api/auth/me').status_code == 200
    with TestClient(create_app(restored)) as restored_client:
        login(restored_client)
        assert restored_client.get('/api/prescriptions').json()[0]['patient']['mrn'] == p['mrn']
    bad = tmp_path / 'bad.sqlite3'
    bad.write_bytes(b'not a database')
    with pytest.raises(ValueError):
        restore_to_new(bad, tmp_path/'invalid-target.sqlite3')
    assert not (tmp_path/'invalid-target.sqlite3').exists()


def test_restart_preserves_records(system):
    _, admin, path = system
    p = patient(admin)
    with TestClient(create_app(path)) as restarted:
        login(restarted)
        assert restarted.get('/api/patients').json()[0]['mrn'] == p['mrn']


def test_security_headers_static_files_and_audit(system):
    _, admin, _ = system
    response = admin.get('/')
    assert response.status_code == 200
    assert response.headers['cache-control'] == 'no-store'
    assert "script-src 'self'" in response.headers['content-security-policy']
    assert admin.get('/assets/app.js').status_code == 200
    assert admin.get('/assets/style.css').status_code == 200
    assert admin.get('/assets/../.data/ash.sqlite3').status_code == 404
    patient(admin)
    events = admin.get('/api/audit').json()
    assert any(e['action']=='patient_created' for e in events)
    assert PASSWORD not in str(events)


def test_init_does_not_overwrite_existing_database(system):
    _, _, path = system
    with pytest.raises(ValueError):
        initialize(path,'new','new',PASSWORD)


def test_draft_edit_optimistic_lock_and_confirmed_snapshot(system):
    app, admin, _ = system
    p = patient(admin)
    doctor = staff(app, admin, 'doctor')
    row = doctor.post('/api/prescriptions', json=rx_body(p['id'])).json()
    updated = {**rx_body(p['id']), 'revision':1, 'notes':'edited by doctor'}
    r = doctor.put(f"/api/prescriptions/{row['id']}", json=updated)
    assert r.status_code == 200, r.text
    assert r.json()['revision'] == 2 and r.json()['notes'] == 'edited by doctor'
    assert doctor.put(f"/api/prescriptions/{row['id']}", json=updated).status_code == 409
    assert doctor.post(f"/api/prescriptions/{row['id']}/confirm", json={'reviewed':True,'revision':1}).status_code == 409
    confirmed = doctor.post(f"/api/prescriptions/{row['id']}/confirm", json={'reviewed':True,'revision':2})
    assert confirmed.status_code == 200
    doctor.put(f"/api/patients/{p['id']}", json={**PATIENT, 'first_name':'نام تغییرکرده'})
    h = admin.get('/api/hospital').json()
    admin.put('/api/hospital', json={**h,'name':'شفاخانهٔ تغییرکرده'})
    saved = doctor.get('/api/prescriptions').json()[0]
    assert saved['patient']['first_name'] == PATIENT['first_name']
    assert saved['hospital']['name'] == h['name']
    assert doctor.put(f"/api/prescriptions/{row['id']}", json={**updated,'revision':3}).status_code == 409


def test_password_change_revokes_all_sessions(system):
    app, admin, _ = system
    another = TestClient(app)
    login(another)
    body = {'current_password':'incorrect','new_password':'new-test-password-12345'}
    assert admin.post('/api/auth/password',json=body).status_code == 400
    assert admin.post('/api/auth/password',json={**body,'current_password':PASSWORD}).status_code == 200
    assert another.get('/api/auth/me').status_code == 401
    assert admin.get('/api/auth/me').status_code == 401
    login(admin,password=body['new_password'])


def test_no_hidden_default_data_or_credentials(system):
    app, admin, _ = system
    assert admin.get('/api/patients').json() == []
    assert admin.get('/api/prescriptions').json() == []
    assert admin.get('/api/medicines').json() == []
    with app.state.sessions() as db:
        assert db.scalar(select(User)).username == 'admin'
    assert admin.get('/api/dashboard').json()['patients'] == 0


def test_fractional_patient_weight_is_preserved(system):
    _, admin, _ = system
    response = admin.post('/api/patients',json={**PATIENT,'age':0,'weight_kg':2.35})
    assert response.status_code == 201
    assert response.json()['weight_kg'] == 2.35
    assert admin.get('/api/patients',params={'q':response.json()['mrn']}).json()[0]['weight_kg'] == 2.35


def test_activation_status_and_renewal_are_admin_only(system):
    app,admin,_=system
    assert admin.get('/api/activation').json()['commercial_license'] is False
    assert admin.post('/api/activation',json={'license':'{}'}).status_code==409
    doctor=staff(app,admin,'doctor')
    assert doctor.get('/api/activation').status_code==403
    assert doctor.post('/api/activation',json={'license':'{}'}).status_code==403


def test_signed_license_renewal_checks_signature_and_keeps_records_accessible(system):
    import base64
    import json
    from cryptography.hazmat.primitives import serialization
    from cryptography.hazmat.primitives.asymmetric.ed25519 import Ed25519PrivateKey
    from backend.app.activation import PRODUCT, canonical
    from backend.app.models import Setting
    app,admin,_=system
    p=patient(admin)
    key=Ed25519PrivateKey.generate()
    public=base64.b64encode(key.public_key().public_bytes(serialization.Encoding.Raw,serialization.PublicFormat.Raw)).decode()
    body={'version':1,'product':PRODUCT,'license_id':'test-renewal','organization':'TEST ONLY',
          'issued_at':int(time.time())-100,'expires_at':int(time.time())-1,'installation_id':'test-install'}
    def signed(value):
        return {'payload':value,'signature':base64.b64encode(key.sign(canonical(value))).decode()}
    with app.state.sessions() as db:
        db.add(Setting(key='activation',value=json.dumps({'mode':'signed','installation_id':'test-install',
                      'public_key':public,'license':signed(body)})))
        db.commit()
    assert admin.get('/api/activation').json()['status']=='needs_review'
    assert admin.get('/api/patients').json()[0]['mrn']==p['mrn']
    valid=signed({**body,'expires_at':int(time.time())+86400})
    tampered=json.loads(json.dumps(valid))
    tampered['payload']['organization']='TAMPERED'
    assert admin.post('/api/activation',json={'license':json.dumps(tampered)}).status_code==422
    result=admin.post('/api/activation',json={'license':json.dumps(valid)})
    assert result.status_code==200,result.text
    assert result.json()['status']=='ready'
    assert admin.get('/api/activation').json()['license_id']=='test-renewal'
