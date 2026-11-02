"""Schema v2 (additive to v1). UTC times stored as integer epoch seconds; no timezone ambiguity."""
import time
from sqlalchemy import Boolean, CheckConstraint, Column, ForeignKey, Integer, Numeric, String, Text
from sqlalchemy.orm import declarative_base, relationship

Base = declarative_base()


class User(Base):
    __tablename__ = 'users'
    id = Column(Integer, primary_key=True)
    username = Column(String(120), unique=True, nullable=False)
    name = Column(String(160), nullable=False)
    password_hash = Column(Text, nullable=False)
    role = Column(String(30), nullable=False)
    active = Column(Boolean, nullable=False, default=True)
    __table_args__ = (CheckConstraint("role IN ('admin','doctor','reception','pharmacy','lab','radiology')"),)


class Doctor(Base):
    __tablename__ = 'doctors'
    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey('users.id'), unique=True, nullable=False)
    prescriptions = relationship('Prescription', back_populates='doctor')
    user = relationship('User', back_populates='doctor_profile')


User.doctor_profile = relationship('Doctor', back_populates='user', uselist=False)


class LoginSession(Base):
    __tablename__ = 'sessions'
    digest = Column(String(64), primary_key=True)
    user_id = Column(Integer, ForeignKey('users.id'), nullable=False)
    csrf = Column(String(80), nullable=False)
    expires = Column(Integer, nullable=False)


class LoginAttempt(Base):
    __tablename__ = 'login_attempts'
    key = Column(String(64), primary_key=True)
    count = Column(Integer, nullable=False, default=0)
    started = Column(Integer, nullable=False)


class Patient(Base):
    __tablename__ = 'patients'
    id = Column(Integer, primary_key=True)
    first_name = Column(String(80), nullable=False)
    last_name = Column(String(80), nullable=False)
    father_name = Column(String(80), nullable=False, default='')
    age = Column(Integer, nullable=False)
    sex = Column(String(20), nullable=False)
    weight_kg = Column(Numeric(6, 2), nullable=True)
    phone = Column(String(40), nullable=False, default='')
    allergies = Column(Text, nullable=False, default='')
    history = Column(Text, nullable=False, default='')
    created = Column(Integer, default=lambda: int(time.time()), nullable=False)
    prescriptions = relationship('Prescription', back_populates='patient')
    __table_args__ = (CheckConstraint('age >= 0 AND age <= 130'), CheckConstraint("sex IN ('female','male','unknown')"))

    @property
    def mrn(self):
        return f'ASH-{self.id:07d}'


class Prescription(Base):
    __tablename__ = 'prescriptions'
    id = Column(Integer, primary_key=True)
    patient_id = Column(Integer, ForeignKey('patients.id'), nullable=False)
    doctor_id = Column(Integer, ForeignKey('doctors.id'), nullable=False)
    complaint = Column(Text, nullable=False)
    diagnosis = Column(Text, nullable=False, default='')
    notes = Column(Text, nullable=False, default='')
    status = Column(String(20), nullable=False, default='draft')
    template_id = Column(Integer, nullable=False, default=1)
    revision = Column(Integer, nullable=False, default=1)
    patient_snapshot = Column(Text, nullable=True)
    hospital_snapshot = Column(Text, nullable=True)
    doctor_snapshot = Column(String(160), nullable=True)
    created = Column(Integer, default=lambda: int(time.time()), nullable=False)
    patient = relationship('Patient', back_populates='prescriptions')
    doctor = relationship('Doctor', back_populates='prescriptions')
    items = relationship('PrescriptionItem', back_populates='prescription', cascade='all, delete-orphan', order_by='PrescriptionItem.id')
    __table_args__ = (CheckConstraint("status IN ('draft','confirmed')"), CheckConstraint('template_id BETWEEN 1 AND 20'))


class PrescriptionItem(Base):
    __tablename__ = 'prescription_items'
    id = Column(Integer, primary_key=True)
    prescription_id = Column(Integer, ForeignKey('prescriptions.id'), nullable=False)
    name = Column(String(160), nullable=False)
    form = Column(String(60), nullable=False)
    dose = Column(String(120), nullable=False)
    frequency = Column(String(120), nullable=False)
    duration = Column(String(120), nullable=False)
    quantity = Column(Integer, nullable=False)
    instructions = Column(String(500), nullable=False, default='')
    prescription = relationship('Prescription', back_populates='items')
    __table_args__ = (CheckConstraint('quantity > 0'),)


class Medicine(Base):
    __tablename__ = 'medicines'
    id = Column(Integer, primary_key=True)
    name = Column(String(160), nullable=False)
    form = Column(String(60), nullable=False)
    strength = Column(String(80), nullable=False)
    stock = Column(Integer, nullable=False)
    reorder = Column(Integer, nullable=False, default=10)
    __table_args__ = (CheckConstraint('stock >= 0 AND reorder >= 0'),)


class WorkOrder(Base):
    __tablename__ = 'work_orders'
    id = Column(Integer, primary_key=True)
    patient_id = Column(Integer, ForeignKey('patients.id'), nullable=False)
    kind = Column(String(20), nullable=False)
    title = Column(String(200), nullable=False)
    status = Column(String(20), nullable=False, default='requested')
    result = Column(Text, nullable=False, default='')
    created_by = Column(Integer, ForeignKey('users.id'), nullable=False)
    resulted_by = Column(Integer, ForeignKey('users.id'), nullable=True)
    created = Column(Integer, default=lambda: int(time.time()), nullable=False)
    patient = relationship('Patient')
    __table_args__ = (CheckConstraint("kind IN ('lab','radiology')"), CheckConstraint("status IN ('requested','completed')"))


class Admission(Base):
    __tablename__ = 'admissions'
    id = Column(Integer, primary_key=True)
    patient_id = Column(Integer, ForeignKey('patients.id'), nullable=False)
    # Nullable unique keys enforce single active patient per bed / bed per patient.
    active_patient = Column(Integer, ForeignKey('patients.id'), unique=True, nullable=True)
    active_bed = Column(Integer, unique=True, nullable=True)
    bed = Column(Integer, nullable=False)
    reason = Column(Text, nullable=False)
    created = Column(Integer, default=lambda: int(time.time()), nullable=False)
    discharged = Column(Integer, nullable=True)
    discharge_note = Column(Text, nullable=False, default='')
    patient = relationship('Patient', foreign_keys=[patient_id])
    __table_args__ = (CheckConstraint('bed BETWEEN 1 AND 10'), CheckConstraint('active_bed IS NULL OR active_bed BETWEEN 1 AND 10'))


class Setting(Base):
    __tablename__ = 'settings'
    key = Column(String(80), primary_key=True)
    value = Column(Text, nullable=False)


class AuditLog(Base):
    __tablename__ = 'audit_logs'
    id = Column(Integer, primary_key=True)
    actor = Column(Integer, ForeignKey('users.id'), nullable=True)
    action = Column(String(80), nullable=False)
    resource = Column(String(80), nullable=False)
    created = Column(Integer, default=lambda: int(time.time()), nullable=False)


class PrintDesign(Base):
    __tablename__ = 'print_designs'
    prescription_id = Column(Integer, ForeignKey('prescriptions.id'), primary_key=True)
    design_id = Column(Integer, nullable=False)
    snapshot = Column(Text, nullable=True)
    prescription = relationship('Prescription', back_populates='design', uselist=False)
    __table_args__ = (CheckConstraint('design_id BETWEEN 1 AND 200'),)


Prescription.design = relationship('PrintDesign', back_populates='prescription', uselist=False, cascade='all, delete-orphan')


class UserPreference(Base):
    __tablename__ = 'user_preferences'
    user_id = Column(Integer, ForeignKey('users.id'), primary_key=True)
    value = Column(Text, nullable=False, default='{}')


class WorkTask(Base):
    __tablename__ = 'work_tasks'
    id = Column(Integer, primary_key=True)
    owner_id = Column(Integer, ForeignKey('users.id'), nullable=False, index=True)
    title = Column(String(160), nullable=False)
    priority = Column(String(20), nullable=False, default='normal')
    due_at = Column(Integer, nullable=True)
    done = Column(Boolean, nullable=False, default=False)
    revision = Column(Integer, nullable=False, default=1)
    created = Column(Integer, nullable=False, default=lambda: int(time.time()))
    __table_args__ = (CheckConstraint("priority IN ('normal','important','urgent')"),)


class Appointment(Base):
    __tablename__ = 'appointments'
    id = Column(Integer, primary_key=True)
    patient_id = Column(Integer, ForeignKey('patients.id'), nullable=False, index=True)
    doctor_id = Column(Integer, ForeignKey('doctors.id'), nullable=False)
    created_by = Column(Integer, ForeignKey('users.id'), nullable=False)
    starts_at = Column(Integer, nullable=False, index=True)
    reason = Column(String(400), nullable=False)
    status = Column(String(20), nullable=False, default='scheduled')
    slot_key = Column(String(100), unique=True, nullable=True)
    revision = Column(Integer, nullable=False, default=1)
    created = Column(Integer, nullable=False, default=lambda: int(time.time()))
    patient = relationship('Patient')
    doctor = relationship('Doctor')
    __table_args__ = (CheckConstraint("status IN ('scheduled','checked_in','completed','cancelled')"),)


class VisitNote(Base):
    __tablename__ = 'visit_notes'
    id = Column(Integer, primary_key=True)
    patient_id = Column(Integer, ForeignKey('patients.id'), nullable=False, index=True)
    author_id = Column(Integer, ForeignKey('users.id'), nullable=False)
    kind = Column(String(30), nullable=False)
    subjective = Column(Text, nullable=False)
    objective = Column(Text, nullable=False, default='')
    assessment = Column(Text, nullable=False, default='')
    plan = Column(Text, nullable=False, default='')
    vitals = Column(Text, nullable=False, default='{}')
    amends_id = Column(Integer, ForeignKey('visit_notes.id'), nullable=True)
    created = Column(Integer, nullable=False, default=lambda: int(time.time()))
    author = relationship('User')
    __table_args__ = (CheckConstraint("kind IN ('opd','followup','emergency')"),)
