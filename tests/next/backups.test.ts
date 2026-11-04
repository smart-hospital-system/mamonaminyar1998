import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import { createSnapshot } from "../../scripts/sqlite-snapshot-lib.mjs";

test("SQLite snapshot captures committed WAL writes; restore invalidates sessions only in NEW copy", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "aybek-snapshot-test-"));
  const source = path.join(dir, "source.db"), backup = path.join(dir, "backup.db"), restored = path.join(dir, "restored.db");
  const db = new DatabaseSync(source);
  try {
    db.exec("PRAGMA journal_mode=WAL; PRAGMA wal_autocheckpoint=0");
    for (const name of ["hms_users", "hms_patients", "hms_prescriptions", "hms_rx_items", "hms_settings", "sessions", "hms_sessions"]) db.exec(`CREATE TABLE ${name} (value TEXT); INSERT INTO ${name} VALUES ('synthetic only')`);
    assert.ok(fs.statSync(source + "-wal").size > 0);
    createSnapshot(source, backup);
    createSnapshot(backup, restored, { restore: true });
    const copy = new DatabaseSync(restored, { readOnly: true });
    try {
      assert.equal(copy.prepare("SELECT count(*) AS n FROM hms_patients").get()!.n, 1);
      for (const name of ["sessions", "hms_sessions"]) {
        assert.equal(copy.prepare(`SELECT count(*) AS n FROM ${name}`).get()!.n, 0);
        assert.equal(db.prepare(`SELECT count(*) AS n FROM ${name}`).get()!.n, 1);
      }
    } finally { copy.close(); }
    assert.throws(() => createSnapshot(source, backup), /NEW path/);
    assert.throws(() => createSnapshot(backup, source, { restore: true }), /NEW path/);
    const sidecarTarget = path.join(dir, "sidecar.db"); fs.writeFileSync(sidecarTarget + "-wal", "synthetic sentinel");
    assert.throws(() => createSnapshot(source, sidecarTarget), /NEW path/);
    assert.equal(fs.readFileSync(sidecarTarget + "-wal", "utf8"), "synthetic sentinel");
  } finally { db.close(); fs.rmSync(dir, { recursive: true, force: true }); }
});
test("invalid or unrelated SQLite sources cannot initialize or replace a hospital", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "aybek-bad-snapshot-"));
  try {
    const invalid = path.join(dir, "invalid.db"), unrelated = path.join(dir, "unrelated.db"), output = path.join(dir, "output.db");
    fs.writeFileSync(invalid, "synthetic not SQLite");
    const db = new DatabaseSync(unrelated); db.exec("CREATE TABLE unrelated (id INTEGER)"); db.close();
    for (const source of [invalid, unrelated, path.join(dir, "missing.db")]) {
      assert.throws(() => createSnapshot(source, output)); assert.equal(fs.existsSync(output), false);
    }
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});
test("legacy Windows tools cannot silently copy live databases/secrets or perform in-place restore", () => {
  const read = (file: string) => fs.readFileSync(`aybek-hms/scripts/install/${file}`, "utf8");
  assert.doesNotMatch(read("07-backup.ps1"), /Copy-Item|Remove-Item/);
  assert.doesNotMatch(read("08-restore.ps1"), /Copy-Item|settings-import|verify-hms/);
  assert.match(read("05-build.ps1"), /whole-folder portable export is disabled/);
  assert.doesNotMatch(read("05-build.ps1"), /robocopy/);
  assert.match(read("_common.ps1"), /while \(\$candidate\)/);
});
