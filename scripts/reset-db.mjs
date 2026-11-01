import fs from "node:fs";
import path from "node:path";

const dir = path.join(process.cwd(), "data");
for (const f of ["slotly.db", "slotly.db-wal", "slotly.db-shm"]) {
  const p = path.join(dir, f);
  if (fs.existsSync(p)) {
    fs.rmSync(p);
    console.log("removed", f);
  }
}
console.log("Database files cleared. Run `npm run seed` to rebuild the demo hospital.");
