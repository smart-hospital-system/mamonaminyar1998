"""Isolated reproductions of the user's pasted examples, NOT application tests.

Run with the audit dependencies installed (see docs/TECHNICAL_AUDIT_FA.md).
Passing means the described defect or corrected minimal example was reproduced.
"""
import os
import subprocess
import sys
import tempfile
import unittest
from datetime import datetime, timezone
from pathlib import Path

from fastapi import FastAPI
from fastapi.testclient import TestClient
from sqlalchemy import Column, DateTime, ForeignKey, Integer, create_engine
from sqlalchemy.exc import NoForeignKeysError
from sqlalchemy.orm import Session, declarative_base, relationship


class SuppliedExampleAudit(unittest.TestCase):
    def test_models_package_shadows_models_file(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            (root / 'models').mkdir()
            (root / 'models' / '__init__.py').write_text('')
            (root / 'models.py').write_text('Base = object()\n')
            env = {**os.environ, 'PYTHONPATH': directory}
            result = subprocess.run(
                [sys.executable, '-c', 'from models import Base'],
                cwd=directory, env=env, capture_output=True, text=True,
            )
            self.assertNotEqual(result.returncode, 0)
            self.assertIn('ImportError', result.stderr)
            self.assertIn('models/__init__.py', result.stderr.replace('\\', '/'))

    def test_user_prescriptions_lacks_foreign_key(self):
        Base = declarative_base()

        class User(Base):
            __tablename__ = 'users'
            id = Column(Integer, primary_key=True)
            prescriptions = relationship('Prescription', back_populates='doctor')

        class Doctor(Base):
            __tablename__ = 'doctors'
            id = Column(Integer, primary_key=True)

        class Prescription(Base):
            __tablename__ = 'prescriptions'
            id = Column(Integer, primary_key=True)
            doctor_id = Column(Integer, ForeignKey('doctors.id'))
            doctor = relationship('Doctor', back_populates='prescriptions')

        try:
            with self.assertRaises(NoForeignKeysError):
                Base.registry.configure()
        finally:
            Base.registry.dispose()

    def test_doctor_relationship_fix_configures(self):
        Base = declarative_base()

        class Doctor(Base):
            __tablename__ = 'doctors'
            id = Column(Integer, primary_key=True)
            prescriptions = relationship('Prescription', back_populates='doctor')

        class Prescription(Base):
            __tablename__ = 'prescriptions'
            id = Column(Integer, primary_key=True)
            doctor_id = Column(Integer, ForeignKey('doctors.id'))
            doctor = relationship('Doctor', back_populates='prescriptions')

        try:
            Base.registry.configure()
            self.assertIs(Prescription.doctor.property.mapper.class_, Doctor)
        finally:
            Base.registry.dispose()

    def test_hospital_put_is_captured_by_dynamic_route(self):
        app = FastAPI()

        @app.put('/api/settings/{setting_id}')
        def update_setting(setting_id: int, value: str):
            return {'id': setting_id}

        @app.put('/api/settings/hospital')
        def update_hospital():
            return {'updated': True}

        response = TestClient(app).put('/api/settings/hospital', params={'value': 'test'})
        self.assertEqual(response.status_code, 422)
        self.assertEqual(response.json()['detail'][0]['loc'], ['path', 'setting_id'])

    def test_static_route_first_fixes_hospital_put(self):
        app = FastAPI()

        @app.put('/api/settings/hospital')
        def update_hospital():
            return {'updated': True}

        @app.put('/api/settings/{setting_id}')
        def update_setting(setting_id: int, value: str):
            return {'id': setting_id}

        self.assertEqual(TestClient(app).put('/api/settings/hospital').status_code, 200)

    def test_scalar_login_parameters_do_not_accept_json_body(self):
        app = FastAPI()

        @app.post('/login')
        def login(email: str, password: str):
            return {'received': True}  # No real authentication in this fixture.

        client = TestClient(app)
        response = client.post('/login', json={'email': 'demo@example.test', 'password': 'fake'})
        self.assertEqual(response.status_code, 422)
        self.assertIn(['query', 'email'], [e['loc'] for e in response.json()['detail']])

    def test_sqlite_expiry_loses_timezone_and_comparison_fails(self):
        Base = declarative_base()

        class Key(Base):
            __tablename__ = 'serial_keys'
            id = Column(Integer, primary_key=True)
            expires_at = Column(DateTime(timezone=True))

        engine = create_engine('sqlite:///:memory:')
        try:
            Base.metadata.create_all(engine)
            with Session(engine) as session:
                session.add(Key(expires_at=datetime(2030, 1, 1, tzinfo=timezone.utc)))
                session.commit()
                stored = session.query(Key).one().expires_at
                self.assertIsNone(stored.tzinfo)
                with self.assertRaises(TypeError):
                    stored < datetime.now(timezone.utc)
                # This normalization is valid ONLY when stored naive values are UTC.
                normalized = stored.replace(tzinfo=timezone.utc)
                self.assertIsInstance(normalized < datetime.now(timezone.utc), bool)
        finally:
            engine.dispose()
            Base.registry.dispose()


if __name__ == '__main__':
    unittest.main(verbosity=2)
