"use client";

import { AlertTriangle, CheckCircle2, FileText, Loader2, Microscope, Search, Syringe, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Empty, Field, Person, Status } from "@/components/hms/ui";
import { relTime } from "@/lib/hms/format";
import type { LabRow } from "@/lib/hms/queries";

type Flag = { name?: string; value?: string; flag: string; note?: string };

const TABS = ["all", "ordered", "collected", "in_progress", "verified"] as const;

export function LabBoard({ rows, role }: { rows: LabRow[]; role: string }) {
  const router = useRouter();
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
    if (!res.ok) setMsg(data.error ?? "Action failed.");
    else {
      if (data.flags) setFlags(data.flags);
      router.refresh();
      if (action === "verify") {
        setMsg("Result verified and released to the ordering physician.");
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
          <input className="hms-input pl-7" placeholder="Patient, MRN or test…" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <div className="flex flex-wrap gap-1">
          {TABS.map((t) => (
            <button key={t} onClick={() => setTab(t)} className="hms-btn hms-btn-sm capitalize" style={tab === t ? { background: "var(--hms-brand-soft)", borderColor: "transparent", color: "var(--hms-brand-ink)" } : undefined}>
              {t.replace("_", " ")} <span className="rounded-full px-1 text-[0.56rem]" style={{ background: "var(--hms-surface-3)" }}>{counts[t]}</span>
            </button>
          ))}
        </div>
      </div>

      {msg && <p className="mt-2 flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[0.7rem]" style={{ background: "color-mix(in srgb,#10b981 12%, transparent)", color: "#0b6b4d" }}><CheckCircle2 size={12} /> {msg}<button className="ml-auto" onClick={() => setMsg(null)}><X size={11} /></button></p>}

      <div className="mt-2 overflow-x-auto rounded-lg border" style={{ borderColor: "var(--hms-border)" }}>
        <table className="w-full min-w-[54rem]">
          <thead style={{ background: "var(--hms-surface-2)" }}>
            <tr>
              <th className="hms-th">Patient</th>
              <th className="hms-th">Test</th>
              <th className="hms-th">Priority</th>
              <th className="hms-th">Sample</th>
              <th className="hms-th">Result</th>
              <th className="hms-th">Ordered</th>
              <th className="hms-th">Status</th>
              <th className="hms-th text-right">Workflow</th>
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
                <td className="hms-td">{r.priority === "urgent" ? <span className="hms-pill" style={{ background: "#fee2e2", color: "#991b1b" }}>urgent</span> : <span className="text-[0.68rem]" style={{ color: "var(--hms-faint)" }}>routine</span>}</td>
                <td className="hms-td text-[0.7rem]">{r.sample_type ?? "—"}</td>
                <td className="hms-td max-w-[12rem] truncate text-[0.7rem]">
                  {r.result ? <span className={/critical|↑|high/i.test(r.result) ? "font-semibold" : ""} style={/critical|↑/i.test(r.result) ? { color: "#b91c1c" } : undefined}>{r.result}</span> : <span style={{ color: "var(--hms-faint)" }}>pending</span>}
                </td>
                <td className="hms-td whitespace-nowrap text-[0.68rem]">{relTime(r.created_at)}</td>
                <td className="hms-td"><Status value={r.status} /></td>
                <td className="hms-td">
                  <div className="flex justify-end gap-1">
                    {r.status === "ordered" && (
                      <button className="hms-btn hms-btn-sm" onClick={() => act(r.id, "collect")} disabled={!!busy}>
                        {busy === r.id + "collect" ? <Loader2 size={10} className="animate-spin" /> : <Syringe size={10} />} Collect
                      </button>
                    )}
                    {["collected", "in_progress"].includes(r.status) && (
                      <button className="hms-btn hms-btn-sm" onClick={() => { setEntry(r); setText(r.result ?? ""); setFlags(null); }}>
                        <Microscope size={10} /> Enter result
                      </button>
                    )}
                    {r.status === "in_progress" && ["admin", "lab", "doctor"].includes(role) && (
                      <button className="hms-btn hms-btn-sm hms-btn-primary" onClick={() => act(r.id, "verify")} disabled={!!busy}>
                        {busy === r.id + "verify" ? <Loader2 size={10} className="animate-spin" /> : <CheckCircle2 size={10} />} Verify
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!filtered.length && <Empty title="Nothing in this lane" hint="Switch tabs or clear the search." icon={<FileText size={16} />} />}
      </div>

      {entry && (
        <div className="fixed inset-0 z-[70] flex items-start justify-center overflow-y-auto bg-black/45 p-4" onClick={() => setEntry(null)}>
          <div className="my-8 w-full max-w-xl rounded-xl border bg-[var(--hms-surface)] p-4 shadow-2xl" style={{ borderColor: "var(--hms-border)" }} onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between">
              <div>
                <p className="text-[0.84rem] font-semibold">{entry.test_name}</p>
                <p className="text-[0.64rem]" style={{ color: "var(--hms-faint)" }}>{entry.patient_name} · {entry.mrn} · ordered by {entry.doctor_name}</p>
              </div>
              <button className="hms-btn hms-btn-sm hms-btn-ghost" onClick={() => setEntry(null)}><X size={13} /></button>
            </div>
            <div className="mt-2">
              <Field label="Results (one per line, e.g. “Hb 9.2 g/dL”)" hint="The assistant recognises common analytes and flags low / high / critical values automatically.">
                <textarea className="hms-input" rows={6} value={text} onChange={(e) => preview(e.target.value)} placeholder={"WBC 13.4 10^9/L\nHb 9.1 g/dL\nPLT 180 10^9/L\nCRP 82 mg/L"} />
              </Field>
            </div>
            {flags && flags.length > 0 && (
              <div className="mt-2 rounded-lg border p-2" style={{ borderColor: "var(--hms-border)" }}>
                <p className="text-[0.6rem] font-bold uppercase tracking-wide" style={{ color: "var(--hms-faint)" }}>Parsed values</p>
                <div className="mt-1 flex flex-wrap gap-1">
                  {flags.map((f, i) => (
                    <span key={i} className="hms-pill" style={{ background: f.flag === "critical" ? "#fee2e2" : f.flag === "high" ? "#fef3c7" : f.flag === "low" ? "#dbeafe" : "var(--hms-surface-3)", color: f.flag === "critical" ? "#991b1b" : f.flag === "high" ? "#92400e" : f.flag === "low" ? "#1e40af" : "var(--hms-muted)" }}>
                      {f.name} {f.value} · {f.flag}
                    </span>
                  ))}
                </div>
                {flags.some((f) => f.flag === "critical") && (
                  <p className="mt-1.5 flex items-center gap-1 text-[0.66rem] font-semibold" style={{ color: "#b91c1c" }}>
                    <AlertTriangle size={11} /> A critical value raises an alarm for the ordering physician.
                  </p>
                )}
              </div>
            )}
            <div className="mt-3 flex justify-end gap-1.5">
              <button className="hms-btn" onClick={() => setEntry(null)}>Cancel</button>
              <button className="hms-btn" onClick={() => act(entry.id, "result", { result: text })} disabled={!text.trim()}>Save draft</button>
              <button
                className="hms-btn hms-btn-primary"
                onClick={async () => {
                  await act(entry.id, "result", { result: text });
                  setMsg("Result saved. Verify it to release to the physician.");
                  setEntry(null);
                }}
                disabled={!text.trim()}
              >
                Save &amp; close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
