"""Create fake teaching data in an exclusively NEW, visibly marked database."""
import argparse
import getpass
import json
import os
from pathlib import Path
from backend.app.database import open_database
from backend.app.models import Patient, Medicine, WorkOrder, Admission, WorkTask, Setting, Doctor
from backend.app.routers.system import DEFAULT_HOSPITAL
from scripts.manage import initialize


def seed(path:Path,password:str,username='owner'):
    if not 12<=len(password)<=200:
        raise ValueError('Use a unique password between 12 and 200 characters.')
    path=path.resolve()
    path.parent.mkdir(parents=True,exist_ok=True)
    # Refuse even an empty existing database. No user data is reduced or replaced.
    fd=os.open(path,os.O_CREAT|os.O_EXCL|os.O_WRONLY,0o600)
    os.close(fd)
    hospital=dict(DEFAULT_HOSPITAL,name=DEFAULT_HOSPITAL['name']+' — آزمایشی')
    try:
        initialize(path,username,'داکتر و مدیر — آموزش',password,hospital=hospital,physician_owner=True)
        engine,sessions=open_database(path)
        try:
            with sessions() as db:
                owner=db.query(Doctor).one()
                db.add(Setting(key='demo_mode',value='true'))
                for i in range(1,21):
                    p=Patient(first_name=f'مریض آزمایشی {i:02}',last_name='آموزشی — غیرواقعی',father_name='داده ساختگی',age=20+i,sex='unknown',history='صرف برای تمرین؛ هیچ فرد واقعی نیست.')
                    db.add(p)
                    db.flush()
                    if i<=3:
                        db.add(WorkOrder(patient_id=p.id,kind='lab' if i%2 else 'radiology',title='درخواست تمرینی — تفسیر یا استفاده بالینی نشود',created_by=owner.user_id))
                    if i<=2:
                        db.add(Admission(patient_id=p.id,active_patient=p.id,active_bed=i,bed=i,reason='بستری ساختگی جهت تمرین'))
                for i in range(1,11):
                    db.add(Medicine(name=f'قلم آموزشی {i:02} — دوا نیست',form='تمرینی',strength='بدون کاربرد طبی',stock=i*3,reorder=10))
                db.add(WorkTask(owner_id=owner.user_id,title='تمرین: یک مریض غیرواقعی ثبت و یک بکاپ آزمایشی بسازید.'))
                db.commit()
        finally:
            engine.dispose()
    except Exception:
        # Keep failed output for review; never delete a file after partial clinical initialization.
        raise
    return path


def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--db',type=Path,default=Path('.data/demo.sqlite3'))
    args=parser.parse_args()
    password=getpass.getpass('New DEMO owner password (12+ chars): ')
    if password!=getpass.getpass('Repeat password: '):
        parser.error('Passwords do not match.')
    seed(args.db,password)
    print('DEMO created; username: owner. Only fake data. Real database was not opened.')


if __name__=='__main__':
    main()
