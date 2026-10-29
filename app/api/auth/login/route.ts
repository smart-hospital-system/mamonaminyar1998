import { get, run } from "@/lib/db";
import { createSession, logActivity, verifyPassword } from "@/lib/auth";
import { body, fail, json, route } from "@/lib/api";

export const POST = route(async (req) => {
  const { email, password, provider } = await body<{
    email?: string;
    password?: string;
    provider?: "google" | "credentials";
  }>(req);

  // Demo Google sign-in — no OAuth round-trip needed for this preview build.
  if (provider === "google") {
    const user = get<{ id: string; email: string; name: string; role: string }>(
      "SELECT * FROM users WHERE role = 'owner' LIMIT 1"
    );
    if (!user) return fail("No demo account available", 404);
    await createSession(user.id, req.headers.get("user-agent") ?? undefined);
    run("UPDATE users SET last_login_at = ? WHERE id = ?", [new Date().toISOString(), user.id]);
    logActivity(user, "signed in", "user", user.id, "Signed in with Google");
    return json({ ok: true, user: { id: user.id, email: user.email, name: user.name, role: user.role } });
  }

  if (!email || !password) return fail("Email and password are required", 422);

  const user = get<{
    id: string; email: string; name: string; role: string; password_hash: string | null; active: number;
    avatar_url: string | null; staff_id: string | null;
  }>("SELECT * FROM users WHERE lower(email) = lower(?)", [email]);

  if (!user || !verifyPassword(password, user.password_hash)) {
    return fail("That email and password don't match. Please try again.", 401);
  }
  if (!user.active) return fail("This account has been deactivated. Contact the owner.", 403);

  await createSession(user.id, req.headers.get("user-agent") ?? undefined);
  run("UPDATE users SET last_login_at = ? WHERE id = ?", [new Date().toISOString(), user.id]);
  logActivity(user, "signed in", "user", user.id, "Signed in with email and password");
  return json({
    ok: true,
    user: { id: user.id, email: user.email, name: user.name, role: user.role, avatar_url: user.avatar_url, staff_id: user.staff_id },
  });
});
