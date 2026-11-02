"use client";

import { ArrowRightLeft, Loader2, LogOut, Moon, Sparkles, UserPlus, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Field, Status } from "@/components/hms/ui";
import { money } from "@/lib/hms/format";
import { statusText } from "@/lib/hms/i18n";
import { useLang, useTx } from "@/components/hms/lang-provider";
import type { AdmissionRow, listBeds } from "@/lib/hms/queries";

type Bed = ReturnType<typeof listBeds>[number];
type Patient = { id: string; name: string; mrn: string };

const TONE: Record<string, { bg: string; border: string }> = {
  occupied: { bg: "color-mix(in srgb,#ef4444 6%, var(--hms-surface))", border: "color-mix(in srgb,#ef4444 34%, var(--hms-border))" },
  available: { bg: "color-mix(in srgb,#10b981 7%, var(--hms-surface))", border: "color-mix(in srgb,#10b981 34%, var(--hms-border))" },
  cleaning: { bg: "color-mix(in srgb,#f59e0b 8%, var(--hms-surface))", border: "color-mix(in srgb,#f59e0b 36%, var(--hms-border))" },
  blocked: { bg: "var(--hms-surface-2)", border: "var(--hms-border)" },
};

export function WardBoard({ beds, admissions, patients, role }: { beds: Bed[]; admissions: AdmissionRow[]; patients: Patient[]; role: string }) {
  const router = useRouter();
  const tx = useTx();
  const { lang } = useLang();
  const [busy, setBusy] = useState<string | null>(null);
  const [mode, setMode] = useState<{ kind: "admit"; bed: Bed } | { kind: "transfer"; admission: AdmissionRow } | { kind: "discharge"; admission: AdmissionRow } | null>(null);
  const [patientId, setPatientId] = useState(patients[0]?.id ?? "");
  const [diagnosis, setDiagnosis] = useState("");
  const [type, setType] = useState("elective");
  const [target, setTarget] = useState("");
  const [msg, setMsg] = useState<string | null>(null);

  const canEdit = ["admin", "nurse", "doctor"].includes(role);

  async function post(payload: Record<string, unknown>) {
    setBusy("x");
    const res = await fetch("/api/hms/beds", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(payload) });
    const data = await res.json();
    setBusy(null);
    setMsg(res.ok ? tx("Ward updated. The monitor will re-scan within seconds.", "وارڈ به‌روز شد. مانیتور در چند ثانیه دوباره اسکن می‌کند.") : data.error ?? tx("Action failed.", "اقدام انجام نشد."));
    if (res.ok) {
      setMode(null);
      router.refresh();
    }
  }

  function click(bed: Bed) {
    if (!canEdit) return;
    const admission = bed.admission_id ? admissions.find((a) => a.id === bed.admission_id) : undefined;
    if (bed.status === "occupied" && admission) {
      setMode({ kind: "transfer", admission });
      return;
    }
    if (bed.status === "cleaning") {
      post({ action: "clean", bed_id: bed.id });
      return;
    }
    if (bed.status === "available") {
      setPatientId(patients[0]?.id ?? "");
      setMode({ kind: "admit", bed });
    }
  }

  return (
    <div className="mt-3">
      {msg && <p className="mb-2 rounded-md px-2 py-1 text-[0.68rem]" style={{ background: "var(--hms-surface-2)", color: "var(--hms-muted)" }}>{msg}</p>}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
        {beds.map((b) => {
          const t = TONE[b.status] ?? TONE.blocked;
          return (
            <div
              key={b.id}
              onClick={() => click(b)}
              className="cursor-pointer rounded-lg border p-2 text-left transition hover:-translate-y-px hover:shadow-sm"
              style={{ background: t.bg, borderColor: t.border }}
            >
              <div className="flex items-center justify-between">
                <span className="text-[0.74rem] font-semibold">{b.label}</span>
                <span className="text-[0.54rem]" style={{ color: "var(--hms-faint)" }}>{b.ward}</span>
              </div>
              <p className="mt-0.5 text-[0.58rem] uppercase tracking-wide" style={{ color: "var(--hms-faint)" }}>{statusText(lang, b.status)} · {b.type}</p>
              <p className="mt-1 truncate text-[0.7rem] font-medium">{b.patient_name ?? (b.status === "cleaning" ? tx("Housekeeping", "در حال نظافت") : b.status === "blocked" ? b.notes ?? tx("Servicing", "در تعمیر") : tx("Tap to admit", "برای بستر زدن لمس کنید"))}</p>
              {b.diagnosis && <p className="truncate text-[0.6rem]" style={{ color: "var(--hms-faint)" }}>{b.diagnosis}</p>}
              <p className="mt-0.5 text-[0.58rem]" style={{ color: "var(--hms-faint)" }}>{money(b.daily_rate, lang)}{tx("/night", " / شب")}</p>
              {b.status === "occupied" && b.admission_id && canEdit && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    const adm = admissions.find((a) => a.id === b.admission_id);
                    if (adm) setMode({ kind: "discharge", admission: adm });
                  }}
                  className="hms-btn hms-btn-sm mt-1"
                  style={{ height: "1.5rem" }}
                >
                  <LogOut size={9} /> {tx("Discharge", "مرخص کردن")}
                </button>
              )}
            </div>
          );
        })}
      </div>
      <p className="mt-2 flex items-center gap-1 text-[0.62rem]" style={{ color: "var(--hms-faint)" }}>
        <Moon size={10} /> {tx("Cleaning beds require one tap to return to service — the monitor flags any bed stuck cleaning for more than 6 hours.", "بستر در حال نظافت با یک لمس به کار برمی‌گردد — مانیتور هر بستری که بیش از ۶ ساعت در نظافت بماند را علامت می‌زند.")}
      </p>

      {mode?.kind === "admit" && (
        <Dialog title={tx("Admit to {bed}", "بستر کردن در {bed}", { bed: mode.bed.label })} sub={`${mode.bed.ward} · ${money(mode.bed.daily_rate, lang)} ${tx("per night", "در هر شب")}`} onClose={() => setMode(null)}>
          <div className="grid gap-2 sm:grid-cols-2">
            <Field label={tx("Patient", "مریض")} className="sm:col-span-2">
              <select className="hms-input" value={patientId} onChange={(e) => setPatientId(e.target.value)}>
                {patients.map((p) => <option key={p.id} value={p.id}>{p.name} · {p.mrn}</option>)}
              </select>
            </Field>
            <Field label={tx("Working diagnosis", "تشخیص اولیه")} className="sm:col-span-2"><input className="hms-input" value={diagnosis} onChange={(e) => setDiagnosis(e.target.value)} placeholder={tx("Acute appendicitis, post-op day 1", "آپندیسایت حاد، روز اول بعد از عمل")} /></Field>
            <Field label={tx("Admission type", "نوع بستر شدن")}>
              <select className="hms-input" value={type} onChange={(e) => setType(e.target.value)}>
                {[["elective", "پلانی"], ["emergency", "عاجل"], ["transfer", "تبدیل"], ["day-case", "یک‌روزه"]].map(([t, fa]) => <option key={t} value={t}>{tx(t, fa)}</option>)}
              </select>
            </Field>
          </div>
          <div className="mt-3 flex justify-end gap-1.5">
            <button className="hms-btn" onClick={() => setMode(null)}>{tx("Cancel", "لغو")}</button>
            <button className="hms-btn hms-btn-primary" onClick={() => post({ action: "admit", bed_id: mode.bed.id, patient_id: patientId, diagnosis, admission_type: type })} disabled={busy === "x"}>
              {busy === "x" ? <Loader2 size={11} className="animate-spin" /> : <UserPlus size={11} />} {tx("Admit patient", "بستر کردن مریض")}
            </button>
          </div>
        </Dialog>
      )}

      {mode?.kind === "transfer" && (
        <Dialog title={tx("Move {name}", "انتقال {name}", { name: mode.admission?.patient_name ?? "" })} sub={tx("Currently in {bed}", "اکنون در {bed}", { bed: mode.admission?.bed_label ?? tx("a bed", "یک بستر") })} onClose={() => setMode(null)}>
          <Field label={tx("Target bed", "بستر مقصد")}>
            <select className="hms-input" value={target} onChange={(e) => setTarget(e.target.value)}>
              <option value="">{tx("Choose a free bed…", "یک بستر خالی انتخاب کنید…")}</option>
              {beds.filter((b) => b.status !== "occupied").map((b) => <option key={b.id} value={b.id}>{b.label} · {b.ward} ({b.status})</option>)}
            </select>
          </Field>
          <div className="mt-3 flex justify-end gap-1.5">
            <button className="hms-btn" onClick={() => setMode(null)}>{tx("Cancel", "لغو")}</button>
            <button className="hms-btn hms-btn-primary" onClick={() => post({ action: "transfer", admission_id: mode.admission?.id, target_bed: target })} disabled={!target || busy === "x"}>
              <ArrowRightLeft size={11} /> {tx("Transfer", "انتقال")}
            </button>
          </div>
        </Dialog>
      )}

      {mode?.kind === "discharge" && (
        <Dialog title={tx("Discharge {name}", "مرخص کردن {name}", { name: mode.admission?.patient_name ?? "" })} sub={tx("The bed is released for cleaning immediately.", "بستر فوراً برای نظافت آزاد می‌شود.")} onClose={() => setMode(null)}>
          <p className="text-[0.72rem]" style={{ color: "var(--hms-muted)" }}>
            {tx("Confirm the discharge summary is complete, take-home medication is dispensed and the invoice is settled or scheduled.", "تأیید کنید که خلاصهٔ مرخصی کامل است، دواهای خانگی تحویل شده و بل تسویه یا زمان‌بندی شده است.")}
          </p>
          <div className="mt-3 flex justify-end gap-1.5">
            <button className="hms-btn" onClick={() => setMode(null)}>{tx("Cancel", "لغو")}</button>
            <button className="hms-btn hms-btn-primary" onClick={() => post({ action: "discharge", admission_id: mode.admission?.id })} disabled={busy === "x"}>
              <Sparkles size={11} /> {tx("Discharge", "مرخص کردن")}
            </button>
          </div>
        </Dialog>
      )}
    </div>
  );
}

function Dialog({ title, sub, children, onClose }: { title: string; sub?: string; children: React.ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/45 p-4" onClick={onClose}>
      <div className="w-full max-w-md rounded-xl border bg-[var(--hms-surface)] p-4 shadow-2xl" style={{ borderColor: "var(--hms-border)" }} onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between">
          <div>
            <p className="text-[0.84rem] font-semibold">{title}</p>
            {sub && <p className="text-[0.64rem]" style={{ color: "var(--hms-faint)" }}>{sub}</p>}
          </div>
          <button className="hms-btn hms-btn-sm hms-btn-ghost" onClick={onClose}><X size={13} /></button>
        </div>
        <div className="mt-2">{children}</div>
      </div>
    </div>
  );
}
