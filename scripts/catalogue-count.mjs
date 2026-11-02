// Prints how many catalogue prescriptions are in the register, then exits 0.
// Used by scripts/deploy.mjs to decide whether the one-time seeder is needed.
// Written as plain node + node:sqlite so it runs before any TypeScript build.
import { DatabaseSync } from "node:sqlite";
import fs from "node:fs";
import path from "node:path";

const file = process.env.SLOTLY_DB_PATH || path.join(process.cwd(), "data", "slotly.db");
if (!fs.existsSync(file)) {
  console.log(0);
  process.exit(0);
}
try {
  const db = new DatabaseSync(file);
  const table = db
    .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='hms_prescriptions'")
    .get();
  if (!table) {
    console.log(0);
    db.close();
    process.exit(0);
  }
  const row = db.prepare("SELECT COUNT(*) AS c FROM hms_prescriptions WHERE rx_no LIKE 'RX-C-%'").get();
  console.log(Number(row?.c ?? 0));
  db.close();
} catch {
  console.log(0);
}
