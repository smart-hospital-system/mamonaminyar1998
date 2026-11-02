import { NextResponse } from "next/server";
import { HttpError } from "./auth";

export type RouteCtx<P extends Record<string, string> = Record<string, string>> = { params: Promise<P> };
export type Handler<P extends Record<string, string> = Record<string, string>> = (req: Request, ctx: RouteCtx<P>) => Promise<Response>;

export function json(data: unknown, status = 200) {
  return NextResponse.json(data, { status });
}

export function fail(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

/** Wrap a route handler with consistent JSON error handling. */
export function route<P extends Record<string, string> = Record<string, string>>(fn: Handler<P>): Handler<P> {
  return async (req: Request, ctx: RouteCtx<P>) => {
    try {
      return await fn(req, ctx);
    } catch (e) {
      if (e instanceof HttpError) return fail(e.message, e.status);
      console.error("[api]", e);
      const message = e instanceof Error ? e.message : "Unexpected server error";
      return fail(message, 500);
    }
  };
}

export async function body<T = Record<string, unknown>>(req: Request): Promise<T> {
  try {
    return (await req.json()) as T;
  } catch {
    throw new HttpError(400, "Invalid JSON body");
  }
}

export function qp(req: Request) {
  return new URL(req.url).searchParams;
}

export function numOrUndefined(v: string | null) {
  if (v === null || v === "") return undefined;
  const n = Number(v);
  return Number.isFinite(n) ? n : undefined;
}
