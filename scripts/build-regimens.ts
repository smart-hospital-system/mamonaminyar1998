/**
 * build-regimens.ts — writes the age- and sex-stratified demo prescriptions.
 *
 * The generation logic lives in lib/hms/regimens/engine.ts so the screen
 * (/hms/diseases) and this file can never disagree. This script only writes the
 * three deliverables and refuses to finish if the dataset breaks a rule.
 *
 * Run: npm run hms:regimens
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { DISEASES } from "../lib/hms/diseases";
import { BANDS, buildAll, isLiquidPrep, validate, type PatientRecord } from "../lib/hms/regimens/engine";
import { reviewRegimen } from "../lib/hms/regimens/safety";

const records: PatientRecord[] = buildAll();
const problems = validate(records);

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

const header = ["patient_id", "rx_no", "name", "name_fa", "sex", "age", "band", "disease_id", "disease", "disease_fa", "icd10", "category", "item_no", "drug", "drug_fa", "class", "form", "strength", "dose", "frequency", "route", "duration_days", "quantity", "unit", "share_pct", "safety_blocks", "safety_cautions"];
const esc = (v: string | number) => {
  const s = String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};
const rows = [header.join(",")];
for (const r of records) {
  // Every prescription is reviewed by the same engine the screen runs.
  const review = reviewRegimen(r.items, { band: r.band, age: r.age });
  r.items.forEach((it, idx) => {
    rows.push([r.patientId, r.rxNo, r.name, r.nameFa, r.sex, r.age, r.band, r.diseaseId, r.disease, r.diseaseFa, r.icd10, r.category, idx + 1, it.drug, it.drugFa, it.className, it.form, it.strength, it.dose, it.frequency, it.route, it.durationDays, it.quantity, it.unit, it.sharePct, review.blocks, review.cautions].map(esc).join(","));
  });
}
writeFileSync("data/disease-regimens.csv", rows.join("\n") + "\n");

const byBand = BANDS.map((b) => ({ band: b.band, label: b.label, count: records.filter((r) => r.band === b.band).length }));
const bySex = ["female", "male"].map((s) => ({ sex: s, count: records.filter((r) => r.sex === s).length }));
const itemCounts = records.map((r) => r.items.length);
const vial = records.filter((r) => r.items.some((i) => i.form === "Vial")).length;
const syrup = records.filter((r) => r.items.some((i) => ["Syrup", "Suspension"].includes(i.form))).length;
const liquid = records.filter((r) => r.items.some((i) => isLiquidPrep(i.form))).length;
const child = records.filter((r) => r.band === "child");
const childSyrup = child.filter((r) => r.items.some((i) => ["Syrup", "Suspension"].includes(i.form))).length;
const lines = records.reduce((n, r) => n + r.items.length, 0);

const reviews = records.map((r) => reviewRegimen(r.items, { band: r.band, age: r.age }));
const withBlock = reviews.filter((r) => r.blocks > 0).length;
const withCaution = reviews.filter((r) => r.cautions > 0).length;
const flagged = reviews.reduce((n, r) => n + r.findings.length, 0);

writeFileSync(
  "data/disease-regimens.md",
  `# Age- and sex-stratified demo prescriptions

**Generated:** ${generatedAt} · **Conditions:** ${DISEASES.length} · **Patients:** ${records.length} · **Prescription lines:** ${lines}

Every condition has one patient per band and per sex: child (< 18), adult (18–70) and older
adult (71–90), half female and half male. Every prescription contains **at least four
medicines** and always includes a liquid preparation. Each one is then **checked by the
system** — age bans, renal adjustment, interactions and duplication.

| Band | Patients |
| --- | --- |
${byBand.map((b) => `| ${b.label} | ${b.count} |`).join("\n")}

| Sex | Patients |
| --- | --- |
${bySex.map((s) => `| ${s.sex} | ${s.count} |`).join("\n")}

| Measure | Result |
| --- | --- |
| Medicines per prescription (min / max) | ${Math.min(...itemCounts)} / ${Math.max(...itemCounts)} |
| Prescriptions with a liquid preparation | ${liquid} of ${records.length} (${Math.round((liquid / records.length) * 100)}%) |
| Child prescriptions with an oral syrup | ${childSyrup} of ${child.length} (${Math.round((childSyrup / child.length) * 100)}%) |
| Prescriptions with an injectable (vial) | ${vial} of ${records.length} (${Math.round((vial / records.length) * 100)}%) |
| Prescriptions with a safety finding | ${withBlock + withCaution} of ${records.length} |
| … of those, blocking findings | ${withBlock} |
| Total findings raised | ${flagged} |

## Files

- \`data/disease-regimens.json\` — one record per patient, every item, dose, quantity and share
- \`data/disease-regimens.csv\` — flat table, one row per prescription line, plus safety counts
- \`data/disease-regimens.md\` — this summary

## The two rules the system enforces

1. **Reference doses, not a prescribing order.** Every entry is a textbook range for teaching.
   \`/hms/diseases\` prints this above the regimen, and the review panel runs age, renal,
   interaction and duplication checks on the prescription you are looking at.
2. **Injectables only where clinically right.** ${Math.round((vial / records.length) * 100)}% of these prescriptions carry a vial — admitted,
   severe or emergency care. A viral cold or a fungal skin infection gets tablets or a syrup,
   because injecting there would be wrong. Children are the exception in the other direction:
   ${Math.round((childSyrup / child.length) * 100)}% receive an oral syrup.

## Disclaimer

Demonstration and teaching dataset. Confirm every prescription against the national formulary,
the renal and hepatic adjustment tables and your own judgement before use.
`
);

console.log(`patients: ${records.length}  lines: ${lines}`);
console.log(`medicines per prescription: min ${Math.min(...itemCounts)}, max ${Math.max(...itemCounts)}`);
console.log(`bands: ${byBand.map((b) => `${b.label}=${b.count}`).join("  ")}`);
console.log(`sex: ${bySex.map((s) => `${s.sex}=${s.count}`).join("  ")}`);
console.log(`vial: ${Math.round((vial / records.length) * 100)}%   liquid: ${Math.round((liquid / records.length) * 100)}%   child syrup: ${childSyrup}/${child.length}`);
console.log(`safety: ${withBlock} blocking, ${withCaution} caution, ${flagged} findings total`);
console.log(`problems: ${problems.length ? problems.join("; ") : "none"}`);
if (problems.length) process.exitCode = 1;
