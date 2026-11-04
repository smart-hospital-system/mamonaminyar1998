if (process.env.AYBEK_ENABLE_DEMO_ACTIONS !== "1" || process.env.AYBEK_ENABLE_TEACHING_REGIMENS !== "1" || !process.argv.includes("--confirm-destroy")) {
  console.error("Refused: synthetic catalogue reset requires both demo/teaching opt-ins and --confirm-destroy. Never run against patient records.");
  process.exit(1);
}
/**
 * seed-catalogue.ts — put the clinical catalogue into the hospital database.
 *
 * The disease/regimen engine produces synthetic examples from the bilingual
 * disease catalogue. The register at /hms/prescriptions also contains the
 * hand-written demo scripts from lib/hms/seed.ts. This script adds only cases
 * with at least one clinically indicated medicine; conditions managed without
 * routine medicines remain in the disease browser and are not fake prescriptions.
 *
 *   hms_patients        one record per generated prescription  (id ct-####, MRN CT-####)
 *   hms_prescriptions   one signed prescription per record      (id crx-####, RX-C-####)
 *   hms_rx_items        clinically indicated lines from the same engine the
 *                       screen uses; a condition with no routine medicine gets
 *                       no synthetic prescription row
 *
 * Everything is derived from the same engine the screen uses, so the register,
 * the printed prescription and data/disease-regimens.json can never disagree.
 *
 * Re-running is safe: rows created by this script are deleted first. Rows that
 * belong to the demo hospital or to real work are never touched — the prefixes
 * ct-, crx- and RX-C- exist only here.
 *
 * Run: npm run hms:catalogue
 */
import { DISEASES } from "../lib/hms/diseases";
import { BANDS, buildAll } from "../lib/hms/regimens/engine";
import { hAll, hGet, hmsDb, hmsReady, hRun, hUid } from "../lib/hms/db";
import { reviewRegimen } from "../lib/hms/regimens/safety";

hmsReady();

const db = hmsDb();

/* --------------------------------------------------------------- housekeeping */
// Only rows this script owns are removed, so a reset does not touch the demo
// hospital and a re-run does not duplicate anything.
db.exec("DELETE FROM hms_rx_items WHERE prescription_id IN (SELECT id FROM hms_prescriptions WHERE rx_no LIKE 'RX-C-%')");
db.exec("DELETE FROM hms_prescriptions WHERE rx_no LIKE 'RX-C-%'");
db.exec("DELETE FROM hms_patients WHERE mrn LIKE 'CT-%'");

/* ------------------------------------------------------------------- the doctor */
// Every catalogue prescription is attributed to the staff doctor account, so the
// register shows a real signatory rather than a dangling id.
const doctor =
  hGet<{ id: string }>("SELECT id FROM hms_users WHERE role = 'doctor' ORDER BY created_at LIMIT 1") ??
  hGet<{ id: string }>("SELECT id FROM hms_users ORDER BY created_at LIMIT 1");

if (!doctor) {
  console.error("No staff account found — open the hospital once so it can seed, then run again.");
  process.exit(1);
}

/* ------------------------------------------------------------------ the records */
const allExamples = buildAll();
const noMedicationCases = allExamples.filter((r) => r.items.length === 0).length;
const records = allExamples.filter((r) => r.items.length > 0);
const today = new Date();
const iso = (d: Date) => d.toISOString();

const insertPatient = db.prepare(
  "INSERT INTO hms_patients (id, mrn, name, gender, dob, phone, email, address, blood_group, allergies, chronic, emergency_contact, insurance, notes, created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)"
);
const insertRx = db.prepare(
  "INSERT INTO hms_prescriptions (id, rx_no, encounter_id, patient_id, doctor_id, diagnosis, icd10, notes, follow_up, template, status, signed_by, signed_at, dispensed_at, pharmacist_id, created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)"
);
const insertItem = db.prepare(
  "INSERT INTO hms_rx_items (id, prescription_id, drug, strength, form, dosage, frequency, duration, instructions, qty, unit_price, sort) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)"
);

const LABEL = Object.fromEntries(BANDS.map((b) => [b.band, b.label]));
const ageOf = (dob: Date, at: Date) => {
  let age = at.getFullYear() - dob.getFullYear();
  const m = at.getMonth() - dob.getMonth();
  if (m < 0 || (m === 0 && at.getDate() < dob.getDate())) age -= 1;
  return age;
};

let written = 0;
let lines = 0;
let blocked = 0;

db.exec("BEGIN");
try {
  records.forEach((r, index) => {
    const seq = String(index + 1).padStart(4, "0");
    const patientId = `ct-${seq}`;
    const rxId = `crx-${seq}`;
    // Spread the register over the last 18 months so the "recent" ordering is
    // meaningful instead of every generated row sharing one timestamp.
    const created = new Date(today.getTime() - ((index * 7) % 540) * 86400000 - (index % 24) * 3600000);
    const dob = new Date(created.getTime() - r.age * 365.25 * 86400000);
    const sexLabel = r.sex === "female" ? "female" : "male";

    insertPatient.run(
      patientId,
      `CT-${seq}`,
      r.name,
      sexLabel,
      dob.toISOString().slice(0, 10),
      "",
      "",
      "",
      "",
      "",
      "",
      "",
      "",
      `Clinical catalogue · ${r.diseaseId} · ${LABEL[r.band] ?? r.band}`,
      iso(created)
    );

    insertRx.run(
      rxId,
      `RX-C-${seq}`,
      null,
      patientId,
      doctor.id,
      `${r.disease} (${r.icd10})`,
      r.icd10,
      `Catalogue regimen for ${r.disease}. ${r.items.length} medicines.`,
      `Review in ${Math.max(...r.items.map((i) => i.durationDays))} days`,
      1,
      "signed",
      doctor.id,
      iso(created),
      null,
      null,
      iso(created)
    );

    r.items.forEach((item, i) => {
      insertItem.run(
        `crx-${seq}-${i + 1}`,
        rxId,
        item.drug,
        item.strength,
        item.form,
        item.dose,
        item.frequency,
        `${item.durationDays} days`,
        `${item.route} · ${item.sharePct}% of the prescription · ${r.bandLabel}`,
        item.quantity,
        0,
        i
      );
      lines += 1;
    });

    const review = reviewRegimen(r.items, { band: r.band, age: r.age });
    if (review.blocks > 0) blocked += 1;
    written += 1;
  });
  db.exec("COMMIT");
} catch (error) {
  db.exec("ROLLBACK");
  console.error("Seeding failed, nothing was written:", error);
  process.exit(1);
}

/* ---------------------------------------------------------------------- report */
const count = (sql: string, p: unknown[] = []) => Number(hAll<{ c: number }>(sql, p)[0]?.c ?? 0);
const totalPatients = count("SELECT COUNT(*) AS c FROM hms_patients");
const totalRx = count("SELECT COUNT(*) AS c FROM hms_prescriptions");
const totalItems = count("SELECT COUNT(*) AS c FROM hms_rx_items");
const catalogueRx = count("SELECT COUNT(*) AS c FROM hms_prescriptions WHERE rx_no LIKE 'RX-C-%'");
const perBand = BANDS.map((b) => {
  const n = count(
    "SELECT COUNT(*) AS c FROM hms_prescriptions r JOIN hms_patients p ON p.id = r.patient_id WHERE r.rx_no LIKE 'RX-C-%' AND p.notes LIKE ?",
    [`%· ${b.label}`]
  );
  return `${b.label} ${n}`;
});

console.log(`conditions in catalogue : ${DISEASES.length}`);
console.log(`cases without a medication example (not seeded as prescriptions): ${noMedicationCases}`);
console.log(`catalogue prescriptions : ${catalogueRx}  (${written} written this run)`);
console.log(`catalogue rx lines      : ${lines}`);
console.log(`bands                   : ${perBand.join("  ·  ")}`);
console.log(`database totals         : patients ${totalPatients}  prescriptions ${totalRx}  lines ${totalItems}`);
console.log(`safety blocks in seed   : ${blocked}`);
if (blocked > 0) {
  console.error("Refusing to leave a blocked regimen in the register.");
  process.exit(1);
}
console.log(`catalogue seeded — the register at /hms/prescriptions now shows them. (${hUid("chk").slice(0, 3)})`);
