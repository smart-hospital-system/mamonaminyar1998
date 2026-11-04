import assert from "node:assert/strict";
import { after, test } from "node:test";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

// Use a temporary database and a synthetic account; never touch or seed the demo database.
const tempDir = mkdtempSync(path.join(tmpdir(), "aybek-hms-api-test-"));
process.env.SLOTLY_DB_PATH = path.join(tempDir, "test.db");

const endpoint = "http://localhost/api/hms/auth/login";
const context = { params: Promise.resolve({ test: "login" }) };
let fixtureAdded = false;

async function post(body: string) {
  const [{ NextRequest }, { POST }, { hmsDb }] = await Promise.all([
    import("next/server"),
    import("../../app/api/hms/auth/login/route"),
    import("../../lib/hms/db"),
  ]);
  const db = hmsDb();
  if (!fixtureAdded) {
    db.prepare("INSERT INTO hms_users (id, name, email, password_hash, role, created_at) VALUES (?, ?, ?, ?, ?, ?)")
      .run("synthetic-api-test", "Synthetic API Test", "api-test@example.invalid", "not-used", "admin", new Date().toISOString());
    fixtureAdded = true;
  }
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
    assert.deepEqual(await response.json(), { error: "Valid JSON object required." });
  });
});
