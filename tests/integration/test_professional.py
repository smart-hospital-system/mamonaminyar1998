"""Professional upgrade: explicit privileges, frozen designs and bounded operational health."""
import json
import sqlite3
from unittest.mock import patch
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import select
from backend.app.main import create_app
from backend.app.models import Doctor, User, Setting, Patient
from backend.app import maintenance
from scripts.manage import initialize
from scripts.demo import seed
from test_hospital import system, staff, patient, rx_body, login, PASSWORD


def test_ordinary_admin_stays_nonclinical(system):
    app,admin,_=system
    p=patient(admin)
    assert not admin.get('/api/auth/me').json()['user']['physician_owner']
    assert admin.post('/api/prescriptions',json=rx_body(p['id'])).status_code==403


def grant(app):
    with app.state.sessions() as db:
        user=db.scalar(select(User).where(User.role=='admin'))
        db.add(Doctor(user_id=user.id))
        db.commit()


def test_owner_can_write_result_and_discharge_without_relabeling_role(system):
    app,admin,_=system
    grant(app)
    assert admin.get('/api/auth/me').json()['user']['physician_owner']
    p=patient(admin)
    rx=admin.post('/api/prescriptions',json=rx_body(p['id']))
    assert rx.status_code==201,rx.text
    assert admin.post(f"/api/prescriptions/{rx.json()['id']}/confirm",json={'revision':1,'reviewed':True}).status_code==200
    for kind in ('lab','radiology'):
        row=admin.post('/api/orders',json={'patient_id':p['id'],'kind':kind,'title':'TEST ONLY'}).json()
        r=admin.post(f"/api/orders/{row['id']}/result",json={'result':'Test result, not clinical'})
        assert r.status_code==200,r.text
    admission=admin.post('/api/admissions',json={'patient_id':p['id'],'bed':1,'reason':'TEST ONLY'}).json()
    assert admin.post(f"/api/admissions/{admission['id']}/discharge",json={'note':'TEST ONLY discharge'}).status_code==200


def test_studio_is_validated_revisioned_and_cannot_rewrite_confirmation(system):
    app,admin,_=system
    doctor=staff(app,admin,'doctor')
    assert doctor.get('/api/professional/studio').status_code==403
    config=admin.get('/api/professional/studio').json()
    p=patient(admin)
    draft=doctor.post('/api/prescriptions',json=rx_body(p['id'],template_id=200)).json()
    confirmed=doctor.post(f"/api/prescriptions/{draft['id']}/confirm",json={'revision':1,'reviewed':True}).json()
    frozen=confirmed['template_config']
    config['profiles'][9]['heading']='عنوان تازه — <not HTML>'
    r=admin.put('/api/professional/studio',json=config)
    assert r.status_code==200,r.text
    assert r.json()['revision']==2
    assert admin.put('/api/professional/studio',json=config).status_code==409
    assert doctor.get(f"/api/prescriptions/{draft['id']}").json()['template_config']==frozen
    assert admin.get('/api/templates').json()[199]['studio']['heading']==config['profiles'][9]['heading']
    invalid=r.json()
    invalid['profiles'][0]['primary']='red;display:none'
    assert admin.put('/api/professional/studio',json=invalid).status_code==422
    invalid=r.json()
    invalid['profiles'][0]['id']=2
    assert admin.put('/api/professional/studio',json=invalid).status_code==422
    disabled=r.json()
    disabled['enabled']=False
    assert admin.put('/api/professional/studio',json=disabled).status_code==200
    assert 'studio' not in admin.get('/api/templates').json()[0]


def test_department_permissions_and_ten_preferences(system):
    app,admin,_=system
    assert len(admin.get('/api/professional/departments').json())==5
    for role in ('lab','radiology','pharmacy'):
        c=staff(app,admin,role)
        assert list(c.get('/api/professional/departments').json())==[role]
        assert c.get('/api/professional/health').status_code==403
        assert c.post('/api/professional/health/check').status_code==403
        assert c.get('/api/professional/health-summary').status_code==200
    for theme in ('sage','ocean','plum','midnight','rose','sand','slate','mint','lavender','copper'):
        assert admin.put('/api/workspace/preferences',json={'theme':theme}).status_code==200


def test_health_escalation_ack_resolution_does_not_edit_clinical_records(system,tmp_path):
    app,admin,path=system
    p=patient(admin)
    with sqlite3.connect(path) as db:
        before=db.execute('SELECT * FROM patients').fetchall()
    (tmp_path/'release-manifest.json').write_text(json.dumps({'files':{'missing.py':'bad'}}))
    initial=maintenance.inspect(app.state.engine,tmp_path,now=1000000)
    issue=next(a for a in initial['alerts'] if a['code']=='files')
    assert not issue['automatic_repair']
    later=maintenance.inspect(app.state.engine,tmp_path,now=1000000+48*3600)
    assert next(a for a in later['alerts'] if a['code']=='files')['escalated']
    response=admin.post('/api/professional/health/acknowledge',json={'code':'files','first_seen':issue['first_seen']})
    assert response.status_code==200
    assert not next(a for a in response.json()['alerts'] if a['code']=='files')['escalated']
    assert admin.post('/api/professional/health/acknowledge',json={'code':'files','first_seen':issue['first_seen']+1}).status_code==409
    (tmp_path/'release-manifest.json').write_text(json.dumps({'files':{}}))
    resolved=maintenance.inspect(app.state.engine,tmp_path)
    assert any(a['code']=='files' for a in resolved['history'])
    assert not any(a['code']=='files' for a in resolved['alerts'])
    with sqlite3.connect(path) as db:
        assert db.execute('SELECT * FROM patients').fetchall()==before


def test_demo_is_exclusive_isolated_and_clearly_labeled(tmp_path):
    path=tmp_path/'demo.sqlite3'
    real=tmp_path/'ash.sqlite3'
    initialize(real,'director','Real-empty-test',PASSWORD)
    seed(path,PASSWORD)
    with pytest.raises(FileExistsError):
        seed(path,PASSWORD)
    with sqlite3.connect(real) as db:
        assert db.execute('SELECT count(*) FROM patients').fetchone()[0]==0
    with TestClient(create_app(path)) as client:
        login(client,'owner')
        assert client.get('/api/professional/session').json()=={'demo':True}
        assert len(client.get('/api/patients').json())==20
        assert len(client.get('/api/medicines').json())==10
        assert client.get('/api/auth/me').json()['user']['physician_owner']
