/**
 * build-regimens.ts — generates the age- and sex-stratified demo prescriptions.
 *
 * For every condition in the catalogue the generator produces one prescription
 * per band (child < 18, adult 18–70, elderly 71–90) for each sex, giving
 * 6 patients and 6 prescriptions per disease. Each prescription carries 4–6
 * medicines with a band-appropriate formulation, dose and quantity, and the
 * item share of the total quantity is printed as a percentage.
 *
 * Output:
 *   data/disease-regimens.json   machine-readable, one record per patient
 *   data/disease-regimens.csv    flat, one row per prescription item
 *   data/disease-regimens.md     human summary with the coverage table
 *
 * Run: npm run hms:regimens
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { DISEASES, CATEGORY_LABEL } from "../lib/hms/diseases";
import { DRUGS, type DoseBand, type Form } from "../lib/hms/regimens/formulary";
import { RECIPES } from "../lib/hms/regimens/recipes";

const BANDS: { band: DoseBand; label: string; labelFa: string; min: number; max: number }[] = [
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
  Ahmad: "احمد", Mohammad: "محمد", Rahim: "رحیم", Karim: "کریم", Yusuf: "یوسف", Hamid: "حمید",
  Bashir: "بشیر", Najib: "نجیب", Omid: "امید", Sami: "سامی", Farid: "فرید", Javid: "جاوید",
  Qasim: "قاسم", Wahid: "وحید", Naim: "نعیم", Sharif: "شریف", Rasool: "رسول", Tariq: "طارق",
  Zubair: "زبیر", Ismail: "اسماعیل",
  Khatera: "خاطره", Mursal: "مرسل", Tamana: "تمنا", Zarlasht: "زرلشت", "Bibi Hawa": "بی‌بی حوا",
  Sadaf: "صدف", Rana: "رعنا", Shukria: "شکریه", Meena: "مینا", Amina: "امینه",
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

function perDay(frequency: string): number {
  for (const [re, n] of PER_DAY) if (re.test(frequency)) return n;
  return 2;
}

function daysOf(duration: string): number {
  const m = duration.match(/(\d+)\s*day/i);
  return m ? Number(m[1]) : 7;
}

const LIQUID: Form[] = ["Syrup", "Suspension", "Drops", "Nebule", "Inhaler"];
/** ORS and other sachets are dispensed dry but given as an oral liquid. */
const isLiquidPrep = (f: Form) => LIQUID.includes(f) || f === "Sachet" || f === "Vial";

function qtyFor(form: Form, dose: string, frequency: string, duration: string): number {
  const per = perDay(frequency);
  // "As needed" and "single dose" regimens are dispensed as one short course.
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
    case "Nebule":
      return Math.max(1, per * days);
    case "Vial":
      return Math.max(1, each * per * days);
    case "Inhaler":
      return Math.max(1, each * per * days);
    default:
      return Math.max(1, each * per * days);
  }
}

type Item = {
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

type PatientRecord = {
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

const unitFor = (form: Form): string => {
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
};

let seq = 0;
const records: PatientRecord[] = [];
const problems: string[] = [];

for (const disease of DISEASES) {
  const recipe = RECIPES[disease.id];
  if (!recipe) {
    problems.push(`${disease.id}: no recipe`);
    continue;
  }
  if (recipe.length < 4) problems.push(`${disease.id}: only ${recipe.length} drugs`);

  for (const b of BANDS) {
    for (const sex of ["female", "male"] as const) {
      seq += 1;
      const pool = sex === "female" ? FEMALE : MALE;
      const perSex = Math.floor((seq - 1) / 2); // 0..299 within each sex
      const first = pool[perSex % pool.length];
      const family = FAMILY[Math.floor(perSex / pool.length) % FAMILY.length];
      const ageSpan = b.max - b.min;
      const age = b.min + ((seq * 7) % (ageSpan + 1));

      const items: Item[] = recipe.map((id) => {
        const d = DRUGS[id];
        const form = d.form[b.band];
        const qty = qtyFor(form, d.dose[b.band], d.frequency[b.band], d.duration);
        return {
          drugId: id,
          drug: d.name,
          drugFa: d.nameFa,
          className: d.className,
          form,
          strength: d.strength[b.band],
          dose: d.dose[b.band],
          frequency: d.frequency[b.band],
          route: d.route[b.band],
          durationDays: daysOf(d.duration),
          quantity: qty,
          unit: unitFor(form),
          sharePct: 0,
        };
      });

      // Guarantee a liquid preparation: swap plain paracetamol for its syrup, or add it.
      const needsSyrup = b.band === "child" && !items.some((i) => ["Syrup", "Suspension"].includes(i.form));
      if (needsSyrup || !items.some((i) => isLiquidPrep(i.form))) {
        const plain = items.findIndex((i) => i.drugId === "paracetamol");
        const syrupDrug = DRUGS["paracetamol_syrup"];
        const asItem = (): Item => {
          const form = syrupDrug.form[b.band];
          const qty = qtyFor(form, syrupDrug.dose[b.band], syrupDrug.frequency[b.band], syrupDrug.duration);
          return {
            drugId: "paracetamol_syrup",
            drug: syrupDrug.name,
            drugFa: syrupDrug.nameFa,
            className: syrupDrug.className,
            form,
            strength: syrupDrug.strength[b.band],
            dose: syrupDrug.dose[b.band],
            frequency: syrupDrug.frequency[b.band],
            route: syrupDrug.route[b.band],
            durationDays: daysOf(syrupDrug.duration),
            quantity: qty,
            unit: unitFor(form),
            sharePct: 0,
          };
        };
        if (plain >= 0) items[plain] = asItem();
        else if (items.length < 6) items.push(asItem());
        else items[items.length - 1] = asItem();
      }

      const total = items.reduce((n, i) => n + i.quantity, 0) || 1;
      for (const i of items) i.sharePct = Math.round((i.quantity / total) * 1000) / 10;
      // Round-off correction so the printed shares always total exactly 100 %.
      const before = Math.round(items.reduce((n, i) => n + i.sharePct, 0) * 10) / 10;
      const last = items[items.length - 1];
      last.sharePct = Math.round((last.sharePct + (100 - before)) * 10) / 10;

      if (items.length < 4) problems.push(`${disease.id}/${b.band}/${sex}: ${items.length} items`);
      // Every prescription must contain a liquid or injectable preparation.
      if (!items.some((i) => isLiquidPrep(i.form)))
        problems.push(`${disease.id}/${b.band}/${sex}: no liquid or vial`);
      // Children must always receive an oral liquid, never tablets only.
      if (b.band === "child" && !items.some((i) => ["Syrup", "Suspension"].includes(i.form)))
        problems.push(`${disease.id}/child: no oral syrup`);

      records.push({
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
}

mkdirSync("data", { recursive: true });

const generatedAt = new Date().toISOString();
writeFileSync(
  "data/disease-regimens.json",
  JSON.stringify(
    {
      generatedAt,
      source: "Aybek Ten-Bed Specialy Surgical Hospital — clinical catalogue",
      disclaimer:
        "Demonstration and teaching dataset. Doses are standard textbook ranges, not a prescribing authority. Confirm against the national formulary, renal/hepatic adjustment and the prescriber's judgement.",
      bands: BANDS.map((b) => ({ band: b.band, label: b.label, labelFa: b.labelFa })),
      totals: { diseases: DISEASES.length, patients: records.length, prescriptions: records.length },
      patients: records,
    },
    null,
    1
  )
);

const header = ["patient_id", "rx_no", "name", "name_fa", "sex", "age", "band", "disease_id", "disease", "disease_fa", "icd10", "category", "item_no", "drug", "drug_fa", "class", "form", "strength", "dose", "frequency", "route", "duration_days", "quantity", "unit", "share_pct"];
const esc = (v: string | number) => {
  const s = String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};
const rows = [header.join(",")];
for (const r of records) {
  r.items.forEach((it, idx) => {
    rows.push([r.patientId, r.rxNo, r.name, r.nameFa, r.sex, r.age, r.band, r.diseaseId, r.disease, r.diseaseFa, r.icd10, r.category, idx + 1, it.drug, it.drugFa, it.className, it.form, it.strength, it.dose, it.frequency, it.route, it.durationDays, it.quantity, it.unit, it.sharePct].map(esc).join(","));
  });
}
writeFileSync("data/disease-regimens.csv", rows.join("\n") + "\n");

// ---- coverage summary ------------------------------------------------------
const byBand = BANDS.map((b) => ({ band: b.band, label: b.label, count: records.filter((r) => r.band === b.band).length }));
const bySex = ["female", "male"].map((s) => ({ sex: s, count: records.filter((r) => r.sex === s).length }));
const itemCounts = records.map((r) => r.items.length);
const vial = records.filter((r) => r.items.some((i) => i.form === "Vial")).length;
const syrup = records.filter((r) => r.items.some((i) => ["Syrup", "Suspension"].includes(i.form))).length;
const liquidOrVial = records.filter((r) => r.items.some((i) => isLiquidPrep(i.form))).length;
const childSyrup = records.filter((r) => r.band === "child").filter((r) => r.items.some((i) => ["Syrup", "Suspension"].includes(i.form))).length;
const childTotal = records.filter((r) => r.band === "child").length;
const lines = records.reduce((n, r) => n + r.items.length, 0);

const md = `# Age- and sex-stratified demo prescriptions

**Generated:** ${generatedAt} · **Conditions:** ${DISEASES.length} · **Patients:** ${records.length} · **Prescriptions:** ${records.length} · **Prescription lines:** ${lines}

Every condition has one patient per band and per sex, so each condition is represented
6 times: child (< 18), adult (18–70) and older adult (71–90), half female and half male.
Every prescription contains **at least four medicines** and always includes a liquid or
injectable preparation (syrup, suspension, nebule, drops, inhaler or vial).

| Band | Patients |
| --- | --- |
${byBand.map((b) => `| ${b.label} | ${b.count} |`).join("\n")}

| Sex | Patients |
| --- | --- |
${bySex.map((s) => `| ${s.sex} | ${s.count} |`).join("\n")}

| Measure | Result |
| --- | --- |
| Medicines per prescription (min / max) | ${Math.min(...itemCounts)} / ${Math.max(...itemCounts)} |
| Prescriptions with a vial (injection) | ${vial} of ${records.length} (${Math.round((vial / records.length) * 100)}%) |
| Prescriptions with a syrup or suspension | ${syrup} of ${records.length} (${Math.round((syrup / records.length) * 100)}%) |
| Prescriptions with any liquid or injectable | ${liquidOrVial} of ${records.length} (${Math.round((liquidOrVial / records.length) * 100)}%) |
| Child prescriptions with an oral syrup/suspension | ${childSyrup} of ${childTotal} (${Math.round((childSyrup / childTotal) * 100)}%) |

Where a vial is clinically justified (admitted patients, severe infection, emergency care) the
regimen uses an injectable; for self-limiting outpatient illness the child receives a syrup and
the adult a tablet, because an injection would not be appropriate there. Vial-bearing
prescriptions: ${vial} of ${records.length} (${Math.round((vial / records.length) * 100)}%).

## Files

- \`data/disease-regimens.json\` — one record per patient, with every item, dose, quantity and share
- \`data/disease-regimens.csv\` — flat table, one row per prescription line
- \`data/disease-regimens.md\` — this summary

## Disclaimer

This is a demonstration and teaching dataset. The doses are standard textbook ranges, not a
prescribing authority. Confirm every prescription against the national formulary, the
renal and hepatic adjustment tables and the prescriber's own judgement before use.
`;
writeFileSync("data/disease-regimens.md", md);

console.log(`patients: ${records.length}  lines: ${lines}`);
console.log(`medicines per prescription: min ${Math.min(...itemCounts)}, max ${Math.max(...itemCounts)}`);
console.log(`bands: ${byBand.map((b) => `${b.label}=${b.count}`).join("  ")}`);
console.log(`sex: ${bySex.map((s) => `${s.sex}=${s.count}`).join("  ")}`);
console.log(`vial coverage: ${Math.round((vial / records.length) * 100)}%   syrup/suspension: ${Math.round((syrup / records.length) * 100)}%   child syrup: ${childSyrup}/${childTotal}`);
console.log(`problems: ${problems.length ? problems.join("; ") : "none"}`);
if (problems.length) process.exitCode = 1;
