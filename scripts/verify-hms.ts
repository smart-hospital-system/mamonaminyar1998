/**
 * Self-check used by installer scripts 03 and 10.
 * Prints the seeded record counts and exits non-zero when something is missing.
 */
import { hmsReady, hAll } from "../lib/hms/db";
import { licenseState } from "../lib/hms/license";

hmsReady();
const count = (t: string) => Number(hAll<{ c: number }>(`SELECT COUNT(*) AS c FROM ${t}`)[0]?.c ?? 0);
const tables = [
  "hms_users", "hms_patients", "hms_appointments", "hms_encounters", "hms_prescriptions", "hms_rx_items",
  "hms_lab_orders", "hms_imaging_orders", "hms_beds", "hms_admissions", "hms_medicines", "hms_surgeries",
  "hms_invoices", "hms_alerts", "hms_audit", "hms_settings",
];
let ok = true;
for (const t of tables) {
  const n = count(t);
  console.log(`${n > 0 ? "OK  " : "MISS"}${t.padEnd(22)} ${n}`);
  if (n === 0 && !["hms_alerts"].includes(t)) ok = false;
}
const lic = licenseState();
console.log(`licence: ${lic.status} · ${lic.plan} · ${lic.daysLeft} day(s) left`);
console.log(ok ? "Aybek HMS looks healthy." : "Some tables are empty — run npm run seed.");
process.exit(ok ? 0 : 1);
