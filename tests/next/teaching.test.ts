import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { buildForDisease, validate } from "../../lib/hms/regimens/engine";
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
