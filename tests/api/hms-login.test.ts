import assert from "node:assert/strict";
import { after, test } from "node:test";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

// Keep route tests isolated from the repository's demo/working database.
const tempDir = mkdtempSync(path.join(tmpdir(), "aybek-hms-api-test-"));
process.env.SLOTLY_DB_PATH = path.join(tempDir, "test.db");
process.env.SLOTLY_SKIP_SEED = "1";

const endpoint = "http://localhost/api/hms/auth/login";
const context = { params: Promise.resolve({ test: "login" }) };

async function post(body: string) {
  const [{ NextRequest }, { POST }] = await Promise.all([
    import("next/server"),
    import("../../app/api/hms/auth/login/route"),
  ]);
  const request = new NextRequest(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body,
  });
  return POST(request, context);
}

after(() => {
  const runtime = globalThis as typeof globalThis & {
    __slotlyDb?: { close: () => void };
  };
  runtime.__slotlyDb?.close();
  delete runtime.__slotlyDb;
  rmSync(tempDir, { recursive: true, force: true });
  delete process.env.SLOTLY_DB_PATH;
  delete process.env.SLOTLY_SKIP_SEED;
});

test("POST /api/hms/auth/login validates real login requests", async (t) => {
  await t.test("rejects a request without credentials", async () => {
    const response = await post("{}");
    assert.equal(response.status, 422);
    assert.deepEqual(await response.json(), {
      error: "Email and password are required.",
    });
  });

  await t.test("returns 400 for malformed JSON", async () => {
    const response = await post("{ not json");
    assert.equal(response.status, 400);
    assert.deepEqual(await response.json(), { error: "Invalid JSON body" });
  });
});
