import test, { after } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { hmsDb, hmsReady } from "../../lib/hms/db";
const dir = fs.mkdtempSync(path.join(os.tmpdir(), "aybek-bootstrap-"));
process.env.SLOTLY_DB_PATH = path.join(dir, "isolated.db");
const db = hmsDb();
assert.ok(fs.existsSync(process.env.SLOTLY_DB_PATH), "DB path must be resolved after module imports, at first connection");
after(() => { db.close(); fs.rmSync(dir, { recursive: true, force: true }); });

test("adding the HMS schema never disables SQLite foreign keys for the shared booking app", () => {
  assert.equal(db.prepare("PRAGMA foreign_keys").get()!.foreign_keys, 1);
});
test("existing hospital records without staff cannot trigger implicit demo account/patient seeding", () => {
  db.prepare("INSERT INTO hms_patients (id,mrn,name,gender,created_at) VALUES ('synthetic','SYNTHETIC','Training only','Unknown','2026-11-02')").run();
  const before = JSON.stringify(db.prepare("SELECT * FROM hms_patients").all());
  assert.throws(() => hmsReady(), /Automatic demo seeding refused/);
  assert.equal(db.prepare("SELECT COUNT(*) AS n FROM hms_users").get()!.n, 0);
  assert.equal(JSON.stringify(db.prepare("SELECT * FROM hms_patients").all()), before);
});
