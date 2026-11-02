/**
 * Clinical knowledge that works without the internet.
 *
 * A ten-bed surgical hospital in Kabul cannot rely on a web lookup at 02:00
 * during a caesarean. Everything here is a small, reviewable rule table that
 * runs on the same machine as the patient record, in the same language as the
 * person using it. The numbers are the widely taught adult values (NEWS2,
 * Cockcroft–Gault, Mosteller) and the dose ceilings are the conservative
 * printed-formulary figures — always a prompt for the clinician, never a
 * replacement for one.
 */

export type Lang = "en" | "fa";
const L = (lang: Lang, en: string, fa: string) => (lang === "fa" ? fa : en);

/* =====================================================================
 * 1. NEWS2 — the early-warning score used by UK NHS trusts and taught
 *    internationally. Three parameters are scored 0–3, four are 0–2.
 * ===================================================================== */

export type News2Input = {
  respiratoryRate: number;
  spo2: number;
  onOxygen: boolean;
  systolic: number;
  pulse: number;
  /** "alert" | "voice" | "pain" | "unresponsive" | "new-confusion" */
  consciousness: string;
  temperature: number;
  /** Optional: scale 2 for hypercapnic respiratory failure (target 88–92%). */
  scale2?: boolean;
};

export type News2Band = {
  score: number;
  band: "low" | "low-medium" | "medium" | "high";
  label: [string, string];
  action: [string, string];
  escalation: [string, string];
  color: string;
};

const BANDS: Record<News2Band["band"], News2Band> = {
  low: {
    score: 0,
    band: "low",
    label: ["Low risk", "خطر کم"],
    action: ["Routine monitoring — minimum 12-hourly observations.", "پایش معمول — حداقل هر ۱۲ ساعت."],
    escalation: ["Ward nurse continues routine care.", "نرس وارڈ مراقبت معمول را ادامه می‌دهد."],
    color: "#0f9d6e",
  },
  "low-medium": {
    score: 0,
    band: "low-medium",
    label: ["Low–medium risk", "خطر کم تا متوسط"],
    action: ["4–6 hourly observations; assess the trend, not one number.", "هر ۴ تا ۶ ساعت معاینه؛ روند را ببینید، نه یک عدد."],
    escalation: ["Inform the nurse in charge at handover.", "در تحویل به نرس مسئول اطلاع دهید."],
    color: "#0ea5e9",
  },
  medium: {
    score: 0,
    band: "medium",
    label: ["Medium risk", "خطر متوسط"],
    action: ["Hourly observations. Urgent review by a clinician competent in acute illness.", "هر ساعت معاینه. بازبینی فوری توسط کلینیسین ماهر در بیماری حاد."],
    escalation: ["Call the on-call doctor now; document the time of the call.", "همین حالا داکتر کشیک را صدا کنید؛ وقت تماس را ثبت کنید."],
    color: "#d97706",
  },
  high: {
    score: 0,
    band: "high",
    label: ["High risk — emergency", "خطر بالا — اضطراری"],
    action: ["Continuous monitoring. Emergency assessment by a senior clinician or critical-care team.", "پایش مداوم. ارزیابی اضطراری توسط کلینیسین ارشد یا تیم مراقبت ویژه."],
    escalation: ["Activate the emergency response immediately; move to theatre or ICU if indicated.", "فوراً تیم اضطراری را فعال کنید؛ در صورت لزوم به اتاق عملیات یا ICU منتقل کنید."],
    color: "#dc2626",
  },
};

export function news2(v: News2Input, lang: Lang) {
  const parts: { key: string; label: string; value: string; score: number; note?: string }[] = [];

  let s = 0;
  const add = (key: string, label: string, value: string, score: number, note?: string) => {
    s += score;
    parts.push({ key, label, value, score, note });
  };

  const rr = v.respiratoryRate;
  add(
    "rr",
    L(lang, "Respiratory rate", "تعداد تنفس"),
    `${rr}/min`,
    rr <= 8 ? 3 : rr <= 11 ? 1 : rr <= 20 ? 0 : rr <= 24 ? 2 : 3
  );

  const spo2 = v.spo2;
  if (!v.scale2) {
    add("spo2", L(lang, "SpO₂", "اکسیجن خون"), `${spo2}%`, spo2 <= 91 ? 3 : spo2 <= 93 ? 2 : spo2 <= 95 ? 1 : 0);
  } else {
    add("spo2", L(lang, "SpO₂ (scale 2)", "اکسیجن خون (مقیاس ۲)"), `${spo2}%`, spo2 <= 83 ? 3 : spo2 <= 85 ? 2 : spo2 <= 87 ? 1 : spo2 <= 92 ? 0 : spo2 <= 94 ? 1 : spo2 <= 96 ? 2 : 3);
  }

  add("o2", L(lang, "Supplemental oxygen", "اکسیجن اضافی"), v.onOxygen ? L(lang, "Yes", "بله") : L(lang, "No", "نه"), v.onOxygen ? 2 : 0);

  const sys = v.systolic;
  add("sbp", L(lang, "Systolic BP", "فشار خون سیستولیک"), `${sys} mmHg`, sys <= 90 ? 3 : sys <= 100 ? 2 : sys <= 110 ? 1 : sys <= 219 ? 0 : 3);

  const hr = v.pulse;
  add("hr", L(lang, "Pulse", "نبض"), `${hr}/min`, hr <= 40 ? 3 : hr <= 50 ? 1 : hr <= 90 ? 0 : hr <= 110 ? 1 : hr <= 130 ? 2 : 3);

  const consciousness = v.consciousness || "alert";
  add(
    "acvpu",
    L(lang, "Consciousness (ACVPU)", "هوشیاری (ACVPU)"),
    consciousness === "alert" ? "Alert" : consciousness === "new-confusion" ? L(lang, "New confusion", "گیجی جدید") : consciousness,
    consciousness === "alert" ? 0 : 3
  );

  const temp = v.temperature;
  add("temp", L(lang, "Temperature", "حرارت بدن"), `${temp} °C`, temp <= 35 ? 3 : temp <= 36 ? 1 : temp <= 38 ? 0 : temp <= 39 ? 1 : 2);

  // NEWS2 red flag: any single parameter scoring 3.
  const single3 = parts.some((p) => p.score === 3);
  const bandKey: News2Band["band"] = s >= 7 || (s >= 5 && single3) ? "high" : s >= 5 ? "medium" : single3 ? "medium" : s >= 1 ? "low-medium" : "low";
  const band = { ...BANDS[bandKey], score: s };

  return { total: s, single3, band, parts, redFlag: s >= 5 || (single3 && s >= 5) };
}

/* =====================================================================
 * 2. qSOFA — a 30-second screen for sepsis at the bedside.
 * ===================================================================== */

export function qsofa(v: { respiratoryRate: number; systolic: number; alteredMentation: boolean }, lang: Lang) {
  const items = [
    { label: L(lang, "Respiratory rate ≥ 22/min", "تعداد تنفس ≥ ۲۲ در دقیقه"), hit: v.respiratoryRate >= 22, points: v.respiratoryRate >= 22 ? 1 : 0 },
    { label: L(lang, "Systolic BP ≤ 100 mmHg", "فشار سیستولیک ≤ ۱۰۰"), hit: v.systolic <= 100, points: v.systolic <= 100 ? 1 : 0 },
    { label: L(lang, "Altered mentation (GCS < 15)", "تغییر وضعیت هوشیاری (GCS < ۱۵)"), hit: v.alteredMentation, points: v.alteredMentation ? 1 : 0 },
  ];
  const score = items.reduce((a, b) => a + b.points, 0);
  return {
    score,
    items,
    positive: score >= 2,
    verdict: score >= 2
      ? L(lang, "Screen positive — treat as sepsis until proven otherwise. Blood cultures, lactate, antibiotics within 1 hour, fluids.", "اسکرین مثبت — تا خلافش ثابت نشود سپسیس است. کشت خون، لاکتات، آنتی‌بیوتیک در یک ساعت اول و مایعات.")
      : L(lang, "Screen negative — keep monitoring; qSOFA does not rule out sepsis.", "اسکرین منفی — پایش را ادامه دهید؛ qSOFA سپسیس را رد نمی‌کند."),
  };
}

/* =====================================================================
 * 3. Body metrics — BMI, BSA, ideal body weight, creatinine clearance.
 * ===================================================================== */

export function bodyMetrics(input: { weightKg: number; heightCm: number; age: number; sex: "male" | "female"; creatinine?: number }, lang: Lang) {
  const { weightKg: w, heightCm: h, age, sex } = input;
  const bmi = w / Math.pow(h / 100, 2);
  const bsa = Math.sqrt((h * w) / 3600);
  const ibw = sex === "male" ? 50 + 0.91 * (h - 152.4) : 45.5 + 0.91 * (h - 152.4);
  const crCl = input.creatinine
    ? (((140 - age) * w) / (72 * input.creatinine)) * (sex === "female" ? 0.85 : 1)
    : null;

  const bmiBand =
    bmi < 18.5
      ? { key: "under", label: L(lang, "Underweight", "کم‌وزن"), color: "#0ea5e9" }
      : bmi < 25
        ? { key: "normal", label: L(lang, "Healthy range", "محدودهٔ سالم"), color: "#0f9d6e" }
        : bmi < 30
          ? { key: "over", label: L(lang, "Overweight", "اضافه‌وزن"), color: "#d97706" }
          : bmi < 35
            ? { key: "obese1", label: L(lang, "Obesity class I", "چاقی درجهٔ ۱"), color: "#ea580c" }
            : { key: "obese2", label: L(lang, "Obesity class II+", "چاقی درجهٔ ۲ و بالاتر"), color: "#dc2626" };

  const renalBand = crCl === null ? null : crCl >= 90 ? "G1" : crCl >= 60 ? "G2" : crCl >= 45 ? "G3a" : crCl >= 30 ? "G3b" : crCl >= 15 ? "G4" : "G5";

  return {
    bmi: Number(bmi.toFixed(1)),
    bmiBand,
    bsa: Number(bsa.toFixed(2)),
    ibw: Number(ibw.toFixed(1)),
    crCl: crCl === null ? null : Number(crCl.toFixed(1)),
    renalBand,
    note: L(
      lang,
      "Cockcroft–Gault estimates creatinine clearance; it over-reads in obesity and under-reads in very low muscle mass.",
      "کاکرافت-گالت کلیرنس کراتینین را تخمین می‌زند؛ در چاقی بیشتر و در کم‌عضلگی شدید کمتر نشان می‌دهد."
    ),
  };
}

/* =====================================================================
 * 4. Paediatric weight-based dosing.
 *    Doses are per kilogram with an absolute adult ceiling.
 * ===================================================================== */

export type PedsDose = {
  drug: string;
  indication: [string, string];
  mgPerKg: number;
  frequency: [string, string];
  maxMg: number;
  route: string;
  caution?: [string, string];
};

export const PEDS_DOSES: PedsDose[] = [
  { drug: "Paracetamol", indication: ["Fever, mild–moderate pain", "تب، درد خفیف تا متوسط"], mgPerKg: 15, frequency: ["every 6 h (max 4 doses/day)", "هر ۶ ساعت (حداکثر ۴ دوز در روز)"], maxMg: 1000, route: "PO/PR", caution: ["Reduce total daily dose to 60 mg/kg/day in neonates.", "در نوزادان مجموع دوز روزانه به ۶۰ mg/kg کاهش یابد."] },
  { drug: "Ibuprofen", indication: ["Fever, pain (> 3 months)", "تب، درد (بالاتر از ۳ ماه)"], mgPerKg: 10, frequency: ["every 8 h", "هر ۸ ساعت"], maxMg: 400, route: "PO", caution: ["Avoid in dehydration, renal impairment or suspected dengue.", "در کم‌آبی، نارسایی کلیه یا شک به دنگ اجتناب شود."] },
  { drug: "Amoxicillin", indication: ["Pneumonia, otitis media", "سینه‌بغل، التهاب گوش میانی"], mgPerKg: 25, frequency: ["every 8 h", "هر ۸ ساعت"], maxMg: 1000, route: "PO", caution: ["Half the dose and double the interval if eGFR < 30.", "در eGFR کمتر از ۳۰ دوز نصف و فاصله دو برابر شود."] },
  { drug: "Amoxicillin-clavulanate", indication: ["Sinusitis, bite wounds", "سینوزیت، زخم گاز‌گرفتگی"], mgPerKg: 25, frequency: ["every 12 h (amoxicillin component)", "هر ۱۲ ساعت (جزء آموکسی‌سیلین)"], maxMg: 875, route: "PO" },
  { drug: "Ceftriaxone", indication: ["Severe pneumonia, meningitis", "سینه‌بغل شدید، مننژیت"], mgPerKg: 50, frequency: ["every 12–24 h", "هر ۱۲ تا ۲۴ ساعت"], maxMg: 2000, route: "IV", caution: ["Never co-infuse with calcium-containing fluids (Ringer's lactate).", "هرگز با مایعات حاوی کلسیم (رینگر لاکتات) هم‌زمان تزریق نشود."] },
  { drug: "Gentamicin", indication: ["Gram-negative sepsis (with another agent)", "سپسیس گرام‌منفی (همراه با دواى دیگر)"], mgPerKg: 5, frequency: ["once daily", "یک بار در روز"], maxMg: 400, route: "IV", caution: ["Measure trough levels after the third dose; avoid > 5 days if possible.", "پس از دوز سوم سطح خونی را بسنجید؛ در صورت امکان بیش از ۵ روز ندهید."] },
  { drug: "Ondansetron", indication: ["Post-operative nausea and vomiting", "تهوع و استفراغ پس از عملیات"], mgPerKg: 0.1, frequency: ["every 8 h", "هر ۸ ساعت"], maxMg: 4, route: "IV" },
  { drug: "Metronidazole", indication: ["Anaerobic infection, intra-abdominal sepsis", "عفونت بی‌هوازی، سپسیس داخل شکم"], mgPerKg: 7.5, frequency: ["every 8 h", "هر ۸ ساعت"], maxMg: 500, route: "PO/IV" },
  { drug: "Oral rehydration (ORS)", indication: ["Diarrhoea with mild–moderate dehydration", "اسهال با کم‌آبی خفیف تا متوسط"], mgPerKg: 50, frequency: ["after each loose stool (50 ml/kg over 4 h)", "پس از هر اسهال (۵۰ ml/kg در ۴ ساعت)"], maxMg: 0, route: "PO", caution: ["Use 75 ml/kg over 4 hours for rehydration; reassess after 4 hours.", "برای آب‌رسانی ۷۵ ml/kg در ۴ ساعت؛ پس از ۴ ساعت دوباره ارزیابی کنید."] },
];

export function pedsDose(drugName: string, weightKg: number, lang: Lang) {
  const rule = PEDS_DOSES.find((d) => d.drug.toLowerCase() === drugName.toLowerCase());
  if (!rule) {
    return {
      found: false as const,
      message: L(lang, "No weight-based rule for this medicine in the table. Use the printed formulary and double-check with a second clinician.", "برای این دوا قاعدهٔ وزنی در جدول نیست. از فورملری چاپی استفاده کنید و با کلینیسین دوم دوباره بررسی کنید."),
    };
  }
  if (rule.maxMg === 0) {
    const ml = Math.round(rule.mgPerKg * weightKg);
    return {
      found: true as const,
      drug: rule.drug,
      dose: `${ml} ml`,
      perKg: `${rule.mgPerKg} ml/kg`,
      frequency: rule.frequency[lang === "fa" ? 1 : 0],
      route: rule.route,
      capped: false,
      caution: rule.caution?.[lang === "fa" ? 1 : 0],
      indication: rule.indication[lang === "fa" ? 1 : 0],
    };
  }
  const raw = rule.mgPerKg * weightKg;
  const capped = raw > rule.maxMg;
  return {
    found: true as const,
    drug: rule.drug,
    dose: `${Math.round(Math.min(raw, rule.maxMg))} mg`,
    perKg: `${rule.mgPerKg} mg/kg`,
    frequency: rule.frequency[lang === "fa" ? 1 : 0],
    route: rule.route,
    capped,
    caution: rule.caution?.[lang === "fa" ? 1 : 0],
    indication: rule.indication[lang === "fa" ? 1 : 0],
  };
}

/* =====================================================================
 * 5. Adult dose adjustment by renal function.
 * ===================================================================== */

export type RenalRule = { drug: string; normal: string; g3a: string; g3b: string; g4: string; g5: string; note: [string, string] };

export const RENAL_RULES: RenalRule[] = [
  { drug: "Metformin", normal: "1000 mg twice daily", g3a: "1000 mg daily", g3b: "500 mg daily — review", g4: "Stop", g5: "Contraindicated", note: ["Hold around contrast and during acute illness.", "در زمان کنتراست و بیماری حاد متوقف شود."] },
  { drug: "Amoxicillin", normal: "500 mg every 8 h", g3a: "500 mg every 8 h", g3b: "500 mg every 8 h", g4: "500 mg every 12 h", g5: "500 mg every 24 h", note: ["Dose after dialysis on dialysis days.", "در روزهای دیالیز، دوز پس از دیالیز داده شود."] },
  { drug: "Ceftriaxone", normal: "2 g daily", g3a: "2 g daily", g3b: "2 g daily", g4: "2 g daily", g5: "2 g daily (max 2 g)", note: ["No renal adjustment needed; hepatic clearance.", "تنظیم کلیوی لازم نیست؛ دفع کبدی دارد."] },
  { drug: "Gentamicin", normal: "5 mg/kg once daily", g3a: "5 mg/kg then levels", g3b: "3–4 mg/kg once daily", g4: "2–3 mg/kg, levels required", g5: "2 mg/kg after dialysis", note: ["Always monitor trough; avoid with other nephrotoxins.", "همیشه سطح خونی را بسنجید؛ با نفروتوکسین‌های دیگر ندهید."] },
  { drug: "Enoxaparin", normal: "1 mg/kg twice daily", g3a: "1 mg/kg twice daily", g3b: "1 mg/kg twice daily", g4: "1 mg/kg once daily", g5: "0.5 mg/kg once daily (anti-Xa)", note: ["Reduce dose in the elderly and low body weight.", "در کهنسالان و وزن کم دوز کاهش یابد."] },
  { drug: "Tramadol", normal: "50–100 mg every 6 h", g3a: "50 mg every 8 h", g3b: "50 mg every 12 h (max 200 mg/day)", g4: "Avoid", g5: "Contraindicated", note: ["Seizure and serotonin risk rises with dose.", "خطر تشنج و سروتونین با دوز بالا افزایش می‌یابد."] },
  { drug: "Spironolactone", normal: "25–50 mg daily", g3a: "25 mg daily, check K⁺", g3b: "Avoid unless specialist", g4: "Avoid", g5: "Contraindicated", note: ["Monitor potassium and creatinine at 1 week.", "پتاسیم و کراتینین را در هفتهٔ اول بسنجید."] },
  { drug: "Atenolol", normal: "50 mg daily", g3a: "50 mg daily", g3b: "25 mg daily", g4: "25 mg alternate days", g5: "10 mg alternate days", note: ["Prefer a non-renally cleared beta-blocker if available.", "در صورت امکان بلاکر غیرکلیوی ترجیح داده شود."] },
];

export function renalAdjust(drugName: string, crCl: number, lang: Lang) {
  const rule = RENAL_RULES.find((r) => r.drug.toLowerCase() === drugName.toLowerCase());
  if (!rule) {
    return { found: false as const, message: L(lang, "No renal rule in the table for this medicine — check the printed formulary.", "برای این دوا قاعدهٔ کلیوی در جدول نیست — فورملری چاپی را ببینید.") };
  }
  const band = crCl >= 90 ? "normal" : crCl >= 60 ? "normal" : crCl >= 45 ? "g3a" : crCl >= 30 ? "g3b" : crCl >= 15 ? "g4" : "g5";
  const bandLabel = { normal: L(lang, "Normal / G2 (≥60)", "طبیعی / G2 (≥۶۰)"), g3a: "G3a (45–59)", g3b: "G3b (30–44)", g4: "G4 (15–29)", g5: L(lang, "G5 (<15, dialysis)", "G5 (کمتر از ۱۵، دیالیز)") }[band];
  return {
    found: true as const,
    drug: rule.drug,
    band: bandLabel,
    dose: rule[band],
    note: rule.note[lang === "fa" ? 1 : 0],
    changed: band !== "normal" && rule[band] !== rule.normal,
  };
}

/* =====================================================================
 * 6. Laboratory reference ranges with flags.
 * ===================================================================== */

export type Ref = { name: string; unit: string; low: number; high: number; criticalLow?: number; criticalHigh?: number; fa: string; note?: [string, string] };

export const REFERENCE: Ref[] = [
  { name: "Haemoglobin", fa: "هیموگلوبین", unit: "g/dL", low: 12, high: 16, criticalLow: 7, criticalHigh: 20, note: ["Male 13–17, female 12–15. Pregnancy lowers the threshold.", "مرد ۱۳–۱۷، زن ۱۲–۱۵. در حاملگی حداقل پایین‌تر است."] },
  { name: "White cell count", fa: "کرات سفید خون", unit: "×10⁹/L", low: 4, high: 11, criticalLow: 1.5, criticalHigh: 30 },
  { name: "Platelets", fa: "پلارک‌ها", unit: "×10⁹/L", low: 150, high: 400, criticalLow: 50, criticalHigh: 1000, note: ["Below 50 before surgery needs a plan; below 20 is a bleeding emergency.", "کمتر از ۵۰ پیش از عملیات برنامه لازم دارد؛ کمتر از ۲۰ اضطراری خون‌ریزی است."] },
  { name: "Sodium", fa: "سودیم", unit: "mmol/L", low: 135, high: 145, criticalLow: 120, criticalHigh: 155 },
  { name: "Potassium", fa: "پتاسیم", unit: "mmol/L", low: 3.5, high: 5.1, criticalLow: 2.5, criticalHigh: 6.5, note: ["Above 6.5 — ECG and immediate treatment.", "بالای ۶٫۵ — نوار قلب و تداوی فوری."] },
  { name: "Urea", fa: "یوریه", unit: "mg/dL", low: 15, high: 40, criticalHigh: 200 },
  { name: "Creatinine", fa: "کراتینین", unit: "mg/dL", low: 0.6, high: 1.3, criticalHigh: 4 },
  { name: "Glucose (fasting)", fa: "شکر خون (ناشتا)", unit: "mg/dL", low: 70, high: 100, criticalLow: 40, criticalHigh: 400 },
  { name: "HbA1c", fa: "HbA1c", unit: "%", low: 4, high: 5.7, criticalHigh: 10, note: ["5.7–6.4 prediabetes; ≥ 6.5 diabetes.", "۵٫۷ تا ۶٫۴ پیش‌دیابت؛ ۶٫۵ و بالاتر دیابت."] },
  { name: "CRP", fa: "CRP", unit: "mg/L", low: 0, high: 5, criticalHigh: 200 },
  { name: "ALT", fa: "ALT", unit: "U/L", low: 7, high: 45, criticalHigh: 500 },
  { name: "Bilirubin", fa: "بیلیروبین", unit: "mg/dL", low: 0.2, high: 1.2, criticalHigh: 10 },
  { name: "INR", fa: "INR", unit: "ratio", low: 0.8, high: 1.2, criticalHigh: 5, note: ["Therapeutic on warfarin is usually 2.0–3.0.", "محدودهٔ درمانی با وارفارین معمولاً ۲ تا ۳ است."] },
  { name: "Amylase", fa: "آمیلاز", unit: "U/L", low: 30, high: 110, criticalHigh: 500 },
  { name: "Lactate", fa: "لاکتات", unit: "mmol/L", low: 0.5, high: 2.2, criticalHigh: 4, note: ["Above 4 with infection = septic shock pathway.", "بالای ۴ همراه با عفونت = مسیر شوک سپتیک."] },
];

export function interpretLab(name: string, value: number, lang: Lang) {
  const ref = REFERENCE.find((r) => r.name.toLowerCase().includes(name.toLowerCase()));
  if (!ref) return { found: false as const, message: L(lang, "Not in the reference table.", "در جدول مرجع نیست.") };
  let flag: "low" | "normal" | "high" | "critical" = "normal";
  if (ref.criticalLow !== undefined && value <= ref.criticalLow) flag = "critical";
  else if (ref.criticalHigh !== undefined && value >= ref.criticalHigh) flag = "critical";
  else if (value < ref.low) flag = "low";
  else if (value > ref.high) flag = "high";
  return {
    found: true as const,
    ref,
    value,
    flag,
    label: {
      low: L(lang, "Below range", "کمتر از محدوده"),
      normal: L(lang, "Within range", "در محدوده"),
      high: L(lang, "Above range", "بیشتر از محدوده"),
      critical: L(lang, "Critical — act now", "بحرانی — فوراً اقدام"),
    }[flag],
    color: { low: "#0ea5e9", normal: "#0f9d6e", high: "#d97706", critical: "#dc2626" }[flag],
  };
}

/* =====================================================================
 * 7. Full interaction library for the standalone checker.
 *    (The prescription screen uses its own compact matcher in ai.ts.)
 * ===================================================================== */

export type InteractionEntry = {
  a: string;
  b: string;
  severity: "critical" | "major" | "moderate" | "minor";
  effect: [string, string];
  action: [string, string];
  tags: string[];
};

export const INTERACTIONS: InteractionEntry[] = [
  { a: "Warfarin", b: "Aspirin", severity: "critical", effect: ["Additive bleeding risk; anticoagulant effect is markedly increased.", "خطر خون‌ریزی افزوده؛ اثر ضدانعقاد به‌شدت زیاد می‌شود."], action: ["Avoid unless a mechanical valve demands it. If unavoidable, add gastroprotection and check INR in 48 h.", "اجتناب کنید مگر دریچهٔ مکانیکی آن را ایجاب کند. در صورت ناچاری، محافظ معده اضافه و INR را در ۴۸ ساعت بسنجید."], tags: ["bleeding", "anticoagulant"] },
  { a: "Warfarin", b: "Metronidazole", severity: "critical", effect: ["INR can double within 3 days — bleeding risk.", "INR می‌تواند در ۳ روز دو برابر شود — خطر خون‌ریزی."], action: ["Reduce the warfarin dose by 25–50% and check INR after 72 hours.", "دوز وارفارین را ۲۵ تا ۵۰٪ کم کنید و INR را پس از ۷۲ ساعت بسنجید."], tags: ["bleeding", "CYP2C9"] },
  { a: "Warfarin", b: "Fluconazole", severity: "major", effect: ["Fluconazole blocks warfarin metabolism.", "فلوکونازول متابولیسم وارفارین را می‌بندد."], action: ["Monitor INR every 48 hours during the course.", "در طول دوره هر ۴۸ ساعت INR را بسنجید."], tags: ["bleeding"] },
  { a: "Ceftriaxone", b: "Ringer's lactate", severity: "critical", effect: ["Calcium precipitates with ceftriaxone — fatal in neonates.", "کلسیم با سفتریاکسون رسوب می‌کند — در نوزادان کشنده است."], action: ["Never run both through one line; flush between, or use normal saline.", "هرگز هر دو را از یک لاین ندهید؛ بین آن‌ها فلاش کنید یا نارمل سالین بدهید."], tags: ["IV compatibility", "neonate"] },
  { a: "Metformin", b: "Iodinated contrast", severity: "major", effect: ["Lactic acidosis risk when renal function drops.", "خطر اسیدوز لاکتیک وقتی کار کلیه افت کند."], action: ["Stop metformin at contrast and restart after 48 h once creatinine is stable.", "متفرمین را در زمان کنتراست قطع و پس از ۴۸ ساعت با کراتینین ثابت شروع کنید."], tags: ["renal", "contrast"] },
  { a: "Lisinopril", b: "Ibuprofen", severity: "major", effect: ["NSAIDs blunt the antihypertensive effect and can cause acute kidney injury.", "NSAID اثر فشارخون را کم می‌کند و می‌تواند آسیب حاد کلیه بدهد."], action: ["Prefer paracetamol; if an NSAID is essential, hydrate and check creatinine at 5 days.", "پاراسیتامول ترجیح دارد؛ اگر NSAID ضروری است، آب‌رسانی و کراتینین در ۵ روز."], tags: ["renal", "elderly", "triple whammy"] },
  { a: "Lisinopril", b: "Spironolactone", severity: "major", effect: ["Hyperkalaemia.", "پتاسیم بالا."], action: ["Check potassium at 1 week and after every dose change; avoid if K⁺ > 5.0.", "پتاسیم را در هفتهٔ اول و پس از هر تغییر دوز بسنجید؛ اگر بالاتر از ۵ باشد ندهید."], tags: ["electrolyte"] },
  { a: "Spironolactone", b: "Potassium chloride", severity: "major", effect: ["Dangerous hyperkalaemia.", "پتاسیم خطرناک بالا."], action: ["Do not combine without a potassium level and ECG monitoring.", "بدون سطح پتاسیم و پایش نوار قلب ترکیب نکنید."], tags: ["electrolyte"] },
  { a: "Azithromycin", b: "Atorvastatin", severity: "major", effect: ["Macrolides raise statin levels — myopathy and rhabdomyolysis.", "ماکرولید سطح استاتین را بالا می‌برد — میوپاتی و رابدومیولیز."], action: ["Hold the statin for the 3–5 day course.", "استاتین را در دورهٔ ۳ تا ۵ روزه قطع کنید."], tags: ["muscle", "CYP3A4"] },
  { a: "Clarithromycin", b: "Ondansetron", severity: "major", effect: ["Additive QT prolongation — torsades risk.", "طولانی‌شدن QT افزوده — خطر تورساد."], action: ["Consider an alternative antibiotic; if used, correct K⁺/Mg²⁺ and monitor ECG.", "آنتی‌بیوتیک جایگزین را در نظر بگیرید؛ در صورت استفاده، K⁺/Mg²⁺ را اصلاح و ECG بگیرید."], tags: ["QT"] },
  { a: "Tramadol", b: "Sertraline", severity: "major", effect: ["Serotonin syndrome and lowered seizure threshold.", "سندرم سروتونین و کاهش آستانهٔ تشنج."], action: ["Use the lowest dose, avoid in epilepsy, counsel on agitation, tremor, fever.", "کمترین دوز، در صرع اجتناب، آموزش در مورد بی‌قراری، لرزش و تب."], tags: ["serotonin", "seizure"] },
  { a: "Tramadol", b: "Dexamethasone", severity: "moderate", effect: ["Reduced seizure threshold.", "کاهش آستانهٔ تشنج."], action: ["Document any seizure history before prescribing.", "پیش از تجویز، سابقهٔ تشنج را ثبت کنید."], tags: ["seizure"] },
  { a: "Omeprazole", b: "Clopidogrel", severity: "major", effect: ["CYP2C19 inhibition reduces clopidogrel activation.", "مهار CYP2C19 فعال‌سازی کلوپیدوگرل را کم می‌کند."], action: ["Use pantoprazole instead.", "به‌جای آن پنتوپرازول بدهید."], tags: ["cardiology", "CYP2C19"] },
  { a: "Gentamicin", b: "Furosemide", severity: "major", effect: ["Additive ototoxicity and nephrotoxicity.", "سمیت گوش و کلیهٔ افزوده."], action: ["Monitor trough levels and creatinine daily; keep the course short.", "سطح خونی و کراتینین روزانه؛ دوره را کوتاه نگه دارید."], tags: ["renal", "ototoxic"] },
  { a: "Enoxaparin", b: "Ketorolac", severity: "major", effect: ["Post-operative haemorrhage risk.", "خطر خون‌ریزی پس از عملیات."], action: ["Prefer paracetamol; if an NSAID is necessary, keep it under 72 hours and inspect the wound daily.", "پاراسیتامول ترجیح دارد؛ در صورت ضرورت NSAID، کمتر از ۷۲ ساعت و بازبینی روزانهٔ زخم."], tags: ["bleeding", "surgery"] },
  { a: "Morphine", b: "Diazepam", severity: "critical", effect: ["Additive respiratory depression.", "کاهش تنفس افزوده."], action: ["Avoid together; if both are needed, half the opioid dose and monitor SpO₂ continuously.", "با هم ندهید؛ در صورت نیاز، دوز اپیوئید را نصف و SpO₂ را مداوم پایش کنید."], tags: ["sedation", "respiratory"] },
  { a: "Insulin", b: "Glimepiride", severity: "major", effect: ["Severe hypoglycaemia.", "هایپوگلیسیمی شدید."], action: ["Avoid combining; if transitioning, stop the sulfonylurea first.", "ترکیب نکنید؛ در انتقال، اول سولفونیل‌یوریا را قطع کنید."], tags: ["glucose"] },
  { a: "Metronidazole", b: "Alcohol", severity: "major", effect: ["Disulfiram-like reaction — flushing, vomiting, tachycardia.", "واکنش شبیه دی‌سولفیرام — سرخی، استفراغ، تپش."], action: ["No alcohol during and for 48 hours after the course.", "در طول دوره و ۴۸ ساعت بعد الکل ممنوع."], tags: ["counselling"] },
  { a: "Amoxicillin", b: "Warfarin", severity: "moderate", effect: ["Gut flora change raises INR.", "تغییر فلور روده INR را بالا می‌برد."], action: ["Check INR after 3–5 days.", "INR را پس از ۳ تا ۵ روز بسنجید."], tags: ["bleeding"] },
  { a: "Ferrous sulphate", b: "Ciprofloxacin", severity: "moderate", effect: ["Chelation halves antibiotic absorption.", "کلاته‌شدن جذب آنتی‌بیوتیک را نصف می‌کند."], action: ["Separate doses by at least 2 hours.", "دوزها را حداقل ۲ ساعت جدا کنید."], tags: ["absorption"] },
  { a: "Salbutamol", b: "Propranolol", severity: "major", effect: ["Beta-blockade antagonises bronchodilation and can cause bronchospasm.", "بلاکر بتا اثر گشادکنندهٔ برونش را خنثی و برونکواسپاسم می‌دهد."], action: ["Use a cardioselective agent and monitor peak flow.", "عامل کاردیوسلکتیو و پایش پیک‌فلو."], tags: ["respiratory"] },
  { a: "Paracetamol", b: "Warfarin", severity: "moderate", effect: ["Regular high-dose paracetamol can raise INR.", "پاراسیتامول با دوز بالای منظم می‌تواند INR را بالا ببرد."], action: ["Check INR if used regularly for more than 3 days.", "اگر بیش از ۳ روز منظم مصرف شد، INR را بسنجید."], tags: ["bleeding"] },
  { a: "Ciprofloxacin", b: "Ondansetron", severity: "major", effect: ["Additive QT prolongation.", "طولانی‌شدن QT افزوده."], action: ["Correct electrolytes and consider ECG monitoring in the elderly.", "الکترولیت‌ها را اصلاح و در کهنسالان ECG را در نظر بگیرید."], tags: ["QT"] },
  { a: "Diclofenac", b: "Aspirin", severity: "moderate", effect: ["Increased GI bleeding and reduced cardioprotection.", "خون‌ریزی معده بیشتر و محافظت قلبی کمتر."], action: ["Avoid long-term combination; add a PPI if both are required.", "ترکیب طولانی‌مدت نکنید؛ در صورت نیاز PPI اضافه کنید."], tags: ["GI", "bleeding"] },
];

export function checkInteraction(a: string, b: string, lang: Lang) {
  const x = a.toLowerCase().trim();
  const y = b.toLowerCase().trim();
  if (!x || !y) return { found: false as const, message: L(lang, "Enter two medicines.", "دو دوا را وارد کنید.") };
  const hit = INTERACTIONS.find(
    (r) =>
      (r.a.toLowerCase().includes(x) || x.includes(r.a.toLowerCase())) &&
      (r.b.toLowerCase().includes(y) || y.includes(r.b.toLowerCase()))
  ) ?? INTERACTIONS.find(
    (r) =>
      (r.a.toLowerCase().includes(y) || y.includes(r.a.toLowerCase())) &&
      (r.b.toLowerCase().includes(x) || x.includes(r.b.toLowerCase()))
  );
  if (!hit) {
    return {
      found: false as const,
      message: L(
        lang,
        "No rule for this pair in the local library. Absence of a warning is not proof of safety — check the printed formulary for anything new.",
        "برای این جفت در کتابخانهٔ محلی قاعده‌ای نیست. نبودِ هشدار دلیل ایمنی نیست — برای هر دواى جدید فورملری چاپی را ببینید."
      ),
    };
  }
  return {
    found: true as const,
    severity: hit.severity,
    pair: [hit.a, hit.b] as [string, string],
    effect: hit.effect[lang === "fa" ? 1 : 0],
    action: hit.action[lang === "fa" ? 1 : 0],
    tags: hit.tags,
  };
}

/** Suggest a safe alternative when a critical pair is found. */
export function alternativesFor(drug: string, lang: Lang) {
  const table: Record<string, [string, string][]> = {
    aspirin: [["Paracetamol", "پاراسیتامول"], ["Clopidogrel (cardiology decision)", "کلوپیدوگرل (تصمیم قلب)"]],
    ibuprofen: [["Paracetamol", "پاراسیتامول"], ["Tramadol (short course)", "ترامادول (دورهٔ کوتاه)"]],
    ketorolac: [["Paracetamol", "پاراسیتامول"], ["Morphine (titrated)", "مورفین (تدریجی)"]],
    omeprazole: [["Pantoprazole", "پنتوپرازول"]],
    clarithromycin: [["Amoxicillin", "آموکسی‌سیلین"], ["Doxycycline", "داکسی‌سایکلین"]],
    azithromycin: [["Amoxicillin", "آموکسی‌سیلین"]],
    diazepam: [["Haloperidol (low dose)", "هالوپریدول (دوز کم)"]],
  };
  const key = Object.keys(table).find((k) => drug.toLowerCase().includes(k));
  return key ? table[key].map((p) => p[lang === "fa" ? 1 : 0]) : [];
}

/** Everything the Intelligence page needs in one payload. */
export function knowledgeSummary() {
  return {
    interactions: INTERACTIONS.length,
    drugs: PEDS_DOSES.length,
    renal: RENAL_RULES.length,
    tests: REFERENCE.length,
  };
}
