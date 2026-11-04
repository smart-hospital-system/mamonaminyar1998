import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { buildForDisease, validate } from "../../lib/hms/regimens/engine";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { createHash } from "node:crypto";
import { DISEASES } from "../../lib/hms/diseases";
import { RECIPES } from "../../lib/hms/regimens/recipes";
test("teaching generator never adds drugs or forces liquid/syrup to meet a universal template", () => {
  const original = RECIPES["RES-001"];
  try {
    RECIPES["RES-001"] = ["paracetamol"];
    const samples = buildForDisease("RES-001");
    assert.equal(samples.length, 6);
    for (const sample of samples) {
      assert.equal(sample.items.length, 1);
      assert.equal(sample.items[0].drugId, "paracetamol");
    }
    assert.deepEqual(validate(samples), []); // structural only, not clinical approval
  } finally { RECIPES["RES-001"] = original; }
});
test("bulk unvalidated regimen export is disabled by default before any file writes", () => {
  const env: NodeJS.ProcessEnv = { ...process.env }; delete env.AYBEK_ENABLE_TEACHING_REGIMENS;
  const result = spawnSync(process.execPath, ["--import", "tsx", "scripts/build-regimens.ts"], { env, encoding: "utf8" });
  assert.equal(result.status, 1);
  assert.match(result.stderr, /Refused/);
});


test("integrated paediatric and reproductive chapters retain intentional no-medication, age and sex restrictions", () => {
  const selected = DISEASES.filter((d) => d.id.startsWith("PED-") || d.id.startsWith("OBG-"));
  assert.equal(selected.length, 120);
  for (const disease of selected) {
    const examples = buildForDisease(disease.id);
    assert.ok(examples.length);
    for (const example of examples) {
      assert.equal(example.items.length, 0);
      if (disease.id.startsWith("PED-")) {
        assert.equal(example.band, "child"); assert.ok(example.age >= 2 && example.age <= 17);
      } else { assert.equal(example.sex, "female"); }
    }
    assert.deepEqual(validate(examples), []);
  }
});
test("catalogue check is read-only, requires no teaching flag and never opens a configured hospital", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "aybek-catalogue-check-"));
  try {
    const source = path.join(dir, "sentinel.db"); fs.writeFileSync(source, "synthetic sentinel, not SQLite");
    const files = [source, "data/disease-regimens.json", "data/disease-regimens.csv", "data/disease-regimens.md"];
    const digest = (file: string) => createHash("sha256").update(fs.readFileSync(file)).digest("hex");
    const before = files.map(digest);
    const env: NodeJS.ProcessEnv = { ...process.env, SLOTLY_DB_PATH: source }; delete env.AYBEK_ENABLE_TEACHING_REGIMENS;
    const result = spawnSync(process.execPath, ["--import", "tsx", "scripts/build-regimens.ts", "--check"], { env, encoding: "utf8" });
    assert.equal(result.status, 0, result.stderr); assert.match(result.stdout, /Read-only structural validation complete/);
    assert.deepEqual(files.map(digest), before);
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});
