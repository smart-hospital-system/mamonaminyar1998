import { get, run } from "@/lib/db";
import { createSession } from "@/lib/auth";
import { body, fail, json, route } from "@/lib/api";

/** One-click demo sign-in per role (handy for reviewing RBAC). */
export const POST = route(async (req) => {
  const { role } = await body<{ role?: string }>(req);
  const user = get<{ id: string; email: string; name: string; role: string; active: number }>(
    role ? "SELECT * FROM users WHERE role = ? AND active = 1 LIMIT 1" : "SELECT * FROM users ORDER BY created_at LIMIT 1",
    role ? [role] : []
  );
  if (!user) return fail("Demo account not found", 404);
  await createSession(user.id, req.headers.get("user-agent") ?? undefined);
  run("UPDATE users SET last_login_at = ? WHERE id = ?", [new Date().toISOString(), user.id]);
  return json({ ok: true, role: user.role });
});
