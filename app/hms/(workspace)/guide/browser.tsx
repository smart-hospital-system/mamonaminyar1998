"use client";

import { Check, ChevronRight, Clock, ExternalLink, Search } from "lucide-react";
import { useMemo, useState } from "react";
import { Pill } from "@/components/hms/ui";

type Step = { n: number; title: string; where: string; action: string; tip?: string; href?: string };
type Chapter = { id: string; title: string; audience: string; summary: string; minutes: number; steps: Step[]; faq: { q: string; a: string }[] };

export function GuideBrowser({ chapters, initial }: { chapters: Chapter[]; initial: string }) {
  const [active, setActive] = useState(initial);
  const [done, setDone] = useState<string[]>(() => {
    if (typeof window === "undefined") return [];
    try {
      return JSON.parse(window.localStorage.getItem("aybek-guide-done") ?? "[]");
    } catch {
      return [];
    }
  });
  const [q, setQ] = useState("");

  const chapter = chapters.find((c) => c.id === active) ?? chapters[0];
  const progress = Math.round((done.length / Math.max(1, chapters.reduce((a, c) => a + c.steps.length, 0))) * 100);

  const matches = useMemo(() => {
    const n = q.trim().toLowerCase();
    if (!n) return chapters;
    return chapters.filter((c) => c.title.toLowerCase().includes(n) || c.summary.toLowerCase().includes(n) || c.steps.some((s) => (s.action + s.where + (s.tip ?? "")).toLowerCase().includes(n)));
  }, [chapters, q]);

  function toggle(key: string) {
    const next = done.includes(key) ? done.filter((k) => k !== key) : [...done, key];
    setDone(next);
    try { window.localStorage.setItem("aybek-guide-done", JSON.stringify(next)); } catch { /* private mode */ }
  }

  return (
    <div className="grid gap-3 md:grid-cols-[13rem_1fr]">
      <div>
        <div className="relative">
          <Search size={12} className="absolute left-2 top-1/2 -translate-y-1/2" style={{ color: "var(--hms-faint)" }} />
          <input className="hms-input !h-8 !text-[0.72rem] pl-6" placeholder="Search the guide…" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <div className="mt-1.5 space-y-0.5">
          {matches.map((c) => (
            <button key={c.id} onClick={() => setActive(c.id)} data-active={active === c.id} className="hms-nav h-8 w-full text-[0.7rem]">
              <span className="flex-1 truncate text-left">{c.title}</span>
              <span className="text-[0.56rem]" style={{ color: "var(--hms-faint)" }}>{c.minutes}m</span>
            </button>
          ))}
        </div>
        <div className="mt-2 rounded-lg border p-2" style={{ borderColor: "var(--hms-border)" }}>
          <div className="flex justify-between text-[0.6rem]"><span>Chapter progress</span><span className="font-semibold">{progress}%</span></div>
          <div className="mt-1 h-1.5 overflow-hidden rounded-full" style={{ background: "var(--hms-surface-3)" }}>
            <div className="h-full rounded-full" style={{ width: `${progress}%`, background: "var(--hms-brand)" }} />
          </div>
        </div>
      </div>

      <div>
        <div className="flex flex-wrap items-center gap-1.5">
          <Pill tone="brand">{chapter.audience}</Pill>
          <Pill tone="neutral"><Clock size={10} /> {chapter.minutes} min</Pill>
        </div>
        <h3 className="mt-1.5 text-[0.95rem] font-semibold tracking-[-0.01em]">{chapter.title}</h3>
        <p className="mt-0.5 text-[0.72rem] leading-relaxed" style={{ color: "var(--hms-muted)" }}>{chapter.summary}</p>

        <ol className="mt-3 space-y-2">
          {chapter.steps.map((s) => {
            const key = `${chapter.id}:${s.n}`;
            const isDone = done.includes(key);
            return (
              <li key={s.n} className="flex gap-2 rounded-lg border p-2" style={{ borderColor: isDone ? "color-mix(in srgb,#10b981 35%, var(--hms-border))" : "var(--hms-border)", background: isDone ? "color-mix(in srgb,#10b981 4%, transparent)" : undefined }}>
                <button
                  onClick={() => toggle(key)}
                  className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border text-[0.6rem] font-bold"
                  style={{ borderColor: isDone ? "#10b981" : "var(--hms-border)", background: isDone ? "#10b981" : "transparent", color: isDone ? "#fff" : "var(--hms-muted)" }}
                  title={isDone ? "Mark as not done" : "Mark as done"}
                >
                  {isDone ? <Check size={11} /> : s.n}
                </button>
                <div className="min-w-0">
                  <p className="text-[0.74rem] font-semibold">{s.title}</p>
                  <p className="mt-0.5 text-[0.66rem] leading-relaxed" style={{ color: "var(--hms-muted)" }}>
                    <b style={{ color: "var(--hms-ink, var(--hms-ink))" }}>{s.where}</b> — {s.action}
                  </p>
                  {s.tip && <p className="mt-0.5 rounded px-1.5 py-1 text-[0.63rem] leading-relaxed" style={{ background: "var(--hms-surface-2)", color: "var(--hms-muted)" }}>Tip · {s.tip}</p>}
                  {s.href && (
                    <a href={s.href} className="mt-1 inline-flex items-center gap-0.5 text-[0.64rem] font-semibold" style={{ color: "var(--hms-brand)" }}>
                      Open this screen <ExternalLink size={10} />
                    </a>
                  )}
                </div>
              </li>
            );
          })}
        </ol>

        {chapter.faq.length > 0 && (
          <div className="mt-3">
            <p className="hms-label">Questions from the ward</p>
            <div className="space-y-1">
              {chapter.faq.map((f) => (
                <details key={f.q} className="rounded-lg border px-2 py-1.5" style={{ borderColor: "var(--hms-border)" }}>
                  <summary className="flex cursor-pointer items-center gap-1 text-[0.7rem] font-medium">{f.q} <ChevronRight size={10} /></summary>
                  <p className="mt-1 text-[0.65rem] leading-relaxed" style={{ color: "var(--hms-muted)" }}>{f.a}</p>
                </details>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
