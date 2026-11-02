"""Operational and migration regressions; synthetic test data only."""
import hashlib
import json
import sqlite3
import time
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor
from unittest.mock import patch
import pytest
from fastapi.testclient import TestClient
from backend.app.backups import validate_snapshot, restore_to_new
from backend.app.main import create_app
from backend.app.templates import TEMPLATES
from backend.app.knowledge import VOCABULARY, symptom_suggestions
from scripts.manage import initialize
from scripts.upgrade_database import upgrade
from test_hospital import system, staff, patient, rx_body, login, PASSWORD


def test_all_200_layout_signatures_are_real_and_old_ids_stable():
    assert [t['id'] for t in TEMPLATES]==list(range(1,201))
    assert len({tuple(t[k] for k in ('header','border','table','footer','density','ornament','typography')) for t in TEMPLATES})==200
    assert len({t['collection'] for t in TEMPLATES})==10
    assert TEMPLATES[19]['name']=='آرشیف استاندارد'


def test_extended_design_does_not_rebuild_legacy_rx_and_freezes_confirmation(system):
    app,admin,path=system
    p=patient(admin)
    doctor=staff(app,admin,'doctor')
    draft=doctor.post('/api/prescriptions',json=rx_body(p['id'],template_id=200)).json()
    assert draft['template_id']==200 and draft['template_config'] is None
    changed=doctor.put(f"/api/prescriptions/{draft['id']}",json=rx_body(p['id'],template_id=177,revision=1)).json()
    assert changed['template_id']==177
    result=doctor.post(f"/api/prescriptions/{draft['id']}/confirm",json={'revision':2,'reviewed':True})
    assert result.status_code==200,result.text
    snapshot=result.json()['template_config']
    assert {k:v for k,v in snapshot.items() if k!='studio'}==TEMPLATES[176]
    assert snapshot['studio']['family']=='editorial'
    with sqlite3.connect(path) as db:
        assert db.execute('SELECT template_id FROM prescriptions').fetchone()[0]==17
    original=TEMPLATES[176]['name']
    try:
        TEMPLATES[176]['name']='future change'
        assert doctor.get(f"/api/prescriptions/{draft['id']}").json()['template_config']==snapshot
    finally:
        TEMPLATES[176]['name']=original


def test_preferences_are_private_validated_and_persisted(system):
    app,admin,_=system
    lab=staff(app,admin,'lab')
    pref={'theme':'midnight','density':'compact','font_size':'large','favorites':[200,2,200]}
    response=lab.put('/api/workspace/preferences',json=pref)
    assert response.status_code==200 and response.json()['favorites']==[2,200]
    assert lab.get('/api/workspace/preferences').json()['theme']=='midnight'
    assert admin.get('/api/workspace/preferences').json()['favorites']==[]
    assert lab.put('/api/workspace/preferences',json={**pref,'favorites':[201]}).status_code==422
    assert lab.put('/api/workspace/preferences',json={**pref,'theme':'<script>'}).status_code==422
    assert lab.put('/api/workspace/preferences',json=pref,headers={'X-CSRF-Token':'bad'}).status_code==403


def test_tasks_private_optimistic_and_audited(system):
    app,admin,path=system
    lab=staff(app,admin,'lab')
    task=admin.post('/api/workspace/tasks',json={'title':'TEST ONLY','priority':'urgent','due_at':int(time.time())-5}).json()
    assert lab.get('/api/workspace/tasks').json()['items']==[]
    assert lab.patch(f"/api/workspace/tasks/{task['id']}",json={'done':True,'revision':1}).status_code==404
    assert admin.get('/api/workspace/overview').json()['tasks_overdue']==1
    assert admin.patch(f"/api/workspace/tasks/{task['id']}",json={'done':True,'revision':1}).status_code==200
    assert admin.patch(f"/api/workspace/tasks/{task['id']}",json={'done':False,'revision':1}).status_code==409
    assert admin.get('/api/workspace/overview').json()['tasks_open']==0
    with sqlite3.connect(path) as db:
        assert db.execute("SELECT count(*) FROM audit_logs WHERE action='workspace_task_changed'").fetchone()[0]==1


def new_appointment(app,admin):
    p=patient(admin)
    doctor=staff(app,admin,'doctor')
    doctor_id=admin.get('/api/workspace/clinicians').json()[0]['id']
    data={'patient_id':p['id'],'doctor_id':doctor_id,'starts_at':int(time.time())//1800*1800,'reason':'TEST ONLY'}
    response=admin.post('/api/workspace/appointments',json=data)
    assert response.status_code==201,response.text
    return doctor,data,response.json()


def test_appointment_collision_states_and_release(system):
    app,admin,_=system
    doctor,data,a=new_appointment(app,admin)
    assert admin.post('/api/workspace/appointments',json=data).status_code==409
    assert admin.post('/api/workspace/appointments',json={**data,'starts_at':data['starts_at']+1}).status_code==422
    assert doctor.patch(f"/api/workspace/appointments/{a['id']}",json={'status':'completed','revision':1}).status_code==409
    assert admin.patch(f"/api/workspace/appointments/{a['id']}",json={'status':'completed','revision':1}).status_code==403
    assert admin.patch(f"/api/workspace/appointments/{a['id']}",json={'status':'checked_in','revision':1}).status_code==200
    assert admin.patch(f"/api/workspace/appointments/{a['id']}",json={'status':'cancelled','revision':1}).status_code==409
    assert doctor.patch(f"/api/workspace/appointments/{a['id']}",json={'status':'completed','revision':2}).status_code==200
    assert admin.patch(f"/api/workspace/appointments/{a['id']}",json={'status':'cancelled','revision':3}).status_code==409
    assert admin.post('/api/workspace/appointments',json=data).status_code==201
    assert admin.get('/api/workspace/appointments?day=2026-02-31').status_code==422


def test_only_assigned_doctor_completes_appointment(system):
    app,admin,_=system
    doctor,data,a=new_appointment(app,admin)
    other=staff(app,admin,'doctor','anotherdoctor')
    admin.patch(f"/api/workspace/appointments/{a['id']}",json={'status':'checked_in','revision':1})
    assert other.patch(f"/api/workspace/appointments/{a['id']}",json={'status':'completed','revision':2}).status_code==403


@pytest.mark.parametrize('role',['reception','pharmacy','lab','radiology','admin'])
def test_non_doctors_cannot_record_clinical_notes(system,role):
    app,admin,_=system
    p=patient(admin)
    actor=admin if role=='admin' else staff(app,admin,role)
    assert actor.post('/api/workspace/visits',json={'patient_id':p['id'],'subjective':'TEST ONLY'}).status_code==403
    if role not in ('reception','admin'):
        assert actor.get('/api/workspace/appointments').status_code==403
    if role!='admin':
        assert actor.get(f"/api/workspace/patients/{p['id']}/dossier").status_code==403


def test_notes_are_append_only_attributable_and_join_timeline(system):
    app,admin,path=system
    p=patient(admin)
    doctor=staff(app,admin,'doctor')
    body={'patient_id':p['id'],'subjective':'TEST ONLY, NOT A CLINICAL RECORD','vitals':{'pulse':72,'temperature':36.5,'spo2':98}}
    response=doctor.post('/api/workspace/visits',json=body)
    assert response.status_code==201,response.text
    note=response.json()
    assert note['vitals']['pulse']==72 and note['author_id']
    assert doctor.patch(f"/api/workspace/visits/{note['id']}",json=body).status_code in (404,405)
    assert doctor.delete(f"/api/workspace/visits/{note['id']}").status_code in (404,405)
    amendment=doctor.post('/api/workspace/visits',json={**body,'subjective':'TEST ONLY AMENDMENT','amends_id':note['id']})
    assert amendment.status_code==201
    other=staff(app,admin,'doctor','anotherdoctor')
    assert other.post('/api/workspace/visits',json={**body,'amends_id':note['id']}).status_code==403
    second=patient(admin)
    assert doctor.post('/api/workspace/visits',json={**body,'patient_id':second['id'],'amends_id':note['id']}).status_code==403
    dossier=doctor.get(f"/api/workspace/patients/{p['id']}/dossier").json()
    assert dossier['counts']['visits']==2 and len(dossier['timeline'])==2
    assert len(dossier['checklist'])==5
    with sqlite3.connect(path) as db:
        assert db.execute('SELECT subjective FROM visit_notes WHERE id=?',(note['id'],)).fetchone()[0]==body['subjective']


@pytest.mark.parametrize('vitals',[{'temperature':99},{'weight_kg':0},{'spo2':101},{'pulse':0},{'systolic':1000}])
def test_vital_input_bounds_not_clinical_thresholds(system,vitals):
    app,admin,_=system
    p=patient(admin)
    doctor=staff(app,admin,'doctor')
    assert doctor.post('/api/workspace/visits',json={'patient_id':p['id'],'subjective':'TEST ONLY','vitals':vitals}).status_code==422


def test_vocabulary_explicit_normalized_and_never_rewrites_negative_statements(system):
    app,admin,_=system
    doctor=staff(app,admin,'doctor')
    assert len(VOCABULARY)==160==len({row['label'] for row in VOCABULARY})
    assert symptom_suggestions('بدون سردرد')==[]
    assert symptom_suggestions('no headache')==[]
    assert symptom_suggestions('dry cough')[0]['label']=='سرفه خشک'
    assert symptom_suggestions('سرفه خشك')[0]['label']=='سرفه خشک'
    assert any(x['match']=='possible_typo' for x in symptom_suggestions('headace'))
    response=doctor.get('/api/knowledge/symptoms?q=headace').json()
    assert response['vocabulary_size']==160
    assert response['clinical_advice'] is False and response['auto_replace'] is False


def test_inventory_search_local_no_sql_wildcard_expansion(system):
    app,admin,_=system
    doctor=staff(app,admin,'doctor')
    admin.post('/api/medicines',json={'name':'TEST aspirin','strength':'TEST ONLY','form':'TEST','stock':8})
    response=doctor.get('/api/workspace/inventory-search?q=aspirin').json()
    assert len(response['items'])==1 and response['items'][0]['stock']==8
    assert doctor.get('/api/workspace/inventory-search?q=%25').json()['items']==[]
    lab=staff(app,admin,'lab')
    assert lab.get('/api/workspace/inventory-search?q=aspirin').status_code==403


def legacy_database(tmp_path):
    path=tmp_path/'legacy.sqlite3'
    initialize(path,'admin','TEST ADMIN',PASSWORD)
    app=create_app(path,secure_cookie=False)
    with TestClient(app) as client:
        login(client)
        p=patient(client)
        doctor=staff(app,client,'doctor')
        rx=doctor.post('/api/prescriptions',json=rx_body(p['id'])).json()
        confirmed=doctor.post(f"/api/prescriptions/{rx['id']}/confirm",json={'reviewed':True,'revision':1}).json()
    with sqlite3.connect(path) as db:
        for table in ('print_designs','user_preferences','work_tasks','appointments','visit_notes'):
            db.execute(f'DROP TABLE {table}')
        db.execute("UPDATE settings SET value='1' WHERE key='schema_version'")
        db.commit()
        db.execute('PRAGMA wal_checkpoint(TRUNCATE)')
    return path,confirmed


def test_upgrade_preserves_original_records_snapshots_and_revokes_sessions(tmp_path):
    source,rx=legacy_database(tmp_path)
    before=hashlib.sha256(source.read_bytes()).hexdigest()
    destination=tmp_path/'upgraded.sqlite3'
    upgrade(source,destination)
    assert hashlib.sha256(source.read_bytes()).hexdigest()==before
    validate_snapshot(destination)
    with sqlite3.connect(destination) as db:
        assert db.execute('SELECT count(*) FROM sessions').fetchone()[0]==0
        assert db.execute("SELECT value FROM settings WHERE key='schema_version'").fetchone()[0]=='2'
    with TestClient(create_app(destination,secure_cookie=False)) as admin:
        login(admin)
        result=admin.get(f"/api/prescriptions/{rx['id']}").json()
        assert result['patient']==rx['patient'] and result['hospital']==rx['hospital'] and result['status']=='confirmed'
        assert result['template_id']==7 and result['template_config'] is None
    with pytest.raises(FileExistsError):
        upgrade(source,destination)
    with pytest.raises(RuntimeError):
        with TestClient(create_app(source)):
            pass


def test_failed_upgrade_removes_partial_destination_keeps_source(tmp_path):
    source,_=legacy_database(tmp_path)
    before=source.read_bytes()
    destination=tmp_path/'failed.sqlite3'
    with patch('scripts.upgrade_database.Base.metadata.create_all',side_effect=RuntimeError('test fault')):
        with pytest.raises(RuntimeError):
            upgrade(source,destination)
    assert not destination.exists()
    assert source.read_bytes()==before


def test_schema2_backup_round_trip_includes_workflows(system,tmp_path):
    app,admin,path=system
    doctor,data,a=new_appointment(app,admin)
    admin.post('/api/workspace/tasks',json={'title':'TEST backup'})
    admin.put('/api/workspace/preferences',json={'theme':'plum','favorites':[200]})
    doctor.post('/api/workspace/visits',json={'patient_id':data['patient_id'],'subjective':'TEST backup note'})
    response=admin.post('/api/backups')
    assert response.status_code==200
    source=tmp_path/'backup.sqlite3'
    source.write_bytes(response.content)
    destination=tmp_path/'restore.sqlite3'
    restore_to_new(source,destination)
    with TestClient(create_app(destination,secure_cookie=False)) as restored:
        login(restored)
        assert restored.get('/api/workspace/preferences').json()['theme']=='plum'
        assert restored.get('/api/workspace/tasks').json()['total']==1
        assert restored.get(f"/api/workspace/patients/{data['patient_id']}/dossier").json()['counts']['visits']==1


def test_parallel_slot_claims_only_one_winner(system):
    app,admin,_=system
    _,data,_=new_appointment(app,admin)
    data={**data,'starts_at':data['starts_at']+1800}
    with ThreadPoolExecutor(max_workers=2) as executor:
        results=list(executor.map(lambda _:admin.post('/api/workspace/appointments',json=data).status_code,range(2)))
    assert sorted(results)==[201,409]


def test_unauthenticated_workspace_never_returns_data(system):
    app,_,_=system
    guest=TestClient(app)
    for endpoint in ('preferences','tasks','overview','appointments','clinicians','patients/1/dossier','inventory-search?q=test'):
        assert guest.get('/api/workspace/'+endpoint).status_code==401


def test_unknown_calendar_extremes_are_validation_errors(system):
    _,admin,_=system
    assert admin.get('/api/workspace/appointments?day=9999-12-31').status_code==422
    assert admin.get('/api/workspace/appointments?day=0001-01-01').status_code==422


def test_backup_rejects_incomplete_columns(system,tmp_path):
    _,admin,_=system
    response=admin.post('/api/backups')
    snapshot=tmp_path/'bad.sqlite3'
    snapshot.write_bytes(response.content)
    with sqlite3.connect(snapshot) as db:
        db.execute('ALTER TABLE visit_notes DROP COLUMN subjective')
    with pytest.raises(ValueError,match='columns'):
        validate_snapshot(snapshot)
