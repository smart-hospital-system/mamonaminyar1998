"""ASH Nexus foundation. Run setup first; no built-in passwords or demo patient records."""
import asyncio
import os
import secrets
import time
import uuid
from contextlib import asynccontextmanager
from pathlib import Path
from fastapi import FastAPI, Request
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from sqlalchemy.exc import IntegrityError
from .backups import SCHEMA_VERSION
from .database import open_database, configured_target
from .models import Base, Setting
from .routers import auth, clinical, system, workspace, professional, operations
from .security import hash_password
from .observability import Metrics, ready

ROOT = Path(__file__).resolve().parents[2]


def create_app(db_path=None, secure_cookie=None):
    target=configured_target(ROOT / '.data' / 'ash.sqlite3',explicit=db_path)
    engine, sessions = open_database(target)

    @asynccontextmanager
    async def lifespan(app):
        # Setup and migrations are explicit; never silently rewrite a live schema.
        from sqlalchemy import inspect
        if not inspect(engine).has_table('settings'):
            raise RuntimeError('Database is not initialized. Run: python -m scripts.manage init')
        if not set(Base.metadata.tables).issubset(inspect(engine).get_table_names()):
            raise RuntimeError('Incomplete/old schema. Stop server. For schema 1 use: python -m scripts.manage upgrade-v1 OLD NEW')
        with sessions() as db:
            version = db.get(Setting, 'schema_version')
            if not version or version.value != SCHEMA_VERSION:
                raise RuntimeError('Unsupported schema. Back up and run a reviewed migration.')
        from . import maintenance
        await asyncio.to_thread(maintenance.inspect, engine, ROOT)
        async def periodic_health():
            while True:
                await asyncio.sleep(maintenance.INTERVAL)
                try:
                    await asyncio.to_thread(maintenance.inspect, engine, ROOT)
                    app.state.maintenance_error=False
                except Exception:
                    # No raw exception/record is disclosed. External watchdog handles an unavailable server.
                    app.state.maintenance_error=True
        app.state.maintenance_error=False
        task=asyncio.create_task(periodic_health())
        try:
            yield
        finally:
            task.cancel()
            try:
                await task
            except asyncio.CancelledError:
                pass
            engine.dispose()

    app = FastAPI(title='ASH Nexus HMS — Foundation', version='0.5.0-dev.1', lifespan=lifespan,
                  docs_url=None, redoc_url=None, openapi_url=None)
    app.state.engine, app.state.sessions = engine, sessions
    app.state.metrics=Metrics()
    app.state.secure_cookie = secure_cookie if secure_cookie is not None else os.environ.get('ASH_SECURE_COOKIE', '0') == '1'
    app.state.dummy_hash = hash_password(secrets.token_urlsafe(32))

    @app.middleware('http')
    async def security_headers(request: Request, call_next):
        request_id=uuid.uuid4().hex
        started=time.monotonic()
        try:
            response = await call_next(request)
        except Exception:
            # Do not let driver exceptions/validation internals log clinical SQL values.
            response=JSONResponse({'detail':'Internal error. Contact the administrator with the request ID.','request_id':request_id},status_code=500)
        route=request.scope.get('route')
        label=getattr(route,'path','unmatched')
        app.state.metrics.record(request.method,label,response.status_code,time.monotonic()-started,request_id)
        response.headers['X-Request-ID']=request_id
        response.headers['Cache-Control'] = 'no-store'
        response.headers['X-Content-Type-Options'] = 'nosniff'
        frame_ancestors = os.environ.get('ASH_FRAME_ANCESTORS', "'self'")
        if frame_ancestors == "'self'":
            response.headers['X-Frame-Options'] = 'SAMEORIGIN'
        response.headers['Referrer-Policy'] = 'no-referrer'
        response.headers['Permissions-Policy'] = 'camera=(), microphone=(), geolocation=()'
        response.headers['Content-Security-Policy'] = "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self'; object-src 'none'; base-uri 'none'; form-action 'self'" + f"; frame-ancestors {frame_ancestors}"
        return response

    @app.exception_handler(IntegrityError)
    async def integrity_error(request, error):
        # No SQL values or patient details are exposed in the HTTP response.
        return JSONResponse({'detail': 'تداخل اطلاعات: نام کاربری، بستر یا وقت نوبت فعال تکراری است.'}, status_code=409)

    @app.get('/healthz')
    def health():
        return {'status': 'ok', 'version': '0.5.0-dev.1', 'mode': 'foundation-not-clinically-validated',
                **({'launch_id': os.environ['ASH_LAUNCH_ID']} if os.environ.get('ASH_LAUNCH_ID') else {})}

    @app.get('/readyz')
    def readiness():
        healthy=ready(engine)
        return JSONResponse({'status':'ready' if healthy else 'not_ready'},status_code=200 if healthy else 503)

    for router in (auth.router, clinical.router, system.router, workspace.router, professional.router, operations.router):
        app.include_router(router)

    @app.get('/')
    def index():
        return FileResponse(ROOT / 'frontend' / 'index.html')

    app.mount('/assets', StaticFiles(directory=ROOT / 'frontend'), name='assets')
    return app


app = create_app()
