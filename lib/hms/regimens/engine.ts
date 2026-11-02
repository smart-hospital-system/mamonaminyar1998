/**
 * Regimen engine — builds the age- and sex-stratified demo prescriptions.
 *
 * Shared by two callers so they can never drift apart:
 *   - scripts/build-regimens.ts  → writes the JSON/CSV/Markdown deliverables
 *   - app/hms/(workspace)/diseases → renders "what this looks like for a child,
 *     an adult and an older adult", checked live against the safety rules
 *
 * Deterministic: the same catalogue always produces the same patients, ages and
 * quantities, so the files and the screen always agree.
 */
import { DISEASES, CATEGORY_LABEL } from "../diseases";
import { DRUGS, type DoseBand, type Form } from "./formulary";
import { RECIPES } from "./recipes";

export type Item = {
  drugId: string;
  drug: string;
  drugFa: string;
  className: string;
  form: Form;
  strength: string;
  dose: string;
  frequency: string;
  route: string;
  durationDays: number;
  quantity: number;
  unit: string;
  sharePct: number;
};

export type PatientRecord = {
  patientId: string;
  rxNo: string;
  name: string;
  nameFa: string;
  sex: "female" | "male";
  age: number;
  band: DoseBand;
  bandLabel: string;
  diseaseId: string;
  disease: string;
  diseaseFa: string;
  icd10: string;
  category: string;
  items: Item[];
};

export const BANDS: { band: DoseBand; label: string; labelFa: string; min: number; max: number }[] = [
  { band: "child", label: "< 18 years", labelFa: "کمتر از ۱۸ سال", min: 2, max: 17 },
  { band: "adult", label: "18–70 years", labelFa: "۱۸ تا ۷۰ سال", min: 18, max: 70 },
  { band: "elderly", label: "71–90 years", labelFa: "۷۱ تا ۹۰ سال", min: 71, max: 90 },
];

const FEMALE = ["Zahra", "Fatima", "Marzia", "Sima", "Laila", "Nargis", "Shabnam", "Parwana", "Gulalai", "Roya", "Nasrin", "Farzana", "Sharifa", "Mahbuba", "Sediqa", "Hasina", "Freshta", "Naheed", "Sonia", "Nadia", "Khatera", "Mursal", "Tamana", "Zarlasht", "Bibi Hawa", "Sadaf", "Rana", "Shukria", "Meena", "Amina"];
const MALE = ["Ahmad", "Mohammad", "Rahim", "Karim", "Yusuf", "Hamid", "Bashir", "Najib", "Omid", "Sami", "Farid", "Javid", "Qasim", "Wahid", "Naim", "Sharif", "Rasool", "Tariq", "Zubair", "Ismail", "Naseer", "Sohail", "Habib", "Latif", "Aziz", "Khalid", "Musa", "Yama", "Bilal", "Sultan"];
const FAMILY = ["Ahmadi", "Niazi", "Karimi", "Rahmani", "Hussaini", "Popal", "Sultani", "Siddiqi", "Barakzai", "Stanikzai", "Noori", "Amiri", "Safi", "Wardak", "Rasuli", "Alizai", "Hashimi", "Salehi", "Yousufi", "Faizi"];

const FA_NAME: Record<string, string> = {
  Zahra: "زهرا", Fatima: "فاطمه", Marzia: "مرضیه", Sima: "سیما", Laila: "لیلا", Nargis: "نرگس",
  Shabnam: "شبنم", Parwana: "پروانه", Gulalai: "گلالی", Roya: "رویا", Nasrin: "نسرین",
  Farzana: "فرزانه", Sharifa: "شریفه", Mahbuba: "محبوبه", Sediqa: "صدیقه", Hasina: "حسینه",
  Freshta: "فرشته", Naheed: "ناهید", Sonia: "سونیا", Nadia: "نادیه",
  Khatera: "خاطره", Mursal: "مرسل", Tamana: "تمنا", Zarlasht: "زرلشت", "Bibi Hawa": "بی‌بی حوا",
  Sadaf: "صدف", Rana: "رعنا", Shukria: "شکریه", Meena: "مینا", Amina: "امینه",
  Ahmad: "احمد", Mohammad: "محمد", Rahim: "رحیم", Karim: "کریم", Yusuf: "یوسف", Hamid: "حمید",
  Bashir: "بشیر", Najib: "نجیب", Omid: "امید", Sami: "سامی", Farid: "فرید", Javid: "جاوید",
  Qasim: "قاسم", Wahid: "وحید", Naim: "نعیم", Sharif: "شریف", Rasool: "رسول", Tariq: "طارق",
  Zubair: "زبیر", Ismail: "اسماعیل",
  Naseer: "نصیر", Sohail: "سهیل", Habib: "حبیب", Latif: "لطیف", Aziz: "عزیز", Khalid: "خالد",
  Musa: "موسی", Yama: "یما", Bilal: "بلال", Sultan: "سلطان",
  Ahmadi: "احمدی", Niazi: "نیازی", Karimi: "کریمی", Rahmani: "رحمانی", Hussaini: "حسینی",
  Popal: "پوپل", Sultani: "سلطانی", Siddiqi: "صدیقی", Barakzai: "بارکزی", Stanikzai: "ستانکزی",
  Noori: "نوری", Amiri: "امیری", Safi: "صفی", Wardak: "وردک", Rasuli: "رسولی",
  Alizai: "علیزایی", Hashimi: "هاشمی", Salehi: "صالحی", Yousufi: "یوسفی", Faizi: "فیضی",
};

const PER_DAY: [RegExp, number][] = [
  [/four times/i, 4],
  [/three times/i, 3],
  [/twice daily/i, 2],
  [/every 8 hours/i, 3],
  [/every 6 hours/i, 4],
  [/every 12 hours/i, 2],
  [/every 24 hours/i, 1],
  [/every 4–6 hours/i, 5],
  [/every 4 hours/i, 6],
  [/once daily/i, 1],
  [/single dose/i, 1],
  [/as needed/i, 2],
];

const perDay = (frequency: string) => PER_DAY.find(([re]) => re.test(frequency))?.[1] ?? 2;

export const daysOf = (duration: string) => {
  const m = duration.match(/(\d+)\s*day/i);
  return m ? Number(m[1]) : 7;
};

const LIQUID: Form[] = ["Syrup", "Suspension", "Drops", "Nebule", "Inhaler"];
/** ORS and other sachets are dispensed dry but taken as an oral liquid. */
export const isLiquidPrep = (f: Form) => LIQUID.includes(f) || f === "Sachet" || f === "Vial";

export function qtyFor(form: Form, dose: string, frequency: string, duration: string): number {
  const per = perDay(frequency);
  const days = /as needed|single/i.test(duration) ? Math.min(daysOf(duration), 7) : daysOf(duration);
  const ml = dose.match(/(\d+)\s*ml/i);
  const units = dose.match(/^(\d+)\s*(?:tablet|capsule|puff|sachet|spray|nebule|vial|dose)/i);
  const each = units ? Number(units[1]) : 1;
  switch (form) {
    case "Syrup":
    case "Suspension":
      return Math.max(1, Math.round((ml ? Number(ml[1]) : 5) * per * days));
    case "Drops":
      return Math.max(1, Math.round((ml ? Number(ml[1]) : 1) * per * days));
    default:
      return Math.max(1, each * per * days);
  }
}

export function unitFor(form: Form): string {
  switch (form) {
    case "Syrup":
    case "Suspension":
    case "Drops":
      return "ml";
    case "Nebule":
      return "nebule";
    case "Vial":
      return "vial";
    case "Inhaler":
      return "puff";
    case "Sachet":
      return "sachet";
    case "Cream":
    case "Ointment":
      return "tube";
    default:
      return "unit";
  }
}

function itemFor(drugId: string, band: DoseBand): Item {
  const d = DRUGS[drugId];
  const form = d.form[band];
  return {
    drugId,
    drug: d.name,
    drugFa: d.nameFa,
    className: d.className,
    form,
    strength: d.strength[band],
    dose: d.dose[band],
    frequency: d.frequency[band],
    route: d.route[band],
    durationDays: daysOf(d.duration),
    quantity: qtyFor(form, d.dose[band], d.frequency[band], d.duration),
    unit: unitFor(form),
    sharePct: 0,
  };
}

/** The six prescriptions for one condition, in band → sex order. */
export function buildForDisease(diseaseId: string): PatientRecord[] {
  const index = DISEASES.findIndex((d) => d.id === diseaseId);
  if (index < 0) return [];
  const disease = DISEASES[index];
  const raw = RECIPES[diseaseId];
  const out: PatientRecord[] = [];
  let seq = index * 6;

  for (const b of BANDS) {
    for (const sex of ["female", "male"] as const) {
      seq += 1;
      const pool = sex === "female" ? FEMALE : MALE;
      const perSex = Math.floor((seq - 1) / 2);
      const first = pool[perSex % pool.length];
      const family = FAMILY[Math.floor(perSex / pool.length) % FAMILY.length];
      const age = b.min + ((seq * 7) % (b.max - b.min + 1));

      const recipe = Array.isArray(raw) ? raw : raw ? raw[b.band] ?? raw.default : [];
      const items = recipe.map((id) => itemFor(id, b.band));

      // Every prescription carries a liquid preparation; children never get
      // tablets only, so plain paracetamol is swapped for the syrup.
      const needsSyrup = b.band === "child" && !items.some((i) => ["Syrup", "Suspension"].includes(i.form));
      if (needsSyrup || !items.some((i) => isLiquidPrep(i.form))) {
        const plain = items.findIndex((i) => i.drugId === "paracetamol");
        const syrup = itemFor("paracetamol_syrup", b.band);
        if (plain >= 0) items[plain] = syrup;
        else if (items.length < 6) items.push(syrup);
        else items[items.length - 1] = syrup;
      }

      const total = items.reduce((n, i) => n + i.quantity, 0) || 1;
      for (const i of items) i.sharePct = Math.round((i.quantity / total) * 1000) / 10;
      const before = Math.round(items.reduce((n, i) => n + i.sharePct, 0) * 10) / 10;
      const last = items[items.length - 1];
      last.sharePct = Math.round((last.sharePct + (100 - before)) * 10) / 10;

      out.push({
        patientId: `dp-${String(seq).padStart(4, "0")}`,
        rxNo: `RX-D-${String(seq).padStart(4, "0")}`,
        name: `${first} ${family}`,
        nameFa: `${FA_NAME[first]} ${FA_NAME[family]}`,
        sex,
        age,
        band: b.band,
        bandLabel: b.label,
        diseaseId: disease.id,
        disease: disease.nameEn,
        diseaseFa: disease.nameFa,
        icd10: disease.icd10,
        category: CATEGORY_LABEL[disease.category]?.en ?? disease.category,
        items,
      });
    }
  }
  return out;
}

export function buildAll(): PatientRecord[] {
  return DISEASES.flatMap((d) => buildForDisease(d.id));
}

/** Structural validation — used by the generator to refuse a bad dataset. */
export function validate(records: PatientRecord[]): string[] {
  const problems: string[] = [];
  for (const r of records) {
    const tag = `${r.diseaseId}/${r.band}/${r.sex}`;
    if (r.items.length < 4) problems.push(`${tag}: only ${r.items.length} drugs`);
    if (!r.items.some((i) => isLiquidPrep(i.form))) problems.push(`${tag}: no liquid or vial`);
    if (r.band === "child" && !r.items.some((i) => ["Syrup", "Suspension"].includes(i.form)))
      problems.push(`${tag}: no oral syrup for a child`);
    const sum = Math.round(r.items.reduce((n, i) => n + i.sharePct, 0) * 10) / 10;
    if (Math.abs(sum - 100) > 0.05) problems.push(`${tag}: shares total ${sum}%`);
  }
  return problems;
}
