// Generate ONLY synthetic seed data in a new isolated database. Never copy a live hospital.
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const index = process.argv.indexOf("--output");
if (index < 0 || !process.argv[index + 1]) {
  console.error("Usage: npm run hms:demo-db -- --output NEW-synthetic-demo.db (existing files are never replaced)");
  process.exit(1);
}
const target = path.resolve(process.argv[index + 1]);
if ([target, `${target}-wal`, `${target}-shm`, `${target}-journal`].some((file) => fs.existsSync(file))) {
  console.error("Refused: output or SQLite sidecars already exist. Choose a new path.");
  process.exit(1);
}
const temp = fs.mkdtempSync(path.join(os.tmpdir(), "aybek-synthetic-"));
try {
  const isolated = path.join(temp, "synthetic.db");
  const child = spawnSync(process.execPath, ["node_modules/tsx/dist/cli.mjs", "-e",
    'import {hmsReady} from "./lib/hms/db"; const db=hmsReady(); db.exec("PRAGMA wal_checkpoint(TRUNCATE)"); db.close();'],
    { cwd: process.cwd(), env: { ...process.env, SLOTLY_DB_PATH: isolated }, stdio: "inherit" });
  if (child.status !== 0 || !fs.existsSync(isolated)) throw new Error("Synthetic seed generation failed.");
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.copyFileSync(isolated, target, fs.constants.COPYFILE_EXCL);
  fs.chmodSync(target, 0o600);
  console.log("NEW synthetic demonstration database created. No existing hospital database was read or modified.");
} catch {
  console.error("Demo generation failed. Existing files were not overwritten; inspect any newly created output before retrying.");
  process.exitCode = 1;
} finally { fs.rmSync(temp, { recursive: true, force: true }); }
