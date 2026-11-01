/**
 * Pure formatters shared by server and client components.
 *
 * Every function takes an optional `lang`. English stays the default so old
 * call sites keep compiling, but every screen now passes the person's language
 * through, which changes three things:
 *   • Persian digits (۱۲۳ instead of 123)
 *   • the Solar Hijri (Persian) calendar for dates, which is what a Kabul
 *     hospital writes on a prescription
 *   • Persian phrases for relative time ("۳ ساعت پیش")
 */

import type { Lang } from "./i18n";

const FA_DIGITS = ["۰", "۱", "۲", "۳", "۴", "۵", "۶", "۷", "۸", "۹"];

function toFaDigits(s: string): string {
  return s.replace(/[0-9]/g, (d) => FA_DIGITS[Number(d)]);
}

export function digitsOf(lang: Lang | undefined, s: string | number): string {
  const text = String(s);
  return lang === "fa" ? toFaDigits(text) : text;
}

export function money(n: number | null | undefined, lang?: Lang) {
  const v = Number(n ?? 0);
  const body = v.toLocaleString("en-US", { minimumFractionDigits: v % 1 === 0 ? 0 : 2, maximumFractionDigits: 2 });
  return lang === "fa" ? `${toFaDigits(body)} $` : `$${body}`;
}

export function dateShort(iso: string | null | undefined, lang?: Lang) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (lang === "fa") {
    // Solar Hijri, Persian month names and Persian digits.
    const s = new Intl.DateTimeFormat("fa-IR-u-ca-persian", { day: "2-digit", month: "short", year: "numeric" }).format(d);
    return s;
  }
  return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

export function dateLong(iso: string | null | undefined, lang?: Lang) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (lang === "fa") {
    return new Intl.DateTimeFormat("fa-IR-u-ca-persian", { weekday: "long", day: "numeric", month: "long", year: "numeric" }).format(d);
  }
  return d.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
}

export function timeShort(iso: string | null | undefined, lang?: Lang) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (lang === "fa") {
    return new Intl.DateTimeFormat("fa-IR", { hour: "2-digit", minute: "2-digit", hour12: false }).format(d);
  }
  return d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", hour12: true });
}

export function age(dob: string | null | undefined, lang?: Lang) {
  if (!dob) return "—";
  const d = new Date(dob);
  const diff = Date.now() - d.getTime();
  const years = Math.floor(diff / (365.25 * 864e5));
  return lang === "fa" ? `${toFaDigits(String(years))} سال` : `${years}y`;
}

export function relTime(iso: string | null | undefined, lang?: Lang) {
  if (!iso) return "—";
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.round(diff / 60000);
  const n = (v: number) => (lang === "fa" ? toFaDigits(String(v)) : String(v));
  if (Math.abs(mins) < 1) return lang === "fa" ? "همین حالا" : "just now";
  if (Math.abs(mins) < 60) return lang === "fa" ? `${n(mins)} دقیقه پیش` : `${mins}m ago`;
  const hours = Math.round(mins / 60);
  if (Math.abs(hours) < 24) return lang === "fa" ? `${n(hours)} ساعت پیش` : `${hours}h ago`;
  const days = Math.round(hours / 24);
  if (Math.abs(days) < 30) return lang === "fa" ? `${n(days)} روز پیش` : `${days}d ago`;
  return dateShort(iso, lang);
}

export function initials(name: string) {
  return name.split(" ").filter(Boolean).slice(0, 2).map((n) => n[0]?.toUpperCase()).join("");
}

/** Percentages and plain counts that a person reads. */
export function num(value: number, lang?: Lang) {
  return lang === "fa" ? toFaDigits(value.toLocaleString("en-US")) : value.toLocaleString("en-US");
}
