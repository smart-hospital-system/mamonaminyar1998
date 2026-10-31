import bcrypt from "bcryptjs";
import { body, json, route } from "@/lib/api";
import { requireHmsApi } from "@/lib/hms/auth";
import type { HmsRole } from "@/lib/hms/auth";
import { hAudit, hGet, hRun } from "@/lib/hms/db";
import { scoreCode } from "@/lib/hms/passwords";

const ROLES: HmsRole[] = ["admin", "doctor", "pharmacist", "lab", "radiology", "nurse", "reception"];

export const PATCH = route<{ id: string }>(async (req, { params }) => {
  const { id } = await params;
  const actor = await requireHmsApi();
  const p = await body<{ role?: string; active?: boolean; password?: string; department?: string; title?: string; name?: string; phone?: string }>(req);

  const self = actor.id === id;
  const isAdmin = actor.role === "admin";

  // changing your own password is allowed for everybody
  if (p.password !== undefined) {
    if (!self && !isAdmin) return json({ error: "Only an administrator can reset another person's password." }, 403);
    const quality = scoreCode(p.password.trim());
    if (!quality.acceptable) {
      return json(
        {
          error: `That code is too easy to guess (${quality.label[0]}). Use 12+ characters mixing letters and digits — or press Generate.`,
          score: quality.score,
        },
        422
      );
    }
    hRun("UPDATE hms_users SET password_hash = ? WHERE id = ?", [bcrypt.hashSync(p.password.trim(), 10), id]);
    hAudit(actor, "password", "user", id, self ? "Changed their own password" : `Reset the password of ${id}`);
  }

  if (p.role !== undefined || p.active !== undefined) {
    if (!isAdmin) return json({ error: "Only an administrator can change roles or access." }, 403);
    if (p.role && !ROLES.includes(p.role as HmsRole)) return json({ error: "Unknown role." }, 422);
    const target = hGet<{ role: string }>("SELECT role FROM hms_users WHERE id = ?", [id]);
    if (!target) return json({ error: "User not found" }, 404);
    if (id === actor.id && (p.active === false || (p.role && p.role !== "admin"))) {
      return json({ error: "You cannot remove your own administrator access." }, 409);
    }
    // never leave the hospital without an administrator
    if (target.role === "admin" && (p.active === false || (p.role && p.role !== "admin"))) {
      const admins = Number(hGet<{ c: number }>("SELECT COUNT(*) AS c FROM hms_users WHERE role = 'admin' AND active = 1")?.c ?? 0);
      if (admins <= 1) return json({ error: "This is the last active administrator — appoint another one first." }, 409);
    }
    if (p.role) hRun("UPDATE hms_users SET role = ? WHERE id = ?", [p.role, id]);
    if (p.active !== undefined) {
      hRun("UPDATE hms_users SET active = ? WHERE id = ?", [p.active ? 1 : 0, id]);
      if (!p.active) hRun("DELETE FROM hms_sessions WHERE user_id = ?", [id]);
    }
    hAudit(actor, "access", "user", id, p.active === false ? "Suspended access" : p.active === true ? "Restored access" : `Changed role to ${p.role}`);
  }

  if (p.name || p.department || p.title || p.phone) {
    if (!isAdmin && !self) return json({ error: "You can only edit your own profile." }, 403);
    if (p.name) hRun("UPDATE hms_users SET name = ? WHERE id = ?", [p.name, id]);
    if (p.department) hRun("UPDATE hms_users SET department = ? WHERE id = ?", [p.department, id]);
    if (p.title) hRun("UPDATE hms_users SET title = ? WHERE id = ?", [p.title, id]);
    if (p.phone) hRun("UPDATE hms_users SET phone = ? WHERE id = ?", [p.phone, id]);
    hAudit(actor, "updated", "user", id, "Updated staff profile details");
  }

  return json({ ok: true });
});

export const dynamic = "force-dynamic";
