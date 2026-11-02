import json
import tempfile
from pathlib import Path
from fastapi import APIRouter, Depends, HTTPException, Query, Request
from fastapi.responses import FileResponse
from sqlalchemy import select
from starlette.background import BackgroundTask
from ..backups import snapshot
from ..knowledge import DISCLAIMER, SOURCES, SYMPTOMS, normalize, support, symptom_suggestions, VOCABULARY
from ..models import AuditLog, Patient, Setting
from ..schemas import ActivationInput, HospitalInput, PrescriptionInput
from ..security import audit, db_dependency, roles
from ..templates import TEMPLATES

router = APIRouter(prefix='/api', tags=['System'])
DEFAULT_HOSPITAL = {'name': 'شفاخانه ده بستر جراحی ایبک', 'english_name': 'Aybek Ten-Bed Specialy Surgical Hospital',
                    'services': 'معاینات • جراحی • لابراتوار • دواخانه', 'phone': '', 'address': '', 'email': '', 'website': '', 'template_id': 1}


@router.get('/hospital')
def hospital(user=Depends(roles('admin', 'doctor', 'reception', 'pharmacy', 'lab', 'radiology')), db=Depends(db_dependency)):
    row = db.get(Setting, 'hospital')
    return json.loads(row.value) if row else DEFAULT_HOSPITAL


@router.put('/hospital')
def update_hospital(body: HospitalInput, user=Depends(roles('admin')), db=Depends(db_dependency)):
    row = db.get(Setting, 'hospital')
    if not row:
        row = Setting(key='hospital', value='{}')
        db.add(row)
    row.value = json.dumps(body.model_dump(), ensure_ascii=False)
    audit(db, user, 'hospital_updated', 'hospital')
    db.commit()
    return body.model_dump()


@router.get('/templates')
def templates(user=Depends(roles('admin', 'doctor', 'reception')), db=Depends(db_dependency)):
    from ..studio import resolved_templates
    return resolved_templates(db)


@router.get('/knowledge/symptoms')
def symptoms(q: str = Query('', max_length=100), user=Depends(roles('doctor'))):
    text = normalize(q)
    return {'matches': symptom_suggestions(text), 'vocabulary_size': len(VOCABULARY),
            'disclaimer': DISCLAIMER, 'sources': SOURCES, 'version': 'vocabulary-v2', 'diagnosis_engine': False, 'clinical_advice': False, 'auto_replace': False}


@router.post('/knowledge/review')
def review(body: PrescriptionInput, user=Depends(roles('doctor')), db=Depends(db_dependency)):
    patient = db.get(Patient, body.patient_id)
    if not patient:
        raise HTTPException(404, 'مریض پیدا نشد.')
    audit(db, user, 'limited_safety_review', patient.id)
    db.commit()
    return support([item.model_dump() for item in body.items], patient)


@router.get('/audit')
def logs(user=Depends(roles('admin')), db=Depends(db_dependency)):
    return [{key: getattr(row, key) for key in ('id', 'actor', 'action', 'resource', 'created')}
            for row in db.scalars(select(AuditLog).order_by(AuditLog.id.desc()).limit(200)).all()]


@router.post('/backups')
def backup(request: Request, user=Depends(roles('admin')), db=Depends(db_dependency)):
    if request.app.state.engine.dialect.name!='sqlite':
        raise HTTPException(409,'برای PostgreSQL از ابزار عملیاتی pg_dump و بازیابی به دیتابیس خالی استفاده کنید؛ راهنمای Enterprise مرحلهٔ اول را بخوانید.')
    audit(db, user, 'backup_requested', 'database')
    db.commit()
    fd, name = tempfile.mkstemp(suffix='.sqlite3')
    import os
    os.close(fd)
    path = Path(name)
    try:
        snapshot(request.app.state.engine, path)
    except Exception:
        path.unlink(missing_ok=True)
        raise
    return FileResponse(path, filename='ash-backup.sqlite3', media_type='application/octet-stream',
                        background=BackgroundTask(path.unlink, missing_ok=True))


@router.get('/activation')
def activation(user=Depends(roles('admin')), db=Depends(db_dependency)):
    from ..activation import activation_status
    row = db.get(Setting, 'activation')
    return activation_status(json.loads(row.value) if row else None)


@router.post('/activation')
def renew_activation(body: ActivationInput,
                     user=Depends(roles('admin')), db=Depends(db_dependency)):
    import time
    from ..activation import activation_status, verify_license
    row = db.get(Setting, 'activation')
    value = json.loads(row.value) if row else {}
    if value.get('mode') != 'signed':
        raise HTTPException(409, 'این نصب کلید عمومی صادرکننده ندارد و به سریال تجاری نیاز ندارد.')
    try:
        envelope = json.loads(body.license)
        verify_license(envelope, value['public_key'], value['installation_id'])
    except (ValueError, KeyError):
        raise HTTPException(422, 'فایل فعال‌سازی معتبر نیست یا به این نصب تعلق ندارد.')
    value.update(license=envelope, activated_at=int(time.time()))
    row.value = json.dumps(value, ensure_ascii=False)
    audit(db, user, 'activation_renewed', 'license')
    db.commit()
    return activation_status(value)
