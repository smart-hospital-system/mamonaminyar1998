import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";

const digest = (file: string) => createHash("sha256").update(fs.readFileSync(file)).digest("hex");

test("all destructive demo commands refuse before touching files without explicit opt-in", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "aybek-cli-refusal-"));
  try {
    const file = path.join(dir, "sentinel.db");
    fs.writeFileSync(file, "synthetic sentinel, not a database");
    const before = digest(file);
    for (const script of ["scripts/reset-db.mjs", "scripts/reset-hms.mjs", "scripts/seed.ts", "scripts/seed-catalogue.ts"]) {
      const env: NodeJS.ProcessEnv = { ...process.env, SLOTLY_DB_PATH: file }; delete env.AYBEK_ENABLE_DEMO_ACTIONS;
      const args = script.endsWith(".ts") ? ["--import", "tsx", script] : [script];
      const result = spawnSync(process.execPath, args, { env, encoding: "utf8" });
      assert.equal(result.status, 1, result.stderr);
      assert.match(result.stderr, /Refused/);
      assert.equal(digest(file), before);
    }
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});

test("demo generation refuses existing destinations and never copies the configured live DB", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "aybek-synthetic-export-test-"));
  try {
    const source = path.join(dir, "live-sentinel.db"), target = path.join(dir, "demo.db");
    fs.writeFileSync(source, "synthetic sentinel — must never be read as SQLite or changed");
    const before = digest(source);
    const env = { ...process.env, SLOTLY_DB_PATH: source };
    const result = spawnSync(process.execPath, ["scripts/make-demo-db.mjs", "--output", target], { env, encoding: "utf8" });
    assert.equal(result.status, 0, result.stderr);
    assert.equal(digest(source), before);
    assert.ok(fs.readFileSync(target).subarray(0, 16).toString().startsWith("SQLite format 3"));
    const targetBefore = digest(target);
    const repeat = spawnSync(process.execPath, ["scripts/make-demo-db.mjs", "--output", target], { env, encoding: "utf8" });
    assert.equal(repeat.status, 1);
    assert.equal(digest(target), targetBefore);
    assert.equal(digest(source), before);
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});


test("deployment configuration requires SQLite-capable Node, honors custom DB and ignores system HOSTNAME", async () => {
  const { deploymentConfig } = await import("../../scripts/deploy-config.mjs");
  assert.throws(() => deploymentConfig("/hospital", {}, "20.19.0"));
  assert.throws(() => deploymentConfig("/hospital", {}, "22.12.0"));
  assert.throws(() => deploymentConfig("/hospital", { SLOTLY_DB_PATH: "" }, "22.13.0"));
  assert.throws(() => deploymentConfig("/hospital", { PORT: "-1" }, "22.13.0"));
  const config = deploymentConfig("/hospital", { SLOTLY_DB_PATH: "private/custom.db", HOSTNAME: "container-id" }, "22.13.0");
  assert.equal(config.host, "0.0.0.0");
  assert.equal(config.dbPath, path.resolve("/hospital/private/custom.db"));
});

test("deployment detects stale application builds but ignores database writes", async () => {
  const { needsBuild } = await import("../../scripts/deploy-config.mjs");
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "aybek-build-test-"));
  try {
    assert.equal(needsBuild(root), true);
    fs.mkdirSync(path.join(root, ".next")); fs.mkdirSync(path.join(root, "app")); fs.mkdirSync(path.join(root, "data"));
    const marker = path.join(root, ".next/BUILD_ID"), source = path.join(root, "app/page.tsx");
    fs.writeFileSync(source, "synthetic source"); fs.writeFileSync(marker, "synthetic build");
    const earlier = new Date("2025-01-01"), later = new Date("2025-01-02");
    fs.utimesSync(source, earlier, earlier); fs.utimesSync(path.dirname(source), earlier, earlier); fs.utimesSync(marker, later, later);
    fs.writeFileSync(path.join(root, "data/runtime.db"), "synthetic runtime write");
    assert.equal(needsBuild(root), false);
    fs.utimesSync(source, new Date("2025-01-03"), new Date("2025-01-03"));
    assert.equal(needsBuild(root), true);
  } finally { fs.rmSync(root, { recursive: true, force: true }); }
});


test("real deployment entrypoint loads its CommonJS environment module and rejects invalid port before DB access", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "aybek-deploy-entry-"));
  try {
    const file = path.join(dir, "sentinel.db"); fs.writeFileSync(file, "synthetic untouched sentinel");
    const before = digest(file);
    const result = spawnSync(process.execPath, ["scripts/deploy.mjs"], { env: { ...process.env, PORT: "0", SLOTLY_DB_PATH: file }, encoding: "utf8" });
    assert.equal(result.status, 1);
    assert.match(result.stderr, /PORT must be between/);
    assert.doesNotMatch(result.stderr, /SyntaxError/);
    assert.equal(digest(file), before);
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});


test("Windows first-install helper preserves an existing database byte-for-byte", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "aybek-first-install-"));
  try {
    const file = path.join(dir, "existing.db"); fs.writeFileSync(file, "synthetic existing sentinel");
    const before = digest(file);
    const result = spawnSync(process.execPath, ["scripts/init-next-demo.mjs"], { env: { ...process.env, SLOTLY_DB_PATH: file }, encoding: "utf8" });
    assert.equal(result.status, 0, result.stderr); assert.equal(digest(file), before);
    assert.match(result.stdout, /Existing database preserved/);
    const wizard = fs.readFileSync("aybek-hms/scripts/install/03-seed.ps1", "utf8");
    assert.doesNotMatch(wizard, /scripts\/reset-db|npm run seed|Copy-Item/);
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});


test("deployment rebuilds after source deletion or production environment changes", async () => {
  const { needsBuild } = await import("../../scripts/deploy-config.mjs");
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "aybek-build-deletion-"));
  try {
    fs.mkdirSync(path.join(root, ".next")); fs.mkdirSync(path.join(root, "app"));
    const marker = path.join(root, ".next/BUILD_ID"), source = path.join(root, "app/page.tsx");
    fs.writeFileSync(source, "synthetic source"); fs.writeFileSync(marker, "synthetic marker");
    const earlier = new Date("2025-01-01"), later = new Date("2025-01-02");
    fs.utimesSync(source, earlier, earlier); fs.utimesSync(path.dirname(source), earlier, earlier); fs.utimesSync(marker, later, later);
    assert.equal(needsBuild(root), false);
    fs.unlinkSync(source); assert.equal(needsBuild(root), true);
    fs.utimesSync(path.dirname(source), earlier, earlier); assert.equal(needsBuild(root), false);
    fs.writeFileSync(path.join(root, ".env.production.local"), "SYNTHETIC_ONLY=1");
    assert.equal(needsBuild(root), true);
  } finally { fs.rmSync(root, { recursive: true, force: true }); }
});


test("read-only hospital verifier refuses a missing database without initializing files", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "aybek-verify-missing-"));
  try {
    const file = path.join(dir, "missing.db");
    const result = spawnSync(process.execPath, ["--import", "tsx", "scripts/verify-hms.ts"], { env: { ...process.env, SLOTLY_DB_PATH: file }, encoding: "utf8" });
    assert.equal(result.status, 1); assert.equal(fs.existsSync(file), false);
    assert.match(result.stderr, /No initialization or repair/);
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});


test("empty operational hospital tables are valid and verification is byte-preserving", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "aybek-verify-empty-"));
  try {
    const file = path.join(dir, "empty.db");
    const setup = spawnSync(process.execPath, ["--input-type=module", "-e", `import { DatabaseSync } from 'node:sqlite'; const db = new DatabaseSync(process.env.SLOTLY_DB_PATH); for (const table of ['hms_users','hms_sessions','hms_settings','hms_patients','hms_appointments','hms_encounters','hms_prescriptions','hms_rx_items','hms_dispenses','hms_lab_orders','hms_imaging_orders','hms_beds','hms_admissions','hms_medicines','hms_surgeries','hms_invoices','hms_alerts','hms_audit']) db.exec('CREATE TABLE '+table+' (value TEXT)'); db.close();`], { env: { ...process.env, SLOTLY_DB_PATH: file }, encoding: "utf8" });
    assert.equal(setup.status, 0, setup.stderr);
    const before = digest(file);
    const result = spawnSync(process.execPath, ["--import", "tsx", "scripts/verify-hms.ts"], { env: { ...process.env, SLOTLY_DB_PATH: file }, encoding: "utf8" });
    assert.equal(result.status, 0, result.stderr); assert.equal(digest(file), before);
    assert.match(result.stdout, /SQLite structural checks passed/);
    assert.doesNotMatch(result.stdout, /run npm run seed/);
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});
