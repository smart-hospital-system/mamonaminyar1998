import test, { after } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { hmsReady, hGet, hAll, hRun, hUid, hNow } from "../../lib/hms/db";
import type { HmsUser } from "../../lib/hms/auth";
import { prescriptionAction } from "../../lib/hms/prescription-actions";

const dir = fs.mkdtempSync(path.join(os.tmpdir(), "aybek-actions-test-"));
process.env.SLOTLY_DB_PATH = path.join(dir, "synthetic.sqlite3");
const db = hmsReady();
assert.ok(fs.existsSync(process.env.SLOTLY_DB_PATH!), "regressions must use their isolated temporary database, never the default installation");
after(() => { db.close(); fs.rmSync(dir, { recursive: true, force: true }); });
const doctor = hGet<HmsUser>("SELECT * FROM hms_users WHERE role='doctor' LIMIT 1")!;
const pharmacist = hGet<HmsUser>("SELECT * FROM hms_users WHERE role='pharmacist' LIMIT 1")!;
const other = { ...doctor, id: "synthetic-other-doctor" };
const patient = hGet<{ id: string }>("SELECT id FROM hms_patients LIMIT 1")!;
const statusError = (status: number) => (e: any) => e.status === status;
function medicine(stock = 10) {
  const id = hUid("testmed"); const name = `Training only ${id}`;
  hRun("INSERT INTO hms_medicines (id,name,stock,active,expiry) VALUES (?,?,?,1,'2099-12-31')", [id, name, stock]);
  return { id, name };
}
function prescription(status = "pending", items = [{ med: medicine(), qty: 2, price: 0 }]) {
  const id = hUid("testrx");
  hRun("INSERT INTO hms_prescriptions (id,rx_no,patient_id,doctor_id,status,template,created_at) VALUES (?,?,?,?,?,1,?)", [id, id, patient.id, doctor.id, status, hNow()]);
  items.forEach((item, index) => hRun("INSERT INTO hms_rx_items (id,prescription_id,drug,qty,unit_price,sort) VALUES (?,?,?,?,?,?)", [hUid("testline"), id, item.med.name, item.qty, item.price, index]));
  return { id, items };
}
function stock(id: string) { return hGet<{ stock: number }>("SELECT stock FROM hms_medicines WHERE id=?", [id])!.stock; }
function state(id: string) { return hGet<{ status: string }>("SELECT status FROM hms_prescriptions WHERE id=?", [id])!.status; }

test("only author or medical director can edit or sign a pending prescription", () => {
  const rx = prescription();
  assert.throws(() => prescriptionAction(rx.id, { action: "sign" }, other), statusError(403));
  prescriptionAction(rx.id, { notes: "Synthetic teaching note" }, doctor);
  prescriptionAction(rx.id, { action: "sign" }, doctor);
  assert.equal(state(rx.id), "signed");
});

test("signed, dispensed and void prescriptions cannot be rewritten or signed again", () => {
  for (const status of ["signed", "dispensed", "void"]) {
    const rx = prescription(status);
    assert.throws(() => prescriptionAction(rx.id, { notes: "rewrite" }, doctor), statusError(409));
    assert.throws(() => prescriptionAction(rx.id, { action: "sign" }, doctor), statusError(409));
    assert.equal(state(rx.id), status);
  }
});

test("signature and pharmacy role are required to dispense", () => {
  const rx = prescription();
  assert.throws(() => prescriptionAction(rx.id, { action: "dispense" }, pharmacist), statusError(409));
  prescriptionAction(rx.id, { action: "sign" }, doctor);
  assert.throws(() => prescriptionAction(rx.id, { action: "dispense" }, doctor), statusError(403));
});

test("duplicate medicine lines aggregate stock requirements and leave all data unchanged on shortage", () => {
  const med = medicine(3);
  const rx = prescription("signed", [{ med, qty: 2, price: 1 }, { med, qty: 2, price: 1 }]);
  assert.throws(() => prescriptionAction(rx.id, { action: "dispense" }, pharmacist), statusError(409));
  assert.equal(stock(med.id), 3); assert.equal(state(rx.id), "signed");
  assert.equal(hAll("SELECT * FROM hms_dispenses WHERE prescription_id=?", [rx.id]).length, 0);
});

test("later stock shortage rolls back earlier medicine deductions", () => {
  const first = medicine(10), second = medicine(1);
  const rx = prescription("signed", [{ med: first, qty: 2, price: 1 }, { med: second, qty: 2, price: 1 }]);
  assert.throws(() => prescriptionAction(rx.id, { action: "dispense" }, pharmacist), statusError(409));
  assert.equal(stock(first.id), 10); assert.equal(stock(second.id), 1);
});

test("a zero unit price is never silently replaced with an invented charge; repeat dispense refused", () => {
  const rx = prescription("signed");
  const response = prescriptionAction(rx.id, { action: "dispense" }, pharmacist);
  assert.ok("total" in response);
  assert.equal(response.total, 0);
  assert.equal(stock(rx.items[0].med.id), 8);
  assert.throws(() => prescriptionAction(rx.id, { action: "dispense" }, pharmacist), statusError(409));
  assert.equal(stock(rx.items[0].med.id), 8);
});

test("injected dispense failure rolls back stock, prescription status, audit and dispense", () => {
  const rx = prescription("signed"); const med = rx.items[0].med;
  db.exec("CREATE TEMP TRIGGER reject_test_dispense BEFORE INSERT ON hms_dispenses BEGIN SELECT RAISE(ABORT, 'synthetic injected failure'); END");
  try { assert.throws(() => prescriptionAction(rx.id, { action: "dispense" }, pharmacist)); }
  finally { db.exec("DROP TRIGGER reject_test_dispense"); }
  assert.equal(stock(med.id), 10); assert.equal(state(rx.id), "signed");
  assert.equal(hAll("SELECT * FROM hms_dispenses WHERE prescription_id=?", [rx.id]).length, 0);
});

test("invalid quantities, missing stock items and unknown actions do not mutate prescriptions", () => {
  const rx = prescription("signed", [{ med: medicine(), qty: -1, price: 0 }]);
  assert.throws(() => prescriptionAction(rx.id, { action: "dispense" }, pharmacist), statusError(409));
  assert.throws(() => prescriptionAction(rx.id, { action: "unknown" }, doctor), statusError(422));
  hRun("UPDATE hms_rx_items SET qty=1,drug='missing synthetic item' WHERE prescription_id=?", [rx.id]);
  assert.throws(() => prescriptionAction(rx.id, { action: "dispense" }, pharmacist), statusError(409));
  assert.equal(state(rx.id), "signed");
});


test("expired, missing and invalid expiry dates block dispensing without destroying stock", () => {
  for (const expiry of ["2000-01-01", null, "invalid", "2099-02-31"]) {
    const rx = prescription("signed"), med = rx.items[0].med;
    hRun("UPDATE hms_medicines SET expiry=? WHERE id=?", [expiry, med.id]);
    assert.throws(() => prescriptionAction(rx.id, { action: "dispense" }, pharmacist), statusError(409));
    assert.equal(stock(med.id), 10); assert.equal(state(rx.id), "signed");
  }
});
