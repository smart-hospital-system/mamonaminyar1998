"""Bounded integrity checks. Never repairs, deletes, edits or infers medical records."""
import json
from pathlib import Path
import shutil
import threading
import time
from sqlalchemy import text, inspect as inspect_database
from sqlalchemy.orm import Session
from .models import Setting, AuditLog
from .backups import SCHEMA_VERSION

LOCK=threading.RLock()
INTERVAL=1800
ESCALATE=48*3600
PLANS={
 'database':('پایگاه داده نیاز به بررسی دارد',['ورود اطلاعات تازه را متوقف کنید.','بکاپ شناخته‌شده را بررسی کنید؛ فایل اصلی را حذف نکنید.','با ابزار بازیابی به یک مسیر جدید برگردانید و تعداد دوسیه‌ها را کنترل کنید.']),
 'files':('فایل ضروری حذف یا تغییر کرده است',['سرور را از دسترس عمومی خارج کنید.','نسخهٔ همسان و مورد اعتماد بسته را استخراج کنید.','پس از بکاپ و تأیید مدیر، فایل برنامه را از همان نسخه بازیابی کنید؛ دیتابیس را جایگزین نکنید.']),
 'disk':('فضای دیسک کم است',['بکاپ‌ها را بدون تأیید حذف نکنید.','فضای غیرطبیِ قابل‌انتقال را روی حافظهٔ امن منتقل کنید.','پس از آزادسازی فضا بررسی سلامت را دوباره اجرا کنید.']),
 'backup':('بکاپ اخیر ثبت نشده است',['از صفحهٔ بکاپ، snapshot جدید بگیرید.','بکاپ را خارج از محل روی فضای رمزگذاری‌شده نگه دارید.','بازیابی آزمایشی به فایل جدید انجام دهید؛ دانلودِ صرف آزمون بازیابی نیست.']),
}


def _read(db,key,default):
    row=db.get(Setting,key)
    return json.loads(row.value) if row else default


def state(engine):
    with Session(engine) as db:
        return _read(db,'maintenance_state',{'checked_at':None,'status':'unknown','alerts':[],'history':[]})


def inspect(engine,root:Path,now=None):
    now=int(time.time()) if now is None else now
    found=[]
    checks=[]
    with LOCK,Session(engine) as db:
        previous=_read(db,'maintenance_state',{})
        db_ok=True
        try:
            db_ok=(db.execute(text('PRAGMA quick_check')).scalar()=='ok' if engine.dialect.name=='sqlite' else db.execute(text('SELECT 1')).scalar()==1)
            db_ok=db_ok and db.get(Setting,'schema_version').value==SCHEMA_VERSION
            from .models import Base
            tables=set(inspect_database(db.connection()).get_table_names())
            db_ok=db_ok and set(Base.metadata.tables).issubset(tables)
        except Exception:
            db_ok=False
        checks.append({'name':'database','status':'ok' if db_ok else 'critical','backend':engine.dialect.name,'scope':'quick_check' if engine.dialect.name=='sqlite' else 'connectivity_and_schema_not_physical_integrity'})
        if not db_ok:
            found.append(('database','critical',[]))
        free=shutil.disk_usage(root).free
        severity='critical' if free<100*1024**2 else 'warning' if free<300*1024**2 else 'ok'
        checks.append({'name':'disk','status':severity,'free_mb':free//1024**2})
        if severity!='ok':
            found.append(('disk',severity,[]))
        manifest=root/'release-manifest.json'
        if manifest.is_file():
            bad=[]
            try:
                import hashlib
                from scripts.distribution import safe_member
                value=json.loads(manifest.read_text())
                # Wheelhouse is install input, not required for an already-running application.
                for name,expected in value['files'].items():
                    if name.startswith('wheelhouse/'):
                        continue
                    file=safe_member(root,name)
                    if not file.is_file() or hashlib.sha256(file.read_bytes()).hexdigest()!=expected:
                        bad.append(name)
            except (ValueError,KeyError,OSError,TypeError):
                bad.append('release-manifest.json')
            checks.append({'name':'packaged_files','status':'critical' if bad else 'ok'})
            if bad:
                found.append(('files','critical',bad[:20]))
        else:
            checks.append({'name':'packaged_files','status':'not_available','message':'فهرست انتشار موجود نیست؛ تمامیت image/بسته باید جداگانه بررسی شود.'})
        backup=_read(db,'maintenance_last_backup',{})
        stale=not backup.get('created_at') or now-backup['created_at']>86400
        checks.append({'name':'backup','status':'warning' if stale else 'ok'})
        if stale:
            found.append(('backup','warning',[]))
        old={row['code']:row for row in previous.get('alerts',[])}
        alerts=[]
        history=previous.get('history',[])
        for code,level,details in found:
            prior=old.get(code,{})
            first=prior.get('first_seen',now)
            title,steps=PLANS[code]
            if code=='backup' and engine.dialect.name=='postgresql':
                steps=['از ابزار عملیاتی PostgreSQL یک pg_dump تازه بسازید.','فایل را رمزگذاری و خارج از سرور نگهداری کنید.','بازیابی را فقط در یک دیتابیس جدید و خالی آزمایش کنید.']
            alert={'code':code,'severity':level,'title':title,'details':details,'steps':steps,
                   'first_seen':first,'last_seen':now,'acknowledged_at':prior.get('acknowledged_at'),
                   'escalated':now-first>=ESCALATE and not prior.get('acknowledged_at'),
                   'automatic_repair':False}
            alerts.append(alert)
            if not prior:
                db.add(AuditLog(actor=None,action='health_issue_opened',resource=code))
        for code,row in old.items():
            if code not in {r[0] for r in found}:
                history.append({'code':code,'first_seen':row['first_seen'],'resolved_at':now})
                db.add(AuditLog(actor=None,action='health_issue_resolved',resource=code))
        value={'checked_at':now,'next_check_at':now+INTERVAL,'status':
            'critical' if any(a['severity']=='critical' for a in alerts) else 'warning' if alerts else 'ok',
            'checks':checks,'alerts':alerts,'history':history[-30:],
            'policy':'هر ۳۰ دقیقه؛ پس از ۴۸ ساعت بدون پاسخ، ارجاع دستی. هیچ تعمیر خودکار سوابق یا کد انجام نمی‌شود.'}
        row=db.get(Setting,'maintenance_state')
        if row:
            row.value=json.dumps(value,ensure_ascii=False)
        else:
            db.add(Setting(key='maintenance_state',value=json.dumps(value,ensure_ascii=False)))
        db.commit()
        return value


def acknowledge(engine,code,first_seen,user_id):
    with LOCK,Session(engine) as db:
        row=db.get(Setting,'maintenance_state')
        value=json.loads(row.value) if row else {}
        alert=next((a for a in value.get('alerts',[]) if a['code']==code and a['first_seen']==first_seen),None)
        if not alert:
            return False
        alert['acknowledged_at']=int(time.time())
        alert['escalated']=False
        row.value=json.dumps(value,ensure_ascii=False)
        db.add(AuditLog(actor=user_id,action='health_issue_acknowledged',resource=code))
        db.commit()
        return True
