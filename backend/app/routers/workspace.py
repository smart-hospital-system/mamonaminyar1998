"""Persisted operational workspaces. Support concerns documentation, not diagnosis."""
from datetime import datetime, timedelta, timezone
import json
import time
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func, select, update
from sqlalchemy.orm import selectinload
from ..models import (Admission, Appointment, Doctor, Medicine, Patient, Prescription, User,
                      UserPreference, VisitNote, WorkOrder, WorkTask)
from ..schemas import (AppointmentInput, AppointmentStateInput, PreferencesInput, TaskInput,
                       TaskStateInput, VisitInput)
from ..security import audit, current_user, db_dependency, roles
from .clinical import patient_json, patient_or_404

router = APIRouter(prefix='/api/workspace', tags=['Workspace'])
KABUL = timezone(timedelta(hours=4, minutes=30))
CLINICAL = roles('admin', 'doctor', 'reception')


def day_window(day=None):
    try:
        start = datetime.strptime(day, '%Y-%m-%d').replace(tzinfo=KABUL) if day else datetime.now(KABUL).replace(hour=0, minute=0, second=0, microsecond=0)
        if not 1970 <= start.year <= 2099:
            raise ValueError('Unsupported year')
    except (ValueError,OverflowError):
        raise HTTPException(422, 'تاریخ معتبر به شکل YYYY-MM-DD لازم است.')
    return int(start.timestamp()), int((start + timedelta(days=1)).timestamp()), start


def appointment_json(row):
    return {name: getattr(row, name) for name in ('id','patient_id','doctor_id','starts_at','reason','status','revision')} | {
        'patient_name': f'{row.patient.first_name} {row.patient.last_name}', 'mrn': row.patient.mrn,
        'doctor_name': row.doctor.user.name, 'doctor_user_id':row.doctor.user_id}


def note_json(row):
    return {name: getattr(row,name) for name in ('id','patient_id','author_id','kind','subjective','objective','assessment','plan','created','amends_id')} | {
        'vitals': json.loads(row.vitals), 'author': row.author.name}


@router.get('/preferences')
def preferences(user=Depends(current_user), db=Depends(db_dependency)):
    row = db.get(UserPreference, user.id)
    return json.loads(row.value) if row else PreferencesInput().model_dump()


@router.put('/preferences')
def save_preferences(body: PreferencesInput, user=Depends(current_user), db=Depends(db_dependency)):
    row = db.get(UserPreference, user.id)
    if not row:
        row = UserPreference(user_id=user.id)
        db.add(row)
    row.value = json.dumps(body.model_dump())
    audit(db,user,'workspace_preferences_updated','self')
    db.commit()
    return body.model_dump()


@router.get('/overview')
def overview(user=Depends(current_user), db=Depends(db_dependency)):
    start,end,today = day_window()
    now = int(time.time())
    count = lambda model,*where: db.scalar(select(func.count()).select_from(model).where(*where))
    result = {'day':today.date().isoformat(), 'timezone':'Asia/Kabul',
              'tasks_open':count(WorkTask,WorkTask.owner_id==user.id,WorkTask.done.is_(False)),
              'tasks_overdue':count(WorkTask,WorkTask.owner_id==user.id,WorkTask.done.is_(False),WorkTask.due_at<now),
              'notes_today':count(VisitNote,VisitNote.created>=start,VisitNote.created<end),
              'appointments_today':count(Appointment,Appointment.starts_at>=start,Appointment.starts_at<end,Appointment.status!='cancelled'),
              'trend':[]}
    for index in range(6,-1,-1):
        day_start=start-index*86400
        result['trend'].append({'day':(today-timedelta(days=index)).date().isoformat(),
            'patients':count(Patient,Patient.created>=day_start,Patient.created<day_start+86400),
            'visits':count(VisitNote,VisitNote.created>=day_start,VisitNote.created<day_start+86400)})
    return result


@router.get('/tasks')
def tasks(user=Depends(current_user), db=Depends(db_dependency)):
    rows=db.scalars(select(WorkTask).where(WorkTask.owner_id==user.id).order_by(WorkTask.done,WorkTask.id.desc()).limit(200)).all()
    return {'items':[{key:getattr(row,key) for key in ('id','title','priority','due_at','done','created','revision')} for row in rows],
            'limit':200,'total':db.scalar(select(func.count()).select_from(WorkTask).where(WorkTask.owner_id==user.id))}


@router.post('/tasks',status_code=201)
def add_task(body:TaskInput,user=Depends(current_user),db=Depends(db_dependency)):
    row=WorkTask(owner_id=user.id,**body.model_dump())
    db.add(row)
    db.flush()
    audit(db,user,'workspace_task_created',row.id)
    db.commit()
    return {'id':row.id,'revision':row.revision}


@router.patch('/tasks/{task_id}')
def change_task(task_id:int,body:TaskStateInput,user=Depends(current_user),db=Depends(db_dependency)):
    row=db.get(WorkTask,task_id)
    if not row or row.owner_id!=user.id:
        raise HTTPException(404,'کار پیدا نشد.')
    result=db.execute(update(WorkTask).where(WorkTask.id==task_id,WorkTask.owner_id==user.id,WorkTask.revision==body.revision).values(done=body.done,revision=body.revision+1))
    if not result.rowcount:
        raise HTTPException(409,'این کار قبلاً تغییر کرده؛ دوباره بارگذاری کنید.')
    audit(db,user,'workspace_task_changed',task_id)
    db.commit()
    return {'ok':True,'revision':body.revision+1}


@router.get('/clinicians')
def clinicians(user=Depends(CLINICAL),db=Depends(db_dependency)):
    return [{'id':doctor.id,'name':doctor.user.name} for doctor in db.scalars(select(Doctor).join(User,Doctor.user_id==User.id).where(User.active.is_(True))).all()]


@router.get('/appointments')
def appointments(day:str|None=Query(default=None,max_length=10),user=Depends(CLINICAL),db=Depends(db_dependency)):
    start,end,_=day_window(day)
    query=select(Appointment).options(selectinload(Appointment.patient),selectinload(Appointment.doctor).selectinload(Doctor.user)).where(Appointment.starts_at>=start,Appointment.starts_at<end)
    total=db.scalar(select(func.count()).select_from(query.subquery()))
    audit(db,user,'appointments_viewed','day')
    db.commit()
    return {'items':[appointment_json(row) for row in db.scalars(query.order_by(Appointment.starts_at).limit(300)).all()],
            'total':total,'limit':300,'timezone':'Asia/Kabul'}


@router.post('/appointments',status_code=201)
def add_appointment(body:AppointmentInput,user=Depends(CLINICAL),db=Depends(db_dependency)):
    patient_or_404(db,body.patient_id)
    doctor=db.get(Doctor,body.doctor_id)
    if not doctor or not doctor.user.active:
        raise HTTPException(422,'داکتر فعال انتخاب کنید.')
    row=Appointment(**body.model_dump(),created_by=user.id,slot_key=f'{body.doctor_id}:{body.starts_at}')
    db.add(row)
    db.flush()
    audit(db,user,'appointment_created',row.id)
    db.commit()
    return appointment_json(row)


@router.patch('/appointments/{appointment_id}')
def change_appointment(appointment_id:int,body:AppointmentStateInput,user=Depends(CLINICAL),db=Depends(db_dependency)):
    row=db.get(Appointment,appointment_id)
    if not row:
        raise HTTPException(404,'نوبت پیدا نشد.')
    if row.status in ('completed','cancelled'):
        raise HTTPException(409,'این نوبت بسته شده است.')
    if body.status=='completed' and row.doctor.user_id!=user.id:
        raise HTTPException(403,'تکمیل معاینه فقط توسط داکتر تعیین‌شده مجاز است.')
    if body.status=='completed' and row.status!='checked_in':
        raise HTTPException(409,'ابتدا پذیرش مریض را ثبت کنید.')
    if body.status=='checked_in' and row.status!='scheduled':
        raise HTTPException(409,'پذیرش قبلاً ثبت شده است.')
    result=db.execute(update(Appointment).where(Appointment.id==row.id,Appointment.revision==body.revision).values(
        status=body.status,revision=body.revision+1,slot_key=None if body.status in ('completed','cancelled') else row.slot_key))
    if not result.rowcount:
        raise HTTPException(409,'نوبت هم‌زمان تغییر کرده است.')
    audit(db,user,'appointment_'+body.status,row.id)
    db.commit()
    return appointment_json(row)


@router.post('/visits',status_code=201)
def add_visit(body:VisitInput,user=Depends(roles('doctor')),db=Depends(db_dependency)):
    patient_or_404(db,body.patient_id)
    if body.amends_id:
        previous=db.get(VisitNote,body.amends_id)
        if not previous or previous.patient_id!=body.patient_id or previous.author_id!=user.id:
            raise HTTPException(403,'الحاقیه باید به یادداشت همین مریض و همین نویسنده مربوط باشد.')
    row=VisitNote(**body.model_dump(exclude={'vitals'}),author_id=user.id,
                  vitals=json.dumps(body.vitals.model_dump(exclude_none=True)))
    db.add(row)
    db.flush()
    audit(db,user,'visit_amended' if body.amends_id else 'visit_recorded',row.id)
    db.commit()
    return note_json(row)


@router.get('/patients/{patient_id}/dossier')
def dossier(patient_id:int,user=Depends(roles('admin','doctor')),db=Depends(db_dependency)):
    patient=patient_or_404(db,patient_id)
    counts={}
    history=[]
    for model,key in ((VisitNote,'visits'),(Prescription,'prescriptions'),(WorkOrder,'orders'),(Admission,'admissions'),(Appointment,'appointments')):
        counts[key]=db.scalar(select(func.count()).select_from(model).where(model.patient_id==patient_id))
        # Per-resource cap is explicit; old records are not presented as complete history.
        rows=db.scalars(select(model).where(model.patient_id==patient_id).order_by(model.id.desc()).limit(100)).all()
        for row in rows:
            if key=='visits':
                event={'kind':'visit','title':'الحاقیهٔ معاینه' if row.amends_id else 'معاینهٔ '+row.kind,'data':note_json(row)}
            elif key=='prescriptions':
                event={'kind':'prescription','title':f'نسخه RX-{row.id}','status':row.status,'data':{'diagnosis':row.diagnosis}}
            elif key=='orders':
                event={'kind':row.kind,'title':row.title,'status':row.status,'data':{'result':row.result}}
            elif key=='admissions':
                event={'kind':'admission','title':f'بستر {row.bed}','status':'discharged' if row.discharged else 'admitted','data':{'reason':row.reason,'discharge_note':row.discharge_note}}
            else:
                event={'kind':'appointment','title':'نوبت معاینه','status':row.status,'data':{'reason':row.reason,'starts_at':row.starts_at}}
            history.append(event|{'id':row.id,'created':row.created})
    checklist=[{'key':key,'label':label,'recorded':bool(value)} for key,label,value in (
        ('identity','نام و تخلص',patient.first_name and patient.last_name),('weight','وزن ثبت‌شده',patient.weight_kg is not None),
        ('allergies','شرح حساسیت بررسی و ثبت شود',patient.allergies.strip()),('history','سابقهٔ طبی',patient.history.strip()),
        ('contact','راه تماس',patient.phone.strip()))]
    pending=db.scalar(select(func.count()).select_from(WorkOrder).where(WorkOrder.patient_id==patient_id,WorkOrder.status=='requested'))
    audit(db,user,'patient_dossier_viewed',patient_id)
    db.commit()
    return {'patient':patient_json(patient),'timeline':sorted(history,key=lambda e:(e['created'],e['id']),reverse=True),
            'counts':counts,'per_resource_limit':100,'pending_results':pending,'checklist':checklist,
            'notice':'چک‌لیست کیفیت ثبت اطلاعات است، نه ارزیابی خطر یا تضمین ایمنی. متن خالی به معنی عدم حساسیت نیست.'}


@router.get('/inventory-search')
def inventory_search(q:str=Query(min_length=1,max_length=100),user=Depends(roles('admin','doctor','pharmacy')),db=Depends(db_dependency)):
    safe=q.strip().replace('\\','\\\\').replace('%','\\%').replace('_','\\_')
    rows=db.scalars(select(Medicine).where(Medicine.name.ilike(f'%{safe}%',escape='\\')).order_by(Medicine.name).limit(15)).all()
    return {'items':[{key:getattr(row,key) for key in ('id','name','strength','form','stock')} for row in rows],
            'notice':'فهرست موجودی محلی است، نه مرجع تجویز یا دوز. انتخاب باید به تأیید داکتر برسد.'}
