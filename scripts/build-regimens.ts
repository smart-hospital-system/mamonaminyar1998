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
import { CHAPTERS } from "../lib/hms/diseases/index";
import { BANDS, buildAll, isLiquidPrep, validate, type PatientRecord } from "../lib/hms/regimens/engine";
import { DRUGS } from "../lib/hms/regimens/formulary";
import { RECIPES, type Recipe } from "../lib/hms/regimens/recipes";
import { reviewRegimen } from "../lib/hms/regimens/safety";

const audit: string[] = [];
const ids = new Set<string>();
const names = new Set<string>();
const canonicalName = (value: string) =>
  value.normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
for (const d of DISEASES) {
  const name = canonicalName(d.nameEn);
  if (ids.has(d.id)) audit.push(`duplicate disease id: ${d.id}`);
  if (names.has(name)) audit.push(`duplicate disease name: ${d.nameEn}`);
  ids.add(d.id);
  names.add(name);
  if (!Object.prototype.hasOwnProperty.call(RECIPES, d.id)) audit.push(`missing recipe: ${d.id}`);
}
const entDiseases = DISEASES.filter((d) => d.id.startsWith("ENT-"));
if (entDiseases.length !== 60) audit.push(`ENT chapter has ${entDiseases.length} entries; expected 60`);
for (const [index, d] of entDiseases.entries()) {
  const expectedId = `ENT-${String(index + 1).padStart(3, "0")}`;
  if (d.id !== expectedId) audit.push(`ENT id sequence: expected ${expectedId}, found ${d.id}`);
  if (d.category !== "ent") audit.push(`${d.id}: category must be ent`);
  if (!d.nameFa || !d.symptoms.length || !d.diagnosis.length || !d.treatment.length || !d.fa || !d.danger.length || !d.complications.length)
    audit.push(`${d.id}: missing bilingual clinical content or red flags`);
  const recipe = RECIPES[d.id];
  if (!Array.isArray(recipe) && recipe?.autoFill !== false) audit.push(`${d.id}: clinical recipe must not auto-fill unrelated medicines`);
}
for (const diseaseId of Object.keys(RECIPES)) {
  if (!ids.has(diseaseId)) audit.push(`orphan recipe: ${diseaseId}`);
}
const recipeDrugIds = (recipe: Recipe) =>
  Array.isArray(recipe) ? recipe : [recipe.default, recipe.child ?? [], recipe.adult ?? [], recipe.elderly ?? []].flat();
for (const [diseaseId, recipe] of Object.entries(RECIPES)) {
  for (const drugId of recipeDrugIds(recipe)) {
    if (!Object.prototype.hasOwnProperty.call(DRUGS, drugId)) audit.push(`${diseaseId}: unknown formulary id ${drugId}`);
  }
}
for (const [drugId, route] of [
  ["saline_nasal", "Nasal"],
  ["beclomethasone_nasal", "Nasal"],
  ["ipratropium_nasal", "Nasal"],
  ["olive_oil_otic", "Otic"],
  ["ciprofloxacin_otic", "Otic"],
  ["clotrimazole_otic", "Otic"],
  ["lubricating_eye_drops", "Ophthalmic"],
] as const) {
  const drug = DRUGS[drugId];
  if (!drug || ["child", "adult", "elderly"].some((band) => drug.form[band as keyof typeof drug.form] !== "Drops" || drug.route[band as keyof typeof drug.route] !== route))
    audit.push(`${drugId}: expected Drops by ${route} route in all age bands`);
}
if (audit.length) throw new Error(`Clinical catalogue audit failed:\n- ${audit.join("\n- ")}`);

const records: PatientRecord[] = buildAll();
const prescriptionRecords = records.filter((r) => r.items.length > 0);
const noMedicationCases = records.length - prescriptionRecords.length;
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
      totals: {
        diseases: DISEASES.length,
        chapters: CHAPTERS.length,
        clinicalCategories: new Set(DISEASES.map((d) => d.category)).size,
        formularyMedicines: Object.keys(DRUGS).length,
        patientExamples: records.length,
        prescriptionExamples: prescriptionRecords.length,
        casesWithoutMedication: noMedicationCases,
      },
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
const itemCounts = prescriptionRecords.map((r) => r.items.length);
const vial = prescriptionRecords.filter((r) => r.items.some((i) => i.form === "Vial")).length;
const liquid = prescriptionRecords.filter((r) => r.items.some((i) => isLiquidPrep(i.form))).length;
const child = prescriptionRecords.filter((r) => r.band === "child");
const childSyrup = child.filter((r) => r.items.some((i) => ["Syrup", "Suspension"].includes(i.form))).length;
const lines = prescriptionRecords.reduce((n, r) => n + r.items.length, 0);

const reviews = prescriptionRecords.map((r) => reviewRegimen(r.items, { band: r.band, age: r.age }));
const withBlock = reviews.filter((r) => r.blocks > 0).length;
const withCaution = reviews.filter((r) => r.cautions > 0).length;
const flagged = reviews.reduce((n, r) => n + r.findings.length, 0);
if (withBlock > 0) problems.push(`${withBlock} prescription examples contain blocking safety findings`);

writeFileSync(
  "data/disease-regimens.md",
  `# Age- and sex-stratified clinical catalogue examples

**Generated:** ${generatedAt} · **Conditions:** ${DISEASES.length} · **Synthetic patient examples:** ${records.length} · **Prescription examples:** ${prescriptionRecords.length} · **Prescription lines:** ${lines}

Each condition has one synthetic patient example for each sex in each band: child (< 18), adult
(18–70) and older adult (71–90). Cases with no routine medicine have **no prescription example**;
procedural or supportive treatment remains in the clinical entry. The original catalogue recipes
retain their historical 4–6-line teaching format. The ENT chapter opts out of automatic fill-in:
only medicines that may be indicated are shown, and some ENT cases correctly have none.

| Band | Synthetic patient examples |
| --- | --- |
${byBand.map((b) => `| ${b.label} | ${b.count} |`).join("\n")}

| Sex | Synthetic patient examples |
| --- | --- |
${bySex.map((s) => `| ${s.sex} | ${s.count} |`).join("\n")}

| Measure | Result |
| --- | --- |
| Medicines per non-empty prescription example (min / max) | ${Math.min(...itemCounts)} / ${Math.max(...itemCounts)} |
| Prescription examples with a liquid preparation | ${liquid} of ${prescriptionRecords.length} (${Math.round((liquid / prescriptionRecords.length) * 100)}%) |
| Child prescription examples with an oral syrup | ${childSyrup} of ${child.length} (${Math.round((childSyrup / child.length) * 100)}%) |
| Prescription examples with an injectable (vial) | ${vial} of ${prescriptionRecords.length} (${Math.round((vial / prescriptionRecords.length) * 100)}%) |
| Prescription examples with a safety finding | ${withBlock + withCaution} of ${prescriptionRecords.length} |
| … of those, blocking findings | ${withBlock} |
| Total findings raised | ${flagged} |
| Cases without a medication example | ${noMedicationCases} |

## Files

- \`data/disease-regimens.json\` — six synthetic age/sex records per condition, including no-medication cases
- \`data/disease-regimens.csv\` — one row per medicine in a non-empty prescription example
- \`data/disease-regimens.md\` — this summary

## Safety and scope

1. **Reference examples, not prescriptions.** Doses are teaching ranges only. The disease page
   prints the disclaimer and the review panel checks age bands, renal adjustments, interactions
   and duplication. A clean check does not establish that a medicine is appropriate for a patient.
2. **Do not add medicines to reach a count.** The ENT chapter can show one indicated medicine or
   none; procedures, hearing support, observation and urgent referral are described in the entry.
3. The application is **not a medical device** and is not clinically certified. Follow the
   national formulary, local antimicrobial policy, patient-specific assessment and specialist advice.

## Disclaimer

Synthetic demonstration and teaching dataset. Confirm any medicine against the national formulary,
renal and hepatic adjustment guidance, allergies and the prescriber's judgement before use.
`
);

console.log(`conditions: ${DISEASES.length}  synthetic patient examples: ${records.length}  prescription examples: ${prescriptionRecords.length}`);
console.log(`cases without a medication example: ${noMedicationCases}  prescription lines: ${lines}`);
console.log(`medicines per non-empty example: min ${Math.min(...itemCounts)}, max ${Math.max(...itemCounts)}`);
console.log(`bands: ${byBand.map((b) => `${b.label}=${b.count}`).join("  ")}`);
console.log(`sex: ${bySex.map((s) => `${s.sex}=${s.count}`).join("  ")}`);
console.log(`vial: ${Math.round((vial / prescriptionRecords.length) * 100)}%   liquid: ${Math.round((liquid / prescriptionRecords.length) * 100)}%   child syrup: ${childSyrup}/${child.length}`);
console.log(`safety: ${withBlock} blocking, ${withCaution} caution, ${flagged} findings total`);
console.log(`problems: ${problems.length ? problems.join("; ") : "none"}`);
if (problems.length) process.exitCode = 1;
