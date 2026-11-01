"use client";

import { AlertTriangle, CheckCircle2, FileText, Loader2, Microscope, Search, Syringe, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Empty, Field, Person, Status } from "@/components/hms/ui";
import { relTime } from "@/lib/hms/format";
import { statusText } from "@/lib/hms/i18n";
import { useLang, useTx } from "@/components/hms/lang-provider";
import type { LabRow } from "@/lib/hms/queries";

type Flag = { name?: string; value?: string; flag: string; note?: string };

const TABS = ["all", "ordered", "collected", "in_progress", "verified"] as const;

export function LabBoard({ rows, role }: { rows: LabRow[]; role: string }) {
  const router = useRouter();
  const tx = useTx();
  const { lang } = useLang();
  const [tab, setTab] = useState<(typeof TABS)[number]>("all");
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [entry, setEntry] = useState<LabRow | null>(null);
  const [text, setText] = useState("");
  const [flags, setFlags] = useState<Flag[] | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  const filtered = rows.filter((r) => (tab === "all" || r.status === tab) && (!q || r.patient_name.toLowerCase().includes(q.toLowerCase()) || r.test_name.toLowerCase().includes(q.toLowerCase()) || r.mrn.includes(q)));

  async function act(id: string, action: string, payload: Record<string, unknown> = {}) {
    setBusy(id + action);
    const res = await fetch(`/api/hms/lab/${id}`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ action, ...payload }) });
    const data = await res.json();
    setBusy(null);
    if (!res.ok) setMsg(data.error ?? tx("Action failed.", "اقدام انجام نشد."));
    else {
      if (data.flags) setFlags(data.flags);
      router.refresh();
      if (action === "verify") {
        setMsg(tx("Result verified and released to the ordering physician.", "نتیجه تأیید و برای داکتر درخواست‌کننده آزاد شد."));
        setEntry(null);
      }
    }
  }

  async function preview(value: string) {
    setText(value);
    if (!value.trim()) return setFlags(null);
    const res = await fetch("/api/hms/ai", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ action: "lab", text: value }) });
    const data = await res.json();
    setFlags(data.result ?? []);
  }

  const counts = Object.fromEntries(TABS.map((t) => [t, t === "all" ? rows.length : rows.filter((r) => r.status === t).length])) as Record<string, number>;

  return (
    <div className="mt-3">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-[13rem] flex-1">
          <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2" style={{ color: "var(--hms-faint)" }} />
          <input className="hms-input pl-7" placeholder={tx("Patient, MRN or test…", "مریض، شمارهٔ پرونده یا تست…")} value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <div className="flex flex-wrap gap-1">
          {TABS.map((t) => (
            <button key={t} onClick={() => setTab(t)} className="hms-btn hms-btn-sm capitalize" style={tab === t ? { background: "var(--hms-brand-soft)", borderColor: "transparent", color: "var(--hms-brand-ink)" } : undefined}>
              {t === "all" ? tx("all", "همه") : statusText(lang, t)} <span className="rounded-full px-1 text-[0.56rem]" style={{ background: "var(--hms-surface-3)" }}>{counts[t]}</span>
            </button>
          ))}
        </div>
      </div>

      {msg && <p className="mt-2 flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[0.7rem]" style={{ background: "color-mix(in srgb,#10b981 12%, transparent)", color: "#0b6b4d" }}><CheckCircle2 size={12} /> {msg}<button className="ml-auto" onClick={() => setMsg(null)}><X size={11} /></button></p>}

      <div className="mt-2 overflow-x-auto rounded-lg border" style={{ borderColor: "var(--hms-border)" }}>
        <table className="w-full min-w-[54rem]">
          <thead style={{ background: "var(--hms-surface-2)" }}>
            <tr>
              <th className="hms-th">{tx("Patient", "مریض")}</th>
              <th className="hms-th">{tx("Test", "تست")}</th>
              <th className="hms-th">{tx("Priority", "اولویت")}</th>
              <th className="hms-th">{tx("Sample", "نمونه")}</th>
              <th className="hms-th">{tx("Result", "نتیجه")}</th>
              <th className="hms-th">{tx("Ordered", "سفارش")}</th>
              <th className="hms-th">{tx("Status", "وضعیت")}</th>
              <th className="hms-th text-right">{tx("Workflow", "جریان کار")}</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((r) => (
              <tr key={r.id} className="hms-row">
                <td className="hms-td"><Person name={r.patient_name} sub={r.mrn} size={24} /></td>
                <td className="hms-td">
                  <p className="font-medium">{r.test_name}</p>
                  <p className="text-[0.6rem]" style={{ color: "var(--hms-faint)" }}>{r.panel} · {r.doctor_name}</p>
                </td>
                <td className="hms-td">{r.priority === "urgent" ? <span className="hms-pill" style={{ background: "#fee2e2", color: "#991b1b" }}>{tx("urgent", "فوری")}</span> : <span className="text-[0.68rem]" style={{ color: "var(--hms-faint)" }}>{tx("routine", "عادی")}</span>}</td>
                <td className="hms-td text-[0.7rem]">{r.sample_type ?? "—"}</td>
                <td className="hms-td max-w-[12rem] truncate text-[0.7rem]">
                  {r.result ? <span className={/critical|↑|high/i.test(r.result) ? "font-semibold" : ""} style={/critical|↑/i.test(r.result) ? { color: "#b91c1c" } : undefined}>{r.result}</span> : <span style={{ color: "var(--hms-faint)" }}>{tx("pending", "در انتظار")}</span>}
                </td>
                <td className="hms-td whitespace-nowrap text-[0.68rem]">{relTime(r.created_at, lang)}</td>
                <td className="hms-td"><Status value={r.status} /></td>
                <td className="hms-td">
                  <div className="flex justify-end gap-1">
                    {r.status === "ordered" && (
                      <button className="hms-btn hms-btn-sm" onClick={() => act(r.id, "collect")} disabled={!!busy}>
                        {busy === r.id + "collect" ? <Loader2 size={10} className="animate-spin" /> : <Syringe size={10} />} {tx("Collect", "نمونه‌گیری")}
                      </button>
                    )}
                    {["collected", "in_progress"].includes(r.status) && (
                      <button className="hms-btn hms-btn-sm" onClick={() => { setEntry(r); setText(r.result ?? ""); setFlags(null); }}>
                        <Microscope size={10} /> {tx("Enter result", "ثبت نتیجه")}
                      </button>
                    )}
                    {r.status === "in_progress" && ["admin", "lab", "doctor"].includes(role) && (
                      <button className="hms-btn hms-btn-sm hms-btn-primary" onClick={() => act(r.id, "verify")} disabled={!!busy}>
                        {busy === r.id + "verify" ? <Loader2 size={10} className="animate-spin" /> : <CheckCircle2 size={10} />} {tx("Verify", "تأیید")}
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!filtered.length && <Empty title={tx("Nothing in this lane", "در این بخش چیزی نیست")} hint={tx("Switch tabs or clear the search.", "تب را عوض کنید یا جستجو را پاک کنید.")} icon={<FileText size={16} />} />}
      </div>

      {entry && (
        <div className="fixed inset-0 z-[70] flex items-start justify-center overflow-y-auto bg-black/45 p-4" onClick={() => setEntry(null)}>
          <div className="my-8 w-full max-w-xl rounded-xl border bg-[var(--hms-surface)] p-4 shadow-2xl" style={{ borderColor: "var(--hms-border)" }} onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between">
              <div>
                <p className="text-[0.84rem] font-semibold">{entry.test_name}</p>
                <p className="text-[0.64rem]" style={{ color: "var(--hms-faint)" }}>{entry.patient_name} · {entry.mrn} · {tx("ordered by", "سفارش‌دهنده")} {entry.doctor_name}</p>
              </div>
              <button className="hms-btn hms-btn-sm hms-btn-ghost" onClick={() => setEntry(null)}><X size={13} /></button>
            </div>
            <div className="mt-2">
              <Field label={tx("Results (one per line, e.g. “Hb 9.2 g/dL”)", "نتایج (هر کدام در یک سطر، مثلاً «Hb 9.2 g/dL»)")} hint={tx("The assistant recognises common analytes and flags low / high / critical values automatically.", "دستیار اقلام آزمایشی رایج را می‌شناسد و مقادیر کم / بلند / بحرانی را خودکار علامت می‌زند.")}>
                <textarea className="hms-input" rows={6} value={text} onChange={(e) => preview(e.target.value)} placeholder={"WBC 13.4 10^9/L\nHb 9.1 g/dL\nPLT 180 10^9/L\nCRP 82 mg/L"} />
              </Field>
            </div>
            {flags && flags.length > 0 && (
              <div className="mt-2 rounded-lg border p-2" style={{ borderColor: "var(--hms-border)" }}>
                <p className="text-[0.6rem] font-bold uppercase tracking-wide" style={{ color: "var(--hms-faint)" }}>{tx("Parsed values", "مقادیر تجزیه‌شده")}</p>
                <div className="mt-1 flex flex-wrap gap-1">
                  {flags.map((f, i) => (
                    <span key={i} className="hms-pill" style={{ background: f.flag === "critical" ? "#fee2e2" : f.flag === "high" ? "#fef3c7" : f.flag === "low" ? "#dbeafe" : "var(--hms-surface-3)", color: f.flag === "critical" ? "#991b1b" : f.flag === "high" ? "#92400e" : f.flag === "low" ? "#1e40af" : "var(--hms-muted)" }}>
                      {f.name} {f.value} · {statusText(lang, f.flag)}
                    </span>
                  ))}
                </div>
                {flags.some((f) => f.flag === "critical") && (
                  <p className="mt-1.5 flex items-center gap-1 text-[0.66rem] font-semibold" style={{ color: "#b91c1c" }}>
                    <AlertTriangle size={11} /> {tx("A critical value raises an alarm for the ordering physician.", "مقدار بحرانی برای داکتر درخواست‌کننده هشدار ایجاد می‌کند.")}
                  </p>
                )}
              </div>
            )}
            <div className="mt-3 flex justify-end gap-1.5">
              <button className="hms-btn" onClick={() => setEntry(null)}>{tx("Cancel", "لغو")}</button>
              <button className="hms-btn" onClick={() => act(entry.id, "result", { result: text })} disabled={!text.trim()}>{tx("Save draft", "ذخیرهٔ پیش‌نویس")}</button>
              <button
                className="hms-btn hms-btn-primary"
                onClick={async () => {
                  await act(entry.id, "result", { result: text });
                  setMsg(tx("Result saved. Verify it to release to the physician.", "نتیجه ذخیره شد. برای آزادسازی به داکتر، آن را تأیید کنید."));
                  setEntry(null);
                }}
                disabled={!text.trim()}
              >
                {tx("Save & close", "ذخیره و بستن")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
