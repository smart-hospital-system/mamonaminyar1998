"""Bounded, process-local metrics and PHI-free HTTP events. No bodies, query strings or user IDs."""
from collections import defaultdict
import json
import logging
import threading
import time
from sqlalchemy import inspect,text
from .backups import SCHEMA_VERSION
from .models import Base

logger=logging.getLogger('ash.requests')
if not logger.handlers:
    logger.addHandler(logging.StreamHandler())
logger.setLevel(logging.INFO)
logger.propagate=False


def ready(engine):
    try:
        with engine.connect() as connection:
            if connection.scalar(text('SELECT 1'))!=1:
                return False
            if not set(Base.metadata.tables).issubset(inspect(connection).get_table_names()):
                return False
            return connection.scalar(text("SELECT value FROM settings WHERE key='schema_version'"))==SCHEMA_VERSION
    except Exception:
        return False


class Metrics:
    def __init__(self):
        self.lock=threading.Lock()
        self.counts=defaultdict(int)
        self.seconds=defaultdict(float)
        self.started=time.monotonic()

    def record(self,method,route,status,elapsed,request_id):
        method=method if method in ('GET','POST','PUT','PATCH','DELETE','HEAD','OPTIONS') else 'OTHER'
        with self.lock:
            self.counts[(method,route,status)]+=1
            self.seconds[(method,route)]+=elapsed
        logger.info(json.dumps({'event':'http_request','request_id':request_id,'method':method,
                                'route':route,'status':status,'duration_ms':round(elapsed*1000,2)},separators=(',',':')))

    def render(self,database_up):
        with self.lock:
            rows=['# HELP ash_database_ready Database connectivity and schema readiness, not physical integrity.',
                  '# TYPE ash_database_ready gauge',f'ash_database_ready {int(database_up)}',
                  '# TYPE ash_process_uptime_seconds gauge',f'ash_process_uptime_seconds {time.monotonic()-self.started:.3f}',
                  '# TYPE ash_http_requests_total counter']
            for (method,route,status),value in sorted(self.counts.items()):
                rows.append(f'ash_http_requests_total{{method={json.dumps(method)},route={json.dumps(route)},status="{status}"}} {value}')
            rows.append('# TYPE ash_http_duration_seconds_total counter')
            for (method,route),value in sorted(self.seconds.items()):
                rows.append(f'ash_http_duration_seconds_total{{method={json.dumps(method)},route={json.dumps(route)}}} {value:.6f}')
        return '\n'.join(rows)+'\n'
