import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import crypto from "node:crypto";
import bcrypt from "bcryptjs";
import { get, run, uid } from "./db";
import type { Role, SessionUser } from "./types";

const COOKIE = "slotly_session";
const SESSION_DAYS = 7;

export function hashPassword(password: string) {
  return bcrypt.hashSync(password, 10);
}

export function verifyPassword(password: string, hash: string | null) {
  if (!hash) return false;
  try {
    return bcrypt.compareSync(password, hash);
  } catch {
    return false;
  }
}

function hashToken(token: string) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export async function createSession(userId: string, userAgent?: string) {
  const token = crypto.randomBytes(32).toString("base64url");
  const expires = new Date(Date.now() + SESSION_DAYS * 864e5).toISOString();
  run(
    "INSERT INTO sessions (token, user_id, expires_at, created_at, user_agent) VALUES (?,?,?,?,?)",
    [hashToken(token), userId, expires, new Date().toISOString(), userAgent ?? null]
  );
  const jar = await cookies();
  jar.set(COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_DAYS * 86400,
  });
  return token;
}

export async function destroySession() {
  const jar = await cookies();
  const token = jar.get(COOKIE)?.value;
  if (token) run("DELETE FROM sessions WHERE token = ?", [hashToken(token)]);
  jar.delete(COOKIE);
}

export async function getCurrentUser(): Promise<SessionUser | null> {
  const jar = await cookies();
  const token = jar.get(COOKIE)?.value;
  if (!token) return null;
  const row = get<{
    id: string;
    email: string;
    name: string;
    role: Role;
    avatar_url: string | null;
    staff_id: string | null;
    expires_at: string;
    active: number;
  }>(
    `SELECT u.id, u.email, u.name, u.role, u.avatar_url, u.staff_id, u.active, s.expires_at
     FROM sessions s JOIN users u ON u.id = s.user_id
     WHERE s.token = ?`,
    [hashToken(token)]
  );
  if (!row) return null;
  if (new Date(row.expires_at).getTime() < Date.now()) {
    run("DELETE FROM sessions WHERE token = ?", [hashToken(token)]);
    return null;
  }
  if (!row.active) return null;
  return {
    id: row.id,
    email: row.email,
    name: row.name,
    role: row.role,
    avatar_url: row.avatar_url,
    staff_id: row.staff_id,
  };
}

export class HttpError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

export async function requireUser(roles?: Role[]): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) throw new HttpError(401, "You must be signed in.");
  if (roles && !roles.includes(user.role)) {
    throw new HttpError(403, "You don't have permission to do that.");
  }
  return user;
}

export function logActivity(
  actor: { id: string; name: string } | null,
  action: string,
  entity: string,
  entityId: string | null,
  detail: string
) {
  run(
    "INSERT INTO activity_logs (id, actor_name, actor_id, action, entity, entity_id, detail, created_at) VALUES (?,?,?,?,?,?,?,?)",
    [
      uid("log"),
      actor?.name ?? "System",
      actor?.id ?? null,
      action,
      entity,
      entityId,
      detail,
      new Date().toISOString(),
    ]
  );
}

export function notify(opts: {
  userId?: string | null;
  type?: string;
  title: string;
  body?: string;
  link?: string;
}) {
  run(
    "INSERT INTO notifications (id, user_id, type, title, body, link, read, created_at) VALUES (?,?,?,?,?,?,0,?)",
    [
      uid("ntf"),
      opts.userId ?? null,
      opts.type ?? "system",
      opts.title,
      opts.body ?? null,
      opts.link ?? null,
      new Date().toISOString(),
    ]
  );
}

/** Page-level role guard for server components. */
export async function guardRole(roles: Role[]): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!roles.includes(user.role)) redirect("/dashboard");
  return user;
}
