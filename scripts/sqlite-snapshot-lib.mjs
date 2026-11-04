// Next.js SQLite snapshots only. Never initializes schemas, reseeds or replaces files.
import { DatabaseSync } from "node:sqlite";
import fs from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";

export function inspectDatabase(file) {
  if (!fs.statSync(file).isFile()) throw new Error("Database source must be an existing file");
  const db = new DatabaseSync(file, { readOnly: true });
  try {
    db.exec("PRAGMA busy_timeout=5000");
    const checks = db.prepare("PRAGMA integrity_check").all();
    if (checks.length !== 1 || Object.values(checks[0])[0] !== "ok") throw new Error("SQLite integrity check failed");
    const names = new Set(db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all().map((r) => r.name));
    for (const table of ["hms_users", "hms_patients", "hms_prescriptions", "hms_rx_items", "hms_settings"]) {
      if (!names.has(table)) throw new Error("Not a recognized Next.js hospital database");
    }
    return { tables: names.size };
  } finally { db.close(); }
}

export function createSnapshot(source, destination, { restore = false } = {}) {
  source = path.resolve(source); destination = path.resolve(destination);
  if (["", "-wal", "-shm", "-journal"].some((suffix) => fs.existsSync(destination + suffix))) throw new Error("Destination or SQLite sidecar exists; choose a NEW path");
  inspectDatabase(source);
  fs.mkdirSync(path.dirname(destination), { recursive: true });
  const temp = path.join(path.dirname(destination), `.aybek-snapshot-${randomUUID()}.db`);
  try {
    const db = new DatabaseSync(source, { readOnly: true });
    try {
      db.exec("PRAGMA busy_timeout=5000");
      // SQLite itself creates a consistent snapshot, including committed WAL data.
      db.prepare("VACUUM INTO ?").run(temp);
    } finally { db.close(); }
    if (restore) {
      const output = new DatabaseSync(temp);
      try {
        output.exec("BEGIN IMMEDIATE");
        const names = new Set(output.prepare("SELECT name FROM sqlite_master WHERE type='table'").all().map((r) => r.name));
        for (const table of ["sessions", "hms_sessions"]) if (names.has(table)) output.exec(`DELETE FROM ${table}`);
        output.exec("COMMIT");
      } finally { output.close(); }
    }
    inspectDatabase(temp);
    fs.chmodSync(temp, 0o600);
    fs.copyFileSync(temp, destination, fs.constants.COPYFILE_EXCL);
    fs.chmodSync(destination, 0o600);
    inspectDatabase(destination);
  } finally {
    // Only this call's uniquely named scratch file may be removed; never source/target sidecars.
    for (const suffix of ["", "-wal", "-shm", "-journal"]) fs.rmSync(temp + suffix, { force: true });
  }
}
