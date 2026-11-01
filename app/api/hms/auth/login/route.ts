import { body, json, route } from "@/lib/api";
import { hmsLogin } from "@/lib/hms/auth";
import { hmsReady } from "@/lib/hms/db";
import { checkThrottle, recordFailure, recordSuccess, throttleKey } from "@/lib/hms/security";

/**
 * POST /api/hms/auth/login
 *
 * Five wrong codes cost a minute; each further failure doubles the wait, up to
 * fifteen minutes. The counter is per email + address, so one careless person
 * cannot lock the whole hospital out, and a successful sign-in clears it.
 */
export const POST = route(async (req) => {
  hmsReady();
  const p = await body<{ email?: string; password?: string }>(req);
  if (!p.email || !p.password) return json({ error: "Email and password are required." }, 422);

  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "local";
  const key = throttleKey(p.email, ip);

  const gate = checkThrottle(key);
  if (gate.blocked) {
    return json(
      {
        error: `Too many failed attempts. Try again in ${gate.secondsLeft} second(s).`,
        retryAfter: gate.secondsLeft,
        locked: true,
      },
      429
    );
  }

  const result = await hmsLogin(p.email, p.password, req.headers.get("user-agent") ?? undefined);
  if (!result.ok) {
    const after = recordFailure(key);
    return json(
      {
        error: after.blocked
          ? `Wrong code. This account is paused for ${after.secondsLeft} second(s).`
          : result.error,
        remaining: after.remaining,
      },
      401
    );
  }

  recordSuccess(key);
  return json({ ok: true, user: result.user });
});

export const dynamic = "force-dynamic";
