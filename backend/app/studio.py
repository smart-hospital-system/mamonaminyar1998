"""Ten editable print families. Text remains clinical data, never generated decoration."""
import json
from pydantic import BaseModel, ConfigDict, Field, field_validator
from .models import Setting
from .templates import TEMPLATES

FAMILIES = [
 ('aura','آرامش بلورین','#258b9c','#dceff4'),('sunrise','سپیدهٔ پاستلی','#76558d','#f6e8f1'),
 ('rose','قاب قلب','#a63765','#fae9ee'),('ribbon','نوار جراحی','#a73236','#f6e8e5'),
 ('orchid','موج ارکیده','#654595','#eee9f8'),('horizon','افق هندسی','#245977','#e3f0f2'),
 ('pediatric','اطفال آرام','#35546e','#edf3fa'),('aqua','مینیمال فیروزه','#267c80','#e6f5f3'),
 ('editorial','نوشتار رسمی','#34475a','#eef0f4'),('surgical','امضای ایبک','#286d59','#e6f0e8'),
]

class Profile(BaseModel):
    model_config=ConfigDict(extra='forbid',str_strip_whitespace=True)
    id:int=Field(ge=1,le=10)
    title:str=Field(min_length=2,max_length=60)
    primary:str=Field(pattern=r'^#[0-9a-fA-F]{6}$')
    wash:str=Field(pattern=r'^#[0-9a-fA-F]{6}$')
    logo: str=Field(pattern=r'^(cross|heart|monogram)$')
    heading: str=Field(default='نسخهٔ طبی',min_length=1,max_length=80)
    footer_note:str=Field(default='مصرف دوا فقط طبق هدایت داکتر.',max_length=200)
    compact:bool=False

class StudioInput(BaseModel):
    model_config=ConfigDict(extra='forbid')
    revision:int=Field(ge=1)
    enabled:bool=True
    profiles:list[Profile]=Field(min_length=10,max_length=10)

    @field_validator('profiles')
    @classmethod
    def complete(cls,rows):
        if sorted(row.id for row in rows)!=list(range(1,11)):
            raise ValueError('All ten family IDs must occur exactly once')
        return rows


def defaults():
    return {'revision':1,'enabled':True,'profiles':[
        Profile(id=i,title=name,primary=color,wash=wash,logo='heart' if code=='rose' else 'cross').model_dump()
        for i,(code,name,color,wash) in enumerate(FAMILIES,1)]}


def configuration(db):
    row=db.get(Setting,'print_studio')
    return json.loads(row.value) if row else defaults()


def resolved_templates(db):
    value=configuration(db)
    if not value['enabled']:
        return [dict(row) for row in TEMPLATES]
    profiles={p['id']:p for p in value['profiles']}
    return [dict(row,studio=dict(profiles[(row['id']-1)//20+1],family=FAMILIES[(row['id']-1)//20][0])) for row in TEMPLATES]
