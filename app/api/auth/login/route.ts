import { get, run } from "@/lib/db";
import { createSession, logActivity, verifyPassword } from "@/lib/auth";
import { body, fail, json, route } from "@/lib/api";
import { checkThrottle, recordFailure, recordSuccess, throttleKey } from "@/lib/hms/security";

export const POST = route(async (req) => {
  const { email, password, provider } = await body<{
    email?: string;
    password?: string;
    provider?: "google" | "credentials";
  }>(req);

  // No identity-provider bypass: real Google/OIDC authentication is not configured.
  if (provider && provider !== "credentials") return fail("External identity-provider sign-in is not configured.", 501);
  if (typeof email !== "string" || typeof password !== "string" || !email.trim() || !password || email.length > 254 || password.length > 200) {
    return fail("Valid email and password are required", 422);
  }

  const key = throttleKey(`workspace:${email}`, "account");
  const gate = checkThrottle(key);
  if (gate.blocked) {
    const response = fail("Too many login attempts. Try again later.", 429);
    response.headers.set("Retry-After", String(gate.secondsLeft));
    return response;
  }
  const user = get<{
    id: string; email: string; name: string; role: string; password_hash: string | null; active: number;
    avatar_url: string | null; staff_id: string | null;
  }>("SELECT * FROM users WHERE lower(email) = lower(?)", [email]);

  if (!user || !verifyPassword(password, user.password_hash)) {
    recordFailure(key);
    return fail("That email and password don't match. Please try again.", 401);
  }
  if (!user.active) return fail("This account has been deactivated. Contact the owner.", 403);

  recordSuccess(key);
  await createSession(user.id, req.headers.get("user-agent") ?? undefined);
  run("UPDATE users SET last_login_at = ? WHERE id = ?", [new Date().toISOString(), user.id]);
  logActivity(user, "signed in", "user", user.id, "Signed in with email and password");
  return json({
    ok: true,
    user: { id: user.id, email: user.email, name: user.name, role: user.role, avatar_url: user.avatar_url, staff_id: user.staff_id },
  });
});
