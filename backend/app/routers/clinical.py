import json
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func, or_, select, update
from sqlalchemy.orm import selectinload
from ..models import Admission, Doctor, Medicine, Patient, Prescription, PrescriptionItem, PrintDesign, Setting, User, WorkOrder
from ..schemas import AdmissionInput, Confirmation, DischargeInput, MedicineInput, OrderInput, PatientInput, PrescriptionInput, PrescriptionUpdate, ResultInput, StockInput
from ..security import audit, db_dependency, roles, is_physician_owner

router = APIRouter(prefix='/api', tags=['Clinical records'])
clinical_read = roles('admin', 'doctor', 'reception')
clinical_write = roles('admin', 'doctor', 'reception')


def patient_or_404(db, patient_id):
    row = db.get(Patient, patient_id)
    if not row:
        raise HTTPException(404, 'مریض پیدا نشد.')
    return row


def patient_json(row):
    return {key: getattr(row, key) for key in ('id', 'first_name', 'last_name', 'father_name', 'age', 'sex', 'weight_kg', 'phone', 'allergies', 'history', 'created')} | {'mrn': row.mrn, 'weight_kg': float(row.weight_kg) if row.weight_kg is not None else None}


def rx_json(row):
    return {key: getattr(row, key) for key in ('id', 'patient_id', 'complaint', 'diagnosis', 'notes', 'status', 'template_id', 'created', 'revision')} | {
        'patient': json.loads(row.patient_snapshot) if row.patient_snapshot else patient_json(row.patient),
        'hospital': json.loads(row.hospital_snapshot) if row.hospital_snapshot else None,
        'doctor': row.doctor_snapshot or row.doctor.user.name,
        'doctor_user_id': row.doctor.user_id,
        'template_id': row.design.design_id if row.design else row.template_id,
        'template_config': json.loads(row.design.snapshot) if row.design and row.design.snapshot else None,
        'items': [{key: getattr(item, key) for key in ('name', 'form', 'dose', 'frequency', 'duration', 'quantity', 'instructions')} for item in row.items],
    }


@router.get('/dashboard')
def dashboard(user=Depends(roles('admin', 'doctor', 'reception', 'pharmacy', 'lab', 'radiology')), db=Depends(db_dependency)):
    count = lambda model, *criteria: db.scalar(select(func.count()).select_from(model).where(*criteria))
    return {'patients': count(Patient), 'prescriptions': count(Prescription), 'medicines': count(Medicine),
            'low_stock': count(Medicine, Medicine.stock <= Medicine.reorder),
            'lab': count(WorkOrder, WorkOrder.kind == 'lab', WorkOrder.status == 'requested'),
            'radiology': count(WorkOrder, WorkOrder.kind == 'radiology', WorkOrder.status == 'requested'),
            'occupied_beds': count(Admission, Admission.discharged.is_(None)), 'bed_capacity': 10}


@router.get('/patients')
def patients(q: str = Query(default='', max_length=100), offset: int = Query(0, ge=0), limit: int = Query(100, ge=1, le=200),
             user=Depends(clinical_read), db=Depends(db_dependency)):
    query = select(Patient)
    if q:
        safe = q.replace('\\', '\\\\').replace('%', '\\%').replace('_', '\\_')
        condition = or_(Patient.first_name.ilike(f'%{safe}%', escape='\\'), Patient.last_name.ilike(f'%{safe}%', escape='\\'))
        number = q.upper().removeprefix('ASH-')
        if number.isdigit():
            condition = or_(condition, Patient.id == int(number))
        query = query.where(condition)
    return [patient_json(row) for row in db.scalars(query.order_by(Patient.id.desc()).offset(offset).limit(limit)).all()]


@router.post('/patients', status_code=201)
def add_patient(body: PatientInput, user=Depends(clinical_write), db=Depends(db_dependency)):
    row = Patient(**body.model_dump())
    db.add(row)
    db.flush()
    audit(db, user, 'patient_created', row.id)
    db.commit()
    return patient_json(row)


@router.put('/patients/{patient_id}')
def edit_patient(patient_id: int, body: PatientInput, user=Depends(clinical_write), db=Depends(db_dependency)):
    row = patient_or_404(db, patient_id)
    for key, value in body.model_dump().items():
        setattr(row, key, value)
    audit(db, user, 'patient_updated', row.id)
    db.commit()
    return patient_json(row)


@router.get('/prescriptions')
def prescriptions(patient_id: int | None = None, user=Depends(roles('admin', 'doctor')), db=Depends(db_dependency)):
    query = select(Prescription).options(selectinload(Prescription.items), selectinload(Prescription.design),
                                           selectinload(Prescription.patient), selectinload(Prescription.doctor).selectinload(Doctor.user))
    if patient_id:
        query = query.where(Prescription.patient_id == patient_id)
    return [rx_json(row) for row in db.scalars(query.order_by(Prescription.id.desc()).limit(200)).all()]


@router.get('/prescriptions/{rx_id}')
def prescription(rx_id: int, user=Depends(roles('admin', 'doctor')), db=Depends(db_dependency)):
    row = db.get(Prescription, rx_id)
    if not row:
        raise HTTPException(404, 'نسخه پیدا نشد.')
    result = rx_json(row)
    audit(db, user, 'prescription_viewed', row.id)
    db.commit()
    return result


@router.post('/prescriptions', status_code=201)
def add_prescription(body: PrescriptionInput, user=Depends(roles('doctor')), db=Depends(db_dependency)):
    patient_or_404(db, body.patient_id)
    doctor = db.scalar(select(Doctor).where(Doctor.user_id == user.id))
    if not doctor:
        raise HTTPException(409, 'پروفایل داکتر موجود نیست.')
    values = body.model_dump(exclude={'items'})
    values['template_id'] = (body.template_id - 1) % 20 + 1
    row = Prescription(**values, doctor_id=doctor.id)
    row.design = PrintDesign(design_id=body.template_id)
    row.items = [PrescriptionItem(**item.model_dump()) for item in body.items]
    db.add(row)
    db.flush()
    audit(db, user, 'prescription_draft_created', row.id)
    db.commit()
    return rx_json(row)


@router.put('/prescriptions/{rx_id}')
def edit_prescription(rx_id: int, body: PrescriptionUpdate, user=Depends(roles('doctor')), db=Depends(db_dependency)):
    row = db.get(Prescription, rx_id)
    if not row:
        raise HTTPException(404, 'نسخه پیدا نشد.')
    if row.doctor.user_id != user.id:
        raise HTTPException(403, 'فقط نویسنده می‌تواند پیش‌نویس را ویرایش کند.')
    patient_or_404(db, body.patient_id)
    values = body.model_dump(exclude={'items', 'revision'})
    values['template_id'] = (body.template_id - 1) % 20 + 1
    result = db.execute(update(Prescription).where(Prescription.id == rx_id, Prescription.status == 'draft',
                        Prescription.revision == body.revision).values(**values, revision=body.revision + 1))
    if not result.rowcount:
        raise HTTPException(409, 'نسخه تغییر کرده یا تأیید شده است؛ دوباره بارگذاری کنید.')
    if row.design:
        row.design.design_id = body.template_id
    else:
        row.design = PrintDesign(design_id=body.template_id)
    row.items = [PrescriptionItem(**item.model_dump()) for item in body.items]
    audit(db, user, 'prescription_draft_updated', row.id)
    db.commit()
    db.refresh(row)
    return rx_json(row)


@router.post('/prescriptions/{rx_id}/confirm')
def confirm_prescription(rx_id: int, body: Confirmation, user=Depends(roles('doctor')), db=Depends(db_dependency)):
    row = db.get(Prescription, rx_id)
    if not row:
        raise HTTPException(404, 'نسخه پیدا نشد.')
    if row.doctor.user_id != user.id:
        raise HTTPException(403, 'فقط داکتر نویسنده نسخه را تأیید می‌کند.')
    if row.status != 'draft':
        raise HTTPException(409, 'نسخه قبلاً تأیید شده است.')
    if not body.reviewed or not row.diagnosis.strip():
        raise HTTPException(422, 'تشخیص و تأیید بازبینی داکتر لازم است.')
    from .system import DEFAULT_HOSPITAL
    hospital = db.get(Setting, 'hospital')
    result = db.execute(update(Prescription).where(Prescription.id == rx_id, Prescription.status == 'draft',
                        Prescription.revision == body.revision).values(status='confirmed', revision=body.revision + 1,
                        patient_snapshot=json.dumps(patient_json(row.patient), ensure_ascii=False),
                        hospital_snapshot=hospital.value if hospital else json.dumps(DEFAULT_HOSPITAL, ensure_ascii=False),
                        doctor_snapshot=row.doctor.user.name))
    if not result.rowcount:
        raise HTTPException(409, 'نسخه هم‌زمان تغییر کرده؛ دوباره بازبینی کنید.')
    from ..studio import resolved_templates
    templates = resolved_templates(db)
    if not row.design:
        row.design = PrintDesign(design_id=row.template_id)
    row.design.snapshot = json.dumps(templates[row.design.design_id - 1], ensure_ascii=False)
    audit(db, user, 'prescription_confirmed', row.id)
    db.commit()
    return rx_json(row)


@router.get('/medicines')
def medicines(user=Depends(roles('admin', 'doctor', 'pharmacy')), db=Depends(db_dependency)):
    return [{key: getattr(row, key) for key in ('id', 'name', 'form', 'strength', 'stock', 'reorder')} for row in db.scalars(select(Medicine).order_by(Medicine.name).limit(1000)).all()]


@router.post('/medicines', status_code=201)
def add_medicine(body: MedicineInput, user=Depends(roles('admin', 'pharmacy')), db=Depends(db_dependency)):
    row = Medicine(**body.model_dump())
    db.add(row)
    db.flush()
    audit(db, user, 'medicine_created', row.id)
    db.commit()
    return {'id': row.id}


@router.post('/medicines/{medicine_id}/stock')
def stock(medicine_id: int, body: StockInput, user=Depends(roles('admin', 'pharmacy')), db=Depends(db_dependency)):
    # Atomic guarded update: simultaneous withdrawals cannot cause negative stock.
    result = db.execute(update(Medicine).where(Medicine.id == medicine_id, Medicine.stock + body.delta >= 0).values(stock=Medicine.stock + body.delta))
    if not result.rowcount:
        raise HTTPException(409, 'دوا پیدا نشد یا موجودی کافی نیست.')
    # Reason is stored as a short operator note; never insert patient data here.
    audit(db, user, 'stock_adjusted', f'{medicine_id}:{body.delta}:{body.reason}')
    db.commit()
    return {'ok': True}


@router.get('/orders')
def orders(kind: str = Query(pattern='^(lab|radiology)$'), user=Depends(roles('admin', 'doctor', 'lab', 'radiology')), db=Depends(db_dependency)):
    if user.role in ('lab', 'radiology') and user.role != kind:
        raise HTTPException(403, 'بخش مجاز نیست.')
    return [{key: getattr(row, key) for key in ('id', 'patient_id', 'kind', 'title', 'status', 'result', 'created')} |
            {'patient_name': f'{row.patient.first_name} {row.patient.last_name}', 'mrn': row.patient.mrn}
            for row in db.scalars(select(WorkOrder).where(WorkOrder.kind == kind).order_by(WorkOrder.id.desc()).limit(200)).all()]


@router.post('/orders', status_code=201)
def add_order(body: OrderInput, user=Depends(roles('doctor')), db=Depends(db_dependency)):
    patient_or_404(db, body.patient_id)
    row = WorkOrder(**body.model_dump(), created_by=user.id)
    db.add(row)
    db.flush()
    audit(db, user, 'order_requested', row.id)
    db.commit()
    return {'id': row.id}


@router.post('/orders/{order_id}/result')
def result(order_id: int, body: ResultInput, user=Depends(roles('lab', 'radiology')), db=Depends(db_dependency)):
    row = db.get(WorkOrder, order_id)
    if not row:
        raise HTTPException(404, 'درخواست پیدا نشد.')
    if user.role != row.kind and not is_physician_owner(user):
        raise HTTPException(403, 'ثبت نتیجه فقط توسط بخش مربوط ممکن است.')
    if row.status != 'requested':
        raise HTTPException(409, 'نتیجه قبلاً ثبت شده است؛ اصلاح به گردش‌کار جداگانه نیاز دارد.')
    row.result, row.status, row.resulted_by = body.result, 'completed', user.id
    audit(db, user, 'order_resulted', row.id)
    db.commit()
    return {'ok': True}


@router.get('/admissions')
def admissions(user=Depends(clinical_read), db=Depends(db_dependency)):
    return [{key: getattr(row, key) for key in ('id', 'patient_id', 'bed', 'reason', 'created', 'discharged', 'discharge_note')} |
            {'patient_name': f'{row.patient.first_name} {row.patient.last_name}', 'mrn': row.patient.mrn}
            for row in db.scalars(select(Admission).order_by(Admission.discharged.is_not(None), Admission.id.desc()).limit(210)).all()]


@router.post('/admissions', status_code=201)
def admit(body: AdmissionInput, user=Depends(roles('admin', 'doctor')), db=Depends(db_dependency)):
    patient_or_404(db, body.patient_id)
    row = Admission(**body.model_dump(), active_bed=body.bed, active_patient=body.patient_id)
    db.add(row)
    db.flush()  # Unique constraints are also enforced for concurrent requests.
    audit(db, user, 'patient_admitted', row.id)
    db.commit()
    return {'id': row.id}


@router.post('/admissions/{admission_id}/discharge')
def discharge(admission_id: int, body: DischargeInput, user=Depends(roles('doctor')), db=Depends(db_dependency)):
    import time
    row = db.get(Admission, admission_id)
    if not row:
        raise HTTPException(404, 'بستری پیدا نشد.')
    if row.discharged:
        raise HTTPException(409, 'قبلاً ترخیص شده است.')
    row.discharged, row.discharge_note = int(time.time()), body.note
    row.active_bed, row.active_patient = None, None
    audit(db, user, 'patient_discharged', row.id)
    db.commit()
    return {'ok': True}
