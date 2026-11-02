from decimal import Decimal
from typing import Literal
from pydantic import BaseModel, ConfigDict, Field, field_validator


class Input(BaseModel):
    model_config = ConfigDict(extra='forbid', str_strip_whitespace=True)


class Login(Input):
    username: str = Field(min_length=1, max_length=120)
    # Password spaces are meaningful and are not stripped.
    password: str = Field(min_length=1, max_length=200)
    @field_validator('password', mode='before')
    @classmethod
    def preserve_password(cls, value):
        return value
    model_config = ConfigDict(extra='forbid')


class UserInput(Input):
    model_config = ConfigDict(extra='forbid')
    @field_validator('username', 'name', mode='before')
    @classmethod
    def clean_identity(cls, value):
        return value.strip() if isinstance(value, str) else value

    username: str = Field(min_length=3, max_length=120, pattern=r'^[a-zA-Z0-9@._+-]+$')
    name: str = Field(min_length=2, max_length=160)
    password: str = Field(min_length=12, max_length=200)
    role: Literal['doctor', 'reception', 'pharmacy', 'lab', 'radiology']


class PatientInput(Input):
    first_name: str = Field(min_length=1, max_length=80)
    last_name: str = Field(min_length=1, max_length=80)
    father_name: str = Field(default='', max_length=80)
    age: int = Field(ge=0, le=130)
    sex: Literal['female', 'male', 'unknown']
    weight_kg: Decimal | None = Field(default=None, ge=Decimal('0.1'), le=500, decimal_places=2)
    phone: str = Field(default='', max_length=40)
    allergies: str = Field(default='', max_length=2000)
    history: str = Field(default='', max_length=4000)


class ItemInput(Input):
    name: str = Field(min_length=1, max_length=160)
    form: str = Field(min_length=1, max_length=60)
    dose: str = Field(min_length=1, max_length=120)
    frequency: str = Field(min_length=1, max_length=120)
    duration: str = Field(min_length=1, max_length=120)
    quantity: int = Field(ge=1, le=10000)
    instructions: str = Field(default='', max_length=500)


class PrescriptionInput(Input):
    patient_id: int = Field(gt=0)
    complaint: str = Field(min_length=1, max_length=4000)
    diagnosis: str = Field(default='', max_length=4000)
    notes: str = Field(default='', max_length=4000)
    template_id: int = Field(default=1, ge=1, le=200)
    items: list[ItemInput] = Field(default_factory=list, max_length=30)


class PrescriptionUpdate(PrescriptionInput):
    revision: int = Field(ge=1)


class Confirmation(Input):
    reviewed: bool
    revision: int = Field(ge=1)


class HospitalInput(Input):
    name: str = Field(min_length=2, max_length=200)
    english_name: str = Field(default='', max_length=200)
    services: str = Field(default='', max_length=300)
    phone: str = Field(default='', max_length=100)
    address: str = Field(default='', max_length=300)
    email: str = Field(default='', max_length=150)
    website: str = Field(default='', max_length=150)
    template_id: int = Field(default=1, ge=1, le=200)


class MedicineInput(Input):
    name: str = Field(min_length=1, max_length=160)
    form: str = Field(min_length=1, max_length=60)
    strength: str = Field(min_length=1, max_length=80)
    stock: int = Field(ge=0, le=1000000)
    reorder: int = Field(default=10, ge=0, le=1000000)


class StockInput(Input):
    delta: int = Field(ge=-1000000, le=1000000)
    reason: str = Field(min_length=3, max_length=200)


class OrderInput(Input):
    patient_id: int = Field(gt=0)
    kind: Literal['lab', 'radiology']
    title: str = Field(min_length=2, max_length=200)


class ResultInput(Input):
    result: str = Field(min_length=2, max_length=8000)


class AdmissionInput(Input):
    patient_id: int = Field(gt=0)
    bed: int = Field(ge=1, le=10)
    reason: str = Field(min_length=2, max_length=2000)


class DischargeInput(Input):
    note: str = Field(min_length=2, max_length=4000)


class PasswordChange(Input):
    model_config = ConfigDict(extra='forbid')
    current_password: str = Field(min_length=1, max_length=200)
    new_password: str = Field(min_length=12, max_length=200)


class ActivationInput(Input):
    license: str = Field(min_length=1, max_length=20000)


class PreferencesInput(Input):
    theme: Literal['sage', 'ocean', 'plum', 'midnight', 'rose', 'sand', 'slate', 'mint', 'lavender', 'copper'] = 'sage'
    density: Literal['comfortable', 'compact'] = 'comfortable'
    font_size: Literal['normal', 'large'] = 'normal'
    favorites: list[int] = Field(default_factory=list, max_length=200)

    @field_validator('favorites')
    @classmethod
    def valid_favorites(cls, values):
        if any(not 1 <= item <= 200 for item in values):
            raise ValueError('Unknown template')
        return sorted(set(values))


class TaskInput(Input):
    title: str = Field(min_length=2, max_length=160)
    priority: Literal['normal', 'important', 'urgent'] = 'normal'
    due_at: int | None = Field(default=None, ge=0, le=4102444800)


class TaskStateInput(Input):
    done: bool
    revision: int = Field(ge=1)


class AppointmentInput(Input):
    patient_id: int = Field(gt=0)
    doctor_id: int = Field(gt=0)
    starts_at: int = Field(ge=0, le=4102444800)
    reason: str = Field(min_length=2, max_length=400)

    @field_validator('starts_at')
    @classmethod
    def half_hour_slot(cls, value):
        if value % 1800:
            raise ValueError('وقت باید در بازهٔ نیم‌ساعته باشد.')
        return value


class AppointmentStateInput(Input):
    status: Literal['checked_in', 'completed', 'cancelled']
    revision: int = Field(ge=1)


class VitalsInput(Input):
    systolic: int | None = Field(default=None, ge=40, le=300)
    diastolic: int | None = Field(default=None, ge=20, le=200)
    pulse: int | None = Field(default=None, ge=20, le=250)
    temperature: float | None = Field(default=None, ge=25, le=45, allow_inf_nan=False)
    spo2: int | None = Field(default=None, ge=0, le=100)
    weight_kg: float | None = Field(default=None, ge=0.1, le=500, allow_inf_nan=False)


class VisitInput(Input):
    patient_id: int = Field(gt=0)
    kind: Literal['opd', 'followup', 'emergency'] = 'opd'
    subjective: str = Field(min_length=2, max_length=4000)
    objective: str = Field(default='', max_length=4000)
    assessment: str = Field(default='', max_length=4000)
    plan: str = Field(default='', max_length=4000)
    vitals: VitalsInput = Field(default_factory=VitalsInput)
    amends_id: int | None = Field(default=None, gt=0)
