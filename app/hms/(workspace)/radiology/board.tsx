"use client";

import { CheckCircle2, Loader2, PenLine, ScanLine, Search, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Empty, Field, Person, Status } from "@/components/hms/ui";
import { relTime } from "@/lib/hms/format";
import { useLang, useTx } from "@/components/hms/lang-provider";
import type { ImagingRow } from "@/lib/hms/queries";

const TEMPLATES: Record<string, { findings: string; impression: string }> = {
  "Chest X-ray": {
    findings: "Lungs are clear with no focal consolidation, effusion or pneumothorax. Cardiothoracic ratio within normal limits. Mediastinal contour unremarkable. No bony abnormality identified.",
    impression: "No acute cardiopulmonary abnormality.",
  },
  "Abdominal ultrasound": {
    findings: "Liver normal in size and echotexture. Gallbladder distended without stones or wall thickening. Both kidneys normal in size with preserved cortico-medullary differentiation. No free fluid. Appendix not visualised.",
    impression: "Unremarkable abdominal ultrasound.",
  },
  "CT abdomen": {
    findings: "Appendix is dilated at 11 mm with periappendiceal fat stranding and a small amount of adjacent free fluid. No abscess or pneumoperitoneum. No obstructing calculus.",
    impression: "Findings consistent with acute appendicitis without perforation.",
  },
};

export function ImagingBoard({ rows, role }: { rows: ImagingRow[]; role: string }) {
  const router = useRouter();
  const tx = useTx();
  const { lang } = useLang();
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [report, setReport] = useState<ImagingRow | null>(null);
  const [findings, setFindings] = useState("");
  const [impression, setImpression] = useState("");
  const [msg, setMsg] = useState<string | null>(null);

  const filtered = rows.filter((r) => !q || r.patient_name.toLowerCase().includes(q.toLowerCase()) || r.modality.toLowerCase().includes(q.toLowerCase()) || r.body_part.toLowerCase().includes(q.toLowerCase()) || r.mrn.includes(q));

  async function act(id: string, action: string, payload: Record<string, unknown> = {}) {
    setBusy(id + action);
    const res = await fetch(`/api/hms/imaging/${id}`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ action, ...payload }) });
    const data = await res.json();
    setBusy(null);
    if (!res.ok) setMsg(data.error ?? tx("Action failed.", "اقدام انجام نشد."));
    else {
      setMsg(action === "report" ? tx("Report released to the requesting physician.", "گزارش برای داکتر درخواست‌کننده آزاد شد.") : tx("Request accepted — acquisition can start.", "درخواست پذیرفته شد — تصویربرداری می‌تواند آغاز شود."));
      router.refresh();
      if (action === "report") setReport(null);
    }
  }

  return (
    <div className="mt-3">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-[13rem] flex-1">
          <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2" style={{ color: "var(--hms-faint)" }} />
          <input className="hms-input pl-7" placeholder={tx("Patient, modality or body part…", "مریض، نوع تصویر یا عضو…")} value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
      </div>

      {msg && <p className="mt-2 flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[0.7rem]" style={{ background: "color-mix(in srgb,#10b981 12%, transparent)", color: "#0b6b4d" }}><CheckCircle2 size={12} /> {msg}<button className="ml-auto" onClick={() => setMsg(null)}><X size={11} /></button></p>}

      <div className="mt-2 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
        {filtered.map((r) => (
          <div key={r.id} className="rounded-lg border p-2.5" style={{ borderColor: r.priority === "urgent" && r.status !== "reported" ? "color-mix(in srgb,#ef4444 35%, var(--hms-border))" : "var(--hms-border)" }}>
            <div className="flex items-start justify-between gap-1">
              <div className="min-w-0">
                <p className="truncate text-[0.76rem] font-semibold">{r.modality}</p>
                <p className="truncate text-[0.64rem]" style={{ color: "var(--hms-faint)" }}>{r.body_part} · {relTime(r.created_at, lang)}</p>
              </div>
              <Status value={r.status} />
            </div>
            <div className="mt-1.5"><Person name={r.patient_name} sub={`${r.mrn} · ${r.doctor_name ?? ""}`} size={24} /></div>
            {r.impression && <p className="mt-1.5 line-clamp-2 text-[0.66rem]" style={{ color: "var(--hms-muted)" }}>{r.impression}</p>}
            <div className="mt-2 flex gap-1">
              {r.status === "requested" && (
                <button className="hms-btn hms-btn-sm" onClick={() => act(r.id, "accept")} disabled={!!busy}>
                  {busy === r.id + "accept" ? <Loader2 size={10} className="animate-spin" /> : <ScanLine size={10} />} {tx("Accept", "پذیرش")}
                </button>
              )}
              {["requested", "in_progress"].includes(r.status) && ["admin", "radiology", "doctor"].includes(role) && (
                <button
                  className="hms-btn hms-btn-sm hms-btn-primary"
                  onClick={() => {
                    setReport(r);
                    const tpl = TEMPLATES[/chest/i.test(r.body_part) ? "Chest X-ray" : /abdomen|pelvis/i.test(r.body_part) ? (r.modality === "CT" ? "CT abdomen" : "Abdominal ultrasound") : ""];
                    setFindings(r.findings ?? tpl?.findings ?? "");
                    setImpression(r.impression ?? tpl?.impression ?? "");
                  }}
                >
                  <PenLine size={10} /> {tx("Report", "گزارش")}
                </button>
              )}
              {r.status === "reported" && <span className="text-[0.64rem]" style={{ color: "var(--hms-faint)" }}>{tx("Released by", "آزادشده توسط")} {r.radiologist}</span>}
            </div>
          </div>
        ))}
      </div>
      {!filtered.length && <Empty title={tx("No imaging requests", "درخواست تصویربرداری نیست")} hint={tx("Requests appear here as soon as a physician orders them.", "به‌محض اینکه داکتر درخواست کند، اینجا دیده می‌شود.")} icon={<ScanLine size={16} />} />}

      {report && (
        <div className="fixed inset-0 z-[70] flex items-start justify-center overflow-y-auto bg-black/45 p-4" onClick={() => setReport(null)}>
          <div className="my-8 w-full max-w-xl rounded-xl border bg-[var(--hms-surface)] p-4 shadow-2xl" style={{ borderColor: "var(--hms-border)" }} onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between">
              <div>
                <p className="text-[0.84rem] font-semibold">{report.modality} — {report.body_part}</p>
                <p className="text-[0.64rem]" style={{ color: "var(--hms-faint)" }}>{report.patient_name} · {report.mrn}</p>
              </div>
              <button className="hms-btn hms-btn-sm hms-btn-ghost" onClick={() => setReport(null)}><X size={13} /></button>
            </div>
            <div className="mt-2 space-y-2">
              <Field label={tx("Findings", "یافته‌ها")}><textarea className="hms-input" rows={5} value={findings} onChange={(e) => setFindings(e.target.value)} /></Field>
              <Field label={tx("Impression", "نتیجه‌گیری")} hint={tx("One or two sentences — this is what the surgeon reads first.", "یک یا دو جمله — این را جراح اول می‌خواند.")}><textarea className="hms-input" rows={2} value={impression} onChange={(e) => setImpression(e.target.value)} /></Field>
            </div>
            <div className="mt-3 flex justify-end gap-1.5">
              <button className="hms-btn" onClick={() => setReport(null)}>{tx("Cancel", "لغو")}</button>
              <button className="hms-btn hms-btn-primary" onClick={() => act(report.id, "report", { findings, impression })} disabled={!findings.trim()}>{tx("Sign & release", "امضا و آزادسازی")}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
