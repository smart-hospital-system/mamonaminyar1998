import bcrypt from "bcryptjs";
import { body, json, route } from "@/lib/api";
import { requireHmsApi } from "@/lib/hms/auth";
import type { HmsRole } from "@/lib/hms/auth";
import { hAll, hAudit, hGet, hNow, hRun, hUid } from "@/lib/hms/db";

const ROLES: HmsRole[] = ["admin", "doctor", "pharmacist", "lab", "radiology", "nurse", "reception"];

export const GET = route(async () => {
  await requireHmsApi();
  const users = hAll<Record<string, unknown>>(
    `SELECT id, name, email, role, department, title, phone, avatar_color, active, last_login_at, created_at
     FROM hms_users ORDER BY active DESC, name`
  ).map((u) => ({
    ...u,
    sessions: Number(hGet<{ c: number }>("SELECT COUNT(*) AS c FROM hms_sessions WHERE user_id = ? AND expires_at > ?", [u.id as string, hNow()])?.c ?? 0),
  }));
  return json({ items: users, roles: ROLES });
});

export const POST = route(async (req) => {
  const actor = await requireHmsApi(["admin"]);
  const p = await body<{ name?: string; email?: string; role?: string; department?: string; title?: string; phone?: string; password?: string }>(req);
  if (!p.name?.trim() || !p.email?.trim()) return json({ error: "Name and email are required." }, 422);
  if (!ROLES.includes((p.role ?? "") as HmsRole)) return json({ error: "Choose a valid role." }, 422);
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(p.email)) return json({ error: "That email address does not look right." }, 422);
  if (hGet("SELECT id FROM hms_users WHERE lower(email) = lower(?)", [p.email.trim()])) {
    return json({ error: "A member of staff already uses that email address." }, 409);
  }
  const password = (p.password ?? "").trim();
  if (password.length < 8) return json({ error: "The initial password must be at least 8 characters." }, 422);

  const id = hUid("usr");
  hRun(
    `INSERT INTO hms_users (id, name, email, role, department, title, phone, avatar_color, password_hash, active, created_at)
     VALUES (?,?,?,?,?,?,?,?,?,1,?)`,
    [id, p.name.trim(), p.email.trim().toLowerCase(), p.role, p.department ?? null, p.title ?? null, p.phone ?? null, "#0ea5a4", bcrypt.hashSync(password, 10), hNow()]
  );
  hAudit(actor, "created", "user", id, `Added ${p.name.trim()} as ${p.role}`);
  return json({ ok: true, id }, 201);
});

export const dynamic = "force-dynamic";
