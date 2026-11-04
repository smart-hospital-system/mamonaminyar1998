import test, { after } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { hmsReady, hRun, hAll, hGet, hUid, hNow } from "../../lib/hms/db";
import { scan, syncAlerts, autoHeal, escalateExpired } from "../../lib/hms/alerts";
const dir = fs.mkdtempSync(path.join(os.tmpdir(), "aybek-monitor-test-"));
process.env.SLOTLY_DB_PATH = path.join(dir, "synthetic.sqlite3");
const db = hmsReady();
assert.ok(fs.existsSync(process.env.SLOTLY_DB_PATH!), "regressions must use their isolated temporary database, never the default installation");
after(() => { db.close(); fs.rmSync(dir, { recursive: true, force: true }); });
const patient = hGet<{ id: string }>("SELECT id FROM hms_patients LIMIT 1")!;
const snapshot = () => JSON.stringify(["hms_patients", "hms_prescriptions", "hms_admissions", "hms_beds", "hms_medicines"].map((t) => hAll(`SELECT * FROM ${t} ORDER BY id`)));

test("scan findings never offer automatic clinical, identity, bed or stock repairs", () => {
  const rx = hUid("orphan");
  hRun("INSERT INTO hms_prescriptions (id,rx_no,patient_id,doctor_id,status,created_at) VALUES (?,?,?,'synthetic','signed',?)", [rx, rx, "missing-synthetic-patient", hNow()]);
  hRun("INSERT INTO hms_admissions (id,patient_id,admitted_at,created_at) VALUES (?,?,?,?)", [hUid("admission"), patient.id, hNow(), hNow()]);
  hRun("INSERT INTO hms_medicines (id,name,stock,active,expiry) VALUES (?,'Synthetic expired stock',20,1,'2000-01-01')", [hUid("stock")]);
  const before = snapshot();
  const findings = scan();
  for (const code of ["orphan-prescription", "expired-stock", "admission-without-bed"]) {
    const finding = findings.find((f) => f.code === code)!;
    assert.ok(finding); assert.equal(finding.autoFixable, false); assert.equal(finding.fix, undefined);
  }
  assert.equal(snapshot(), before);
});

test("48-hour escalation and direct repair calls never change clinical records", () => {
  const rows = syncAlerts(scan());
  for (const row of rows) hRun("UPDATE hms_alerts SET due_at='2000-01-01T00:00:00Z' WHERE id=?", [row.id]);
  const before = snapshot();
  const report = escalateExpired();
  assert.ok(report.length > 0);
  assert.ok(report.every((r) => r.healed === false));
  for (const row of rows.filter((r) => ["orphan-prescription", "expired-stock", "admission-without-bed"].includes(r.code))) {
    assert.equal(autoHeal(row.id, "synthetic-admin").ok, false);
  }
  assert.equal(snapshot(), before);
  syncAlerts(scan());
  const expired = hGet<{ severity: string; auto_fixable: number }>("SELECT severity,auto_fixable FROM hms_alerts WHERE code='expired-stock' AND status='open'")!;
  assert.equal(expired.severity, "critical"); assert.equal(expired.auto_fixable, 0);
});

test("monitor does not auto-resolve independently raised clinical alerts", () => {
  const id = hUid("manual-alert");
  hRun("INSERT INTO hms_alerts (id,code,severity,category,title,status,first_seen,last_seen) VALUES (?,?,'critical','Clinical','Synthetic critical result','open',?,?)", [id, "critical-result-synthetic-123", hNow(), hNow()]);
  syncAlerts(scan());
  assert.equal(hGet<{ status: string }>("SELECT status FROM hms_alerts WHERE id=?", [id])!.status, "open");
});
