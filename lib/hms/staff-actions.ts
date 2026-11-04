import bcrypt from "bcryptjs";
import { HttpError } from "@/lib/auth";
import type { HmsUser, HmsRole } from "./auth";
import { hAudit, hGet, hRun, hmsReady } from "./db";
import { scoreCode } from "./passwords";

const ROLES: HmsRole[] = ["admin", "doctor", "pharmacist", "lab", "radiology", "nurse", "reception"];
export type StaffPatch = { role?: string; active?: boolean; password?: string; department?: string; title?: string; name?: string; phone?: string };

/** Validate the whole operation before changing password, access, profile or audit rows. */
export function updateStaff(id: string, p: StaffPatch, actor: HmsUser) {
  const self = actor.id === id, admin = actor.role === "admin";
  for (const key of ["role", "password", "department", "title", "name", "phone"] as const) {
    if (p[key] !== undefined && (typeof p[key] !== "string" || p[key]!.length > 200)) throw new HttpError(422, "Invalid staff field.");
  }
  if (p.active !== undefined && typeof p.active !== "boolean") throw new HttpError(422, "Active must be a boolean.");
  if (p.role !== undefined && !ROLES.includes(p.role as HmsRole)) throw new HttpError(422, "Unknown role.");
  if (!admin && (p.role !== undefined || p.active !== undefined)) throw new HttpError(403, "Only an administrator can change roles or access.");
  if (!admin && !self) throw new HttpError(403, "You may only update your own profile or password.");
  if (p.password !== undefined && !scoreCode(p.password.trim()).acceptable) throw new HttpError(422, "Choose a stronger password (12+ mixed characters).");
  if (p.name !== undefined && !p.name.trim()) throw new HttpError(422, "Staff name cannot be empty.");

  const db = hmsReady();
  db.exec("BEGIN IMMEDIATE");
  try {
    const target = hGet<{ role: string; active: number }>("SELECT role,active FROM hms_users WHERE id=?", [id]);
    if (!target) throw new HttpError(404, "User not found.");
    const removingAdmin = p.active === false || (p.role !== undefined && p.role !== "admin");
    if (self && admin && removingAdmin) throw new HttpError(409, "You cannot remove your own administrator access.");
    if (target.role === "admin" && target.active && removingAdmin) {
      const count = hGet<{ c: number }>("SELECT COUNT(*) AS c FROM hms_users WHERE role='admin' AND active=1")!.c;
      if (count <= 1) throw new HttpError(409, "Appoint another active administrator first.");
    }
    if (p.password !== undefined) {
      hRun("UPDATE hms_users SET password_hash=? WHERE id=?", [bcrypt.hashSync(p.password.trim(), 10), id]);
      hAudit(actor, "password", "user", id, "Password changed; all prior sessions revoked");
    }
    if (p.role !== undefined) hRun("UPDATE hms_users SET role=? WHERE id=?", [p.role, id]);
    if (p.active !== undefined) hRun("UPDATE hms_users SET active=? WHERE id=?", [p.active ? 1 : 0, id]);
    for (const field of ["name", "department", "title", "phone"] as const) {
      if (p[field] !== undefined) hRun(`UPDATE hms_users SET ${field}=? WHERE id=?`, [p[field]!.trim(), id]);
    }
    if (p.password !== undefined || p.role !== undefined || p.active === false) hRun("DELETE FROM hms_sessions WHERE user_id=?", [id]);
    hAudit(actor, "updated", "user", id, "Authorized atomic staff account update");
    db.exec("COMMIT");
    return { ok: true };
  } catch (error) {
    try { db.exec("ROLLBACK"); } catch { /* preserve the original failure */ }
    throw error;
  }
}
