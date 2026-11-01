"use client";

import { AlertOctagon, AlertTriangle, Info, ShieldCheck } from "lucide-react";
import { useMemo, useState } from "react";
import type { Item } from "@/lib/hms/regimens/engine";

export type ReviewItem = {
  severity: "block" | "caution" | "info";
  drug: string;
  rule: string;
  title: string;
  detail: string;
};

export type BandView = {
  band: "child" | "adult" | "elderly";
  label: string;
  patient: string;
  age: number;
  sex: string;
  items: (Item & { shareLabel: string })[];
  findings: ReviewItem[];
  verdict: "block" | "caution" | "info" | "clear";
};

const TONE = {
  block: { icon: AlertOctagon, color: "#c0392b", bg: "rgba(192,57,43,.10)" },
  caution: { icon: AlertTriangle, color: "#a8630a", bg: "rgba(168,99,10,.10)" },
  info: { icon: Info, color: "#1f6feb", bg: "rgba(31,111,235,.10)" },
  clear: { icon: ShieldCheck, color: "#147a4b", bg: "rgba(20,122,75,.10)" },
} as const;

export function RegimenReview({
  bands,
  labels,
  noteTitle,
  noteBody,
}: {
  bands: BandView[];
  labels: { medicines: string; share: string; review: string; noFindings: string; patient: string; years: string; sexFemale: string; sexMale: string; blocks: string; cautions: string };
  noteTitle: string;
  noteBody: string;
}) {
  const [active, setActive] = useState(0);
  const view = bands[active];
  const tone = TONE[view.verdict];
  const Icon = tone.icon;
  const counts = useMemo(() => {
    const b = view.findings.filter((f) => f.severity === "block").length;
    const c = view.findings.filter((f) => f.severity === "caution").length;
    return { b, c };
  }, [view]);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-1.5">
        {bands.map((b, i) => {
          const t = TONE[b.verdict];
          return (
            <button
              key={b.band}
              type="button"
              onClick={() => setActive(i)}
              className="flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-medium transition"
              style={{
                borderColor: i === active ? "var(--hms-brand)" : "var(--hms-border)",
                background: i === active ? "var(--hms-brand-soft)" : "var(--hms-surface-2)",
                color: "var(--hms-ink)",
              }}
            >
              <t.icon size={13} style={{ color: t.color }} />
              {b.label}
            </button>
          );
        })}
      </div>

      <div className="rounded-xl border p-3" style={{ borderColor: "var(--hms-border)", background: "var(--hms-surface-2)" }}>
        <div className="flex flex-wrap items-baseline justify-between gap-1">
          <span className="text-sm font-semibold" style={{ color: "var(--hms-ink)" }}>
            {view.patient}
          </span>
          <span className="text-[11px]" style={{ color: "var(--hms-muted)" }}>
            {view.age} {labels.years} · {view.sex === "female" ? labels.sexFemale : labels.sexMale}
          </span>
        </div>

        <ul className="mt-2 space-y-1.5">
          {view.items.map((it, i) => (
            <li key={i} className="rounded-lg border px-2.5 py-1.5" style={{ borderColor: "var(--hms-border)", background: "var(--hms-surface)" }}>
              <div className="flex flex-wrap items-baseline justify-between gap-1">
                <span className="text-[13px] font-medium" style={{ color: "var(--hms-ink)" }}>{it.drug}</span>
                <span className="text-[11px] tabular-nums" style={{ color: "var(--hms-muted)" }}>{it.shareLabel}</span>
              </div>
              <div className="mt-0.5 text-[11px]" style={{ color: "var(--hms-muted)" }}>
                {it.form} · {it.strength} · {it.dose} · {it.frequency} · {it.route} · {it.quantity} {it.unit}
              </div>
              <div className="mt-1 h-1 w-full overflow-hidden rounded-full" style={{ background: "var(--hms-surface-3)" }}>
                <div className="h-full rounded-full" style={{ width: `${Math.min(100, it.sharePct)}%`, background: "var(--hms-brand)" }} />
              </div>
            </li>
          ))}
        </ul>
      </div>

      <div className="rounded-xl border p-3" style={{ borderColor: tone.color, background: tone.bg }}>
        <div className="flex items-center gap-1.5 text-sm font-semibold" style={{ color: tone.color }}>
          <Icon size={14} />
          {labels.review}
          <span className="ms-auto text-[11px] font-normal">
            {counts.b > 0 && `${counts.b} ${labels.blocks}`}
            {counts.b > 0 && counts.c > 0 && " · "}
            {counts.c > 0 && `${counts.c} ${labels.cautions}`}
          </span>
        </div>
        {view.findings.length === 0 ? (
          <p className="mt-1.5 text-[12px]" style={{ color: "var(--hms-ink)" }}>{labels.noFindings}</p>
        ) : (
          <ul className="mt-1.5 space-y-1.5">
            {view.findings.map((f, i) => {
              const t = TONE[f.severity];
              return (
                <li key={i} className="flex gap-1.5 text-[12px]" style={{ color: "var(--hms-ink)" }}>
                  <t.icon size={13} className="mt-0.5 shrink-0" style={{ color: t.color }} />
                  <span>
                    <span className="font-medium">{f.drug}</span> — {f.title}
                    <span className="block text-[11px]" style={{ color: "var(--hms-muted)" }}>{f.detail}</span>
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <div className="rounded-xl border px-3 py-2" style={{ borderColor: "var(--hms-border)", background: "var(--hms-surface-2)" }}>
        <p className="text-[12px] font-semibold" style={{ color: "var(--hms-ink)" }}>{noteTitle}</p>
        <p className="mt-1 text-[11px] leading-relaxed" style={{ color: "var(--hms-muted)" }}>{noteBody}</p>
      </div>
    </div>
  );
}
