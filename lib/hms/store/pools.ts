/**
 * Pools for the hospital store catalogue.
 *
 * Format: `Name|نام دری|class|form-group|strength1,strength2,…`
 *
 * form-group is one of the seven groups the owner asked for:
 *   solid       tablets, capsules, effervescent tablets, oral sachets
 *   liquid      syrups, suspensions, oral drops, inhalers, nebuliser solutions
 *   topical     creams, ointments, gels, lotions, eye/ear/nasal drops
 *   injection   vials, ampoules, prefilled syringes
 *   consumable  gloves, masks, caps, gowns, packs, tubes, catheters, sutures
 *   hygiene     shampoo, soap, pampers, sanitizer, barrier cream
 *   misc        dressings, test strips, thermometers, nebuliser masks, splints
 *
 * The class keys match the therapeutic percentages requested by the owner.
 */
export type ClassKey =
  | "uro_gi"
  | "resp_card"
  | "surg_anesth"
  | "ent"
  | "eye_skin"
  | "obstetric"
  | "trauma"
  | "ortho"
  | "endo_haem";

export type FormGroup = "solid" | "liquid" | "topical" | "injection" | "consumable" | "hygiene" | "misc";

export const CLASS_LABEL: Record<ClassKey, { en: string; fa: string }> = {
  uro_gi: { en: "Urinary, sexual & digestive", fa: "بولی، تناسلی و هضمی" },
  resp_card: { en: "Respiratory & cardiac", fa: "تنفسی و قلبی" },
  surg_anesth: { en: "Surgery & anaesthesia", fa: "جراحی و انستیزی" },
  ent: { en: "Ear, nose & throat", fa: "گوش، گلو و بینی" },
  eye_skin: { en: "Eye & skin", fa: "چشم و جلدی" },
  obstetric: { en: "Obstetric & newborn", fa: "نسایی و نوزاد" },
  trauma: { en: "Traffic, forensic & emergency", fa: "حادثات، جنایی و عاجل" },
  ortho: { en: "Orthopaedic", fa: "ارتوپیدی" },
  endo_haem: { en: "Endocrine & blood", fa: "اندوکراین و خون" },
};

export const FORM_LABEL: Record<FormGroup, { en: string; fa: string }> = {
  solid: { en: "Tablet / capsule / effervescent / oral sachet", fa: "تابلیت، کپسول، جوشی، ساشه" },
  liquid: { en: "Syrup / suspension / drops / inhaler", fa: "شربت، سوسپانسیون، قطره، انهیلر" },
  topical: { en: "Ointment / cream / gel / lotion / eye drops", fa: "مرحم، کریم، جیل، لوشن، قطرهٔ چشم" },
  injection: { en: "Vial / ampoule / prefilled syringe", fa: "ویال، امپول، سرنج آماده" },
  consumable: { en: "Gloves, mask, cap, pack, tube, catheter", fa: "دستکش، ماسک، کلاه، پک، تیوب، کاتتر" },
  hygiene: { en: "Shampoo, soap, pampers, sanitizer", fa: "شامپو، صابون، پمپر، ضدعفونی" },
  misc: { en: "Dressing, strips, thermometer, masks, splint", fa: "پانسمان، نوار تست، ترمومتر، ماسک، آتل" },
};

/** Therapeutic targets, normalised from the owner's list to exactly 1000. */
export const CLASS_TARGET: Record<ClassKey, number> = {
  uro_gi: 273,
  resp_card: 182,
  surg_anesth: 91,
  ent: 91,
  eye_skin: 91,
  obstetric: 45,
  trauma: 45,
  ortho: 91,
  endo_haem: 91,
};

/** Form-group targets out of 1000 (30/20/10/10/10/10/10 as requested). */
export const FORM_TARGET: Record<FormGroup, number> = {
  solid: 300,
  liquid: 200,
  topical: 100,
  injection: 100,
  consumable: 100,
  hygiene: 100,
  misc: 100,
};

const LINES = `
# ---- urinary, sexual & digestive -------------------------------------------
Omeprazole|امپرازول|uro_gi|solid|20 mg,40 mg
Esomeprazole|ایزومپرازول|uro_gi|solid|20 mg,40 mg
Pantoprazole|پنتوپرازول|uro_gi|solid|40 mg
Ranitidine|رانیتیدین|uro_gi|solid|150 mg,300 mg
Famotidine|فاموتیدین|uro_gi|solid|20 mg,40 mg
Sucralfate|سوکرالفات|uro_gi|solid|1 g
Domperidone|دومپریدون|uro_gi|solid|10 mg
Metoclopramide|میتوکلوپرامید|uro_gi|solid|10 mg
Ondansetron|اندانسترون|uro_gi|solid|4 mg,8 mg
Loperamide|لوپرامید|uro_gi|solid|2 mg
Bisacodyl|بیزاکودیل|uro_gi|solid|5 mg,10 mg
Mebeverine|میبیورین|uro_gi|solid|135 mg
Mesalazine|مزالسازین|uro_gi|solid|400 mg,800 mg
Albendazole|البنڈازول|uro_gi|solid|400 mg
Mebendazole|میبینڈازول|uro_gi|solid|100 mg,500 mg
Praziquantel|پرازیکوانتل|uro_gi|solid|600 mg
Ursodeoxycholic acid|اسید اورسودی‌اکسی‌کولیک|uro_gi|solid|250 mg,300 mg
Pancreatin|پانکریاتین|uro_gi|solid|10 000 IU,25 000 IU
Simethicone|سیمیتیکون|uro_gi|solid|40 mg,80 mg
Rifaximin|ریفاکسیمین|uro_gi|solid|550 mg
Ciprofloxacin|سیپروفلوکسازین|uro_gi|solid|250 mg,500 mg
Metronidazole|مترونیدازول|uro_gi|solid|200 mg,400 mg
Nitrofurantoin|نایتروفورانتوین|uro_gi|solid|50 mg,100 mg
Trimethoprim|تری‌متوپریم|uro_gi|solid|100 mg,200 mg
Tamsulosin|تامسولوسین|uro_gi|solid|0.4 mg
Finasteride|فیناستراید|uro_gi|solid|1 mg,5 mg
Sildenafil|سیلدینافیل|uro_gi|solid|25 mg,50 mg,100 mg
Oxybutynin|اوکسی‌بیوتینین|uro_gi|solid|2.5 mg,5 mg
Solifenacin|سولیفناسین|uro_gi|solid|5 mg,10 mg
Potassium citrate|پوتاشیم سیترات|uro_gi|solid|1.5 g
Lactulose|لاکتولوز|uro_gi|liquid|3.35 g/5 ml,10 g/15 ml
Antacid suspension|سوسپانسیون آنتی‌اسید|uro_gi|liquid|200 ml,500 ml
Domperidone suspension|سوسپانسیون دومپریدون|uro_gi|liquid|5 mg/5 ml
Ondansetron syrup|شربت اندانسترون|uro_gi|liquid|4 mg/5 ml
Metronidazole suspension|سوسپانسیون مترونیدازول|uro_gi|liquid|200 mg/5 ml
Albendazole suspension|سوسپانسیون البنڈازول|uro_gi|liquid|200 mg/5 ml
Simethicone drops|قطرهٔ سیمیتیکون|uro_gi|liquid|40 mg/ml
Magnesium hydroxide|مگنیزیم هایڈروکساید|uro_gi|liquid|400 mg/5 ml
Ondansetron injection|اندانسترون (تزریقی)|uro_gi|injection|2 mg/ml,4 mg/2 ml
Metoclopramide injection|میتوکلوپرامید (تزریقی)|uro_gi|injection|5 mg/ml
Omeprazole injection|امپرازول (تزریقی)|uro_gi|injection|40 mg
Hyoscine butylbromide|هایوسین بوتیل‌بروماید|uro_gi|injection|20 mg/ml
Ranitidine injection|رانیتیدین (تزریقی)|uro_gi|injection|25 mg/ml
Hydrocortisone rectal cream|کریم رکتال هایڈروکورتیزون|uro_gi|topical|1%
Lidocaine gel|جیل لیدوکایین|uro_gi|topical|2%
Glyceryl trinitrate ointment|مرحم نیتروگلیسیرین|uro_gi|topical|0.4%

Urine drainage bag|کیسهٔ ادرار|uro_gi|consumable|2 L,night bag
Nelaton catheter|کاتتر نلاتون|uro_gi|consumable|10 Fr,12 Fr,14 Fr
Rectal tube|تیوب رکتال|uro_gi|consumable|16 Fr,18 Fr
Stoma bag|کیسهٔ کلستومی|uro_gi|consumable|closed, drainable
Disposable bed sheet|ملافهٔ یک‌بار مصرف|uro_gi|consumable|60x90 cm
Antiseptic soap|صابون ضدعفونی|uro_gi|hygiene|100 g,500 ml

# ---- respiratory & cardiac -------------------------------------------------
Salbutamol|سالبوتامول|resp_card|solid|2 mg,4 mg
Prednisolone|پردنیزولون|resp_card|solid|5 mg,25 mg
Montelukast|مونته‌لوکاست|resp_card|solid|4 mg,10 mg
Theophylline|تیوفیلین|resp_card|solid|100 mg,200 mg
Amoxicillin|اموکسی‌سیلین|resp_card|solid|250 mg,500 mg
Amoxicillin-clavulanate|اموکسی‌سیلین-کلاولانیت|resp_card|solid|625 mg,1 g
Azithromycin|آزیترومایسین|resp_card|solid|250 mg,500 mg
Doxycycline|داکسی‌سیکلین|resp_card|solid|100 mg
Levofloxacin|لیووفلوکسازین|resp_card|solid|250 mg,500 mg
Clarithromycin|کلاریترومایسین|resp_card|solid|250 mg,500 mg
Cetirizine|ستیریزین|resp_card|solid|5 mg,10 mg
Loratadine|لوراتادین|resp_card|solid|10 mg
Fexofenadine|فیکسوفنادین|resp_card|solid|120 mg,180 mg
Aspirin|اسپرین|resp_card|solid|75 mg,300 mg
Clopidogrel|کلوپیدوگریل|resp_card|solid|75 mg
Atorvastatin|آتورواستاتین|resp_card|solid|10 mg,20 mg,40 mg
Rosuvastatin|روزوواستاتین|resp_card|solid|5 mg,10 mg
Bisoprolol|بیزوپرولول|resp_card|solid|2.5 mg,5 mg
Atenolol|اتینولول|resp_card|solid|25 mg,50 mg
Amlodipine|آملودیپین|resp_card|solid|5 mg,10 mg
Losartan|لوزارتان|resp_card|solid|50 mg,100 mg
Lisinopril|لیزینوپریل|resp_card|solid|5 mg,10 mg
Hydrochlorothiazide|هایڈروکلوروتیازاید|resp_card|solid|25 mg
Furosemide|فوروسیماید|resp_card|solid|20 mg,40 mg
Spironolactone|سپیرونولاکتون|resp_card|solid|25 mg,50 mg
Isosorbide mononitrate|ایزوسورباید مونونایترات|resp_card|solid|20 mg,40 mg
Digoxin|دیگوکسین|resp_card|solid|0.0625 mg,0.25 mg
Warfarin|وارفارین|resp_card|solid|1 mg,5 mg
Rivaroxaban|ریواروکسابان|resp_card|solid|10 mg,20 mg
Apixaban|اپیکسابان|resp_card|solid|2.5 mg,5 mg
Salbutamol syrup|شربت سالبوتامول|resp_card|liquid|2 mg/5 ml
Ambroxol syrup|شربت آمبروکسول|resp_card|liquid|15 mg/5 ml,30 mg/5 ml
Guaifenesin syrup|شربت گایفنیزین|resp_card|liquid|100 mg/5 ml
Dextromethorphan syrup|شربت دکسترومیتورفان|resp_card|liquid|15 mg/5 ml
Chlorpheniramine syrup|شربت کلرفنیرامین|resp_card|liquid|2 mg/5 ml
Prednisolone syrup|شربت پردنیزولون|resp_card|liquid|5 mg/5 ml
Salbutamol nebules|نبول سالبوتامول|resp_card|liquid|2.5 mg/2.5 ml,5 mg/2.5 ml
Ipratropium nebules|نبول ایپراتروپیوم|resp_card|liquid|250 mcg/ml,500 mcg/2 ml
Budesonide nebules|نبول بودزوناید|resp_card|liquid|0.5 mg/2 ml,1 mg/2 ml
Beclomethasone inhaler|انهیلر بکلومیتازون|resp_card|liquid|50 mcg,250 mcg
Salmeterol-fluticasone inhaler|انهیلر سالمترول-فلوتیکازون|resp_card|liquid|25/125 mcg,25/250 mcg
Ceftriaxone|سفتریاکسون|resp_card|injection|500 mg,1 g,2 g
Furosemide injection|فوروسیماید (تزریقی)|resp_card|injection|10 mg/ml,20 mg/2 ml
Digoxin injection|دیگوکسین (تزریقی)|resp_card|injection|0.25 mg/ml
Heparin sodium|هپارین|resp_card|injection|1000 IU/ml,5000 IU/ml
Enoxaparin|انوکساپارین|resp_card|injection|20 mg,40 mg,60 mg
Amiodarone|آمیودارون|resp_card|injection|50 mg/ml
Adenosine|آدینوزین|resp_card|injection|6 mg/2 ml
Atropine|آتروپین|resp_card|injection|0.6 mg/ml,1 mg/ml
Adrenaline|ادرینالین|resp_card|injection|1 mg/ml
Noradrenaline|نورادرینالین|resp_card|injection|1 mg/ml
Nitroglycerin infusion|نیتروگلیسیرین وریدی|resp_card|injection|5 mg/ml

# ---- surgery & anaesthesia -------------------------------------------------
Ketamine|کیتامین|surg_anesth|injection|50 mg/ml,100 mg/ml
Propofol|پروپوفول|surg_anesth|injection|10 mg/ml
Thiopental|تیوپنتال|surg_anesth|injection|500 mg
Suxamethonium|سوکسامیتونیوم|surg_anesth|injection|50 mg/ml,100 mg
Rocuronium|روکورونیوم|surg_anesth|injection|10 mg/ml
Vecuronium|ویکورونیوم|surg_anesth|injection|4 mg,10 mg
Fentanyl|فنتانیل|surg_anesth|injection|50 mcg/ml
Morphine sulphate|مورفین سلفات|surg_anesth|injection|10 mg/ml,15 mg/ml
Tramadol injection|ترامادول (تزریقی)|surg_anesth|injection|50 mg/ml
Lidocaine|لیدوکایین|surg_anesth|injection|1%,2%
Bupivacaine|بوپیواکایین|surg_anesth|injection|0.25%,0.5%
Midazolam|میدازولام|surg_anesth|injection|1 mg/ml,5 mg/ml
Diazepam injection|دیازپام (تزریقی)|surg_anesth|injection|5 mg/ml
Neostigmine|نیوستیگمین|surg_anesth|injection|2.5 mg
Glycopyrrolate|گلایکوپیرولات|surg_anesth|injection|0.2 mg/ml
Cefazolin|سفازولین|surg_anesth|injection|1 g,2 g
Metronidazole infusion|مترونیدازول وریدی|surg_anesth|injection|500 mg/100 ml
Dexamethasone injection|دکسامیتازون (تزریقی)|surg_anesth|injection|4 mg/ml
Pethidine|پتیدین|surg_anesth|injection|50 mg/ml
Paracetamol|پاراسیتامول|surg_anesth|solid|500 mg,1 g
Ibuprofen|ایبوپروفن|surg_anesth|solid|200 mg,400 mg
Diclofenac|دیکلوفیناک|surg_anesth|solid|25 mg,50 mg
Tramadol|ترامادول|surg_anesth|solid|50 mg,100 mg
Paracetamol infusion|پاراسیتامول وریدی|surg_anesth|liquid|10 mg/ml
Chlorhexidine solution|محلول کلرهگزیدین|surg_anesth|liquid|0.5%,2%,4%
Povidone-iodine solution|محلول پوویدون آیوداین|surg_anesth|liquid|10%,7.5%,1%
Hydrogen peroxide solution|محلول هایڈروژن پراکساید|surg_anesth|liquid|3%,6%
Sodium chloride irrigation|محلول شست‌وشوی نارمل سالین|surg_anesth|liquid|0.9%,1 L
Cetrimide antiseptic solution|محلول ضدعفونی ستیریماید|surg_anesth|liquid|0.5%,15%
Glutaraldehyde disinfectant|ضدعفونی گلوتارالدیهاید|surg_anesth|liquid|2%
Alcohol 70% hand solution|محلول الکول ۷۰٪|surg_anesth|liquid|70%,100 ml
Sterile gloves|دستکش استریل|surg_anesth|consumable|6.5,7,7.5,8
Examination gloves|دستکش معاینه|surg_anesth|consumable|S,M,L
Surgical mask|ماسک جراحی|surg_anesth|consumable|3-ply
N95 respirator|ماسک N95|surg_anesth|consumable|standard
Surgical cap|کلاه جراحی|surg_anesth|consumable|standard
Sterile gown|گان استریل|surg_anesth|consumable|L,XL
Minor surgical pack|پک جراحی کوچک|surg_anesth|consumable|set
Major surgical pack|پک جراحی بزرگ|surg_anesth|consumable|set
Nasogastric tube|تیوب معده|surg_anesth|consumable|12 Fr,14 Fr,16 Fr
Suction catheter|کاتتر سکشن|surg_anesth|consumable|10 Fr,12 Fr,14 Fr
Urinary catheter|کاتتر ادراری|surg_anesth|consumable|14 Fr,16 Fr,18 Fr
IV cannula|کانولا وریدی|surg_anesth|consumable|18 G,20 G,22 G,24 G
Syringe|سرنج|surg_anesth|consumable|2 ml,5 ml,10 ml,20 ml
Suture|نخ بخیه|surg_anesth|consumable|2-0,3-0,4-0
Surgical blade|تیغهٔ جراحی|surg_anesth|consumable|#10,#15,#22

Oxygen face mask|ماسک اکسیژن|resp_card|misc|adult,paediatric
Nebuliser mask kit|کیت ماسک نبولایزر|resp_card|misc|adult,paediatric
Peak flow meter|پیک‌فلومتر|resp_card|misc|standard

# ---- ear, nose & throat ----------------------------------------------------
Betahistine|بیتاهیستین|ent|solid|8 mg,16 mg
Cinnarizine|سیناریزین|ent|solid|25 mg,75 mg
Dimenhydrinate|دیمنهایڈرینیت|ent|solid|50 mg
Pseudoephedrine|پسیودوافیدرین|ent|solid|30 mg,60 mg
Chlorpheniramine|کلرفنیرامین|ent|solid|4 mg
Paracetamol ENT|پاراسیتامول (گوش گلو)|ent|solid|500 mg
Amoxicillin ENT|اموکسی‌سیلین (گوش گلو)|ent|solid|500 mg
Xylometazoline nasal drops|قطرهٔ بینی زایلومیتازولین|ent|liquid|0.05%,0.1%
Saline nasal spray|اسپری نمکی بینی|ent|liquid|0.9%
Ofloxacin ear drops|قطرهٔ گوش اوفلوکسازین|ent|liquid|0.3%
Chloramphenicol ear drops|قطرهٔ گوش کلرامفنیکول|ent|liquid|5%
Ambroxol ENT syrup|شربت آمبروکسول (ENT)|ent|liquid|15 mg/5 ml
Betamethasone nasal drops|قطرهٔ بینی بتامیتازون|ent|liquid|0.1%
Beclomethasone nasal spray|اسپری بینی بکلومیتازون|ent|topical|50 mcg
Mometasone nasal spray|اسپری بینی مومیتازون|ent|topical|50 mcg
Fluticasone nasal spray|اسپری بینی فلوتیکازون|ent|topical|50 mcg
Ear wax softening drops|قطرهٔ نرم‌کنندهٔ جرم گوش|ent|topical|sodium bicarbonate,olive oil
Azelastine nasal spray|اسپری بینی آزلاستین|ent|topical|0.1%,0.15%
Ipratropium nasal spray|اسپری بینی ایپراتروپیوم|ent|topical|0.03%,0.06%
Budesonide nasal spray|اسپری بینی بودزوناید|ent|topical|32 mcg,64 mcg
Saline nasal gel|ژل نمکی بینی|ent|topical|30 g
Mupirocin nasal ointment|مرحم بینی موپیروسین|ent|topical|2%
Glycerin ear drops|قطرهٔ گوش گلیسرین|ent|topical|10 ml
Antiseptic throat paint|رنگ گلو ضدعفونی|ent|topical|15 ml
Hydrocortisone ear cream|کریم گوش هایڈروکورتیزون|ent|topical|1%
Nasal tampon|تامپون بینی|ent|topical|pack of 5
Ceftriaxone ENT|سفتریاکسون (ENT)|ent|injection|1 g
Dexamethasone ENT|دکسامیتازون (ENT)|ent|injection|4 mg/ml
Hyoscine ENT|هایوسین (ENT)|ent|injection|20 mg/ml

Tongue depressor|دیپریسور زبان|ent|misc|pack of 100
Ear speculum|اسپکولوم گوش|ent|misc|2 mm,3 mm,4 mm

# ---- eye & skin ------------------------------------------------------------
Chloramphenicol eye ointment|مرحم چشم کلرامفنیکول|eye_skin|topical|1%
Tetracycline eye ointment|مرحم چشم تتراسایکلین|eye_skin|topical|1%
Ciprofloxacin eye drops|قطرهٔ چشم سیپروفلوکسازین|eye_skin|topical|0.3%
Tobramycin eye drops|قطرهٔ چشم توبرامایسین|eye_skin|topical|0.3%
Timolol eye drops|قطرهٔ چشم تیمولول|eye_skin|topical|0.25%,0.5%
Latanoprost eye drops|قطرهٔ چشم لاتانوپروست|eye_skin|topical|0.005%
Artificial tears|قطرهٔ اشک مصنوعی|eye_skin|topical|0.5%
Atropine eye drops|قطرهٔ چشم آتروپین|eye_skin|topical|1%
Tropicamide eye drops|قطرهٔ چشم تروپیکاماید|eye_skin|topical|0.5%,1%
Betamethasone cream|کریم بتامیتازون|eye_skin|topical|0.05%,0.1%
Clotrimazole cream|کریم کلوتریمازول|eye_skin|topical|1%
Mupirocin ointment|مرحم موپیروسین|eye_skin|topical|2%
Silver sulfadiazine cream|کریم سلفادیازین نقره|eye_skin|topical|1%
Permethrin lotion|لوشن پرمترین|eye_skin|topical|5%
Calamine lotion|لوشن کالامین|eye_skin|topical|15%
Ketoconazole cream|کریم کیتوکونازول|eye_skin|topical|2%
Hydrocortisone cream|کریم هایڈروکورتیزون|eye_skin|topical|1%
Fusidic acid cream|کریم فوسیدیک اسید|eye_skin|topical|2%
Benzoyl peroxide gel|جیل بنزوییل پراکساید|eye_skin|topical|2.5%,5%
Terbinafine cream|کریم تربینافین|eye_skin|topical|1%
Zinc oxide ointment|مرحم زنک اکساید|eye_skin|topical|20%
Fluconazole|فلوکونازول|eye_skin|solid|50 mg,150 mg,200 mg
Terbinafine|تربینافین|eye_skin|solid|125 mg,250 mg
Acyclovir|آسیکلوویر|eye_skin|solid|200 mg,400 mg,800 mg
Griseofulvin|گریزیوفولوین|eye_skin|solid|125 mg,500 mg
Isotretinoin|ایزوترتینویین|eye_skin|solid|10 mg,20 mg
Methotrexate|میتوترکسات|eye_skin|solid|2.5 mg,10 mg
Prednisolone skin|پردنیزولون (جلدی)|eye_skin|solid|5 mg,25 mg
Doxycycline skin|داکسی‌سیکلین (جلدی)|eye_skin|solid|100 mg
Cetirizine skin|ستیریزین (جلدی)|eye_skin|solid|10 mg
Ketoconazole shampoo|شامپو کیتوکونازول|eye_skin|hygiene|1%,2%
Selenium sulfide lotion|لوشن سلنیوم سلفاید|eye_skin|hygiene|1%,2.5%
Emollient cream|کریم مرطوب‌کننده|eye_skin|hygiene|100 g,500 g,1 kg
Medicated soap|صابون طبی|eye_skin|hygiene|75 g,100 g,125 g
Tar shampoo|شامپو قطران|eye_skin|hygiene|1%,3%
Zinc pyrithione shampoo|شامپو زنک پیریتیون|eye_skin|hygiene|1%,2%
Coal tar ointment|مرحم قطران ذغال|eye_skin|hygiene|2%,5%
Barrier hand cream|کریم محافظ دست|eye_skin|hygiene|50 g,100 g
Antifungal powder|پودر ضد قارچ|eye_skin|hygiene|50 g,100 g
Skin cleanser wash|شویندهٔ پوست|eye_skin|hygiene|200 ml,500 ml

Eye pad|پد چشم|eye_skin|misc|sterile pack of 10
Eye test card|کارت تست بینایی|eye_skin|misc|Snellen
Sanitising wipes|دستمال ضدعفونی|eye_skin|hygiene|pack of 100

# ---- obstetric & newborn ---------------------------------------------------
Ferrous sulphate|فروس سلفات|obstetric|solid|200 mg
Folic acid|فولیک اسید|obstetric|solid|1 mg,5 mg
Calcium carbonate|کلسیم کاربونات|obstetric|solid|500 mg,1 g
Iron-folic acid combination|ترکیب آهن و فولیک اسید|obstetric|solid|tablet
Misoprostol|میزوپروستول|obstetric|solid|25 mcg,200 mcg
Methylergometrine|متیل‌ارگومترین|obstetric|solid|0.125 mg,0.2 mg
Nifedipine|نیفیدیپین|obstetric|solid|5 mg,10 mg
Vitamin D3|ویتامین D3|obstetric|solid|1000 IU,50 000 IU
Paracetamol obstetric|پاراسیتامول (نسایی)|obstetric|solid|500 mg
Iron syrup|شربت آهن|obstetric|liquid|100 mg/5 ml
ORS sachet|ساشهٔ ORS|obstetric|liquid|1 sachet / 1 L
Antacid obstetric|آنتی‌اسید (نسایی)|obstetric|liquid|200 ml
Oxytocin|اوکسیتوسین|obstetric|injection|5 IU/ml,10 IU/ml
Magnesium sulphate|مگنیزیم سلفات|obstetric|injection|50%
Tranexamic acid|ترانکسامیک اسید|obstetric|injection|500 mg/5 ml,1 g/10 ml
Tetanus toxoid|توکسوئید کزاز|obstetric|injection|0.5 ml
Vitamin K1|ویتامین K1|obstetric|injection|2 mg,10 mg
Dexamethasone obstetric|دکسامیتازون (نسایی)|obstetric|injection|4 mg/ml
Disposable delivery kit|پک ولادت یک‌بار مصرف|obstetric|consumable|set
Cord clamp|کلمپ بند ناف|obstetric|consumable|pack of 10
Sanitary pads|پد صحی|obstetric|hygiene|pack of 10
Baby pampers|پمپر طفل|obstetric|hygiene|S,M,L
Baby shampoo|شامپو طفل|obstetric|hygiene|200 ml
Barrier cream|کریم محافظ پوست|obstetric|hygiene|100 g

Incontinence pad|پد بی‌اختیاری ادرار|obstetric|misc|pack of 10
Nappy rash cream|کریم سوختگی پمپر|obstetric|hygiene|50 g

# ---- traffic, forensic & emergency ----------------------------------------
Rabies vaccine|واکسن هاری|trauma|injection|0.5 ml
Rabies immunoglobulin|ایمونوگلوبولین هاری|trauma|injection|500 IU
Tetanus immunoglobulin|ایمونوگلوبولین کزاز|trauma|injection|250 IU,500 IU
Ketamine trauma|کیتامین (تروما)|trauma|injection|50 mg/ml
Morphine trauma|مورفین (تروما)|trauma|injection|10 mg/ml
Hydrocortisone|هایڈروکورتیزون|trauma|injection|100 mg,200 mg
Ceftriaxone trauma|سفتریاکسون (تروما)|trauma|injection|1 g
Metronidazole trauma|مترونیدازول (تروما)|trauma|injection|500 mg
Ringer lactate|رینگر لاکتات|trauma|injection|500 ml,1 L
Normal saline|نارمل سالین|trauma|injection|500 ml,1 L
Paracetamol trauma|پاراسیتامول (تروما)|trauma|solid|500 mg
Ibuprofen trauma|ایبوپروفن (تروما)|trauma|solid|400 mg
Tramadol trauma|ترامادول (تروما)|trauma|solid|50 mg
Ciprofloxacin trauma|سیپروفلوکسازین (تروما)|trauma|solid|500 mg
Amoxicillin-clavulanate trauma|اموکسی‌سیلین-کلاولانیت (تروما)|trauma|solid|625 mg
Cervical collar|کالر گردنی|trauma|consumable|S,M,L
Burn dressing kit|پک پانسمان سوختگی|trauma|consumable|set
Emergency dressing pack|پک پانسمان عاجل|trauma|consumable|set
Splint|آتل|trauma|misc|small,medium,large
Stretcher sheet|ملافهٔ برانکارد|trauma|misc|disposable
Tourniquet|تورنیکه|trauma|misc|adult
Gauze roll|رول گاز|trauma|misc|10 cm,15 cm
Adhesive plaster|پلاستر چسپنده|trauma|misc|2.5 cm,5 cm
Elastic bandage|بند کشی|trauma|misc|10 cm

Cast padding|پد گچ|ortho|consumable|5 cm,7.5 cm,10 cm,15 cm,20 cm
Stockingette|زیرگچ|ortho|consumable|5 cm,7.5 cm,10 cm,15 cm,20 cm
Fibreglass cast tape|نوار گچ فایبرگلاس|ortho|consumable|7.5 cm,10 cm,12.5 cm,15 cm
Cast saw blade|تیغهٔ ارهٔ گچ|ortho|consumable|small,large
Bone cement|سیمان استخوان|ortho|consumable|20 g,40 g
Surgical drill bit|متهٔ جراحی|ortho|consumable|2.0 mm,2.5 mm,3.2 mm
Kirschner wire|سیم کیرشنر|ortho|consumable|1.0 mm,1.5 mm,2.0 mm
Sterile drape|شیت استریل|ortho|consumable|60x60 cm,90x90 cm
Suction tubing|تیوب سکشن|ortho|consumable|2 m
Antiseptic hand rub|ژل ضدعفونی دست|ortho|hygiene|100 ml,250 ml,500 ml,1 L
Surgical scrub solution|محلول شست‌وشوی جراحی|ortho|hygiene|250 ml,500 ml
Instrument disinfectant|ضدعفونی وسایل|ortho|hygiene|1 L,5 L
Massage oil|روغن ماساژ|ortho|hygiene|100 ml,200 ml
Physiotherapy gel|ژل فیزوتراپی|ortho|hygiene|250 g,500 g

# ---- orthopaedic -----------------------------------------------------------
Naproxen|ناپروکسین|ortho|solid|250 mg,500 mg
Celecoxib|سیلیکوکسایب|ortho|solid|100 mg,200 mg
Methocarbamol|میتوکاربامول|ortho|solid|500 mg
Diazepam|دیازپام|ortho|solid|2 mg,5 mg
Alendronate|آلندرونات|ortho|solid|10 mg,70 mg
Colchicine|کولشیسین|ortho|solid|0.5 mg
Allopurinol|آلوپورینول|ortho|solid|100 mg,300 mg
Febuxostat|فیبوکسوستات|ortho|solid|40 mg,80 mg
Calcium + vitamin D|کلسیم + ویتامین D|ortho|solid|500 mg/400 IU
Paracetamol ortho|پاراسیتامول (ارتوپیدی)|ortho|solid|500 mg
Ibuprofen ortho|ایبوپروفن (ارتوپیدی)|ortho|solid|400 mg
Diclofenac ortho|دیکلوفیناک (ارتوپیدی)|ortho|solid|50 mg
Tramadol ortho|ترامادول (ارتوپیدی)|ortho|solid|50 mg
Ketorolac|کیتورولاک|ortho|injection|30 mg/ml
Diclofenac injection|دیکلوفیناک (تزریقی)|ortho|injection|25 mg/ml
Triamcinolone|تریامسینولون|ortho|injection|10 mg/ml,40 mg/ml
Methylprednisolone|متیل‌پردنیزولون|ortho|injection|40 mg,125 mg
Hyaluronic acid|اسید هایالورونیک|ortho|injection|20 mg/2 ml
Lidocaine ortho|لیدوکایین (ارتوپیدی)|ortho|injection|1%,2%
Diclofenac gel|جیل دیکلوفیناک|ortho|topical|1%
Ibuprofen gel|جیل ایبوپروفن|ortho|topical|5%
Heparinoid gel|جیل هپارینوئید|ortho|topical|0.5%
Capsaicin cream|کریم کاپسایسین|ortho|topical|0.025%,0.075%
Plaster of Paris bandage|بند گچی|ortho|misc|10 cm,15 cm,20 cm
Crepe bandage|بند کریپ|ortho|misc|10 cm,15 cm
Knee brace|زانوبند|ortho|misc|S,M,L,XL
Wrist splint|آتل مچ|ortho|misc|standard
Walking stick|عصای راه‌رفتن|ortho|misc|adjustable
Crutches|عصای زیربغل|ortho|misc|adult,child

Glucose test strips|نوار تست گلوکز|endo_haem|misc|box of 25,box of 50,box of 100
Ketone test strips|نوار تست کیتون|endo_haem|misc|box of 25,box of 50
Lancets|لنست|endo_haem|misc|box of 50,box of 100,box of 200
Insulin syringes|سرنج انسولین|endo_haem|misc|pack of 30,pack of 50,pack of 100
Insulin pen needles|سوزن قلم انسولین|endo_haem|misc|pack of 50,pack of 100
Insulin pen|قلم انسولین|endo_haem|misc|3 ml
Urine ketone strips|نوار کیتون ادرار|endo_haem|misc|box of 50
Haemoglobin strips|نوار هموگلوبین|endo_haem|misc|box of 50
Prothrombin test strips|نوار تست پروترومبین|endo_haem|misc|box of 24,box of 48
Diabetic foot cream|کریم پای دیابتی|endo_haem|hygiene|75 ml

# ---- endocrine & blood -----------------------------------------------------
Metformin|میتفورمین|endo_haem|solid|500 mg,850 mg,1000 mg
Gliclazide|گلیکلازاید|endo_haem|solid|30 mg,80 mg
Glibenclamide|گلیبینکلاماید|endo_haem|solid|2.5 mg,5 mg
Sitagliptin|سیتاگلیپتین|endo_haem|solid|50 mg,100 mg
Empagliflozin|امپاگلیفلوزین|endo_haem|solid|10 mg,25 mg
Levothyroxine|لیووتییروکسین|endo_haem|solid|25 mcg,50 mcg,100 mcg
Carbimazole|کاربیمازول|endo_haem|solid|5 mg,10 mg
Propylthiouracil|پروپیل‌تیواوراسیل|endo_haem|solid|50 mg
Calcitriol|کلسیتریول|endo_haem|solid|0.25 mcg,0.5 mcg
Vitamin D3 endo|ویتامین D3 (اندوکراین)|endo_haem|solid|1000 IU,5000 IU
Ferrous fumarate|فروس فومارات|endo_haem|solid|200 mg
Hydroxyurea|هایڈروکسی‌یوریا|endo_haem|solid|500 mg
Folic acid haem|فولیک اسید (خون)|endo_haem|solid|5 mg
Tranexamic acid oral|ترانکسامیک اسید خوراکی|endo_haem|solid|500 mg
Prednisolone endo|پردنیزولون (اندوکراین)|endo_haem|solid|5 mg,25 mg
Vitamin B12|ویتامین B12|endo_haem|solid|500 mcg,1000 mcg
Insulin soluble|انسولین محلول|endo_haem|injection|100 IU/ml
Insulin isophane|انسولین ایزوفان|endo_haem|injection|100 IU/ml
Insulin glargine|انسولین گلارجین|endo_haem|injection|100 IU/ml
Glucagon|گلوکاگون|endo_haem|injection|1 mg
Iron sucrose|آهن ساکروز|endo_haem|injection|20 mg/ml
Erythropoietin|اریتروپوییتین|endo_haem|injection|2000 IU,4000 IU
Vitamin K haem|ویتامین K (خون)|endo_haem|injection|10 mg/ml
Dextrose 50%|دکستروز ۵۰٪|endo_haem|injection|50%
Dextrose 10%|دکستروز ۱۰٪|endo_haem|injection|10%
Insulin infusion|انسولین وریدی|endo_haem|injection|1 IU/ml
Glucose gel|ژل گلوکز|endo_haem|liquid|15 g
Iron syrup haem|شربت آهن (خون)|endo_haem|liquid|100 mg/5 ml
Vitamin D drops|قطرهٔ ویتامین D|endo_haem|liquid|400 IU/ml
Oral glucose solution|محلول گلوکز خوراکی|endo_haem|liquid|10%
`;

export type Generic = { name: string; nameFa: string; cls: ClassKey; form: FormGroup; strengths: string[] };

export const GENERICS: Generic[] = LINES.split("\n")
  .map((l) => l.trim())
  .filter((l) => l && !l.startsWith("#"))
  .map((l) => {
    const [name, nameFa, cls, form, strengths] = l.split("|").map((x) => x.trim());
    return { name, nameFa, cls: cls as ClassKey, form: form as FormGroup, strengths: strengths.split(",").map((s) => s.trim()) };
  });

export const ALLOWED_FORMS: Record<ClassKey, FormGroup[]> = {
  uro_gi: ["solid", "liquid", "injection", "topical", "consumable", "hygiene"],
  resp_card: ["solid", "liquid", "injection", "misc"],
  surg_anesth: ["injection", "solid", "liquid", "consumable", "misc", "hygiene"],
  ent: ["solid", "liquid", "topical", "injection", "misc"],
  eye_skin: ["topical", "solid", "liquid", "hygiene", "misc"],
  obstetric: ["solid", "liquid", "injection", "consumable", "hygiene", "misc"],
  trauma: ["injection", "solid", "consumable", "misc", "hygiene"],
  ortho: ["solid", "injection", "topical", "misc", "consumable", "hygiene"],
  endo_haem: ["solid", "injection", "liquid", "misc", "hygiene"],
};
