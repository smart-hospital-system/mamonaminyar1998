"use client";

import { Check, Loader2, Sparkles, Wrench, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { relTime } from "@/lib/hms/format";
import { statusText } from "@/lib/hms/i18n";
import { useLang, useTr } from "./lang-provider";
import { Pill } from "./ui";

type Alert = {
  id: string;
  code: string;
  severity: string;
  category: string;
  title: string;
  detail: string | null;
  link: string | null;
  auto_fixable: number;
  status: string;
  first_seen: string;
  last_seen?: string | null;
  due_at?: string | null;
  occurrences: number;
};

export function AlertList({ alerts, compact }: { alerts: Alert[]; compact?: boolean }) {
  const router = useRouter();
  const t = useTr();
  const { lang } = useLang();
  const [busy, setBusy] = useState<string | null>(null);
  const [, startTransition] = useTransition();
  const [note, setNote] = useState<{ tone: "ok" | "bad"; text: string } | null>(null);

  async function act(id: string, action: "heal" | "acknowledge" | "resolve") {
    setBusy(id + action);
    try {
      const res = await fetch("/api/hms/alerts", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action, id, note: "Resolved from the command centre" }),
      });
      const data = await res.json();
      setNote({ tone: res.ok ? "ok" : "bad", text: data.message ?? (res.ok ? t("al.updated") : data.error ?? t("al.couldNot")) });
      startTransition(() => router.refresh());
    } catch {
      setNote({ tone: "bad", text: t("al.network") });
    } finally {
      setBusy(null);
    }
  }

  if (!alerts.length) {
    return (
      <div className="flex flex-col items-center gap-1 px-3 py-6 text-center">
        <span className="flex h-8 w-8 items-center justify-center rounded-full" style={{ background: "color-mix(in srgb,#10b981 16%, transparent)", color: "#0b7a58" }}>
          <Check size={15} />
        </span>
        <p className="text-[0.76rem] font-semibold">{t("al.none")}</p>
        <p className="text-[0.66rem]" style={{ color: "var(--hms-muted)" }}>
          {t("al.noneHint")}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-1.5">
      {note && (
        <p
          className="flex items-center gap-1.5 rounded-md px-2 py-1.5 text-[0.66rem]"
          style={{ background: note.tone === "ok" ? "#dcfce7" : "#fee2e2", color: note.tone === "ok" ? "#166534" : "#991b1b" }}
        >
          {note.tone === "ok" ? <Check size={11} /> : <X size={11} />}
          {note.text}
          <button className="ml-auto opacity-60" onClick={() => setNote(null)}><X size={10} /></button>
        </p>
      )}
      {alerts.map((a) => {
        const tone = a.severity === "critical" ? "bad" : a.severity === "warning" ? "warn" : "info";
        return (
          <div
            key={a.id}
            className="rounded-lg border p-2.5"
            style={{
              borderColor: a.severity === "critical" ? "color-mix(in srgb,#ef4444 32%, var(--hms-border))" : "var(--hms-border)",
              background: a.severity === "critical" ? "color-mix(in srgb,#ef4444 5%, var(--hms-surface))" : "var(--hms-surface)",
            }}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-1.5">
                  <Pill tone={tone as "bad"} dot>{statusText(lang, a.severity)}</Pill>
                  <span className="text-[0.6rem]" style={{ color: "var(--hms-faint)" }}>{a.category} · {relTime(a.last_seen ?? a.first_seen, lang)}</span>
                  {a.occurrences > 1 && <span className="text-[0.6rem]" style={{ color: "var(--hms-faint)" }}>×{a.occurrences}</span>}
                </div>
                <p className="mt-1 text-[0.76rem] font-semibold leading-tight">{a.title}</p>
                {!compact && <p className="mt-0.5 text-[0.68rem] leading-relaxed" style={{ color: "var(--hms-muted)" }}>{a.detail}</p>}
              </div>
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-1.5">
              {a.auto_fixable ? (
                <button className="hms-btn hms-btn-sm hms-btn-primary" onClick={() => act(a.id, "heal")} disabled={!!busy}>
                  {busy === a.id + "heal" ? <Loader2 size={10} className="animate-spin" /> : <Wrench size={10} />}
                  {t("al.autoFix")}
                </button>
              ) : null}
              <button className="hms-btn hms-btn-sm" onClick={() => act(a.id, "acknowledge")} disabled={!!busy}>
                <Sparkles size={10} /> {t("al.ack")}
              </button>
              <button className="hms-btn hms-btn-sm hms-btn-ghost" onClick={() => act(a.id, "resolve")} disabled={!!busy}>
                <Check size={10} /> {t("al.resolve")}
              </button>
              {a.link && (
                <a href={a.link} className="ml-auto text-[0.64rem] font-semibold" style={{ color: "var(--hms-brand)" }}>
                  {t("al.goTo")}
                </a>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function ScanButton() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function scan() {
    setBusy(true);
    try {
      const res = await fetch("/api/hms/alerts?scan=1", { method: "POST" });
      const data = await res.json();
      setMsg(`${data.alerts?.length ?? 0} alarm(s) open · health ${data.health?.score ?? "—"}%`);
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <span className="flex items-center gap-2">
      {msg && <span className="text-[0.62rem]" style={{ color: "var(--hms-faint)" }}>{msg}</span>}
      <button className="hms-btn hms-btn-sm" onClick={scan} disabled={busy}>
        {busy ? <Loader2 size={11} className="animate-spin" /> : <Wrench size={11} />} Run scan
      </button>
    </span>
  );
}
