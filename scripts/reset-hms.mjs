/**
 * Reset only the hospital layer, keeping the booking workspace untouched.
 *
 * Use it when you have been experimenting on the demo installation and want the
 * published demo back: every hms_* table is dropped, and the next page load
 * re-seeds the full hospital from `lib/hms/seed.ts` (9 staff accounts, patients,
 * consults, prescriptions, lab and imaging orders, ten beds, stock, invoices).
 *
 * This deletes patient data. On a live installation take a backup first:
 *   npm run backup:data      (or copy data\slotly.db)
 *
 * Usage: npm run hms:reset
 */
import { DatabaseSync } from "node:sqlite";
import path from "node:path";

const file = process.env.SLOTLY_DB_PATH || path.join(process.cwd(), "data", "slotly.db");
const db = new DatabaseSync(file);

const tables = db
  .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name LIKE 'hms_%' AND name NOT LIKE 'sqlite_%'")
  .all();

if (!tables.length) {
  console.log("No hospital tables found — nothing to reset. Start the app once and it will seed itself.");
  process.exit(0);
}

db.exec("PRAGMA foreign_keys = OFF;");
for (const t of tables) db.exec(`DROP TABLE IF EXISTS "${t.name}"`);
db.exec("PRAGMA foreign_keys = ON;");

console.log(`Dropped ${tables.length} hospital table(s) from ${path.basename(file)}.`);
console.log("Open the app (or run `npm run hms:verify`) and the demo hospital is rebuilt automatically.");
