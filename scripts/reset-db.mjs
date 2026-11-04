
if (process.env.AYBEK_ENABLE_DEMO_ACTIONS !== "1" || !process.argv.includes("--confirm-destroy")) {
  console.error("Refused: destructive demo operation requires AYBEK_ENABLE_DEMO_ACTIONS=1 and --confirm-destroy. Stop the app and verify a backup first.");
  process.exit(1);
}
import fs from "node:fs";
import path from "node:path";

const file = path.resolve(process.env.SLOTLY_DB_PATH || path.join(process.cwd(), "data", "slotly.db"));
for (const suffix of ["", "-wal", "-shm", "-journal"]) {
  const p = file + suffix;
  if (fs.existsSync(p)) {
    fs.rmSync(p);
    console.log("removed", path.basename(p));
  }
}
console.log("Database files cleared. Run `npm run seed` to rebuild the demo hospital.");
