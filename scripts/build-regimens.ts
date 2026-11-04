const checkOnly = process.argv.includes("--check");
if (!checkOnly && (process.env.AYBEK_ENABLE_TEACHING_REGIMENS !== "1" || !process.argv.includes("--teaching-only"))) {
  console.error("Refused: unvalidated teaching-only export requires AYBEK_ENABLE_TEACHING_REGIMENS=1 and --teaching-only. Use --check for read-only structural validation.");
  process.exit(1);
}
/**
 * build-regimens.ts — writes the age- and sex-stratified demo prescriptions.
 *
 * The generation logic lives in lib/hms/regimens/engine.ts so the screen
 * (/hms/diseases) and this file can never disagree. This script only writes the
 * three deliverables and refuses to finish if the dataset breaks a rule.
 *
 * Run: npm run hms:regimens
 */
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { resolve, join, dirname, basename } from "node:path";
import { DISEASES } from "../lib/hms/diseases";
import { CHAPTERS } from "../lib/hms/diseases/index";
import { BANDS, buildAll, buildForDisease, isLiquidPrep, validate, type PatientRecord } from "../lib/hms/regimens/engine";
import { DRUGS } from "../lib/hms/regimens/formulary";
import { RECIPES, type Recipe } from "../lib/hms/regimens/recipes";
import { reviewRegimen } from "../lib/hms/regimens/safety";

const arg = process.argv.indexOf("--output-dir");
const destination = arg < 0 ? "" : process.argv[arg + 1];
if (!checkOnly && (!destination || destination.startsWith("--"))) throw new Error("--output-dir NEW_DIRECTORY is required");
const outputDir = destination ? resolve(destination) : "";
if (!checkOnly && existsSync(outputDir)) throw new Error("Output directory must not already exist");
const documents = new Map<string, string>();
const stageDocument = (name: string, content: string) => { documents.set(basename(name), content); };
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
const ophthalmicDiseases = DISEASES.filter((d) => d.id.startsWith("OPH-"));
if (ophthalmicDiseases.length !== 60) audit.push(`ophthalmic chapter has ${ophthalmicDiseases.length} entries; expected 60`);
for (const [index, d] of ophthalmicDiseases.entries()) {
  const expectedId = `OPH-${String(index + 1).padStart(3, "0")}`;
  if (d.id !== expectedId) audit.push(`ophthalmic id sequence: expected ${expectedId}, found ${d.id}`);
  if (d.category !== "ophthalmic") audit.push(`${d.id}: category must be ophthalmic`);
  if (!d.nameFa || !d.symptoms.length || !d.diagnosis.length || !d.treatment.length || !d.fa || !d.danger.length || !d.complications.length)
    audit.push(`${d.id}: missing bilingual clinical content or red flags`);
  const recipe = RECIPES[d.id];
  if (!Array.isArray(recipe) && recipe?.autoFill !== false) audit.push(`${d.id}: clinical recipe must not auto-fill unrelated medicines`);
}
const paediatricDiseases = DISEASES.filter((d) => d.id.startsWith("PED-"));
if (paediatricDiseases.length !== 60) audit.push(`paediatric chapter has ${paediatricDiseases.length} entries; expected 60`);
for (const [index, d] of paediatricDiseases.entries()) {
  const expectedId = `PED-${String(index + 1).padStart(3, "0")}`;
  if (d.id !== expectedId) audit.push(`paediatric id sequence: expected ${expectedId}, found ${d.id}`);
  if (d.category !== "paediatric") audit.push(`${d.id}: category must be paediatric`);
  if (!d.nameFa || !d.symptoms.length || !d.diagnosis.length || !d.treatment.length || !d.fa || !d.danger.length || !d.complications.length)
    audit.push(`${d.id}: missing bilingual clinical content or red flags`);
  const recipe = RECIPES[d.id];
  if (Array.isArray(recipe) || recipe?.autoFill !== false) audit.push(`${d.id}: paediatric recipe must not auto-fill medicines`);
  if (!Array.isArray(recipe) && (recipe.applicableBands?.join(",") !== "child"))
    audit.push(`${d.id}: synthetic regimen examples must be restricted to the child band`);
  if (!Array.isArray(recipe)) {
    const ageRange = recipe.exampleAgeRange?.child;
    if (!ageRange || ageRange.min < 2 || ageRange.max > 17 || ageRange.min > ageRange.max)
      audit.push(`${d.id}: expected a valid child-only synthetic age range within 2–17`);
  }
  if (!Array.isArray(recipe) && [recipe.default, recipe.child ?? [], recipe.adult ?? [], recipe.elderly ?? []].some((items) => items.length > 0))
    audit.push(`${d.id}: weight-specific paediatric medicines must not be prefilled`);
}
const obgynDiseases = DISEASES.filter((d) => d.id.startsWith("OBG-"));
if (obgynDiseases.length !== 60) audit.push(`obstetrics and gynaecology chapter has ${obgynDiseases.length} entries; expected 60`);
const obgynIcd10 = new Set<string>();
for (const [index, d] of obgynDiseases.entries()) {
  const expectedId = `OBG-${String(index + 1).padStart(3, "0")}`;
  if (d.id !== expectedId) audit.push(`OBG id sequence: expected ${expectedId}, found ${d.id}`);
  const expectedCategory = index < 34 ? "obstetric" : "gynaecology";
  if (d.category !== expectedCategory) audit.push(`${d.id}: category must be ${expectedCategory}`);
  if (!d.nameFa || !d.symptoms.length || !d.diagnosis.length || !d.treatment.length || !d.fa || !d.danger.length || !d.complications.length)
    audit.push(`${d.id}: missing bilingual clinical content or red flags`);
  if (obgynIcd10.has(d.icd10)) audit.push(`${d.id}: duplicate ICD-10 code within OBG chapter: ${d.icd10}`);
  obgynIcd10.add(d.icd10);
  if (DISEASES.some((other) => !other.id.startsWith("OBG-") && other.icd10 === d.icd10))
    audit.push(`${d.id}: ICD-10 code ${d.icd10} overlaps another chapter`);
  const recipe = RECIPES[d.id];
  if (Array.isArray(recipe) || recipe?.autoFill !== false) audit.push(`${d.id}: reproductive-health recipe must not auto-fill medicines`);
  if (Array.isArray(recipe) || recipe.applicableSexes?.join(",") !== "female")
    audit.push(`${d.id}: synthetic cases must be female-only`);
  if (Array.isArray(recipe) || !recipe.applicableBands?.length)
    audit.push(`${d.id}: synthetic cases must list applicable age bands`);
  if (!Array.isArray(recipe)) {
    if ([recipe.default, recipe.child ?? [], recipe.adult ?? [], recipe.elderly ?? []].some((items) => items.length > 0))
      audit.push(`${d.id}: reproductive-health examples must not prefill medicines`);
    for (const band of recipe.applicableBands ?? []) {
      const bandRange = BANDS.find((entry) => entry.band === band);
      const ageRange = recipe.exampleAgeRange?.[band];
      if (!bandRange || !ageRange || ageRange.min < bandRange.min || ageRange.max > bandRange.max || ageRange.min > ageRange.max)
        audit.push(`${d.id}: expected a valid age range within the ${band} band`);
    }
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
  ["olopatadine_ophthalmic", "Ophthalmic"],
  ["ciprofloxacin_ophthalmic", "Ophthalmic"],
] as const) {
  const drug = DRUGS[drugId];
  if (!drug || ["child", "adult", "elderly"].some((band) => drug.form[band as keyof typeof drug.form] !== "Drops" || drug.route[band as keyof typeof drug.route] !== route))
    audit.push(`${drugId}: expected Drops by ${route} route in all age bands`);
}
if (audit.length) throw new Error(`Clinical catalogue audit failed:\n- ${audit.join("\n- ")}`);

const records: PatientRecord[] = buildAll();
const prescriptionRecords = records.filter((r) => r.items.length > 0);
const medicatedConditions = new Set(prescriptionRecords.map((r) => r.diseaseId)).size;
const noMedicationCases = records.length - prescriptionRecords.length;
const problems = validate(records);
for (const d of paediatricDiseases) {
  const examples = buildForDisease(d.id);
  const recipe = RECIPES[d.id];
  const ageRange = !Array.isArray(recipe) ? recipe.exampleAgeRange?.child : undefined;
  if (
    examples.length !== 2 ||
    !ageRange ||
    examples.some((r) => r.band !== "child" || r.items.length !== 0 || r.age < ageRange.min || r.age > ageRange.max)
  )
    problems.push(`${d.id}: expected two age-matched, child-only synthetic cases with no prefilled medicines`);
}
for (const d of obgynDiseases) {
  const examples = buildForDisease(d.id);
  const recipe = RECIPES[d.id];
  const expectedBands = !Array.isArray(recipe) ? recipe.applicableBands ?? [] : [];
  if (
    examples.length !== expectedBands.length ||
    examples.some((r) => {
      const ageRange = !Array.isArray(recipe) ? recipe.exampleAgeRange?.[r.band] : undefined;
      return r.sex !== "female" || r.items.length !== 0 || !ageRange || r.age < ageRange.min || r.age > ageRange.max;
    })
  )
    problems.push(`${d.id}: expected one female-only, age-matched, no-medication example per applicable band`);
}



const generatedAt = new Date().toISOString();
stageDocument(
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
        medicatedConditions,
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
stageDocument("data/disease-regimens.csv", rows.join("\n") + "\n");

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

stageDocument(
  "data/disease-regimens.md",
  `# Age- and sex-stratified clinical catalogue examples

**Generated:** ${generatedAt} · **Conditions:** ${DISEASES.length} · **Synthetic patient examples:** ${records.length} · **Prescription examples:** ${prescriptionRecords.length} · **Prescription lines:** ${lines}

Each condition has synthetic patient examples only in its applicable age bands: child (2–17),
adult (18–70) and older adult (71–90). The paediatric chapter is restricted to child-band examples;
children under 2 and neonatal dosing are outside this demo engine. Its cases are age-bounded and do
not prefill medicines because safe choices depend on weight, age, diagnosis and formulation.
Obstetric and gynaecology cases are female-only, age-bounded, and have no prefilled medicines.
Other cases with no routine medicine have **no prescription example**; procedural or supportive
treatment remains in the clinical entry. All legacy and new examples are unvalidated teaching fixtures. No medicine, minimum count,
liquid, syrup, vial or injection is added to fill a template. The limited rule screen cannot
certify dosing, clinical indication or patient-specific renal suitability.

| Band | Synthetic patient examples |
| --- | --- |
${byBand.map((b) => `| ${b.label} | ${b.count} |`).join("\n")}

| Sex | Synthetic patient examples |
| --- | --- |
${bySex.map((s) => `| ${s.sex} | ${s.count} |`).join("\n")}

| Measure | Result |
| --- | --- |
| Conditions with at least one medication example | ${medicatedConditions} of ${DISEASES.length} |
| Medicines per non-empty prescription example (min / max) | ${Math.min(...itemCounts)} / ${Math.max(...itemCounts)} |
| Prescription examples with a liquid preparation | ${liquid} of ${prescriptionRecords.length} (${Math.round((liquid / prescriptionRecords.length) * 100)}%) |
| Child prescription examples with an oral syrup | ${childSyrup} of ${child.length} (${Math.round((childSyrup / child.length) * 100)}%) |
| Prescription examples with an injectable (vial) | ${vial} of ${prescriptionRecords.length} (${Math.round((vial / prescriptionRecords.length) * 100)}%) |
| Prescription examples with a safety finding | ${reviews.filter((r) => r.blocks > 0 || r.cautions > 0).length} of ${prescriptionRecords.length} |
| … of those, blocking findings | ${withBlock} |
| Total findings raised | ${flagged} |
| Cases without a medication example | ${noMedicationCases} |

## Files

- \`data/disease-regimens.json\` — synthetic age/sex records for applicable bands, including child-only paediatric cases and no-medication cases
- \`data/disease-regimens.csv\` — one row per medicine in a non-empty prescription example
- \`data/disease-regimens.md\` — this summary

## Safety and scope

1. **Reference examples, not prescriptions.** Doses are teaching ranges only. The disease page
   prints the disclaimer and the review panel checks age bands, renal adjustments, interactions
   and duplication. A clean check does not establish that a medicine is appropriate for a patient.
2. **Do not add medicines to reach a count.** ENT and ophthalmic examples show only medicines that
   may be indicated. Paediatric examples are child-only and intentionally have no prefilled drugs;
   weight-based decisions, supportive care, procedures and referral stay in the clinical entry.
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
if (problems.length) throw new Error(`Validation failed before export: ${problems.join("; ")}`);
if (checkOnly) {
  console.log("Read-only structural validation complete. No files or databases changed; this is not clinical approval.");
} else {
  mkdirSync(dirname(outputDir), { recursive: true });
  mkdirSync(outputDir);
  for (const [name, content] of documents) writeFileSync(join(outputDir, name), content, { flag: "wx" });
}
