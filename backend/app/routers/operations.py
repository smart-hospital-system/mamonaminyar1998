from fastapi import APIRouter,Depends,Request
from fastapi.responses import PlainTextResponse
from ..security import roles
from ..observability import ready
from ..backups import SCHEMA_VERSION

router=APIRouter(prefix='/api/ops',tags=['Operations'])


@router.get('/status')
def status(request:Request,user=Depends(roles('admin'))):
    return {'database':request.app.state.engine.dialect.name,'ready':ready(request.app.state.engine),
            'schema_version_expected':SCHEMA_VERSION,'scope':'single-process-development-foundation',
            'maintenance_monitor_failed':request.app.state.maintenance_error,
            'fhir_r4':False,'smart_on_fhir':False}


@router.get('/metrics',response_class=PlainTextResponse)
def metrics(request:Request,user=Depends(roles('admin'))):
    return PlainTextResponse(request.app.state.metrics.render(ready(request.app.state.engine)),
                             media_type='text/plain; version=0.0.4; charset=utf-8')
