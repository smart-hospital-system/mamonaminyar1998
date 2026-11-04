import test, { after } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { hmsReady, hGet, hRun, hUid } from "../../lib/hms/db";
import type { HmsUser } from "../../lib/hms/auth";
import { updateStock } from "../../lib/hms/stock-actions";
const dir = fs.mkdtempSync(path.join(os.tmpdir(), "aybek-stock-test-"));
process.env.SLOTLY_DB_PATH = path.join(dir, "synthetic.db");
const db = hmsReady();
assert.ok(fs.existsSync(process.env.SLOTLY_DB_PATH!), "regressions must use their isolated temporary database, never the default installation"); after(() => { db.close(); fs.rmSync(dir, { recursive: true, force: true }); });
const pharmacist = hGet<HmsUser>("SELECT * FROM hms_users WHERE role='pharmacist' LIMIT 1")!;
const doctor = hGet<HmsUser>("SELECT * FROM hms_users WHERE role='doctor' LIMIT 1")!;
const id = hUid("synthetic-stock");
hRun("INSERT INTO hms_medicines (id,name,stock,active) VALUES (?,'Synthetic test item',10,1)", [id]);
const stock = () => hGet<{ stock: number }>("SELECT stock FROM hms_medicines WHERE id=?", [id])!.stock;
const status = (code: number) => (e: any) => e.status === code;
test("stock validation rejects coerced, negative, conflicting and invalid-date updates", () => {
  for (const p of [{ stock: -1 }, { price: -2 }, { stock: NaN }, { add: "3" }, { add: 3, stock: 4 }, { expiry: "2099-02-31" }]) {
    assert.throws(() => updateStock(id, p as any, pharmacist), status(422)); assert.equal(stock(), 10);
  }
});
test("negative adjustments never silently clamp stock to zero", () => {
  assert.throws(() => updateStock(id, { add: -11 }, pharmacist), status(409)); assert.equal(stock(), 10);
});
test("only pharmacy roles can adjust stock, with finite arithmetic", () => {
  assert.throws(() => updateStock(id, { add: 2 }, doctor), status(403));
  updateStock(id, { add: 2 }, pharmacist); assert.equal(stock(), 12);
});
test("audit failure rolls back every stock and metadata update", () => {
  db.exec("CREATE TEMP TRIGGER reject_stock_audit BEFORE INSERT ON hms_audit BEGIN SELECT RAISE(ABORT, 'synthetic injected failure'); END");
  try { assert.throws(() => updateStock(id, { add: 3, batch: "synthetic-change" }, pharmacist)); }
  finally { db.exec("DROP TRIGGER reject_stock_audit"); }
  assert.equal(stock(), 12);
  assert.equal(hGet<{ batch: string | null }>("SELECT batch FROM hms_medicines WHERE id=?", [id])!.batch, null);
});
