"""Explicit configuration, department totals and operational integrity support."""
import json
from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel, ConfigDict, Field
from sqlalchemy import func, select, update
from ..models import Setting, Medicine, WorkOrder, Admission, Patient, Prescription
from ..security import current_user, db_dependency, roles, audit
from ..studio import StudioInput, configuration
from .. import maintenance

router=APIRouter(prefix='/api/professional',tags=['Professional workspaces'])


@router.get('/studio')
def studio(user=Depends(roles('admin')),db=Depends(db_dependency)):
    return configuration(db)


@router.put('/studio')
def save_studio(body:StudioInput,user=Depends(roles('admin')),db=Depends(db_dependency)):
    current=configuration(db)
    if body.revision!=current['revision']:
        raise HTTPException(409,'تنظیمات هم‌زمان تغییر کرده است؛ دوباره بارگذاری کنید.')
    value=body.model_dump()
    value['revision']+=1
    row=db.get(Setting,'print_studio')
    if row:
        raw=row.value
        result=db.execute(update(Setting).where(Setting.key=='print_studio',Setting.value==raw).values(value=json.dumps(value,ensure_ascii=False)))
        if not result.rowcount:
            raise HTTPException(409,'تنظیمات هم‌زمان تغییر کرد.')
    else:
        db.add(Setting(key='print_studio',value=json.dumps(value,ensure_ascii=False)))
    audit(db,user,'print_studio_updated','ten-families')
    db.commit()
    return value


@router.get('/departments')
def departments(user=Depends(current_user),db=Depends(db_dependency)):
    count=lambda model,*criteria:db.scalar(select(func.count()).select_from(model).where(*criteria))
    permitted={
        'opd':('admin','doctor','reception'), 'pharmacy':('admin','doctor','pharmacy'),
        'lab':('admin','doctor','lab'),'radiology':('admin','doctor','radiology'),'inpatient':('admin','doctor','reception')}
    data={
        'opd':{'registered_patients':count(Patient),'drafts':count(Prescription,Prescription.status=='draft')},
        'pharmacy':{'items':count(Medicine),'low_stock':count(Medicine,Medicine.stock<=Medicine.reorder)},
        'lab':{'pending':count(WorkOrder,WorkOrder.kind=='lab',WorkOrder.status=='requested'),'completed':count(WorkOrder,WorkOrder.kind=='lab',WorkOrder.status=='completed')},
        'radiology':{'pending':count(WorkOrder,WorkOrder.kind=='radiology',WorkOrder.status=='requested'),'completed':count(WorkOrder,WorkOrder.kind=='radiology',WorkOrder.status=='completed')},
        'inpatient':{'occupied':count(Admission,Admission.discharged.is_(None)),'capacity':10}}
    return {key:value for key,value in data.items() if user.role in permitted[key]}


@router.get('/health-summary')
def health_summary(request:Request,user=Depends(current_user)):
    value=maintenance.state(request.app.state.engine)
    return {'status':'critical' if request.app.state.maintenance_error else value['status'],'checked_at':value['checked_at'],
            'monitor_failed':request.app.state.maintenance_error,
            'issues':len(value['alerts']),'critical':sum(a['severity']=='critical' for a in value['alerts'])}


@router.get('/health')
def health(request:Request,user=Depends(roles('admin'))):
    value=maintenance.state(request.app.state.engine)
    value['monitor_failed']=request.app.state.maintenance_error
    if value['monitor_failed']:
        value['status']='critical'
    return value


@router.post('/health/check')
def check(request:Request,user=Depends(roles('admin'))):
    from ..main import ROOT
    value=maintenance.inspect(request.app.state.engine,ROOT)
    request.app.state.maintenance_error=False
    return value


class Acknowledgement(BaseModel):
    model_config=ConfigDict(extra='forbid')
    code:str=Field(pattern=r'^(database|files|disk|backup)$')
    first_seen:int=Field(ge=0)


@router.post('/health/acknowledge')
def ack(body:Acknowledgement,request:Request,user=Depends(roles('admin'))):
    if not maintenance.acknowledge(request.app.state.engine,body.code,body.first_seen,user.id):
        raise HTTPException(409,'هشدار برطرف یا تغییر کرده است؛ صفحه را تازه کنید.')
    return maintenance.state(request.app.state.engine)


@router.get('/session')
def session(user=Depends(current_user),db=Depends(db_dependency)):
    flag=db.get(Setting,'demo_mode')
    return {'demo':bool(flag and flag.value=='true')}
