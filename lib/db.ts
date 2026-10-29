import { DatabaseSync } from "node:sqlite";
import fs from "node:fs";
import path from "node:path";
import { seedDatabase } from "./seed";

declare global {
  // eslint-disable-next-line no-var
  var __slotlyDb: DatabaseSync | undefined;
}

const DB_PATH = process.env.SLOTLY_DB_PATH || path.join(process.cwd(), "data", "slotly.db");

const SCHEMA = `
PRAGMA journal_mode = WAL;
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT,
  name TEXT NOT NULL,
  avatar_url TEXT,
  role TEXT NOT NULL DEFAULT 'staff',
  staff_id TEXT,
  google_sub TEXT,
  active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL,
  last_login_at TEXT
);

CREATE TABLE IF NOT EXISTS sessions (
  token TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL,
  user_agent TEXT
);

CREATE TABLE IF NOT EXISTS staff (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  title TEXT,
  avatar_color TEXT,
  bio TEXT,
  specialties TEXT DEFAULT '[]',
  rating REAL DEFAULT 5,
  hourly_rate REAL DEFAULT 30,
  active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS staff_schedules (
  id TEXT PRIMARY KEY,
  staff_id TEXT NOT NULL,
  weekday INTEGER NOT NULL,
  start_time TEXT NOT NULL,
  end_time TEXT NOT NULL,
  is_working INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS staff_time_off (
  id TEXT PRIMARY KEY,
  staff_id TEXT NOT NULL,
  start_date TEXT NOT NULL,
  end_date TEXT NOT NULL,
  reason TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS staff_services (
  staff_id TEXT NOT NULL,
  service_id TEXT NOT NULL,
  PRIMARY KEY (staff_id, service_id)
);

CREATE TABLE IF NOT EXISTS services (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  description TEXT,
  duration_min INTEGER NOT NULL DEFAULT 60,
  price REAL NOT NULL DEFAULT 0,
  deposit REAL NOT NULL DEFAULT 0,
  color TEXT DEFAULT '#6366f1',
  buffer_min INTEGER NOT NULL DEFAULT 10,
  active INTEGER NOT NULL DEFAULT 1,
  popular INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS service_addons (
  id TEXT PRIMARY KEY,
  service_id TEXT NOT NULL,
  name TEXT NOT NULL,
  price REAL NOT NULL DEFAULT 0,
  duration_min INTEGER NOT NULL DEFAULT 0,
  active INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS customers (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  dob TEXT,
  notes TEXT,
  preferences TEXT,
  tags TEXT DEFAULT '[]',
  loyalty_points INTEGER NOT NULL DEFAULT 0,
  vip INTEGER NOT NULL DEFAULT 0,
  marketing_opt_in INTEGER NOT NULL DEFAULT 1,
  visits INTEGER NOT NULL DEFAULT 0,
  total_spent REAL NOT NULL DEFAULT 0,
  last_visit_at TEXT,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS bookings (
  id TEXT PRIMARY KEY,
  code TEXT NOT NULL,
  customer_id TEXT NOT NULL,
  staff_id TEXT NOT NULL,
  service_id TEXT NOT NULL,
  addons TEXT DEFAULT '[]',
  start_at TEXT NOT NULL,
  end_at TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  payment_status TEXT NOT NULL DEFAULT 'unpaid',
  price REAL NOT NULL DEFAULT 0,
  notes TEXT,
  internal_notes TEXT,
  source TEXT NOT NULL DEFAULT 'online',
  recurring_rule TEXT,
  parent_id TEXT,
  reminder_sent INTEGER NOT NULL DEFAULT 0,
  cancelled_reason TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_bookings_start ON bookings(start_at);
CREATE INDEX IF NOT EXISTS idx_bookings_customer ON bookings(customer_id);
CREATE INDEX IF NOT EXISTS idx_bookings_staff ON bookings(staff_id);

CREATE TABLE IF NOT EXISTS waitlist (
  id TEXT PRIMARY KEY,
  customer_id TEXT NOT NULL,
  service_id TEXT NOT NULL,
  staff_id TEXT,
  desired_from TEXT,
  desired_to TEXT,
  preferred_time TEXT,
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'waiting',
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS payments (
  id TEXT PRIMARY KEY,
  booking_id TEXT,
  customer_id TEXT NOT NULL,
  invoice_no TEXT NOT NULL,
  amount REAL NOT NULL DEFAULT 0,
  tip REAL NOT NULL DEFAULT 0,
  tax REAL NOT NULL DEFAULT 0,
  total REAL NOT NULL DEFAULT 0,
  method TEXT NOT NULL DEFAULT 'card',
  status TEXT NOT NULL DEFAULT 'paid',
  refunded_amount REAL NOT NULL DEFAULT 0,
  paid_at TEXT,
  notes TEXT,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS reviews (
  id TEXT PRIMARY KEY,
  booking_id TEXT,
  customer_id TEXT NOT NULL,
  staff_id TEXT,
  rating INTEGER NOT NULL DEFAULT 5,
  comment TEXT,
  reply TEXT,
  tags TEXT DEFAULT '[]',
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS coupons (
  id TEXT PRIMARY KEY,
  code TEXT UNIQUE NOT NULL,
  description TEXT,
  type TEXT NOT NULL DEFAULT 'percent',
  value REAL NOT NULL DEFAULT 10,
  min_amount REAL NOT NULL DEFAULT 0,
  max_uses INTEGER NOT NULL DEFAULT 100,
  uses INTEGER NOT NULL DEFAULT 0,
  starts_at TEXT,
  expires_at TEXT,
  active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS campaigns (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  channel TEXT NOT NULL DEFAULT 'email',
  subject TEXT,
  body TEXT,
  audience TEXT NOT NULL DEFAULT 'all',
  status TEXT NOT NULL DEFAULT 'draft',
  recipients INTEGER NOT NULL DEFAULT 0,
  opened INTEGER NOT NULL DEFAULT 0,
  clicked INTEGER NOT NULL DEFAULT 0,
  scheduled_at TEXT,
  sent_at TEXT,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS referrals (
  id TEXT PRIMARY KEY,
  referrer_customer_id TEXT NOT NULL,
  referred_name TEXT NOT NULL,
  referred_email TEXT,
  code TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  reward REAL NOT NULL DEFAULT 15,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS notifications (
  id TEXT PRIMARY KEY,
  user_id TEXT,
  type TEXT NOT NULL DEFAULT 'system',
  title TEXT NOT NULL,
  body TEXT,
  link TEXT,
  read INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS activity_logs (
  id TEXT PRIMARY KEY,
  actor_name TEXT NOT NULL,
  actor_id TEXT,
  action TEXT NOT NULL,
  entity TEXT NOT NULL,
  entity_id TEXT,
  detail TEXT,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);
`;

function init(): DatabaseSync {
  fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
  const db = new DatabaseSync(DB_PATH);
  db.exec(SCHEMA);
  return db;
}

export function getDb(): DatabaseSync {
  if (!globalThis.__slotlyDb) {
    globalThis.__slotlyDb = init();
    // Seed on first boot (empty database) — keeps the demo alive on first load.
    if (process.env.SLOTLY_SKIP_SEED !== "1") {
      const row = globalThis.__slotlyDb
        .prepare("SELECT COUNT(*) AS c FROM users")
        .get() as { c: number };
      if (!row || row.c === 0) {
        seedDatabase(globalThis.__slotlyDb as DatabaseSync);
      }
    }
  }
  return globalThis.__slotlyDb as DatabaseSync;
}

export type Row = Record<string, unknown>;

/** node:sqlite returns null-prototype rows — normalise to plain objects for React. */
function plain<T>(row: unknown): T {
  return { ...(row as Record<string, unknown>) } as T;
}

/** node:sqlite rejects `undefined` bindings — treat them as SQL NULL. */
function bind(params: unknown[]): never[] {
  return params.map((p) => (p === undefined ? null : p)) as never[];
}

export function all<T = Row>(sql: string, params: unknown[] = []): T[] {
  return (getDb().prepare(sql).all(...bind(params)) as unknown[]).map((r) => plain<T>(r));
}

export function get<T = Row>(sql: string, params: unknown[] = []): T | undefined {
  const row = getDb().prepare(sql).get(...bind(params));
  return row === undefined ? undefined : plain<T>(row);
}

export function run(sql: string, params: unknown[] = []) {
  return getDb().prepare(sql).run(...bind(params));
}

export function transaction<T>(fn: () => T): T {
  const db = getDb();
  db.exec("BEGIN");
  try {
    const out = fn();
    db.exec("COMMIT");
    return out;
  } catch (e) {
    db.exec("ROLLBACK");
    throw e;
  }
}

export function resetDatabase() {
  const db = getDb();
  const tables = [
    "users","sessions","staff","staff_schedules","staff_time_off","staff_services",
    "services","service_addons","customers","bookings","waitlist","payments","reviews",
    "coupons","campaigns","referrals","notifications","activity_logs","settings",
  ];
  for (const t of tables) db.exec(`DELETE FROM ${t}`);
}

export function nowIso() {
  return new Date().toISOString();
}

export function uid(prefix: string) {
  return `${prefix}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
}
