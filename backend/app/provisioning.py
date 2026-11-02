"""Explicit, transactional first-time schema creation; never a startup auto-migration."""
import json
from sqlalchemy import inspect
from sqlalchemy.orm import Session
from .backups import SCHEMA_VERSION
from .database import require_empty_postgres
from .models import Base,Setting,User,Doctor
from .security import hash_password


def provision(engine,username,name,password,hospital,activation=None,physician_owner=False):
    if not 12<=len(password)<=200:
        raise ValueError('Use a unique password between 12 and 200 characters.')
    encoded=hash_password(password)
    with engine.begin() as connection:
        if engine.dialect.name=='postgresql':
            require_empty_postgres(connection)
        elif inspect(connection).get_table_names():
            raise ValueError('Database already has tables. Setup never overwrites an existing database.')
        Base.metadata.create_all(connection)
        with Session(bind=connection) as db:
            owner=User(username=username.strip().lower(),name=name,role='admin',password_hash=encoded)
            db.add(owner);db.flush()
            if physician_owner:
                db.add(Doctor(user_id=owner.id))
            db.add(Setting(key='schema_version',value=SCHEMA_VERSION))
            db.add(Setting(key='hospital',value=json.dumps(hospital,ensure_ascii=False)))
            if activation is not None:
                db.add(Setting(key='activation',value=json.dumps(activation,ensure_ascii=False)))
            db.flush()
