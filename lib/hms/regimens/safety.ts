/**
 * Regimen safety review — the system checks a prescription instead of printing
 * a disclaimer and hoping someone reads it.
 *
 * Four independent checks run on every generated regimen:
 *
 *   1. AGE / BAND     — drugs that must not reach a child or an older adult
 *                       (tetracyclines under 8, fluoroquinolones in children,
 *                       NSAIDs and benzodiazepines in the elderly, …).
 *   2. RENAL          — the drug is matched against RENAL_RULES from
 *                       lib/hms/clinical.ts; when the patient's creatinine
 *                       clearance is at or below 50 ml/min the rule's
 *                       recommendation is attached, and drugs marked "Avoid"
 *                       or "Contraindicated" become blocking findings.
 *   3. INTERACTIONS   — every pair inside the prescription is matched against
 *                       INTERACTIONS from lib/hms/clinical.ts.
 *   4. DUPLICATION    — the same molecule twice (paracetamol tablet + syrup).
 *
 * Severity: "block" stops a prescription from being issued, "caution" requires
 * a documented reason, "info" is worth reading. Nothing here replaces the
 * prescriber — it makes the check impossible to skip.
 */
import { INTERACTIONS, RENAL_RULES, type Lang } from "../clinical";
import type { DoseBand } from "./formulary";
import type { Item } from "./engine";

export type Severity = "block" | "caution" | "info";

export type Finding = {
  severity: Severity;
  drug: string;
  rule: string;
  titleEn: string;
  titleFa: string;
  detailEn: string;
  detailFa: string;
  basis: string;
};

export type Review = {
  findings: Finding[];
  blocks: number;
  cautions: number;
  infos: number;
  /** Worst severity present, or "clear". */
  verdict: Severity | "clear";
};

/** Drugs that must not be given inside a band. Keys are English drug names. */
const BAND_BANS: {
  match: RegExp;
  band: DoseBand;
  severity: Severity;
  rule: string;
  en: [string, string];
  fa: [string, string];
}[] = [
  {
    match: /doxycycline|tetracycline/i, band: "child", severity: "block", rule: "Tetracycline in a child",
    en: ["Never give a tetracycline under 8 years — permanent tooth staining and enamel hypoplasia.", "If the indication is rickettsial or atypical infection, use a macrolide instead."],
    fa: ["زیر ۸ سال هرگز تتراسایکلین ندهید — رنگ‌شدگی دائمی دندان و نقص مینا.", "در عفونت‌های آتیپیک ماکرولید را جایگزین کنید."],
  },
  {
    match: /ciprofloxacin|levofloxacin|fluoroquinolone/i, band: "child", severity: "caution", rule: "Fluoroquinolone in a child",
    en: ["Reserve for infections with no alternative (e.g. resistant typhoid); cartilage and tendon risk.", "Document the reason in the notes."],
    fa: ["فقط وقتی جایگزین نیست (مثلاً تیفوئید مقاوم)؛ خطر غضروف و تاندون.", "دلیل انتخاب را در یادداشت ثبت کنید."],
  },
  {
    match: /ibuprofen|diclofenac|naproxen|aspirin/i, band: "elderly", severity: "caution", rule: "NSAID in an older adult",
    en: ["Gastrointestinal bleeding, acute kidney injury and blood-pressure elevation rise sharply over 70.", "Use the lowest dose for the shortest time with stomach protection, or switch to paracetamol."],
    fa: ["خون‌ریزی معده، آسیب حاد کلیه و بلندی فشار در بالای ۷۰ سال به‌شدت بالا می‌رود.", "کمترین دوز و کوتاه‌ترین مدت با محافظ معده، یا پاراسیتامول."],
  },
  {
    match: /diazepam/i, band: "elderly", severity: "caution", rule: "Benzodiazepine in an older adult",
    en: ["Falls, confusion and respiratory depression — halve the dose and review daily.", "Avoid combining with other sedatives."],
    fa: ["زمین‌خوردن، گیجی و تضعیف تنفس — دوز نصف و بازبینی روزانه.", "با سایر آرام‌بخش‌ها ترکیب نکنید."],
  },
  {
    match: /gentamicin|vancomycin/i, band: "elderly", severity: "caution", rule: "Nephrotoxic antibiotic in an older adult",
    en: ["Age-related decline in glomerular filtration raises trough levels.", "Check creatinine and drug levels; extend the interval."],
    fa: ["افت فیلتراسیون کلیوی با سن، سطح خونی را بالا می‌برد.", "کراتینین و سطح دوا را بسنجید؛ فاصله را بیشتر کنید."],
  },
  {
    match: /metronidazole/i, band: "child", severity: "info", rule: "Metronidazole in a child",
    en: ["Weight-band the dose; avoid alcohol-containing syrups.", "Taste is bitter — give after food."],
    fa: ["دوز بر اساس وزن؛ از شربت‌های الکول‌دار پرهیز کنید.", "طعم تلخ دارد — بعد از غذا بدهید."],
  },
  {
    match: /prednisolone|dexamethasone|hydrocortisone/i, band: "elderly", severity: "info", rule: "Corticosteroid in an older adult",
    en: ["Check glucose and consider bone protection on any course longer than 3 weeks.", "Taper if treatment exceeds 2 weeks."],
    fa: ["قند خون را بسنجید و در دورهٔ بیش از ۳ هفته محافظت استخوان را در نظر بگیرید.", "اگر درمان بیش از ۲ هفته شد، تدریجی قطع کنید."],
  },
];

function renalBand(crCl: number): "g3b" | "g4" | "g5" | null {
  if (crCl > 50) return null;
  if (crCl > 30) return "g3b";
  if (crCl > 15) return "g4";
  return "g5";
}

/** Names in the formulary that differ from the clinical rule table. */
const ALIAS: Record<string, string> = {
  "amoxicillin-clavulanate": "Amoxicillin",
  "oral rehydration salts": "",
  "ringer lactate": "",
  "budesonide inhaler": "",
  "beclomethasone nasal spray": "",
  enoxaparin: "Enoxaparin",
  ceftriaxone: "Ceftriaxone",
  gentamicin: "Gentamicin",
  vancomycin: "Vancomycin",
};

export function reviewRegimen(
  items: Item[],
  ctx: { band: DoseBand; age: number; crCl?: number | null; lang?: Lang }
): Review {
  const lang = ctx.lang ?? "en";
  const findings: Finding[] = [];
  const push = (f: Finding) => findings.push(f);

  for (const item of items) {
    for (const rule of BAND_BANS) {
      if (rule.band !== ctx.band || !rule.match.test(item.drug)) continue;
      push({
        severity: rule.severity,
        drug: item.drug,
        rule: rule.rule,
        titleEn: rule.en[0],
        titleFa: rule.fa[0],
        detailEn: rule.en[1],
        detailFa: rule.fa[1],
        basis: `band:${ctx.band}`,
      });
    }

    if (typeof ctx.crCl === "number" && ctx.crCl > 0) {
      const key = ALIAS[item.drug.toLowerCase()] ?? item.drug;
      const renal = RENAL_RULES.find((r) => r.drug.toLowerCase() === key.toLowerCase());
      const band = renalBand(ctx.crCl);
      if (renal && band) {
        const dose = renal[band];
        const stop = /avoid|contraindicat|stop/i.test(dose);
        push({
          severity: stop ? "block" : "caution",
          drug: item.drug,
          rule: "Renal dose adjustment",
          titleEn: `Creatinine clearance ${Math.round(ctx.crCl)} ml/min — ${dose}`,
          titleFa: `کلیرانس کراتینین ${Math.round(ctx.crCl)} میلی‌لیتر در دقیقه — ${dose}`,
          detailEn: renal.note[0],
          detailFa: renal.note[1],
          basis: "renal",
        });
      }
    }
  }

  // Interactions across every pair in the prescription.
  for (let i = 0; i < items.length; i += 1) {
    for (let j = i + 1; j < items.length; j += 1) {
      const a = items[i];
      const b = items[j];
      const hit = INTERACTIONS.find(
        (x) =>
          (x.a.toLowerCase() === a.drug.toLowerCase() && x.b.toLowerCase() === b.drug.toLowerCase()) ||
          (x.a.toLowerCase() === b.drug.toLowerCase() && x.b.toLowerCase() === a.drug.toLowerCase())
      );
      if (!hit) continue;
      push({
        severity: hit.severity === "critical" ? "block" : hit.severity === "major" ? "caution" : "info",
        drug: `${a.drug} + ${b.drug}`,
        rule: "Drug interaction",
        titleEn: hit.effect[0],
        titleFa: hit.effect[1],
        detailEn: hit.action[0],
        detailFa: hit.action[1],
        basis: "interaction",
      });
    }
  }

  // Same molecule twice (a tablet and its syrup).
  const seen = new Map<string, string>();
  for (const item of items) {
    const base = item.drug.replace(/\s*\(.*\)\s*/g, "").trim().toLowerCase();
    if (seen.has(base)) {
      push({
        severity: "block",
        drug: item.drug,
        rule: "Duplication",
        titleEn: `Duplicate therapy: ${item.drug} already appears as ${seen.get(base)}`,
        titleFa: `تکرار دوا: ${item.drug} قبلاً به شکل ${seen.get(base)} آمده است`,
        detailEn: "Count the total daily dose of the molecule, or remove one line.",
        detailFa: "دوز کل روزانهٔ همان ماده را حساب کنید یا یک سطر را حذف کنید.",
        basis: "duplication",
      });
    } else {
      seen.set(base, item.drug);
    }
  }

  const blocks = findings.filter((f) => f.severity === "block").length;
  const cautions = findings.filter((f) => f.severity === "caution").length;
  const infos = findings.filter((f) => f.severity === "info").length;
  const verdict: Review["verdict"] = blocks ? "block" : cautions ? "caution" : infos ? "info" : "clear";
  return { findings, blocks, cautions, infos, verdict };
}

/**
 * The national-formulary rule, as a value the UI must render. Kept next to the
 * checker so a screen cannot show one without the other.
 */
export const FORMULARY_NOTE = {
  en: {
    title: "Reference doses, not a prescribing order",
    body:
      "Every dose in this catalogue is a standard textbook range for teaching. Before you treat, compare it with the national formulary, adjust for renal and hepatic function, and record your own decision. The system checks age, renal function, interactions and duplication — it does not know this patient.",
  },
  fa: {
    title: "دوزها مرجع آموزشی است، نه دستور تجویز",
    body:
      "هر دوز در این کاتالوگ یک رِنج استاندارد کتابی برای آموزش است. پیش از تداوی آن را با فورملری ملی مقایسه کنید، برای کار کلیه و کبد تنظیم کنید و تصمیم خود را ثبت کنید. سیستم سن، کار کلیه، تداخل و تکرار دوا را می‌سنجد — اما این بیمار را نمی‌شناسد.",
  },
};
