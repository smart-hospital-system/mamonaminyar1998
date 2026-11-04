import { NextResponse } from "next/server";
import { HttpError } from "./auth";
import { randomUUID } from "node:crypto";
import { isSameOriginMutation } from "./request-security";

export type RouteCtx<P extends Record<string, string> = Record<string, string>> = { params: Promise<P> };
export type Handler<P extends Record<string, string> = Record<string, string>> = (req: Request, ctx: RouteCtx<P>) => Promise<Response>;

export function json(data: unknown, status = 200) {
  return NextResponse.json(data, { status, headers: { "cache-control": "no-store" } });
}

export function fail(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status, headers: { "cache-control": "no-store" } });
}

/** Wrap a route handler with consistent JSON error handling. */
export function route<P extends Record<string, string> = Record<string, string>>(fn: Handler<P>): Handler<P> {
  return async (req: Request, ctx: RouteCtx<P>) => {
    try {
      if (!isSameOriginMutation(req)) return fail("Cross-origin or unidentified browser mutation refused.", 403);
      return await fn(req, ctx);
    } catch (e) {
      if (e instanceof HttpError) return fail(e.message, e.status);
      const requestId = randomUUID();
      // Never log request bodies, SQL exceptions, tokens, patient values or stack traces.
      console.error(JSON.stringify({ event: "api_error", request_id: requestId }));
      const response = fail("Unexpected server error. Contact the administrator with the request ID.", 500);
      response.headers.set("X-Request-ID", requestId);
      return response;
    }
  };
}

const MAX_JSON_BYTES = 1024 * 1024;
export async function body<T = Record<string, unknown>>(req: Request): Promise<T> {
  if (!req.headers.get("content-type")?.toLowerCase().startsWith("application/json")) {
    throw new HttpError(415, "Use application/json.");
  }
  if (Number(req.headers.get("content-length")) > MAX_JSON_BYTES) throw new HttpError(413, "JSON body too large.");
  const reader = req.body?.getReader();
  if (!reader) throw new HttpError(400, "JSON object required.");
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const part = await reader.read();
      if (part.done) break;
      size += part.value.byteLength;
      if (size > MAX_JSON_BYTES) { await reader.cancel(); throw new HttpError(413, "JSON body too large."); }
      chunks.push(part.value);
    }
  } finally { reader.releaseLock(); }
  try {
    const value: unknown = JSON.parse(Buffer.concat(chunks).toString("utf8"));
    if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error();
    return value as T;
  } catch { throw new HttpError(400, "Valid JSON object required."); }
}

export function qp(req: Request) {
  return new URL(req.url).searchParams;
}

export function numOrUndefined(v: string | null) {
  if (v === null || v === "") return undefined;
  const n = Number(v);
  return Number.isFinite(n) ? n : undefined;
}
