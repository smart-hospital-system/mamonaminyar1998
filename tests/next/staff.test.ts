import test, { after } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import bcrypt from "bcryptjs";
import { hmsReady, hGet, hRun, hNow, hUid } from "../../lib/hms/db";
import type { HmsUser } from "../../lib/hms/auth";
import { updateStaff } from "../../lib/hms/staff-actions";
const dir = fs.mkdtempSync(path.join(os.tmpdir(), "aybek-staff-test-"));
process.env.SLOTLY_DB_PATH = path.join(dir, "synthetic.sqlite3");
const db = hmsReady();
assert.ok(fs.existsSync(process.env.SLOTLY_DB_PATH!), "regressions must use their isolated temporary database, never the default installation");
after(() => { db.close(); fs.rmSync(dir, { recursive: true, force: true }); });
const doctor = hGet<HmsUser>("SELECT * FROM hms_users WHERE role='doctor' LIMIT 1")!;
const admin = hGet<HmsUser>("SELECT * FROM hms_users WHERE role='admin' LIMIT 1")!;
const hash = (id: string) => hGet<{ password_hash: string }>("SELECT password_hash FROM hms_users WHERE id=?", [id])!.password_hash;
const status = (code: number) => (e: any) => e.status === code;
const password = "example-Synthetic-Review-57!";

test("forbidden mixed password + role change cannot partially change a password", () => {
  const before = hash(doctor.id);
  assert.throws(() => updateStaff(doctor.id, { password, role: "admin" }, doctor), status(403));
  assert.equal(hash(doctor.id), before);
});

test("wrong field types and weak passwords are rejected without any mutation", () => {
  const before = hash(doctor.id);
  assert.throws(() => updateStaff(doctor.id, { password: 4 as any }, doctor), status(422));
  assert.throws(() => updateStaff(doctor.id, { password, active: "false" as any }, admin), status(422));
  assert.throws(() => updateStaff(doctor.id, { password: "short" }, doctor), status(422));
  assert.equal(hash(doctor.id), before);
});

test("self password change revokes all existing sessions", () => {
  hRun("INSERT INTO hms_sessions (token,user_id,expires_at,created_at) VALUES (?,?,?,?)", [hUid("session"), doctor.id, "2099-01-01T00:00:00Z", hNow()]);
  updateStaff(doctor.id, { password }, doctor);
  assert.equal(bcrypt.compareSync(password, hash(doctor.id)), true);
  assert.equal(hGet<{ c: number }>("SELECT COUNT(*) AS c FROM hms_sessions WHERE user_id=?", [doctor.id])!.c, 0);
});

test("self administrator removal is refused", () => {
  assert.throws(() => updateStaff(admin.id, { role: "nurse" }, admin), status(409));
  assert.throws(() => updateStaff(admin.id, { active: false }, admin), status(409));
});

test("missing users return 404 and other profiles cannot be edited by physicians", () => {
  assert.throws(() => updateStaff("missing-synthetic", { name: "Synthetic" }, admin), status(404));
  assert.throws(() => updateStaff(admin.id, { name: "Synthetic" }, doctor), status(403));
});

test("injected audit failure rolls back password and profile atomically", () => {
  const before = hash(doctor.id);
  db.exec("CREATE TEMP TRIGGER reject_staff_audit BEFORE INSERT ON hms_audit BEGIN SELECT RAISE(ABORT, 'synthetic injected failure'); END");
  try { assert.throws(() => updateStaff(doctor.id, { password: password + "new", name: "Changed" }, admin)); }
  finally { db.exec("DROP TRIGGER reject_staff_audit"); }
  assert.equal(hash(doctor.id), before);
  assert.equal(hGet<{ name: string }>("SELECT name FROM hms_users WHERE id=?", [doctor.id])!.name, doctor.name);
});
