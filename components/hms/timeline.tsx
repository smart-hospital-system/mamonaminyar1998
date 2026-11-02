"use client";

import {
  Activity, BedDouble, CalendarDays, CreditCard, FlaskConical, Pill, ScanLine, Scissors, Stethoscope,
} from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { useLang } from "./lang-provider";

/**
 * One chronological spine for the whole chart.
 *
 * The old page listed each table separately, which meant a surgeon had to hold
 * four lists in their head to reconstruct a stay. This merges every event —
 * encounter, prescription, lab, imaging, admission, operation, invoice — into a
 * single time-ordered story, filterable by kind, with the source of each line
 * one click away.
 */

export type TimelineEvent = {
  id: string;
  kind: "encounter" | "rx" | "lab" | "imaging" | "admission" | "surgery" | "invoice";
  at: string;
  title: string;
  detail?: string;
  status?: string;
  href?: string;
};

const KIND: Record<TimelineEvent["kind"], { icon: typeof Activity; en: string; fa: string; color: string }> = {
  encounter: { icon: Stethoscope, en: "Visit", fa: "معاینه", color: "#0e9488" },
  rx: { icon: Pill, en: "Prescription", fa: "نسخه", color: "#2563eb" },
  lab: { icon: FlaskConical, en: "Laboratory", fa: "لابراتوار", color: "#7c3aed" },
  imaging: { icon: ScanLine, en: "Imaging", fa: "اکسری", color: "#0891b2" },
  admission: { icon: BedDouble, en: "Ward", fa: "بستری", color: "#d97706" },
  surgery: { icon: Scissors, en: "Theatre", fa: "عملیات", color: "#b91c1c" },
  invoice: { icon: CreditCard, en: "Billing", fa: "بل", color: "#4d7c0f" },
};

export function PatientTimeline({ events }: { events: TimelineEvent[] }) {
  const { tx, lang } = useLang();
  const [filter, setFilter] = useState<"all" | TimelineEvent["kind"]>("all");

  const kinds = useMemo(() => {
    const set = new Set(events.map((e) => e.kind));
    return Array.from(set);
  }, [events]);

  const shown = useMemo(
    () => (filter === "all" ? events : events.filter((e) => e.kind === filter)).slice().sort((a, b) => b.at.localeCompare(a.at)),
    [events, filter]
  );

  return (
    <div className="hms-card">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b px-3.5 py-2.5" style={{ borderColor: "var(--hms-border)" }}>
        <div>
          <p className="text-[0.84rem] font-semibold">{tx("One timeline", "یک خط زمانی")}</p>
          <p className="text-[0.64rem]" style={{ color: "var(--hms-muted)" }}>
            {tx("Every visit, prescription, test and bill in one story — newest first.", "هر معاینه، نسخه، تست و بل در یک داستان — جدیدترین اول.")}
          </p>
        </div>
        <div className="flex flex-wrap gap-1">
          <button onClick={() => setFilter("all")} data-active={filter === "all"} className="hms-tab !h-7 !text-[0.66rem]">
            {tx("All", "همه")} <span style={{ color: "var(--hms-faint)" }}>{events.length}</span>
          </button>
          {kinds.map((k) => {
            const K = KIND[k];
            return (
              <button key={k} onClick={() => setFilter(k)} data-active={filter === k} className="hms-tab !h-7 !text-[0.66rem]">
                <K.icon size={11} /> {tx(K.en, K.fa)}
              </button>
            );
          })}
        </div>
      </div>

      <div className="max-h-[26rem] overflow-y-auto px-3.5 py-3">
        {shown.length === 0 && (
          <p className="py-6 text-center text-[0.72rem]" style={{ color: "var(--hms-faint)" }}>
            {tx("Nothing recorded of this kind yet.", "از این نوع هنوز چیزی ثبت نشده.")}
          </p>
        )}
        <ol className="relative space-y-3 border-s ps-3.5" style={{ borderColor: "var(--hms-border)" }}>
          {shown.map((e) => {
            const K = KIND[e.kind];
            const Icon = K.icon;
            const body = (
              <>
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="rounded px-1.5 py-0.5 text-[0.56rem] font-bold uppercase tracking-[0.08em]" style={{ background: `color-mix(in srgb, ${K.color} 12%, transparent)`, color: K.color }}>
                    {tx(K.en, K.fa)}
                  </span>
                  <p className="min-w-0 flex-1 truncate text-[0.74rem] font-medium">{e.title}</p>
                  {e.status && <span className="text-[0.58rem] capitalize" style={{ color: "var(--hms-faint)" }}>{e.status}</span>}
                </div>
                {e.detail && <p className="mt-0.5 text-[0.66rem] leading-relaxed" style={{ color: "var(--hms-muted)" }}>{e.detail}</p>}
                <p className="mt-0.5 text-[0.58rem]" style={{ color: "var(--hms-faint)" }} data-num>
                  {new Date(e.at).toLocaleString(lang === "fa" ? "fa-AF" : "en-GB", { dateStyle: "medium", timeStyle: "short" })}
                </p>
              </>
            );
            return (
              <li key={`${e.kind}-${e.id}`} className="relative">
                <span
                  className="absolute -start-[1.42rem] top-0.5 grid h-4 w-4 place-items-center rounded-full ring-2"
                  style={{ background: `color-mix(in srgb, ${K.color} 16%, var(--hms-surface))`, color: K.color, ["--tw-ring-color" as string]: "var(--hms-surface)" }}
                >
                  <Icon size={9} />
                </span>
                {e.href ? (
                  <Link href={e.href} className="block rounded-lg px-1.5 py-1 transition hover:bg-[var(--hms-surface-2)]">
                    {body}
                  </Link>
                ) : (
                  <div className="px-1.5 py-1">{body}</div>
                )}
              </li>
            );
          })}
        </ol>
      </div>
    </div>
  );
}

/** A compact strip of things that must not be missed before the next decision. */
export function SafetyStrip({ items }: { items: { tone: "good" | "warn" | "bad"; label: string; href?: string }[] }) {
  const { tx } = useLang();
  if (!items.length) {
    return (
      <div className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[0.68rem]" style={{ background: "color-mix(in srgb,#10b981 10%, transparent)", color: "#0b7a58" }}>
        <Activity size={12} /> {tx("Nothing needs attention on this chart right now.", "همین حالا چیزی در این پرونده نیاز به توجه ندارد.")}
      </div>
    );
  }
  const color = { good: "#0f9d6e", warn: "#b45309", bad: "#b91c1c" };
  return (
    <div className="flex flex-wrap gap-1.5">
      {items.map((i) => (
        <span key={i.label} className="rounded-full px-2.5 py-1 text-[0.66rem] font-medium" style={{ background: `color-mix(in srgb, ${color[i.tone]} 11%, transparent)`, color: color[i.tone] }}>
          {i.label}
        </span>
      ))}
    </div>
  );
}

/** Unused import guard for icons referenced only in the type map. */
export const _timelineIcons = { Activity, CalendarDays };
