import test from "node:test";
import assert from "node:assert/strict";
import { isSameOriginMutation, demoActionsEnabled, safeReturnPath } from "../../lib/request-security";
import { route, body } from "../../lib/api";
import { POST as demoLogin } from "../../app/api/auth/demo/route";
import { POST as workspaceLogin } from "../../app/api/auth/login/route";
import { POST as resetWorkspace } from "../../app/api/demo/reset/route";
import { POST as resetHospital } from "../../app/api/hms/backup/route";
import { validatePrescriptionInput } from "../../lib/hms/prescription-validation";
import { recordFailure, checkThrottle, resetThrottle, throttleSnapshot, throttleKey, strongCode } from "../../lib/hms/security";

const ctx = { params: Promise.resolve({}) };
const request = (payload: unknown, headers: Record<string, string> = {}) => new Request("https://hospital.example/api/test", {
  method: "POST", headers: { "content-type": "application/json", ...headers }, body: JSON.stringify(payload),
});

test("mutation policy rejects cross-origin, null-origin and unidentified cookie requests", () => {
  assert.equal(isSameOriginMutation(request({}, { origin: "https://hospital.example" })), true);
  for (const headers of [{ origin: "https://evil.example" }, { origin: "null" }, { cookie: "session=example" }, { origin: "https://hospital.example", "sec-fetch-site": "cross-site" }] as Record<string, string>[]) {
    assert.equal(isSameOriginMutation(request({}, headers)), false);
  }
  assert.equal(isSameOriginMutation(new Request("https://hospital.example/api/test")), true);
});

test("TLS termination accepts exact public host, never client-forwarded host", () => {
  const req = new Request("http://internal/api/test", { method: "POST", headers: { host: "preview.e2b.app", origin: "https://preview.e2b.app" } });
  assert.equal(isSameOriginMutation(req), true);
  assert.equal(isSameOriginMutation(request({}, { origin: "https://evil.example", "x-forwarded-host": "evil.example" })), false);
});

test("return paths cannot redirect outside the application", () => {
  for (const value of ["https://evil.example", "//evil.example", "/\\evil.example", "/\nevil", null]) assert.equal(safeReturnPath(value), "/dashboard");
  assert.equal(safeReturnPath("/dashboard?tab=calendar"), "/dashboard?tab=calendar");
});

test("passwordless and destructive demo APIs are disabled before any database access", async () => {
  delete process.env.AYBEK_ENABLE_DEMO_ACTIONS;
  assert.equal(demoActionsEnabled(), false);
  for (const handler of [demoLogin, resetWorkspace, resetHospital]) assert.equal((await handler(request({ role: "owner", action: "reset-demo", confirm: "RESET" }), ctx)).status, 403);
  process.env.AYBEK_ENABLE_DEMO_ACTIONS = "true";
  assert.equal(demoActionsEnabled(), false);
  delete process.env.AYBEK_ENABLE_DEMO_ACTIONS;
});

test("fake Google authentication never grants an owner session", async () => {
  const response = await workspaceLogin(request({ provider: "google" }), ctx);
  assert.equal(response.status, 501);
  assert.equal(response.headers.has("set-cookie"), false);
});

test("malformed/primitive/array JSON bodies fail predictably", async () => {
  for (const payload of [null, [], "text", 4]) await assert.rejects(body(request(payload)), (e: any) => e.status === 400);
  await assert.rejects(body(new Request("http://example", { method: "POST", body: "x" })), (e: any) => e.status === 415);
  assert.deepEqual(await body(request({ name: "synthetic" })), { name: "synthetic" });
});

test("JSON body size is bounded even without a Content-Length header", async () => {
  await assert.rejects(body(request({ x: "x".repeat(1024 * 1024) })), (e: any) => e.status === 413);
});

test("unexpected API errors do not expose SQL, secrets, paths or patient values", async () => {
  const original = console.error;
  const logs: string[] = [];
  console.error = (value: string) => logs.push(value);
  try {
    const response = await route(async () => { throw new Error("example-sensitive-patient SQL password /private/database"); })(request({}), ctx);
    const output = await response.text();
    assert.equal(response.status, 500);
    assert.equal(response.headers.get("cache-control"), "no-store");
    assert.ok(response.headers.get("x-request-id"));
    assert.doesNotMatch(output + logs.join(""), /sensitive-patient|SQL|password|private\/database/);
  } finally { console.error = original; }
});

test("generic wrapper rejects CSRF before handler execution", async () => {
  let called = false;
  const response = await route(async () => { called = true; return new Response(); })(request({}, { origin: "https://evil.example" }), ctx);
  assert.equal(response.status, 403);
  assert.equal(called, false);
});

test("prescription transport validation rejects coerced flags and unsafe quantities", () => {
  const valid = { patient_id: "synthetic", items: [{ drug: "Training item", qty: 2, unit_price: 0 }] };
  assert.equal(validatePrescriptionInput(valid), null);
  assert.ok(validatePrescriptionInput({ ...valid, sign: "false" }));
  for (const qty of [-1, 0, NaN, Infinity, "2", undefined]) assert.ok(validatePrescriptionInput({ ...valid, items: [{ drug: "Training", qty }] }));
  assert.ok(validatePrescriptionInput({ ...valid, items: [null] }));
  assert.ok(validatePrescriptionInput({ ...valid, items: [{ drug: "Training", qty: 2, unit_price: -1 }] }));
});

test("account throttling is bounded and normalized", () => {
  resetThrottle();
  const key = throttleKey(" OWNER@EXAMPLE.TEST ", "account");
  assert.equal(key, throttleKey("owner@example.test", "account"));
  for (let i = 0; i < 6; i++) recordFailure(key);
  assert.equal(checkThrottle(key).blocked, true);
  for (let i = 0; i < 4200; i++) recordFailure(`synthetic-${i}`);
  assert.ok(throttleSnapshot(10000).length <= 4096);
  resetThrottle();
});


test("stale or forged session cookies cannot trap the login page in a redirect loop", async () => {
  const { NextRequest } = await import("next/server");
  const { middleware } = await import("../../middleware");
  const response = middleware(new NextRequest("https://hospital.example/login", { headers: { cookie: "slotly_session=invalid-synthetic" } }));
  assert.equal(response.status, 200);
  assert.equal(response.headers.has("location"), false);
});


test("generated passwords use cryptographic independent symbols and meet the actual server policy", async () => {
  const { scoreCode } = await import("../../lib/hms/passwords");
  const codes = new Set<string>();
  for (let i = 0; i < 100; i++) {
    const code = strongCode();
    assert.match(code, /^[A-Z3-9]{5}(-[A-Z3-9]{5}){3}$/);
    assert.equal(scoreCode(code).acceptable, true);
    codes.add(code);
  }
  assert.equal(codes.size, 100);
});


test("trivially repeated passwords are not accepted merely for containing three character classes", async () => {
  const { scoreCode } = await import("../../lib/hms/passwords");
  for (const value of ["AAAAAAAAAAAAA1!", "aaaaaaAAAAAA1111", "111111111111aaA!"]) assert.equal(scoreCode(value).acceptable, false);
});
