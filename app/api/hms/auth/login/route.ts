import { body, json, route } from "@/lib/api";
import { hmsLogin } from "@/lib/hms/auth";
import { hmsReady } from "@/lib/hms/db";

export const POST = route(async (req) => {
  hmsReady();
  const p = await body<{ email?: string; password?: string }>(req);
  if (!p.email || !p.password) return json({ error: "Email and password are required." }, 422);
  const result = await hmsLogin(p.email, p.password, req.headers.get("user-agent") ?? undefined);
  if (!result.ok) return json({ error: result.error }, 401);
  return json({ ok: true, user: result.user });
});

export const dynamic = "force-dynamic";
