import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { BUSINESS } from "./types";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const TZ = BUSINESS.timezone;

/** S$1,240.50 */
export function money(n: number | null | undefined, compact = false) {
  const v = Number(n ?? 0);
  if (compact && Math.abs(v) >= 1000) {
    const units = [
      { d: 1_000_000, s: "M" },
      { d: 1_000, s: "k" },
    ];
    const u = units.find((x) => Math.abs(v) >= x.d)!;
    return `S$${(v / u.d).toFixed(v / u.d >= 100 ? 0 : 1).replace(/\.0$/, "")}${u.s}`;
  }
  return `S$${v.toLocaleString("en-SG", { minimumFractionDigits: v % 1 === 0 ? 0 : 2, maximumFractionDigits: 2 })}`;
}

export function num(n: number | null | undefined) {
  return Number(n ?? 0).toLocaleString("en-SG");
}

export function pct(n: number | null | undefined, digits = 0) {
  return `${(Number(n ?? 0)).toFixed(digits)}%`;
}

function parts(iso: string | Date, opts: Intl.DateTimeFormatOptions) {
  return new Intl.DateTimeFormat("en-SG", { timeZone: TZ, ...opts }).format(
    typeof iso === "string" ? new Date(iso) : iso
  );
}

/** 14 Mar 2026 */
export function fmtDate(iso: string | Date | null | undefined) {
  if (!iso) return "—";
  return parts(iso, { day: "2-digit", month: "short", year: "numeric" });
}

/** Sat, 14 Mar */
export function fmtDateShort(iso: string | Date | null | undefined) {
  if (!iso) return "—";
  return parts(iso, { weekday: "short", day: "numeric", month: "short" });
}

/** Sat, 14 Mar — from a YYYY-MM-DD key */
export function fmDateKey(key: string) {
  return new Intl.DateTimeFormat("en-SG", {
    timeZone: TZ,
    weekday: "short",
    day: "numeric",
    month: "short",
  }).format(new Date(`${key}T12:00:00+08:00`));
}

/** 14 Mar */
export function fmtDayMonth(iso: string | Date | null | undefined) {
  if (!iso) return "—";
  return parts(iso, { day: "numeric", month: "short" });
}

/** 3:30 pm */
export function fmtTime(iso: string | Date | null | undefined) {
  if (!iso) return "—";
  return parts(iso, { hour: "numeric", minute: "2-digit", hour12: true }).toLowerCase();
}

/** 14 Mar 2026, 3:30 pm */
export function fmtDateTime(iso: string | Date | null | undefined) {
  if (!iso) return "—";
  return `${fmtDate(iso)}, ${fmtTime(iso)}`;
}

/** YYYY-MM-DD in business timezone */
export function dateKey(iso: string | Date = new Date()) {
  const d = typeof iso === "string" ? new Date(iso) : iso;
  const p = new Intl.DateTimeFormat("en-CA", {
    timeZone: TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
  return p; // en-CA yields YYYY-MM-DD
}

/** HH:mm in business timezone */
export function timeKey(iso: string | Date) {
  return parts(iso, { hour: "2-digit", minute: "2-digit", hour12: false });
}

/** Convert business-local date + time into a UTC ISO string (Singapore, no DST) */
export function toIso(dateKeyValue: string, timeValue: string) {
  return new Date(`${dateKeyValue}T${timeValue}:00+08:00`).toISOString();
}

export function addMinutes(iso: string, minutes: number) {
  return new Date(new Date(iso).getTime() + minutes * 60_000).toISOString();
}

export function minutesBetween(a: string, b: string) {
  return Math.round((new Date(b).getTime() - new Date(a).getTime()) / 60_000);
}

export function todayKey() {
  return dateKey(new Date());
}

export function addDaysKey(key: string, days: number) {
  const d = new Date(`${key}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export function startOfWeekKey(key: string) {
  const d = new Date(`${key}T00:00:00Z`);
  const dow = d.getUTCDay(); // 0 Sun
  const diff = dow === 0 ? -6 : 1 - dow; // Monday start
  d.setUTCDate(d.getUTCDate() + diff);
  return d.toISOString().slice(0, 10);
}

export function relativeTime(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.round(diff / 60000);
  if (Math.abs(mins) < 1) return "just now";
  if (Math.abs(mins) < 60) return `${mins}m ago`;
  const hours = Math.round(mins / 60);
  if (Math.abs(hours) < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  if (Math.abs(days) < 30) return `${days}d ago`;
  return fmtDate(iso);
}

export function initials(name: string | null | undefined) {
  if (!name) return "?";
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((n) => n[0]?.toUpperCase())
    .join("");
}

export function titleCase(s: string) {
  return s.replace(/[_-]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export function durationLabel(min: number) {
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m ? `${h}h ${m}m` : `${h}h`;
}

export function parseJson<T>(value: string | null | undefined, fallback: T): T {
  if (!value) return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

export function bookingCode() {
  return `BK-${Math.random().toString(36).slice(2, 6).toUpperCase()}${Math.floor(Math.random() * 90 + 10)}`;
}

export function invoiceNo() {
  const y = new Date().getFullYear();
  return `INV-${y}-${Math.floor(Math.random() * 9000 + 1000)}`;
}
