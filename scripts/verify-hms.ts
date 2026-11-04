/** Read-only structural check. Never seed, repair, reset or require demo records. */
import * as nextEnv from "@next/env";
import { DatabaseSync } from "node:sqlite";
import { deploymentConfig } from "./deploy-config.mjs";
import { inspectDatabase } from "./sqlite-snapshot-lib.mjs";
nextEnv.loadEnvConfig(process.cwd());
try {
  const { dbPath } = deploymentConfig(process.cwd(), process.env);
  inspectDatabase(dbPath); // refuses missing/unrelated/invalid files without creating them
  const db = new DatabaseSync(dbPath, { readOnly: true });
  try {
    const tables = [
      "hms_users", "hms_sessions", "hms_settings", "hms_patients", "hms_appointments", "hms_encounters",
      "hms_prescriptions", "hms_rx_items", "hms_dispenses", "hms_lab_orders", "hms_imaging_orders",
      "hms_beds", "hms_admissions", "hms_medicines", "hms_surgeries", "hms_invoices", "hms_alerts", "hms_audit",
    ];
    const actual = new Set(db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all().map((r) => r.name));
    let ok = true;
    for (const table of tables) {
      if (!actual.has(table)) { console.log(`MISS ${table}`); ok = false; continue; }
      const count = db.prepare(`SELECT COUNT(*) AS c FROM ${table}`).get()!.c;
      console.log(`OK   ${table.padEnd(22)} ${count} (empty operational tables are allowed)`);
    }
    if (db.prepare("PRAGMA foreign_key_check").all().length) { console.log("Foreign-key violations require manual review; no repair attempted."); ok = false; }
    console.log(ok ? "SQLite structural checks passed. Not clinical validation, licence verification or a restore drill." : "Structural check failed. Preserve records and investigate manually; do not reseed.");
    if (!ok) process.exitCode = 1;
  } finally { db.close(); }
} catch (error) {
  console.error(`Verification refused/failed: ${error instanceof Error ? error.message : "unknown error"}. No initialization or repair was attempted.`);
  process.exitCode = 1;
}
