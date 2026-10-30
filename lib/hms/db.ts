import type { DatabaseSync } from "node:sqlite";
import { getDb } from "@/lib/db";
import { seedHms } from "./seed";

/**
 * Aybek HMS data layer.
 * Deb lazily adds the `hms_*` tables to the same SQLite file used by the rest of the
 * deployment, so a single backup covers everything.
 */

const SCHEMA = `
CREATE TABLE IF NOT EXISTS hms_users (
  id TEXT PRIMARY KEY, name TEXT NOT NULL, email TEXT NOT NULL UNIQUE, password_hash TEXT NOT NULL,
  role TEXT NOT NULL, department TEXT, title TEXT, phone TEXT, avatar_color TEXT,
  active INTEGER NOT NULL DEFAULT 1, last_login_at TEXT, created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS hms_sessions (
  token TEXT PRIMARY KEY, user_id TEXT NOT NULL, expires_at TEXT NOT NULL, user_agent TEXT, created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS hms_settings (
  section TEXT PRIMARY KEY, value TEXT NOT NULL, updated_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS hms_patients (
  id TEXT PRIMARY KEY, mrn TEXT NOT NULL UNIQUE, name TEXT NOT NULL, gender TEXT NOT NULL, dob TEXT,
  phone TEXT, email TEXT, address TEXT, blood_group TEXT, allergies TEXT, chronic TEXT,
  emergency_contact TEXT, insurance TEXT, notes TEXT, created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS hms_appointments (
  id TEXT PRIMARY KEY, patient_id TEXT NOT NULL, doctor_id TEXT NOT NULL, department TEXT NOT NULL,
  start_at TEXT NOT NULL, status TEXT NOT NULL, reason TEXT, notes TEXT, created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS hms_encounters (
  id TEXT PRIMARY KEY, patient_id TEXT NOT NULL, doctor_id TEXT NOT NULL, department TEXT NOT NULL,
  visit_type TEXT, diagnosis TEXT, icd10 TEXT, summary TEXT, vitals TEXT, status TEXT,
  created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS hms_prescriptions (
  id TEXT PRIMARY KEY, rx_no TEXT NOT NULL UNIQUE, encounter_id TEXT, patient_id TEXT NOT NULL,
  doctor_id TEXT NOT NULL, diagnosis TEXT, icd10 TEXT, notes TEXT, follow_up TEXT,
  template INTEGER NOT NULL DEFAULT 1, status TEXT NOT NULL, signed_by TEXT, signed_at TEXT,
  dispensed_at TEXT, pharmacist_id TEXT, created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS hms_rx_items (
  id TEXT PRIMARY KEY, prescription_id TEXT NOT NULL, drug TEXT NOT NULL, strength TEXT, form TEXT,
  dosage TEXT, frequency TEXT, duration TEXT, instructions TEXT, qty INTEGER NOT NULL DEFAULT 1,
  unit_price REAL NOT NULL DEFAULT 0, sort INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE IF NOT EXISTS hms_medicines (
  id TEXT PRIMARY KEY, name TEXT NOT NULL, strength TEXT, form TEXT, category TEXT,
  unit_price REAL NOT NULL DEFAULT 0, stock INTEGER NOT NULL DEFAULT 0, reorder_level INTEGER NOT NULL DEFAULT 20,
  batch TEXT, expiry TEXT, supplier TEXT, location TEXT, active INTEGER NOT NULL DEFAULT 1, updated_at TEXT
);
CREATE TABLE IF NOT EXISTS hms_dispenses (
  id TEXT PRIMARY KEY, prescription_id TEXT NOT NULL, patient_id TEXT NOT NULL, pharmacist_id TEXT,
  items TEXT NOT NULL, total REAL NOT NULL DEFAULT 0, note TEXT, created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS hms_lab_orders (
  id TEXT PRIMARY KEY, patient_id TEXT NOT NULL, encounter_id TEXT, ordered_by TEXT, panel TEXT NOT NULL,
  test_name TEXT NOT NULL, priority TEXT NOT NULL DEFAULT 'routine', status TEXT NOT NULL DEFAULT 'ordered',
  sample_type TEXT, result TEXT, reference TEXT, technician TEXT, verified_by TEXT,
  created_at TEXT NOT NULL, completed_at TEXT, price REAL NOT NULL DEFAULT 0
);
CREATE TABLE IF NOT EXISTS hms_imaging_orders (
  id TEXT PRIMARY KEY, patient_id TEXT NOT NULL, encounter_id TEXT, ordered_by TEXT,
  modality TEXT NOT NULL, body_part TEXT NOT NULL, priority TEXT NOT NULL DEFAULT 'routine',
  status TEXT NOT NULL DEFAULT 'requested', findings TEXT, impression TEXT, radiologist TEXT,
  created_at TEXT NOT NULL, reported_at TEXT, price REAL NOT NULL DEFAULT 0
);
CREATE TABLE IF NOT EXISTS hms_beds (
  id TEXT PRIMARY KEY, label TEXT NOT NULL UNIQUE, ward TEXT NOT NULL, type TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'available', patient_id TEXT, admitted_at TEXT, daily_rate REAL NOT NULL DEFAULT 0,
  notes TEXT
);
CREATE TABLE IF NOT EXISTS hms_admissions (
  id TEXT PRIMARY KEY, patient_id TEXT NOT NULL, bed_id TEXT, consultant TEXT,
  diagnosis TEXT, admission_type TEXT, admitted_at TEXT NOT NULL, discharged_at TEXT,
  status TEXT NOT NULL DEFAULT 'admitted', notes TEXT, created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS hms_surgeries (
  id TEXT PRIMARY KEY, patient_id TEXT NOT NULL, surgeon TEXT NOT NULL, procedure_name TEXT NOT NULL,
  theatre TEXT NOT NULL, scheduled_at TEXT NOT NULL, duration_min INTEGER NOT NULL DEFAULT 60,
  status TEXT NOT NULL DEFAULT 'scheduled', anesthesia TEXT, assistant TEXT, anesthetist TEXT,
  notes TEXT, created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS hms_invoices (
  id TEXT PRIMARY KEY, invoice_no TEXT NOT NULL UNIQUE, patient_id TEXT NOT NULL, encounter_id TEXT,
  items TEXT NOT NULL, subtotal REAL NOT NULL DEFAULT 0, discount REAL NOT NULL DEFAULT 0,
  tax REAL NOT NULL DEFAULT 0, total REAL NOT NULL DEFAULT 0, paid REAL NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'unpaid', created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS hms_alerts (
  id TEXT PRIMARY KEY, code TEXT NOT NULL, severity TEXT NOT NULL, category TEXT NOT NULL,
  title TEXT NOT NULL, detail TEXT, link TEXT, auto_fixable INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'open', first_seen TEXT NOT NULL, last_seen TEXT NOT NULL,
  due_at TEXT, resolved_at TEXT, resolution TEXT, occurrences INTEGER NOT NULL DEFAULT 1
);
CREATE TABLE IF NOT EXISTS hms_audit (
  id TEXT PRIMARY KEY, user_id TEXT, user_name TEXT, action TEXT NOT NULL, entity TEXT NOT NULL,
  entity_id TEXT, detail TEXT, created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS hms_licenses (
  id TEXT PRIMARY KEY, serial TEXT NOT NULL UNIQUE, plan TEXT NOT NULL, seats INTEGER NOT NULL DEFAULT 1,
  issued_at TEXT NOT NULL, activated_at TEXT, hospital TEXT, machine TEXT,
  status TEXT NOT NULL DEFAULT 'issued', note TEXT
);
CREATE INDEX IF NOT EXISTS idx_hms_rx_patient ON hms_prescriptions(patient_id);
CREATE INDEX IF NOT EXISTS idx_hms_rx_items ON hms_rx_items(prescription_id);
CREATE INDEX IF NOT EXISTS idx_hms_lab_status ON hms_lab_orders(status);
CREATE INDEX IF NOT EXISTS idx_hms_appt_start ON hms_appointments(start_at);
CREATE INDEX IF NOT EXISTS idx_hms_audit_created ON hms_audit(created_at);
`;

let ready = false;

export function hmsDb(): DatabaseSync {
  const db = getDb();
  if (!ready) {
    db.exec("PRAGMA foreign_keys = OFF;");
    db.exec(SCHEMA);
    ready = true;
  }
  return db;
}

/** Force a re-check of the schema (used by the installer/health-check scripts). */
export function ensureHmsSchema() {
  ready = false;
  hmsDb();
}

export type HmsRow = Record<string, unknown>;

function plain<T>(row: unknown): T {
  return { ...(row as Record<string, unknown>) } as T;
}

function bind(params: unknown[]): never[] {
  return params.map((p) => (p === undefined ? null : p)) as never[];
}

export function hAll<T = HmsRow>(sql: string, params: unknown[] = []): T[] {
  return (hmsDb().prepare(sql).all(...bind(params)) as unknown[]).map((r) => plain<T>(r));
}

export function hGet<T = HmsRow>(sql: string, params: unknown[] = []): T | undefined {
  const row = hmsDb().prepare(sql).get(...bind(params));
  return row === undefined ? undefined : plain<T>(row);
}

export function hRun(sql: string, params: unknown[] = []) {
  return hmsDb().prepare(sql).run(...bind(params));
}

export function hUid(prefix: string) {
  return `${prefix}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}

export function hNow() {
  return new Date().toISOString();
}

/** Bootstrap: schema + demo seed + default settings on first boot. */
export function hmsReady() {
  const db = hmsDb();
  const row = db.prepare("SELECT COUNT(*) AS c FROM hms_users").get() as { c: number } | undefined;
  if (!row || Number(row.c) === 0) seedHms(db);
  return db;
}

/* -------------------------------------------------------------- backup & reset */

/** Every hms_* table, row by row. Used by the JSON backup the owner downloads
 *  from Settings → Data, and by anyone who wants to inspect the hospital file. */
export function dumpHms(): { table: string; rows: Record<string, unknown>[] }[] {
  const db = hmsDb();
  const tables = db
    .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name LIKE 'hms_%' AND name NOT LIKE 'sqlite_%' ORDER BY name")
    .all() as { name: string }[];
  return tables.map((t) => ({
    table: t.name,
    rows: db.prepare(`SELECT * FROM "${t.name}"`).all() as Record<string, unknown>[],
  }));
}

/**
 * Return the demo hospital to the state it shipped in: drop the hms_* tables,
 * rebuild the schema and re-seed. The booking tables are left untouched so the
 * two halves of the repository stay independent.
 *
 * Destructive by design — the caller must be the administrator and must confirm.
 */
export function resetHmsData() {
  const db = hmsDb();
  const tables = db
    .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name LIKE 'hms_%' AND name NOT LIKE 'sqlite_%'")
    .all() as { name: string }[];
  db.exec("PRAGMA foreign_keys = OFF;");
  for (const t of tables) db.exec(`DROP TABLE IF EXISTS "${t.name}"`);
  db.exec(SCHEMA);
  seedHms(db);
  db.exec("PRAGMA foreign_keys = ON;");
  return tables.length;
}

/* ------------------------------------------------------------------ settings */

export type HmsSettings = Record<string, Record<string, unknown>>;

export const DEFAULT_SETTINGS: HmsSettings = {
  identity: {
    name: "Aybek Ten-Bed Specialy Surgical Hospital",
    name_short: "Aybek Hospital",
    name_local: "شفاخانه ده بستر جراحی ایبک",
    tagline: "Ten beds. One standard: surgical precision with human warmth.",
    license_no: "MOPH-AYB-2026-0148",
    tax_id: "TIN 900-482-771",
    phone: "+93 20 250 1188",
    emergency: "+93 700 118 800",
    email: "care@aybekhospital.af",
    website: "https://aybekhospital.af",
    address: "Street 4, Aybek Medical District, Kabul",
    city: "Kabul",
    country: "Afghanistan",
    timezone: "Asia/Kabul",
    currency: "USD",
    logo_mark: "cross",
    footer_note: "This document is computer generated and valid without a wet stamp when signed electronically.",
    language: "en",
  },
  clinical: {
    default_template: 1,
    follow_up_days: 14,
    rx_prefix: "RX",
    require_signature: true,
    show_icd10: true,
    vitals_required: true,
    drug_interaction_check: true,
    max_rx_items: 8,
    lab_turnaround_hours: 24,
    imaging_turnaround_hours: 12,
  },
  billing: {
    currency: "USD",
    tax_rate: 0,
    consultation_fee: 25,
    followup_fee: 10,
    bed_daily_rate: 45,
    lab_markup: 0,
    imaging_markup: 0,
    accept_cash: true,
    accept_card: true,
    accept_insurance: true,
    invoice_prefix: "AYB",
  },
  alerts: {
    enabled: true,
    interval_minutes: 30,
    sound: true,
    escalation_hours: 48,
    auto_heal: true,
    quiet_from: "22:00",
    quiet_to: "06:00",
    notify_roles: ["admin", "doctor"],
  },
  license: {
    status: "trial",
    serial: "",
    plan: "Trial (14 days)",
    seats: 5,
    activated_at: "",
    owner: "Dr. Mamon Aminyar",
    machine: "",
  },
  modules: {
    opd: true,
    pharmacy: true,
    laboratory: true,
    radiology: true,
    inpatient: true,
    surgery: true,
    billing: true,
    ai: true,
  },
  theme: {
    active: "clinical",
    rx_template: 1,
    density: "comfortable",
    accent: "#0ea5a4",
  },
};

export function getSettings(): HmsSettings {
  const rows = hAll<{ section: string; value: string }>("SELECT section, value FROM hms_settings");
  const out: HmsSettings = { ...DEFAULT_SETTINGS };
  for (const r of rows) {
    try {
      out[r.section] = { ...(out[r.section] ?? {}), ...(JSON.parse(r.value) as Record<string, unknown>) };
    } catch {
      /* ignore corrupt row */
    }
  }
  return out;
}

export function getSection<T extends Record<string, unknown>>(section: string): T {
  return (getSettings()[section] ?? {}) as T;
}

export function saveSettings(section: string, values: Record<string, unknown>) {
  const current = getSettings()[section] ?? {};
  const merged = { ...current, ...values };
  hRun(
    "INSERT INTO hms_settings (section, value, updated_at) VALUES (?,?,?) ON CONFLICT(section) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at",
    [section, JSON.stringify(merged), hNow()]
  );
  return merged;
}

/* ------------------------------------------------------------------ audit */

export function hAudit(
  user: { id?: string; name?: string } | null,
  action: string,
  entity: string,
  entityId: string | null,
  detail: string
) {
  hRun(
    "INSERT INTO hms_audit (id, user_id, user_name, action, entity, entity_id, detail, created_at) VALUES (?,?,?,?,?,?,?,?)",
    [hUid("aud"), user?.id ?? null, user?.name ?? "system", action, entity, entityId, detail, hNow()]
  );
}
