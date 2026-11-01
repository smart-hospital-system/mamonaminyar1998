import crypto from "node:crypto";
import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { hAll, hGet, hRun, hUid, hmsReady } from "./db";

export type HmsRole = "admin" | "doctor" | "pharmacist" | "lab" | "radiology" | "nurse" | "reception";

export type HmsUser = {
  id: string;
  name: string;
  email: string;
  role: HmsRole;
  department: string | null;
  title: string | null;
  phone: string | null;
  avatar_color: string | null;
  active: number;
};

const COOKIE = "aybek_session";
const SESSION_DAYS = 14;

const hashToken = (t: string) => crypto.createHash("sha256").update(t).digest("hex");

export function verifyPassword(password: string, hash: string) {
  try {
    return bcrypt.compareSync(password, hash);
  } catch {
    return false;
  }
}

export async function hmsLogin(email: string, password: string, userAgent?: string) {
  hmsReady();
  const user = hGet<HmsUser & { password_hash: string }>(
    "SELECT * FROM hms_users WHERE lower(email) = lower(?) AND active = 1",
    [email.trim()]
  );
  if (!user || !verifyPassword(password, user.password_hash)) {
    return { ok: false as const, error: "Email or password is incorrect." };
  }
  const token = crypto.randomBytes(32).toString("base64url");
  const expires = new Date(Date.now() + SESSION_DAYS * 864e5).toISOString();
  hRun(
    "INSERT INTO hms_sessions (token, user_id, expires_at, user_agent, created_at) VALUES (?,?,?,?,?)",
    [hashToken(token), user.id, expires, userAgent ?? null, new Date().toISOString()]
  );
  hRun("UPDATE hms_users SET last_login_at = ? WHERE id = ?", [new Date().toISOString(), user.id]);
  const jar = await cookies();
  jar.set(COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_DAYS * 86400,
  });
  return { ok: true as const, user: toPublic(user) };
}

export async function hmsLogout() {
  const jar = await cookies();
  const token = jar.get(COOKIE)?.value;
  if (token) hRun("DELETE FROM hms_sessions WHERE token = ?", [hashToken(token)]);
  jar.delete(COOKIE);
}

export async function getHmsUser(): Promise<HmsUser | null> {
  try {
    const jar = await cookies();
    const token = jar.get(COOKIE)?.value;
    if (!token) return null;
    const session = hGet<{ user_id: string; expires_at: string }>(
      "SELECT user_id, expires_at FROM hms_sessions WHERE token = ?",
      [hashToken(token)]
    );
    if (!session) return null;
    if (new Date(session.expires_at).getTime() < Date.now()) {
      hRun("DELETE FROM hms_sessions WHERE token = ?", [hashToken(token)]);
      return null;
    }
    const user = hGet<HmsUser & { password_hash: string }>(
      "SELECT * FROM hms_users WHERE id = ? AND active = 1",
      [session.user_id]
    );
    return user ? toPublic(user) : null;
  } catch {
    return null;
  }
}

export async function requireHmsPage(roles?: HmsRole[]) {
  const user = await getHmsUser();
  if (!user) redirect("/hms/login");
  if (roles && roles.length && !roles.includes(user.role)) redirect("/hms?denied=1");
  return user;
}

function toPublic(u: HmsUser & { password_hash?: string }): HmsUser {
  const { password_hash: _drop, ...rest } = u;
  return rest as HmsUser;
}

export const ROLE_LABEL: Record<HmsRole, string> = {
  admin: "Medical Director",
  doctor: "Physician",
  pharmacist: "Pharmacist",
  lab: "Lab Technologist",
  radiology: "Radiologist",
  nurse: "Ward Nurse",
  reception: "Front Desk",
};

export const ROLE_HOME: Record<HmsRole, string> = {
  admin: "/hms",
  doctor: "/hms/opd",
  pharmacist: "/hms/pharmacy",
  lab: "/hms/lab",
  radiology: "/hms/radiology",
  nurse: "/hms/inpatients",
  reception: "/hms/patients",
};

/** Who can sign clinical documents. */
export const CLINICAL_ROLES: HmsRole[] = ["admin", "doctor"];

export function canAccess(user: HmsUser, department: string) {
  if (user.role === "admin") return true;
  const map: Record<string, HmsRole[]> = {
    opd: ["doctor", "nurse", "reception"],
    pharmacy: ["pharmacist", "nurse"],
    laboratory: ["lab"],
    radiology: ["radiology"],
    inpatient: ["nurse", "doctor", "admin"],
    surgery: ["doctor", "nurse", "admin"],
    patients: ["reception", "nurse", "doctor", "admin"],
    prescriptions: ["doctor", "pharmacist", "nurse", "admin"],
    settings: ["admin"],
    alerts: ["admin", "doctor", "nurse", "pharmacist", "lab", "radiology"],
    guide: ["admin", "doctor", "nurse", "pharmacist", "lab", "radiology", "reception"],
  };
  return (map[department] ?? []).includes(user.role);
}

export function hmsUsers() {
  return hAll<HmsUser>(
    "SELECT id, name, email, role, department, title, phone, avatar_color, active FROM hms_users WHERE active = 1 ORDER BY name"
  );
}

export function hmsUserById(id: string) {
  return hGet<HmsUser>("SELECT id, name, email, role, department, title, avatar_color FROM hms_users WHERE id = ?", [id]);
}

export function newAuditId() {
  return hUid("aud");
}

/** API guard — throws HttpError so the shared route wrapper returns clean JSON. */
export async function requireHmsApi(roles?: HmsRole[]): Promise<HmsUser> {
  const user = await getHmsUser();
  if (!user) {
    const { HttpError } = await import("@/lib/auth");
    throw new HttpError(401, "You must be signed in to the hospital workspace.");
  }
  if (roles?.length && !roles.includes(user.role)) {
    const { HttpError } = await import("@/lib/auth");
    throw new HttpError(403, "Your role cannot perform this action.");
  }
  return user;
}
