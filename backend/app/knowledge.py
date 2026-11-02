"""Small, explicitly incomplete vocabulary. NOT a diagnostic or dosing engine."""
import re
import unicodedata


def normalize(text):
    return re.sub(r'\s+', ' ', unicodedata.normalize('NFKC', text).lower().replace('ي', 'ی').replace('ك', 'ک').replace('\u200c',' ').replace('ـ','')).strip()


SYMPTOMS = [
    ('تب', 'fever'), ('سرفه', 'cough'), ('سردرد', 'headache'), ('درد شکم', 'abdominal pain'),
    ('درد سینه', 'chest pain'), ('نفس‌تنگی', 'shortness of breath'), ('تهوع', 'nausea'),
    ('استفراغ', 'vomiting'), ('اسهال', 'diarrhea'), ('سرگیجه', 'dizziness'),
    ('خستگی', 'fatigue'), ('درد مفصل', 'joint pain'), ('حساسیت', 'allergy'),
    ('بیهوشی', 'unconsciousness'), ('خونریزی', 'bleeding'), ('کاهش اشتها', 'loss of appetite'),
]
SOURCES = [
    {'name': 'WHO — منابع رسمی مراقبت صحی', 'url': 'https://www.who.int/'},
    {'name': 'DailyMed — برچسب رسمی دواها', 'url': 'https://dailymed.nlm.nih.gov/dailymed/'},
    {'name': 'NICE BNF — مرجع تجویز', 'url': 'https://bnf.nice.org.uk/'},
]
DISCLAIMER = 'پوشش محدود و اعتبارسنجی بالینی‌نشده؛ نبود هشدار به معنی بی‌خطر بودن نیست. این ابزار تشخیص یا دوز تجویز نمی‌کند.'


def support(items, patient):
    names = [normalize(item['name']) for item in items]
    has = lambda words: any(any(word in name for word in words) for name in names)
    warnings = []
    if has(['warfarin', 'وارفارین']) and has(['aspirin', 'اسپرین', 'آسپرین']):
        warnings.append('وارفارین و اسپرین: احتمال افزایش خطر خونریزی؛ بازبینی داکتر لازم است.')
    if len(names) != len(set(names)):
        warnings.append('نام دوای تکراری وجود دارد؛ شکل، قدرت و ضرورت تکرار بررسی شود.')
    if patient.age < 18:
        warnings.append('مریض زیر ۱۸ سال است؛ این ابزار دوز اطفال را محاسبه نمی‌کند.')
    if patient.allergies.strip():
        warnings.append('حساسیت در دوسیه ثبت شده است؛ همهٔ دواها را با سابقهٔ حساسیت مقایسه کنید.')
    checklist = [
        {'key':'identity','label':'هویت مریض بازبینی شود','recorded':bool(patient.first_name and patient.last_name)},
        {'key':'weight','label':'وزن در دوسیه ثبت شده','recorded':patient.weight_kg is not None},
        {'key':'allergies','label':'شرح حساسیت توسط داکتر بررسی شود','recorded':bool(patient.allergies.strip())},
        {'key':'history','label':'سابقهٔ طبی ثبت شده','recorded':bool(patient.history.strip())},
    ]
    return {'checklist':checklist,'warnings': warnings, 'disclaimer': DISCLAIMER, 'sources': SOURCES, 'coverage': 'limited-rules-v1',
            'auto_dosing': False, 'mandatory_injections': False}

# 160 explicit vocabulary entries. These are documentation terms, NOT 160 diagnoses,
# protocols or sources of treatment. Synonyms help typing; text is never replaced silently.
GROUPS = [
 ('عمومی', SYMPTOMS),
 ('تنفسی', [('سرفه خشک','dry cough'),('سرفه خلط‌دار','productive cough'),('خلط خونی','blood-stained sputum'),
 ('خس‌خس سینه','wheezing'),('گرفتگی صدا','hoarseness'),('گلودرد','sore throat'),('گرفتگی بینی','nasal congestion'),
 ('آبریزش بینی','runny nose'),('عطسه','sneezing'),('تنفس سریع','rapid breathing'),('درد هنگام تنفس','pain with breathing'),
 ('سرفه شبانه','night cough'),('احساس خفگی','choking sensation'),('کبودی لب','blue lips'),('خشکی گلو','dry throat'),('از دست دادن بویایی','loss of smell')]),
 ('گوارشی', [('سوزش معده','heartburn'),('نفخ','bloating'),('یبوست','constipation'),('درد بالای شکم','upper abdominal pain'),
 ('درد پایین شکم','lower abdominal pain'),('مشکل بلع','difficulty swallowing'),('درد هنگام بلع','painful swallowing'),
 ('استفراغ خونی','vomiting blood'),('مدفوع سیاه','black stool'),('خون در مدفوع','blood in stool'),('زردی چشم','yellow eyes'),
 ('احساس پری شکم','abdominal fullness'),('ترش کردن','acid reflux'),('خشکی دهان','dry mouth'),('تشنگی زیاد','excessive thirst'),('بی‌اختیاری مدفوع','fecal incontinence')]),
 ('اعصاب و حواس', [('تاری دید','blurred vision'),('دوبینی','double vision'),('بی‌حسی','numbness'),('مورمور شدن','tingling'),
 ('ضعف یک‌طرفه','one-sided weakness'),('اختلال گفتار','speech difficulty'),('لرزش','tremor'),('تشنج گزارش‌شده','reported seizure'),
 ('عدم تعادل','imbalance'),('اختلال حافظه','memory difficulty'),('گیجی','confusion'),('خواب‌آلودگی','drowsiness'),
 ('حساسیت به نور','light sensitivity'),('کاهش شنوایی','hearing loss'),('وزوز گوش','tinnitus'),('درد چشم','eye pain')]),
 ('قلب و گردش خون', [('تپش قلب','palpitations'),('ورم پا','leg swelling'),('درد ساق','calf pain'),('سردی اندام','cold extremity'),
 ('غش','fainting'),('درد با فعالیت','exertional pain'),('تعریق سرد','cold sweating'),('احساس ضربان نامنظم','irregular heartbeat sensation'),
 ('ورم یک‌طرفه پا','one-sided leg swelling'),('رنگ‌پریدگی','pallor'),('خستگی هنگام فعالیت','exertional fatigue'),
 ('درد پشت جناغ','retrosternal pain'),('سنگینی سینه','chest heaviness'),('ورم دست','hand swelling'),('کبودی انگشت','blue finger'),('سردی پا','cold feet')]),
 ('ادراری', [('سوزش ادرار','burning urination'),('تکرر ادرار','urinary frequency'),('خون در ادرار','blood in urine'),
 ('کاهش ادرار','reduced urine'),('قطع ادرار','inability to urinate'),('درد پهلو','flank pain'),('ادرار شبانه','night urination'),
 ('بی‌اختیاری ادرار','urinary incontinence'),('فوریت ادرار','urinary urgency'),('ادرار کدر','cloudy urine'),
 ('بوی غیرعادی ادرار','unusual urine odor'),('جریان ضعیف ادرار','weak urine stream'),('احساس تخلیه ناکامل','incomplete emptying sensation'),
 ('درد زیر شکم هنگام ادرار','lower abdominal pain with urination'),('ورم اطراف چشم','swelling around eyes'),('افزایش حجم ادرار','increased urine volume')]),
 ('عضلات و مفاصل', [('کمردرد','back pain'),('گردن‌درد','neck pain'),('درد زانو','knee pain'),('درد شانه','shoulder pain'),
 ('درد مچ','wrist pain'),('درد عضله','muscle pain'),('گرفتگی عضله','muscle cramps'),('ورم مفصل','joint swelling'),
 ('خشکی صبحگاهی','morning stiffness'),('محدودیت حرکت','limited movement'),('درد پاشنه','heel pain'),('درد لگن','hip pain'),
 ('درد آرنج','elbow pain'),('ضعف عضله','muscle weakness'),('درد پس از ضربه','pain after injury'),('درد هنگام راه رفتن','pain walking')]),
 ('پوست و زخم', [('خارش','itching'),('دانه‌های پوستی','skin rash'),('قرمزی پوست','skin redness'),('تورم صورت','facial swelling'),
 ('کهیر','hives'),('تاول','blister'),('زخم باز','open wound'),('ترشح زخم','wound discharge'),('درد محل زخم','wound pain'),
 ('تغییر رنگ پوست','skin color change'),('خشکی پوست','dry skin'),('ریزش مو','hair loss'),('کبودی پوست','skin bruising'),
 ('پوسته‌ریزی','skin scaling'),('تعریق زیاد','excessive sweating'),('ترک پوست','skin fissure')]),
 ('خواب و روان', [('بی‌خوابی','insomnia'),('خواب زیاد','excessive sleep'),('خرخر','snoring'),('کابوس','nightmare'),
 ('اضطراب گزارش‌شده','reported anxiety'),('غمگینی گزارش‌شده','reported sadness'),('بی‌قراری','restlessness'),
 ('مشکل تمرکز','difficulty concentrating'),('احساس ناامیدی','hopelessness'),('کاهش علاقه','reduced interest'),
 ('افکار آسیب به خود','thoughts of self-harm'),('تحریک‌پذیری','irritability'),('خواب منقطع','interrupted sleep'),
 ('ترس ناگهانی','sudden fear'),('کاهش انرژی','low energy'),('تغییر اشتها','appetite change')]),
 ('رشد و تناسلی', [('کاهش وزن ناخواسته','unintentional weight loss'),('افزایش وزن ناخواسته','unintentional weight gain'),
 ('تعریق شبانه','night sweats'),('عدم تحمل گرما','heat intolerance'),('عدم تحمل سرما','cold intolerance'),
 ('تاخیر عادت ماهوار','delayed menstruation'),('خونریزی غیرعادی ماهوار','unusual menstrual bleeding'),('درد ماهوار','menstrual pain'),
 ('ترشح غیرعادی تناسلی','unusual genital discharge'),('درد پستان','breast pain'),('کاهش شیر خوردن طفل','reduced infant feeding'),
 ('گریه غیرعادی طفل','unusual infant crying'),('کاهش فعالیت طفل','reduced child activity'),('کندی رشد گزارش‌شده','reported slow growth'),
 ('درد بیضه','testicular pain'),('توده گزارش‌شده','reported lump')]),
]
VOCABULARY = [{'label':fa,'english':en,'group':group} for group, entries in GROUPS for fa,en in entries]
SYMPTOMS = [(entry['label'],entry['english']) for entry in VOCABULARY]


def symptom_suggestions(query, limit=12):
    from difflib import SequenceMatcher
    text=normalize(query).replace('\u200c',' ').replace('ـ','')
    if not text or any(word in text.split() for word in ('بدون','ندارد','نیست','no','not')):
        return []
    result=[]
    for entry in VOCABULARY:
        labels=[normalize(entry['label']).replace('\u200c',' '),entry['english']]
        exact=any(text in label for label in labels)
        score=max(SequenceMatcher(None,text,label).ratio() for label in labels)
        if exact or (len(text)>=3 and score>=.72):
            result.append(entry|{'match':'text' if exact else 'possible_typo','score':round(1 if exact else score,2)})
    return sorted(result,key=lambda e:(-e['score'],e['label']))[:limit]
