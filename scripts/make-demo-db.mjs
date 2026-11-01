// Build data/demo-hospital.db: a clean, single-file copy of the demo hospital
// that ships on the disc. START-HERE.bat copies it to slotly.db on a fresh
// install, so a new computer opens with the full sample hospital immediately.
//
// Run it with the hospital stopped. The checkpoint folds any pending -wal data
// into the main file first, so nothing in flight is lost.
import { DatabaseSync } from "node:sqlite";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const source = path.join(root, "data", "slotly.db");
const target = path.join(root, "data", "demo-hospital.db");

if (!fs.existsSync(source)) {
  console.error("data/slotly.db not found — run the app once, then npm run hms:demo-db.");
  process.exit(1);
}

const db = new DatabaseSync(source);
db.exec("PRAGMA wal_checkpoint(TRUNCATE);");
const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name LIKE 'hms_%'").all();
if (tables.length === 0) {
  db.close();
  console.error("No hms_* tables — open the hospital once so it can seed, then run this again.");
  process.exit(1);
}
if (fs.existsSync(target)) fs.rmSync(target);
db.exec(`VACUUM INTO '${target.replace(/\\/g, "/")}';`);
db.close();

const size = (fs.statSync(target).size / 1024 / 1024).toFixed(2);
console.log(`demo-hospital.db written (${tables.length} hospital tables, ${size} MB).`);
