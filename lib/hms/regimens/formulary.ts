/**
 * Formulary for the age-stratified demo prescriptions.
 *
 * Every drug carries three dose bands (child < 18, adult 18–70, elderly 71–90)
 * and the dosage form used in that band, so a generated prescription can state
 * "syrup 5 ml three times daily" for a child and "vial 1 g IV daily" for an
 * admitted adult without a second lookup table.
 *
 * Doses are standard textbook ranges for demonstration and teaching. They are
 * NOT a substitute for the national formulary, the renal adjustment table in
 * lib/hms/clinical.ts, or the prescriber's judgement — the generated file says
 * so on every page.
 */

export type DoseBand = "child" | "adult" | "elderly";
export type Form =
  | "Tablet"
  | "Capsule"
  | "Syrup"
  | "Suspension"
  | "Vial"
  | "Nebule"
  | "Cream"
  | "Ointment"
  | "Drops"
  | "Suppository"
  | "Sachet"
  | "Inhaler";

export type Drug = {
  id: string;
  name: string;
  nameFa: string;
  className: string;
  /** Form prescribed in each band. */
  form: Record<DoseBand, Form>;
  strength: Record<DoseBand, string>;
  dose: Record<DoseBand, string>;
  frequency: Record<DoseBand, string>;
  duration: string;
  route: Record<DoseBand, string>;
  /** Marks drugs that must never be given to a child or an older adult. */
  avoid?: DoseBand[];
};

const c = (form: Form, strength: string, dose: string, frequency: string, route = "Oral") => ({ form, strength, dose, frequency, route });
const A = (strength: string, dose: string, frequency: string, route = "Oral") => ({ strength, dose, frequency, route });

type Spec = {
  name: string;
  nameFa: string;
  className: string;
  child: { form: Form; strength: string; dose: string; frequency: string; route?: string };
  adult: { strength: string; dose: string; frequency: string; route?: string };
  elderly: { strength: string; dose: string; frequency: string; route?: string };
  duration?: string;
};

const SPECS: Record<string, Spec> = {
  co_trimoxazole: {
    name: "Co-trimoxazole", nameFa: "کو-تریموکسازول", className: "Antibiotic — sulfonamide",
    child: c("Suspension", "240 mg/5 ml", "6 mg/kg (trimethoprim) per dose", "Every 12 hours"),
    adult: A("960 mg tablet", "960 mg", "Every 12 hours"),
    elderly: A("960 mg tablet", "960 mg", "Every 12 hours, check renal function"),
    duration: "14 days",
  },
  paracetamol_syrup: {
    name: "Paracetamol (oral liquid)", nameFa: "پاراسیتامول (شربت)", className: "Analgesic / antipyretic",
    child: c("Syrup", "120 mg/5 ml", "10–15 mg/kg per dose", "Every 6 hours if needed"),
    adult: A("Syrup 120 mg/5 ml", "15 ml", "Every 6 hours, max 4 g/day"),
    elderly: A("Syrup 120 mg/5 ml", "10 ml", "Every 6–8 hours, max 3 g/day"),
    duration: "5 days",
  },
  paracetamol: {
    name: "Paracetamol", nameFa: "پاراسیتامول", className: "Analgesic / antipyretic",
    child: c("Syrup", "120 mg/5 ml", "10–15 mg/kg per dose", "Every 6 hours if needed"),
    adult: A("500 mg tablet", "1 g", "Every 6 hours, max 4 g/day"),
    elderly: A("500 mg tablet", "500 mg – 1 g", "Every 6–8 hours, max 3 g/day"),
    duration: "5 days",
  },
  ibuprofen: {
    name: "Ibuprofen", nameFa: "ایبوپروفن", className: "NSAID",
    child: c("Suspension", "100 mg/5 ml", "5–10 mg/kg per dose", "Every 8 hours with food"),
    adult: A("400 mg tablet", "400 mg", "Every 8 hours with food"),
    elderly: A("200 mg tablet", "200 mg", "Every 8 hours, shortest course"),
    duration: "5 days",
  },
  amoxicillin: {
    name: "Amoxicillin", nameFa: "اموکسی‌سیلین", className: "Antibiotic — penicillin",
    child: c("Syrup", "125 mg/5 ml", "25 mg/kg per dose", "Every 8 hours"),
    adult: A("500 mg capsule", "500 mg", "Every 8 hours"),
    elderly: A("500 mg capsule", "500 mg", "Every 8 hours, check renal function"),
    duration: "7 days",
  },
  amox_clav: {
    name: "Amoxicillin-Clavulanate", nameFa: "اموکسی‌سیلین-کلاولانیت", className: "Antibiotic — penicillin",
    child: c("Suspension", "156 mg/5 ml", "25 mg/kg per dose", "Every 8 hours"),
    adult: A("625 mg tablet", "625 mg", "Every 8 hours"),
    elderly: A("625 mg tablet", "625 mg", "Every 8 hours, check renal function"),
    duration: "7 days",
  },
  penicillin_v: {
    name: "Penicillin V", nameFa: "پنی‌سیلین V", className: "Antibiotic — penicillin",
    child: c("Syrup", "125 mg/5 ml", "12.5 mg/kg per dose", "Every 6 hours"),
    adult: A("500 mg tablet", "500 mg", "Every 6 hours"),
    elderly: A("500 mg tablet", "500 mg", "Every 6 hours"),
    duration: "10 days",
  },
  ceftriaxone: {
    name: "Ceftriaxone", nameFa: "سفتریاکسون", className: "Antibiotic — cephalosporin",
    child: c("Vial", "500 mg", "50 mg/kg once daily", "Once daily", "IV / IM"),
    adult: A("1 g vial", "1–2 g", "Once daily", "IV / IM"),
    elderly: A("1 g vial", "1 g", "Once daily", "IV / IM"),
    duration: "5–7 days",
  },
  azithromycin: {
    name: "Azithromycin", nameFa: "آزیترومایسین", className: "Antibiotic — macrolide",
    child: c("Suspension", "200 mg/5 ml", "10 mg/kg once daily", "Once daily"),
    adult: A("500 mg tablet", "500 mg", "Once daily"),
    elderly: A("250 mg tablet", "250 mg", "Once daily, check QT"),
    duration: "5 days",
  },
  ciprofloxacin: {
    name: "Ciprofloxacin", nameFa: "سیپروفلوکسازین", className: "Antibiotic — fluoroquinolone",
    child: c("Suspension", "250 mg/5 ml", "15 mg/kg per dose", "Every 12 hours"),
    adult: A("500 mg tablet", "500 mg", "Every 12 hours"),
    elderly: A("250 mg tablet", "250 mg", "Every 12 hours, check renal function"),
    duration: "5 days",
  },
  doxycycline: {
    name: "Doxycycline", nameFa: "داکسی‌سیکلین", className: "Antibiotic — tetracycline",
    child: c("Capsule", "100 mg", "2 mg/kg per dose (over 8 years)", "Every 12 hours"),
    adult: A("100 mg capsule", "100 mg", "Every 12 hours"),
    elderly: A("100 mg capsule", "100 mg", "Every 12 hours, swallow upright"),
    duration: "7 days",
  },
  metronidazole: {
    name: "Metronidazole", nameFa: "مترونیدازول", className: "Antimicrobial — anaerobic",
    child: c("Syrup", "200 mg/5 ml", "7.5 mg/kg per dose", "Every 8 hours"),
    adult: A("400 mg tablet", "400 mg", "Every 8 hours"),
    elderly: A("400 mg tablet", "400 mg", "Every 8 hours, avoid alcohol"),
    duration: "7 days",
  },
  vancomycin: {
    name: "Vancomycin", nameFa: "وانکومایسین", className: "Antibiotic — glycopeptide",
    child: c("Vial", "500 mg", "15 mg/kg per dose", "Every 6 hours", "IV"),
    adult: A("1 g vial", "1 g", "Every 12 hours", "IV"),
    elderly: A("1 g vial", "1 g", "Every 24 hours, monitor levels", "IV"),
    duration: "7–10 days",
  },
  oseltamivir: {
    name: "Oseltamivir", nameFa: "اسلتامیویر", className: "Antiviral",
    child: c("Suspension", "6 mg/ml", "Weight-banded dose", "Every 12 hours"),
    adult: A("75 mg capsule", "75 mg", "Every 12 hours"),
    elderly: A("75 mg capsule", "75 mg", "Every 12 hours"),
    duration: "5 days",
  },
  acyclovir: {
    name: "Acyclovir", nameFa: "آسیکلوویر", className: "Antiviral",
    child: c("Suspension", "200 mg/5 ml", "20 mg/kg per dose", "Every 6 hours"),
    adult: A("400 mg tablet", "400 mg", "Every 8 hours"),
    elderly: A("400 mg tablet", "400 mg", "Every 12 hours, hydrate well"),
    duration: "7 days",
  },
  salbutamol: {
    name: "Salbutamol", nameFa: "سالبوتامول", className: "Bronchodilator",
    child: c("Nebule", "2.5 mg/2.5 ml", "1 nebule", "Every 20 minutes in an attack"),
    adult: A("100 mcg inhaler", "2 puffs", "Every 4–6 hours as needed"),
    elderly: A("100 mcg inhaler", "2 puffs", "Every 4–6 hours, monitor heart rate"),
    duration: "As needed",
  },
  prednisolone: {
    name: "Prednisolone", nameFa: "پردنیزولون", className: "Corticosteroid",
    child: c("Syrup", "5 mg/5 ml", "1–2 mg/kg once daily", "Once daily, morning"),
    adult: A("5 mg tablet", "40 mg", "Once daily, morning"),
    elderly: A("5 mg tablet", "30 mg", "Once daily, morning, cover bone health"),
    duration: "5 days",
  },
  dexamethasone: {
    name: "Dexamethasone", nameFa: "دکسامیتازون", className: "Corticosteroid",
    child: c("Vial", "4 mg/ml", "0.15 mg/kg", "Single dose", "IM / IV"),
    adult: A("4 mg/ml vial", "8 mg", "Once daily", "IV / IM"),
    elderly: A("4 mg/ml vial", "4 mg", "Once daily", "IV / IM"),
    duration: "1–3 days",
  },
  hydrocortisone: {
    name: "Hydrocortisone", nameFa: "هایڈروکورتیزون", className: "Corticosteroid",
    child: c("Vial", "100 mg", "4 mg/kg per dose", "Every 6 hours", "IV"),
    adult: A("100 mg vial", "100 mg", "Every 6 hours", "IV"),
    elderly: A("100 mg vial", "50 mg", "Every 6 hours", "IV"),
    duration: "3 days",
  },
  ors: {
    name: "Oral rehydration salts", nameFa: "نمک‌های محلول خوراکی ORS", className: "Rehydration",
    child: c("Sachet", "1 sachet / 200 ml", "50–100 ml/kg over 4 hours", "Small frequent sips"),
    adult: A("1 sachet / 1 L", "200 ml", "After each loose stool"),
    elderly: A("1 sachet / 1 L", "200 ml", "After each loose stool"),
    duration: "3 days",
  },
  ringer: {
    name: "Ringer lactate", nameFa: "رینگر لاکتات", className: "IV fluid",
    child: c("Vial", "500 ml", "10–20 ml/kg bolus", "As required", "IV"),
    adult: A("1 L bag", "500 ml – 1 L", "As required", "IV"),
    elderly: A("500 ml bag", "250–500 ml", "Cautious rate", "IV"),
    duration: "24–48 hours",
  },
  zinc: {
    name: "Zinc sulphate", nameFa: "زنک سلفات", className: "Supplement",
    child: c("Syrup", "20 mg/5 ml", "10–20 mg once daily", "Once daily"),
    adult: A("20 mg tablet", "20 mg", "Once daily"),
    elderly: A("20 mg tablet", "20 mg", "Once daily"),
    duration: "14 days",
  },
  vitamin_a: {
    name: "Vitamin A", nameFa: "ویتامین A", className: "Supplement",
    child: c("Capsule", "200 000 IU", "100 000 – 200 000 IU", "Single dose, repeat next day"),
    adult: A("200 000 IU capsule", "200 000 IU", "Single dose"),
    elderly: A("200 000 IU capsule", "200 000 IU", "Single dose"),
    duration: "1–2 days",
  },
  omeprazole: {
    name: "Omeprazole", nameFa: "امپرازول", className: "Antacid — PPI",
    child: c("Suspension", "10 mg/5 ml", "1 mg/kg once daily", "Once daily before breakfast"),
    adult: A("20 mg capsule", "20 mg", "Once daily before breakfast"),
    elderly: A("20 mg capsule", "20 mg", "Once daily before breakfast"),
    duration: "14 days",
  },
  ondansetron: {
    name: "Ondansetron", nameFa: "اندانسترون", className: "Antiemetic",
    child: c("Syrup", "4 mg/5 ml", "0.15 mg/kg per dose", "Every 8 hours as needed"),
    adult: A("4 mg tablet", "4 mg", "Every 8 hours as needed"),
    elderly: A("4 mg tablet", "4 mg", "Every 12 hours, check QT"),
    duration: "3 days",
  },
  cetirizine: {
    name: "Cetirizine", nameFa: "ستیریزین", className: "Antihistamine",
    child: c("Syrup", "5 mg/5 ml", "2.5–5 mg once daily", "Once daily at night"),
    adult: A("10 mg tablet", "10 mg", "Once daily at night"),
    elderly: A("10 mg tablet", "5 mg", "Once daily at night"),
    duration: "14 days",
  },
  chlorpheniramine: {
    name: "Chlorpheniramine", nameFa: "کلرفنیرامین", className: "Antihistamine",
    child: c("Syrup", "2 mg/5 ml", "1 mg per dose", "Every 8 hours"),
    adult: A("4 mg tablet", "4 mg", "Every 8 hours"),
    elderly: A("4 mg tablet", "4 mg", "Every 12 hours, avoid in glaucoma"),
    duration: "7 days",
  },
  beclomethasone_nasal: {
    name: "Beclomethasone nasal spray", nameFa: "اسپری بینی بکلومیتازون", className: "Nasal corticosteroid",
    child: c("Drops", "50 mcg/dose", "1 spray each nostril", "Twice daily"),
    adult: A("50 mcg/dose", "2 sprays each nostril", "Twice daily"),
    elderly: A("50 mcg/dose", "1 spray each nostril", "Twice daily"),
    duration: "28 days",
  },
  budesonide_inh: {
    name: "Budesonide inhaler", nameFa: "بودزوناید استنشاقی", className: "Inhaled corticosteroid",
    child: c("Inhaler", "100 mcg/dose", "1 puff", "Twice daily with spacer"),
    adult: A("200 mcg/dose", "1–2 puffs", "Twice daily"),
    elderly: A("200 mcg/dose", "1 puff", "Twice daily, rinse mouth"),
    duration: "Long term",
  },
  amoxicillin_syrup_note: {
    name: "Saline nasal drops", nameFa: "قطرهٔ نمکی بینی", className: "Supportive",
    child: c("Drops", "0.9% saline", "2 drops each nostril", "Three times daily"),
    adult: A("0.9% saline spray", "2 sprays each nostril", "Three times daily"),
    elderly: A("0.9% saline spray", "2 sprays each nostril", "Three times daily"),
    duration: "7 days",
  },
  ferrous: {
    name: "Ferrous sulphate", nameFa: "فروس سلفات", className: "Supplement — iron",
    child: c("Syrup", "100 mg/5 ml", "3–6 mg/kg once daily", "Once daily"),
    adult: A("200 mg tablet", "200 mg", "Once daily"),
    elderly: A("200 mg tablet", "200 mg", "Once daily, alternate days if constipated"),
    duration: "3 months",
  },
  folic_acid: {
    name: "Folic acid", nameFa: "فولیک اسید", className: "Supplement",
    child: c("Tablet", "1 mg", "0.5 mg once daily", "Once daily"),
    adult: A("5 mg tablet", "5 mg", "Once daily"),
    elderly: A("5 mg tablet", "5 mg", "Once daily"),
    duration: "3 months",
  },
  artemether: {
    name: "Artemether-Lumefantrine", nameFa: "آرتمیتر-لومه‌فانترین", className: "Antimalarial",
    child: c("Syrup", "180/90 mg per 5 ml", "Weight-banded dose", "Twice daily"),
    adult: A("80/480 mg tablet", "4 tablets", "Twice daily with fat"),
    elderly: A("80/480 mg tablet", "4 tablets", "Twice daily with fat"),
    duration: "3 days",
  },
  artesunate: {
    name: "Artesunate", nameFa: "آرتسونیت", className: "Antimalarial — severe",
    child: c("Vial", "60 mg", "3 mg/kg per dose", "At 0, 12, 24 hours", "IV / IM"),
    adult: A("60 mg vial", "2.4 mg/kg per dose", "At 0, 12, 24 hours", "IV / IM"),
    elderly: A("60 mg vial", "2.4 mg/kg per dose", "At 0, 12, 24 hours", "IV / IM"),
    duration: "3 doses",
  },
  insulin_soluble: {
    name: "Soluble insulin", nameFa: "انسولین محلول", className: "Antidiabetic",
    child: c("Vial", "100 IU/ml", "0.1 IU/kg/hour", "Per sliding scale", "IV"),
    adult: A("100 IU/ml vial", "0.1 IU/kg/hour", "Per sliding scale", "IV"),
    elderly: A("100 IU/ml vial", "0.05 IU/kg/hour", "Per sliding scale", "IV"),
    duration: "Until stable",
  },
  dextrose: {
    name: "Dextrose 10%", nameFa: "دکستروز ۱۰٪", className: "IV glucose",
    child: c("Vial", "500 ml", "2–5 ml/kg bolus", "As required", "IV"),
    adult: A("500 ml bag", "250 ml", "As required", "IV"),
    elderly: A("500 ml bag", "250 ml", "Caution in diabetes", "IV"),
    duration: "1–2 days",
  },
  dextrose_50: {
    name: "Dextrose 50%", nameFa: "دکستروز ۵۰٪", className: "IV glucose — emergency",
    child: c("Vial", "20 ml", "2 ml/kg of 10%", "Repeat if needed", "IV"),
    adult: A("20 ml vial", "20–50 ml", "Repeat if needed", "IV"),
    elderly: A("20 ml vial", "20–30 ml", "Repeat if needed", "IV"),
    duration: "Single use",
  },
  salbutamol_neb: {
    name: "Ipratropium nebuliser", nameFa: "ایپراتروپیوم نبولایزر", className: "Bronchodilator — anticholinergic",
    child: c("Nebule", "250 mcg/ml", "1 nebule", "Every 20 minutes in an attack"),
    adult: A("500 mcg nebule", "1 nebule", "Every 6 hours"),
    elderly: A("500 mcg nebule", "1 nebule", "Every 6 hours, avoid in glaucoma"),
    duration: "3 days",
  },
  magnesium: {
    name: "Magnesium sulphate", nameFa: "مگنیزیم سلفات", className: "Bronchodilator adjunct",
    child: c("Vial", "500 mg/ml", "40 mg/kg per dose", "Single dose", "IV"),
    adult: A("500 mg/ml vial", "2 g", "Single dose", "IV"),
    elderly: A("500 mg/ml vial", "1.5 g", "Single dose", "IV"),
    duration: "Single dose",
  },
  oxygen: {
    name: "Oxygen", nameFa: "اکسیژن", className: "Respiratory support",
    child: c("Vial", "Therapy", "Titrate to SpO2 94–98%", "Continuous"),
    adult: A("Cylinder / concentrator", "Titrate to target saturation", "Continuous"),
    elderly: A("Cylinder / concentrator", "Titrate to 88–92% in COPD", "Continuous"),
    duration: "Until stable",
  },
  heparin_lmwh: {
    name: "Enoxaparin", nameFa: "انوکساپارین", className: "Anticoagulant",
    child: c("Vial", "40 mg/0.4 ml", "0.5–1 mg/kg per dose", "Every 12 hours", "SC"),
    adult: A("40 mg syringe", "40–60 mg", "Once daily", "SC"),
    elderly: A("40 mg syringe", "40 mg", "Once daily, check renal function", "SC"),
    duration: "5–7 days",
  },
  warfarin_note: {
    name: "Amoxicillin (oral step-down)", nameFa: "اموکسی‌سیلین (ادامهٔ خوراکی)", className: "Antibiotic — penicillin",
    child: c("Syrup", "125 mg/5 ml", "25 mg/kg per dose", "Every 8 hours"),
    adult: A("500 mg capsule", "500 mg", "Every 8 hours"),
    elderly: A("500 mg capsule", "500 mg", "Every 8 hours"),
    duration: "5 days",
  },
  tetanus_toxoid: {
    name: "Tetanus toxoid", nameFa: "توکسوئید کزاز", className: "Vaccine",
    child: c("Vial", "0.5 ml", "0.5 ml", "Single dose", "IM"),
    adult: A("0.5 ml vial", "0.5 ml", "Single dose", "IM"),
    elderly: A("0.5 ml vial", "0.5 ml", "Single dose", "IM"),
    duration: "Single dose",
  },
  rabies_vaccine: {
    name: "Rabies vaccine", nameFa: "واکسن هاری", className: "Vaccine",
    child: c("Vial", "0.5 ml", "0.5 ml", "Day 0, 3, 7, 28", "IM"),
    adult: A("0.5 ml vial", "0.5 ml", "Day 0, 3, 7, 28", "IM"),
    elderly: A("0.5 ml vial", "0.5 ml", "Day 0, 3, 7, 28", "IM"),
    duration: "28 days",
  },
  rabies_ig: {
    name: "Rabies immunoglobulin", nameFa: "ایمونوگلوبولین هاری", className: "Passive immunisation",
    child: c("Vial", "500 IU", "20 IU/kg infiltrated", "Single dose", "Local infiltration"),
    adult: A("500 IU vial", "20 IU/kg infiltrated", "Single dose", "Local infiltration"),
    elderly: A("500 IU vial", "20 IU/kg infiltrated", "Single dose", "Local infiltration"),
    duration: "Single dose",
  },
  diphtheria_at: {
    name: "Diphtheria antitoxin", nameFa: "آنتی‌توکسین دیفتیری", className: "Antitoxin",
    child: c("Vial", "10 000 IU", "20 000–40 000 IU", "Single dose", "IV"),
    adult: A("10 000 IU vial", "40 000 IU", "Single dose", "IV"),
    elderly: A("10 000 IU vial", "40 000 IU", "Single dose", "IV"),
    duration: "Single dose",
  },
  act_note: {
    name: "Insulin sliding scale", nameFa: "جدول انسولین", className: "Antidiabetic",
    child: c("Vial", "100 IU/ml", "Per protocol", "Every 4 hours", "IV"),
    adult: A("100 IU/ml vial", "Per protocol", "Every 4 hours", "IV"),
    elderly: A("100 IU/ml vial", "Per protocol", "Every 6 hours", "IV"),
    duration: "Until stable",
  },
  salbutamol_syrup: {
    name: "Salbutamol syrup", nameFa: "شربت سالبوتامول", className: "Bronchodilator — oral",
    child: c("Syrup", "2 mg/5 ml", "0.1 mg/kg per dose", "Every 8 hours"),
    adult: A("2 mg/5 ml syrup", "5 ml", "Every 8 hours"),
    elderly: A("2 mg/5 ml syrup", "5 ml", "Every 12 hours"),
    duration: "5 days",
  },
  ambroxol: {
    name: "Ambroxol", nameFa: "آمبروکسول", className: "Mucolytic",
    child: c("Syrup", "15 mg/5 ml", "5–10 ml", "Three times daily"),
    adult: A("30 mg tablet", "30 mg", "Three times daily"),
    elderly: A("30 mg tablet", "30 mg", "Twice daily"),
    duration: "7 days",
  },
  chloroquine: {
    name: "Chloroquine", nameFa: "کلوروکین", className: "Antimalarial",
    child: c("Syrup", "50 mg/5 ml", "10 mg/kg", "At 0 and 24 hours"),
    adult: A("250 mg tablet", "600 mg base", "At 0 and 24 hours"),
    elderly: A("250 mg tablet", "600 mg base", "At 0 and 24 hours"),
    duration: "3 days",
  },
  primaquine: {
    name: "Primaquine", nameFa: "پریماکین", className: "Antimalarial — radical cure",
    child: c("Tablet", "7.5 mg", "0.25 mg/kg once daily", "Once daily after G6PD test"),
    adult: A("7.5 mg tablet", "0.25 mg/kg", "Once daily for 14 days"),
    elderly: A("7.5 mg tablet", "0.25 mg/kg", "Once daily, check G6PD"),
    duration: "14 days",
  },

  gentamicin: {
    name: "Gentamicin", nameFa: "جنتامایسین", className: "Antibiotic — aminoglycoside",
    child: c("Vial", "40 mg/ml", "5 mg/kg once daily", "Once daily", "IV / IM"),
    adult: A("80 mg vial", "5 mg/kg once daily", "Once daily", "IV / IM"),
    elderly: A("80 mg vial", "3 mg/kg once daily", "Once daily, monitor renal function", "IV / IM"),
    duration: "7 days",
  },
  anti_tb_fdc: {
    name: "Anti-TB fixed-dose combination (RHZE)", nameFa: "ترکیب ثابت ضد سل (RHZE)", className: "Antitubercular",
    child: c("Tablet", "Dispersible RHZE", "Weight-banded per national chart", "Once daily before food"),
    adult: A("4-drug FDC", "4 tablets", "Once daily before food"),
    elderly: A("4-drug FDC", "4 tablets", "Once daily before food"),
    duration: "2 months, then RH for 4 months",
  },
  pyridoxine: {
    name: "Pyridoxine", nameFa: "پیریدوکسین", className: "Vitamin B6",
    child: c("Tablet", "25 mg", "12.5 mg once daily", "Once daily"),
    adult: A("25 mg tablet", "25 mg", "Once daily"),
    elderly: A("25 mg tablet", "25 mg", "Once daily"),
    duration: "During TB treatment",
  },
  stibogluconate: {
    name: "Sodium stibogluconate", nameFa: "سودیم استیبوگلوکونات", className: "Antileishmanial",
    child: c("Vial", "100 mg/ml", "20 mg/kg once daily", "Once daily", "IM / IV"),
    adult: A("100 mg/ml vial", "20 mg/kg once daily", "Once daily", "IM / IV"),
    elderly: A("100 mg/ml vial", "20 mg/kg once daily", "Once daily, ECG monitoring", "IM / IV"),
    duration: "20 days",
  },
  amphotericin_b: {
    name: "Liposomal amphotericin B", nameFa: "آمفوتریسین B لیپوزومال", className: "Antifungal",
    child: c("Vial", "50 mg", "3 mg/kg once daily", "Once daily", "IV"),
    adult: A("50 mg vial", "3 mg/kg once daily", "Once daily", "IV"),
    elderly: A("50 mg vial", "3 mg/kg once daily", "Once daily, monitor renal function", "IV"),
    duration: "Single dose or 5 days",
  },
  ceftazidime: {
    name: "Ceftazidime", nameFa: "سفتازیدیم", className: "Antibiotic — cephalosporin",
    child: c("Vial", "500 mg", "50 mg/kg per dose", "Every 8 hours", "IV"),
    adult: A("1 g vial", "1–2 g", "Every 8 hours", "IV"),
    elderly: A("1 g vial", "1 g", "Every 12 hours", "IV"),
    duration: "7 days",
  },

  diazepam: {
    name: "Diazepam", nameFa: "دیازپام", className: "Muscle relaxant / sedative",
    child: c("Vial", "10 mg/2 ml", "0.1–0.3 mg/kg per dose", "Every 4–6 hours as needed", "IV"),
    adult: A("10 mg/2 ml vial", "10 mg", "Every 6 hours as needed", "IV"),
    elderly: A("10 mg/2 ml vial", "5 mg", "Every 8 hours, monitor breathing", "IV"),
    duration: "5 days",
  },
  fluconazole: {
    name: "Fluconazole", nameFa: "فلوکونازول", className: "Antifungal",
    child: c("Syrup", "50 mg/5 ml", "3–6 mg/kg once daily", "Once daily"),
    adult: A("150 mg capsule", "150 mg", "Once daily"),
    elderly: A("150 mg capsule", "150 mg", "Once daily, check renal function"),
    duration: "7–14 days",
  },
  nystatin: {
    name: "Nystatin oral drops", nameFa: "قطرهٔ خوراکی نیستاتین", className: "Antifungal — topical",
    child: c("Drops", "100 000 IU/ml", "1 ml after feeds", "Four times daily"),
    adult: A("100 000 IU/ml drops", "1 ml", "Four times daily"),
    elderly: A("100 000 IU/ml drops", "1 ml", "Four times daily"),
    duration: "14 days",
  },
  leprosy_mdt: {
    name: "Leprosy multidrug therapy (rifampicin-dapsone-clofazimine)", nameFa: "درمان چنددوايي جوزام", className: "Antileprosy",
    child: c("Tablet", "Paediatric blister", "Weight-banded monthly", "Monthly supervised dose"),
    adult: A("Adult blister", "Monthly supervised dose", "Monthly supervised dose"),
    elderly: A("Adult blister", "Monthly supervised dose", "Monthly supervised dose"),
    duration: "6–12 months",
  },
  clotrimazole: {
    name: "Clotrimazole cream", nameFa: "کریم کلوتریمازول", className: "Antifungal — topical",
    child: c("Cream", "1%", "Thin layer twice daily", "Twice daily"),
    adult: A("1% cream", "Thin layer twice daily", "Twice daily"),
    elderly: A("1% cream", "Thin layer twice daily", "Twice daily"),
    duration: "4 weeks",
  },
  terbinafine: {
    name: "Terbinafine", nameFa: "تربینافین", className: "Antifungal — oral",
    child: c("Tablet", "250 mg", "Weight-banded", "Once daily"),
    adult: A("250 mg tablet", "250 mg", "Once daily"),
    elderly: A("250 mg tablet", "250 mg", "Once daily, check liver enzymes"),
    duration: "4 weeks",
  },

  // ---- gastrointestinal chapter -------------------------------------------
  lactulose: {
    name: "Lactulose", nameFa: "لاکتولوز", className: "Osmotic laxative",
    child: c("Syrup", "3.35 g/5 ml", "2.5–5 ml", "Twice daily"),
    adult: A("3.35 g/5 ml syrup", "15–30 ml", "Twice daily"),
    elderly: A("3.35 g/5 ml syrup", "15 ml", "Once daily, adjust to stool"),
    duration: "14 days",
  },
  bisacodyl: {
    name: "Bisacodyl", nameFa: "بیزاکودیل", className: "Stimulant laxative",
    child: c("Suppository", "5 mg", "1 suppository", "Once daily"),
    adult: A("5 mg tablet", "10 mg", "Once daily at night"),
    elderly: A("5 mg tablet", "5 mg", "Once daily at night, short course"),
    duration: "7 days",
  },
  omeprazole_iv: {
    name: "Omeprazole (IV)", nameFa: "امپرازول وریدی", className: "Proton pump inhibitor — IV",
    child: c("Vial", "40 mg", "0.5 mg/kg once daily", "Once daily", "IV"),
    adult: A("40 mg vial", "40 mg", "Twice daily", "IV"),
    elderly: A("40 mg vial", "40 mg", "Once daily", "IV"),
    duration: "3 days",
  },
  sucralfate: {
    name: "Sucralfate", nameFa: "سوکرالفات", className: "Mucosal protectant",
    child: c("Suspension", "1 g/5 ml", "0.5 g", "Four times daily"),
    adult: A("1 g tablet", "1 g", "Four times daily before meals"),
    elderly: A("1 g tablet", "1 g", "Four times daily"),
    duration: "14 days",
  },
  domperidone: {
    name: "Domperidone", nameFa: "دومپریدون", className: "Prokinetic",
    child: c("Suspension", "5 mg/5 ml", "0.25 mg/kg per dose", "Three times daily before meals"),
    adult: A("10 mg tablet", "10 mg", "Three times daily before meals"),
    elderly: A("10 mg tablet", "10 mg", "Three times daily, check QT"),
    duration: "7 days",
  },
  metoclopramide: {
    name: "Metoclopramide", nameFa: "میتوکلوپرامید", className: "Antiemetic / prokinetic",
    child: c("Syrup", "5 mg/5 ml", "0.1–0.15 mg/kg per dose", "Every 8 hours"),
    adult: A("10 mg tablet", "10 mg", "Every 8 hours before meals"),
    elderly: A("10 mg tablet", "5 mg", "Every 8 hours, short course"),
    duration: "5 days",
  },
  loperamide: {
    name: "Loperamide", nameFa: "لوپرامید", className: "Antimotility",
    child: c("Syrup", "1 mg/5 ml", "0.1 mg/kg per dose", "After each loose stool"),
    adult: A("2 mg capsule", "4 mg", "After each loose stool, max 16 mg/day"),
    elderly: A("2 mg capsule", "2 mg", "After each loose stool, avoid if febrile"),
    duration: "2 days",
  },
  mesalazine: {
    name: "Mesalazine", nameFa: "مزالسازین", className: "Aminosalicylate",
    child: c("Tablet", "400 mg", "30–50 mg/kg daily", "Once daily"),
    adult: A("800 mg tablet", "2.4–4.8 g", "Once daily"),
    elderly: A("800 mg tablet", "2.4 g", "Once daily, check renal function"),
    duration: "Long term",
  },
  ursodeoxycholic: {
    name: "Ursodeoxycholic acid", nameFa: "اسید اورسودی‌اکسی‌کولیک", className: "Bile acid therapy",
    child: c("Suspension", "250 mg/5 ml", "10–15 mg/kg daily", "Once daily"),
    adult: A("300 mg capsule", "10–15 mg/kg", "Once daily with food"),
    elderly: A("300 mg capsule", "10–15 mg/kg", "Once daily"),
    duration: "Long term",
  },
  cholecalciferol: {
    name: "Cholecalciferol (vitamin D3)", nameFa: "کوله‌کلسیفرول (ویتامین D3)", className: "Vitamin",
    child: c("Drops", "400 IU/ml", "400–800 IU daily", "Once daily"),
    adult: A("50 000 IU capsule", "50 000 IU", "Once weekly for 8 weeks"),
    elderly: A("50 000 IU capsule", "50 000 IU", "Once weekly for 8 weeks"),
    duration: "8 weeks",
  },
  calcium_carbonate: {
    name: "Calcium carbonate", nameFa: "کلسیم کاربونات", className: "Mineral supplement",
    child: c("Suspension", "500 mg/5 ml", "500 mg daily", "Once daily"),
    adult: A("500 mg tablet", "1 g", "Once daily"),
    elderly: A("500 mg tablet", "1 g", "Once daily with vitamin D"),
    duration: "3 months",
  },

  // ---- cardiovascular chapter --------------------------------------------
  amlodipine: {
    name: "Amlodipine", nameFa: "آملودیپین", className: "Antihypertensive — calcium channel blocker",
    child: c("Tablet", "5 mg", "0.1 mg/kg once daily", "Once daily"),
    adult: A("5 mg tablet", "5–10 mg", "Once daily"),
    elderly: A("5 mg tablet", "2.5–5 mg", "Once daily, watch ankle oedema"),
    duration: "Long term",
  },
  losartan: {
    name: "Losartan", nameFa: "لوزارتان", className: "Antihypertensive — ARB",
    child: c("Tablet", "50 mg", "0.7 mg/kg once daily", "Once daily"),
    adult: A("50 mg tablet", "50–100 mg", "Once daily"),
    elderly: A("50 mg tablet", "25–50 mg", "Once daily, check potassium"),
    duration: "Long term",
  },
  bisoprolol: {
    name: "Bisoprolol", nameFa: "بیزوپرولول", className: "Beta blocker",
    child: c("Tablet", "2.5 mg", "0.05 mg/kg once daily", "Once daily"),
    adult: A("5 mg tablet", "5–10 mg", "Once daily"),
    elderly: A("2.5 mg tablet", "1.25–2.5 mg", "Once daily, titrate slowly"),
    duration: "Long term",
  },
  atorvastatin: {
    name: "Atorvastatin", nameFa: "آتورواستاتین", className: "Statin",
    child: c("Tablet", "10 mg", "0.2 mg/kg once daily", "Once daily at night"),
    adult: A("40 mg tablet", "40–80 mg", "Once daily at night"),
    elderly: A("20 mg tablet", "20 mg", "Once daily at night, check muscle symptoms"),
    duration: "Long term",
  },
  aspirin: {
    name: "Aspirin", nameFa: "اسپرین", className: "Antiplatelet",
    child: c("Tablet", "75 mg", "3–5 mg/kg once daily", "Once daily"),
    adult: A("75 mg tablet", "75–150 mg", "Once daily"),
    elderly: A("75 mg tablet", "75 mg", "Once daily with gastroprotection"),
    duration: "Long term",
  },
  clopidogrel: {
    name: "Clopidogrel", nameFa: "کلوپیدوگریل", className: "Antiplatelet",
    child: c("Tablet", "75 mg", "1 mg/kg once daily", "Once daily"),
    adult: A("75 mg tablet", "75 mg", "Once daily"),
    elderly: A("75 mg tablet", "75 mg", "Once daily"),
    duration: "12 months",
  },
  furosemide: {
    name: "Furosemide", nameFa: "فوروسیماید", className: "Loop diuretic",
    child: c("Syrup", "10 mg/ml", "1–2 mg/kg per dose", "Once or twice daily"),
    adult: A("40 mg tablet", "40–80 mg", "Once daily, morning"),
    elderly: A("20 mg tablet", "20–40 mg", "Once daily, morning, check potassium"),
    duration: "Long term",
  },
  spironolactone: {
    name: "Spironolactone", nameFa: "سپیرونولاکتون", className: "Potassium-sparing diuretic",
    child: c("Tablet", "25 mg", "1–2 mg/kg daily", "Once daily"),
    adult: A("25 mg tablet", "25–50 mg", "Once daily"),
    elderly: A("25 mg tablet", "25 mg", "Once daily, check potassium at 1 week"),
    duration: "Long term",
  },
  digoxin: {
    name: "Digoxin", nameFa: "دیگوکسین", className: "Cardiac glycoside",
    child: c("Syrup", "50 mcg/ml", "5–10 mcg/kg load", "Then once daily"),
    adult: A("0.25 mg tablet", "0.125–0.25 mg", "Once daily"),
    elderly: A("0.0625 mg tablet", "0.0625–0.125 mg", "Once daily, check levels"),
    duration: "Long term",
  },
  nitroglycerin: {
    name: "Glyceryl trinitrate", nameFa: "نیتروگلیسیرین", className: "Nitrate",
    child: c("Tablet", "0.5 mg", "Not routine in children", "Under supervision only", "Sublingual"),
    adult: A("0.5 mg sublingual tablet", "0.5 mg", "Every 5 minutes, max 3 doses", "Sublingual"),
    elderly: A("0.5 mg sublingual tablet", "0.5 mg", "Every 5 minutes, sit down first", "Sublingual"),
    duration: "As needed",
  },
  isosorbide: {
    name: "Isosorbide mononitrate", nameFa: "ایزوسورباید مونونایترات", className: "Nitrate — long acting",
    child: c("Tablet", "20 mg", "Not routine in children", "Under supervision only"),
    adult: A("20 mg tablet", "20–40 mg", "Twice daily, 8-hour nitrate-free gap"),
    elderly: A("20 mg tablet", "20 mg", "Twice daily, watch for hypotension"),
    duration: "Long term",
  },
  warfarin: {
    name: "Warfarin", nameFa: "وارفارین", className: "Anticoagulant — vitamin K antagonist",
    child: c("Tablet", "1 mg", "0.1 mg/kg once daily", "Once daily, INR guided"),
    adult: A("5 mg tablet", "5 mg", "Once daily, INR guided"),
    elderly: A("1 mg tablet", "1–2 mg", "Once daily, INR guided"),
    duration: "Long term",
  },
  heparin: {
    name: "Unfractionated heparin", nameFa: "هپارین", className: "Anticoagulant — parenteral",
    child: c("Vial", "1000 IU/ml", "75 IU/kg bolus", "Infusion, aPTT guided", "IV"),
    adult: A("5000 IU/ml vial", "5000 IU bolus", "Infusion, aPTT guided", "IV"),
    elderly: A("5000 IU/ml vial", "4000 IU bolus", "Infusion, reduced rate", "IV"),
    duration: "5 days",
  },
  amiodarone: {
    name: "Amiodarone", nameFa: "آمیودارون", className: "Antiarrhythmic",
    child: c("Vial", "50 mg/ml", "5 mg/kg bolus", "Then infusion", "IV"),
    adult: A("150 mg/3 ml vial", "300 mg bolus", "Then infusion", "IV"),
    elderly: A("150 mg/3 ml vial", "150 mg bolus", "Then infusion, monitor QT", "IV"),
    duration: "24 hours infusion",
  },
  adenosine: {
    name: "Adenosine", nameFa: "آدینوزین", className: "Antiarrhythmic — diagnostic",
    child: c("Vial", "6 mg/2 ml", "0.1 mg/kg rapid push", "Repeat once", "IV"),
    adult: A("6 mg/2 ml vial", "6–12 mg", "Rapid push with flush", "IV"),
    elderly: A("6 mg/2 ml vial", "6 mg", "Rapid push, monitor rhythm", "IV"),
    duration: "Single dose",
  },
  atropine: {
    name: "Atropine", nameFa: "آتروپین", className: "Anticholinergic — emergency",
    child: c("Vial", "0.6 mg/ml", "0.02 mg/kg", "Repeat as needed", "IV"),
    adult: A("0.6 mg/ml vial", "0.5–1 mg", "Repeat every 3–5 minutes", "IV"),
    elderly: A("0.6 mg/ml vial", "0.5 mg", "Repeat as needed, watch confusion", "IV"),
    duration: "Single use",
  },
  adrenaline: {
    name: "Adrenaline", nameFa: "ادرینالین", className: "Vasopressor / resuscitation",
    child: c("Vial", "1 mg/ml", "0.01 mg/kg", "Every 3–5 minutes in arrest", "IV / IM"),
    adult: A("1 mg/ml vial", "1 mg", "Every 3–5 minutes in arrest", "IV / IM"),
    elderly: A("1 mg/ml vial", "1 mg", "Every 3–5 minutes in arrest", "IV / IM"),
    duration: "Per resuscitation",
  },
  frusemide_infusion: {
    name: "Nitroglycerin infusion", nameFa: "نیتروگلیسیرین وریدی", className: "Vasodilator — infusion",
    child: c("Vial", "5 mg/ml", "Not routine in children", "Specialist only", "IV"),
    adult: A("5 mg/ml vial", "5–10 mcg/min", "Titrate to response", "IV"),
    elderly: A("5 mg/ml vial", "5 mcg/min", "Titrate slowly, watch pressure", "IV"),
    duration: "24–48 hours",
  },
  bisacodyl_note: {
    name: "Polyethylene glycol", nameFa: "پلی‌اتیلن گلیکول", className: "Osmotic laxative",
    child: c("Sachet", "17 g", "0.5 g/kg per dose", "Twice daily"),
    adult: A("17 g sachet", "17 g", "Once daily in 250 ml water"),
    elderly: A("17 g sachet", "17 g", "Once daily"),
    duration: "14 days",
  },
  clopidogrel_note: {
    name: "Enoxaparin (treatment dose)", nameFa: "انوکساپارین (دوز درمانی)", className: "Anticoagulant — LMWH",
    child: c("Vial", "40 mg/0.4 ml", "1 mg/kg per dose", "Every 12 hours", "SC"),
    adult: A("60 mg syringe", "1 mg/kg", "Every 12 hours", "SC"),
    elderly: A("40 mg syringe", "0.75 mg/kg", "Every 12 hours, check renal function", "SC"),
    duration: "7 days",
  },

  tranexamic_note: {
    name: "Tranexamic acid", nameFa: "ترانکسامیک اسید", className: "Antifibrinolytic",
    child: c("Vial", "500 mg/5 ml", "10 mg/kg per dose", "Every 8 hours", "IV"),
    adult: A("500 mg/5 ml ampoule", "1 g", "Every 8 hours", "IV"),
    elderly: A("500 mg/5 ml ampoule", "500 mg", "Every 8 hours", "IV"),
    duration: "3 days",
  },
  colchicine_note: {
    name: "Colchicine", nameFa: "کولشیسین", className: "Anti-inflammatory — gout",
    child: c("Tablet", "0.5 mg", "Specialist dosing only", "Specialist only"),
    adult: A("0.5 mg tablet", "0.5 mg", "Twice daily"),
    elderly: A("0.5 mg tablet", "0.5 mg", "Once daily, check renal function"),
    duration: "14 days",
  },
  insulin_note: {
    name: "Glucose gel", nameFa: "ژل گلوکز", className: "Emergency glucose",
    child: c("Sachet", "15 g", "1 sachet", "Repeat after 15 minutes"),
    adult: A("15 g sachet", "1 sachet", "Repeat after 15 minutes"),
    elderly: A("15 g sachet", "1 sachet", "Repeat after 15 minutes"),
    duration: "Single use",
  },
};

export const DRUGS: Record<string, Drug> = Object.fromEntries(
  Object.entries(SPECS).map(([id, s]) => [
    id,
    {
      id,
      name: s.name,
      nameFa: s.nameFa,
      className: s.className,
      form: {
        child: s.child.form,
        adult: formFor(s.adult.route, s.adult.strength),
        elderly: formFor(s.elderly.route, s.elderly.strength),
      },
      strength: { child: s.child.strength, adult: s.adult.strength, elderly: s.elderly.strength },
      dose: { child: s.child.dose, adult: s.adult.dose, elderly: s.elderly.dose },
      frequency: { child: s.child.frequency, adult: s.adult.frequency, elderly: s.elderly.frequency },
      duration: s.duration ?? "5 days",
      route: {
        child: routeFor(s.child.form, s.child.route),
        adult: routeFor(formFor(s.adult.route, s.adult.strength), s.adult.route),
        elderly: routeFor(formFor(s.elderly.route, s.elderly.strength), s.elderly.route),
      },
    } satisfies Drug,
  ])
);

/** Form follows the route when one is stated, otherwise it is read from the strength text. */
function formFor(route: string | undefined, strength: string): Form {
  const r = (route ?? "oral").toLowerCase();
  if (r !== "oral") return "Vial";
  return guessForm(strength);
}

/** Route follows the form: inhalers are inhaled, nebules nebulised, creams topical. */
function routeFor(form: Form, declared: string | undefined): string {
  if (form === "Inhaler") return "Inhaled";
  if (form === "Nebule") return "Nebulised";
  if (form === "Cream" || form === "Ointment") return "Topical";
  if (form === "Suppository") return "Rectal";
  if (form === "Drops" && /nose|nasal/i.test(declared ?? "")) return "Nasal";
  return declared ?? "Oral";
}

function guessForm(strength: string): Form {
  const s = strength.toLowerCase();
  if (s.includes("vial") || s.includes("syringe")) return "Vial";
  if (s.includes("syrup")) return "Syrup";
  if (s.includes("suspension")) return "Suspension";
  if (s.includes("nebule")) return "Nebule";
  if (s.includes("inhaler")) return "Inhaler";
  if (s.includes("capsule")) return "Capsule";
  if (s.includes("sachet")) return "Sachet";
  if (s.includes("drop")) return "Drops";
  if (s.includes("spray")) return "Drops";
  if (s.includes("bag")) return "Vial";
  if (s.includes("cylinder") || s.includes("concentrator")) return "Vial";
  return "Tablet";
}

export const SYRUP_OR_VIAL: Form[] = ["Syrup", "Suspension", "Vial", "Nebule", "Drops"];
