"use client";

import {
  AlertTriangle, CheckCircle2, ClipboardPlus, Loader2, Plus, Printer, Sparkles, Stethoscope, Trash2, Wand2,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Btn, Field, Pill, Status } from "@/components/hms/ui";
import { age, digitsOf } from "@/lib/hms/format";
import { statusText } from "@/lib/hms/i18n";
import { useLang, useTx } from "@/components/hms/lang-provider";

type Patient = { id: string; name: string; mrn: string; dob: string | null; gender: string | null; allergies: string | null };
type Appt = { id: string; patient_id: string; patient_name: string; start_at: string; reason: string | null };

type Line = { drug: string; strength: string; form: string; dosage: string; frequency: string; duration: string; instructions: string; qty: number; unit_price: number };

const EMPTY: Line = { drug: "", strength: "", form: "Tablet", dosage: "", frequency: "", duration: "", instructions: "", qty: 10, unit_price: 0 };

const VITALS = [
  { key: "systolic", label: "Systolic", unit: "mmHg", ph: "120" },
  { key: "diastolic", label: "Diastolic", unit: "mmHg", ph: "80" },
  { key: "pulse", label: "Pulse", unit: "bpm", ph: "78" },
  { key: "temp", label: "Temp", unit: "°C", ph: "36.8" },
  { key: "spo2", label: "SpO₂", unit: "%", ph: "98" },
  { key: "resp", label: "Resp", unit: "/min", ph: "16" },
] as const;

const QUICK = [
  "Paracetamol 500 mg", "Amoxicillin 500 mg", "Ibuprofen 400 mg", "Metformin 500 mg",
  "Amlodipine 5 mg", "Omeprazole 20 mg", "Ceftriaxone 1 g", "Tramadol 50 mg",
];

export function ConsultConsole({
  patients,
  appointments,
  templates,
  canPrescribe,
  initialPatientId,
  initialAppointmentId,
}: {
  patients: Patient[];
  appointments: Appt[];
  templates: { id: number; name: string }[];
  canPrescribe: boolean;
  /** Set when the consult room is opened from a patient chart or a queue row. */
  initialPatientId?: string;
  initialAppointmentId?: string;
}) {
  const router = useRouter();
  const tx = useTx();
  const { lang } = useLang();
  const preselected = initialPatientId && patients.some((p) => p.id === initialPatientId) ? initialPatientId : undefined;
  const preselectedAppt = initialAppointmentId && appointments.some((a) => a.id === initialAppointmentId) ? initialAppointmentId : undefined;
  const [patientId, setPatientId] = useState(preselected ?? appointments[0]?.patient_id ?? patients[0]?.id ?? "");
  const [apptId, setApptId] = useState(preselectedAppt ?? appointments[0]?.id ?? "");
  const [q, setQ] = useState("");
  const [diagnosis, setDiagnosis] = useState("");
  const [icd10, setIcd10] = useState("");
  const [summary, setSummary] = useState("");
  const [followUp, setFollowUp] = useState("");
  const [template, setTemplate] = useState(1);
  const [vitals, setVitals] = useState<Record<string, string>>({});
  const [lines, setLines] = useState<Line[]>([{ ...EMPTY }]);
  const [triage, setTriage] = useState<{ score: number; level: string; recommendation: string; drivers?: string[] } | null>(null);
  const [safety, setSafety] = useState<{ score: number; verdict: string; summary: string; interactions: { pair?: string; severity: string; detail: string }[] } | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ tone: "ok" | "bad"; text: string } | null>(null);
  const [rxId, setRxId] = useState<string | null>(null);

  const patient = useMemo(() => patients.find((p) => p.id === patientId), [patients, patientId]);
  const filtered = useMemo(() => {
    const n = q.trim().toLowerCase();
    if (!n) return patients.slice(0, 8);
    return patients.filter((p) => p.name.toLowerCase().includes(n) || p.mrn.toLowerCase().includes(n)).slice(0, 8);
  }, [patients, q]);

  const numbered = useMemo(() => {
    const v: Record<string, number> = {};
    for (const [k, val] of Object.entries(vitals)) if (val !== "") v[k] = Number(val);
    return v;
  }, [vitals]);

  const runTriage = useCallback(async (payload: Record<string, number>) => {
    const res = await fetch("/api/hms/ai", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ action: "triage", vitals: payload }) });
    const data = await res.json();
    setTriage(data.result);
  }, []);

  const runScreen = useCallback(async (ls: Line[], allergies: string | null) => {
    const payload = ls.filter((l) => l.drug.trim()).map((l) => ({ drug: l.drug, dosage: l.dosage, frequency: l.frequency, duration: l.duration }));
    if (!payload.length) return setSafety(null);
    const res = await fetch("/api/hms/ai", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ action: "screen", lines: payload, allergies }) });
    const data = await res.json();
    setSafety(data.result);
  }, []);

  useEffect(() => {
    if (Object.keys(numbered).length < 2) return setTriage(null);
    const t = setTimeout(() => runTriage(numbered), 320);
    return () => clearTimeout(t);
  }, [numbered, runTriage]);

  useEffect(() => {
    const t = setTimeout(() => runScreen(lines, patient?.allergies ?? null), 380);
    return () => clearTimeout(t);
  }, [lines, patient, runScreen]);

  async function suggest() {
    if (!diagnosis.trim()) return setMsg({ tone: "bad", text: tx("Type a working diagnosis first — the assistant needs it to draft the note.", "اول تشخیص اولیه را بنویسید — دستیار برای نوشتن یادداشت به آن نیاز دارد.") });
    setBusy("note");
    const [note, tpl, doses] = await Promise.all([
      fetch("/api/hms/ai", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ action: "note", diagnosis, vitals: numbered }) }).then((r) => r.json()),
      fetch("/api/hms/ai", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ action: "template", diagnosis }) }).then((r) => r.json()),
      fetch("/api/hms/ai", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ action: "doses", weight: 70, age: patient?.dob ? Number(age(patient.dob).replace("y", "")) : 30 }) }).then((r) => r.json()),
    ]);
    setSummary(`${note.result?.summary ?? ""}\n\n${(note.result?.plan ?? []).join("\n")}`.trim());
    setFollowUp(note.result?.followUp ?? "");
    setTemplate(tpl.suggested ?? 1);
    if (doses.result?.length) {
      setLines((ls) => {
        const next = [...ls];
        doses.result.slice(0, 2).forEach((d: { drug: string; dose: string; note: string }, i: number) => {
          if (next[i] && !next[i].drug) next[i] = { ...next[i], drug: next[i].drug || d.drug, dosage: d.dose, instructions: d.note, frequency: "As directed", duration: "5 days" };
        });
        return next;
      });
    }
    setBusy(null);
    setMsg({ tone: "ok", text: tx("Drafted from the diagnosis. Suggested print design: {tpl}.", "از روی تشخیص نوشته شد. طرح چاپ پیشنهادی: {tpl}.", { tpl: templates.find((t) => t.id === tpl.suggested)?.name ?? `${tx("template", "طرح")} ${digitsOf(lang, tpl.suggested)}` }) });
  }

  async function save(sign: boolean) {
    if (!patientId) return setMsg({ tone: "bad", text: tx("Choose a patient first.", "اول یک مریض انتخاب کنید.") });
    const valid = lines.filter((l) => l.drug.trim());
    if (!valid.length) return setMsg({ tone: "bad", text: tx("Add at least one medicine before finishing the consult.", "پیش از پایان معاینه حداقل یک دوا اضافه کنید.") });
    setBusy(sign ? "sign" : "draft");
    setMsg(null);
    try {
      if (diagnosis.trim() || summary.trim()) {
        const enc = await fetch("/api/hms/encounters", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            patient_id: patientId,
            appointment_id: apptId || undefined,
            diagnosis: diagnosis || undefined,
            icd10: icd10 || undefined,
            summary,
            vitals: numbered,
            visit_type: apptId ? "followup" : "new",
          }),
        });
        if (!enc.ok) {
          const detail = await enc.json().catch(() => ({}));
          setMsg({ tone: "bad", text: detail.error ?? tx("The clinical note could not be saved.", "یادداشت کلینیکی ذخیره نشد.") });
          setBusy(null);
          return;
        }
      }
      const res = await fetch("/api/hms/prescriptions", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          patient_id: patientId,
          diagnosis: diagnosis || undefined,
          icd10: icd10 || undefined,
          notes: summary || undefined,
          follow_up: followUp || undefined,
          template,
          sign,
          items: valid.map((l) => ({ ...l, drug: l.drug.trim() })),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMsg({ tone: "bad", text: data.error ?? tx("The consult could not be saved.", "معاینه ذخیره نشد.") });
        if (data.safety) setSafety(data.safety);
      } else {
        setMsg({ tone: "ok", text: sign ? tx("Signed {no}. Open the print sheet to hand it to the patient.", "{no} امضا شد. برای دادن به مریض، برگهٔ چاپ را باز کنید.", { no: data.rx_no }) : tx("Draft {no} saved — sign it when you are ready.", "پیش‌نویس {no} ذخیره شد — هر وقت آماده بودید امضا کنید.", { no: data.rx_no }) });
        setRxId(data.id);
        router.refresh();
      }
    } catch {
      setMsg({ tone: "bad", text: tx("Network error while saving.", "خطای شبکه هنگام ذخیره.") });
    } finally {
      setBusy(null);
    }
  }

  const verdictTone = safety?.verdict === "stop" ? "bad" : safety?.verdict === "caution" ? "warn" : "good";

  return (
    <div className="mt-3 space-y-3">
      {/* patient picker */}
      <div className="grid gap-2 sm:grid-cols-[1.4fr_1fr]">
        <div>
          <span className="hms-label">{tx("Patient", "مریض")}</span>
          <input className="hms-input" placeholder={tx("Search name or MRN…", "جستجوی نام یا شمارهٔ پرونده…")} value={q} onChange={(e) => setQ(e.target.value)} />
          <div className="mt-1 max-h-32 overflow-y-auto rounded-lg border" style={{ borderColor: "var(--hms-border)" }}>
            {filtered.map((p) => (
              <button
                key={p.id}
                onClick={() => {
                  setPatientId(p.id);
                  setQ("");
                  setApptId("");
                }}
                className="flex w-full items-center justify-between gap-2 px-2 py-1.5 text-left text-[0.72rem] hover:bg-[var(--hms-surface-2)]"
                style={patientId === p.id ? { background: "var(--hms-brand-soft)", color: "var(--hms-brand-ink)" } : undefined}
              >
                <span className="truncate">{p.name}</span>
                <span className="shrink-0 text-[0.6rem]" style={{ color: "var(--hms-faint)" }}>{p.mrn}</span>
              </button>
            ))}
          </div>
        </div>
        <div>
          <span className="hms-label">{tx("Linked appointment", "وقت مرتبط")}</span>
          <select className="hms-input" value={apptId} onChange={(e) => { setApptId(e.target.value); const a = appointments.find((x) => x.id === e.target.value); if (a) setPatientId(a.patient_id); }}>
            <option value="">{tx("Walk-in (no appointment)", "بدون وقت (مراجعهٔ مستقیم)")}</option>
            {appointments.filter((a) => a.patient_id === patientId || !patientId).map((a) => (
              <option key={a.id} value={a.id}>{a.patient_name} · {new Date(a.start_at).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}</option>
            ))}
          </select>
          {patient && (
            <div className="mt-1.5 rounded-lg px-2 py-1.5 text-[0.66rem]" style={{ background: "var(--hms-surface-2)" }}>
              <b>{patient.name}</b> · {patient.mrn} · {patient.gender ? statusText(lang, patient.gender) : "—"} · {age(patient.dob, lang)}
              {patient.allergies && patient.allergies !== "None" && (
                <span className="ml-1 font-semibold" style={{ color: "#b91c1c" }}>· {tx("allergy", "حساسیت")}: {patient.allergies}</span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* vitals */}
      <div className="rounded-lg border p-2.5" style={{ borderColor: "var(--hms-border)" }}>
        <div className="flex items-center justify-between">
          <span className="text-[0.62rem] font-bold uppercase tracking-[0.06em]" style={{ color: "var(--hms-faint)" }}>{tx("Vitals & triage", "علایم حیاتی و تریاژ")}</span>
          {triage && (
            <span className="flex items-center gap-1 text-[0.64rem] font-semibold">
              <Status value={triage.level === "critical" ? "critical" : triage.level === "urgent" ? "warning" : "active"} />
              NEWS {digitsOf(lang, triage.score)}
            </span>
          )}
        </div>
        <div className="mt-1.5 grid grid-cols-3 gap-1.5 sm:grid-cols-6">
          {VITALS.map((v) => (
            <label key={v.key} className="block">
              <span className="text-[0.56rem] uppercase tracking-wide" style={{ color: "var(--hms-faint)" }}>{v.key === "systolic" ? tx("Systolic", "سیستولیک") : v.key === "diastolic" ? tx("Diastolic", "دیاستولیک") : v.key === "pulse" ? tx("Pulse", "نبض") : v.key === "temp" ? tx("Temp", "حرارت") : v.key === "spo2" ? "SpO₂" : tx("Resp", "تنفس")} <span className="normal-case">({v.unit})</span></span>
              <input
                className="hms-input mt-0.5 !h-8 !text-[0.72rem]"
                inputMode="decimal"
                placeholder={v.ph}
                value={vitals[v.key] ?? ""}
                onChange={(e) => setVitals((s) => ({ ...s, [v.key]: e.target.value }))}
              />
            </label>
          ))}
        </div>
        {triage && (
          <p className="mt-1.5 rounded-md px-2 py-1 text-[0.66rem]" style={{ background: triage.level === "critical" ? "#fee2e2" : triage.level === "urgent" ? "#fef3c7" : "var(--hms-surface-2)", color: triage.level === "critical" ? "#991b1b" : triage.level === "urgent" ? "#92400e" : "var(--hms-muted)" }}>
            <AlertTriangle size={10} className="mr-1 inline" />
            {triage.recommendation}
          </p>
        )}
      </div>

      {/* diagnosis */}
      <div className="grid gap-2 sm:grid-cols-[1.6fr_0.7fr_auto]">
        <Field label={tx("Working diagnosis", "تشخیص اولیه")}>
          <input className="hms-input" value={diagnosis} onChange={(e) => setDiagnosis(e.target.value)} placeholder={tx("e.g. Acute appendicitis", "مثلاً آپندیسایت حاد")} />
        </Field>
        <Field label="ICD-10">
          <input className="hms-input" value={icd10} onChange={(e) => setIcd10(e.target.value)} placeholder="K35.8" />
        </Field>
        <div className="flex items-end">
          <Btn variant="soft" onClick={suggest} loading={busy === "note"} icon={<Wand2 size={12} />}>{tx("AI draft", "پیش‌نویس هوشمند")}</Btn>
        </div>
      </div>

      <Field label={tx("Clinical note & plan", "یادداشت کلینیکی و پلان")}>
        <textarea className="hms-input" rows={3} value={summary} onChange={(e) => setSummary(e.target.value)} placeholder={tx("History, examination, plan. Use the AI draft button to start from the diagnosis.", "تاریخچه، معاینه، پلان. با دکمهٔ پیش‌نویس هوشمند از روی تشخیص شروع کنید.")} />
      </Field>

      {/* medicines */}
      <div>
        <div className="flex items-center justify-between">
          <span className="hms-label !mb-0">{tx("Medicines", "دواها")} ({digitsOf(lang, lines.filter((l) => l.drug).length)})</span>
          <div className="flex gap-1">
            {QUICK.slice(0, 3).map((d) => (
              <button key={d} className="hms-btn hms-btn-sm" onClick={() => setLines((ls) => [...ls, { ...EMPTY, drug: d }])}>
                <Plus size={10} /> {d.split(" ")[0]}
              </button>
            ))}
            <button className="hms-btn hms-btn-sm hms-btn-soft" onClick={() => setLines((ls) => [...ls, { ...EMPTY }])}><Plus size={10} /> {tx("Add line", "افزودن سطر")}</button>
          </div>
        </div>
        <div className="mt-1.5 space-y-1.5">
          {lines.map((l, i) => (
            <div key={i} className="grid items-center gap-1 rounded-lg border p-1.5" style={{ borderColor: "var(--hms-border)", gridTemplateColumns: "1.5fr 0.7fr 0.8fr 1fr 0.8fr 0.55fr auto" }}>
              <input className="hms-input !h-8 !text-[0.7rem]" list="drug-list" placeholder={tx("Medicine", "دوا")} value={l.drug} onChange={(e) => setLines((ls) => ls.map((x, j) => (j === i ? { ...x, drug: e.target.value } : x)))} />
              <input className="hms-input !h-8 !text-[0.7rem]" placeholder={tx("500 mg", "۵۰۰ ملی‌گرم")} value={l.strength} onChange={(e) => setLines((ls) => ls.map((x, j) => (j === i ? { ...x, strength: e.target.value } : x)))} />
              <input className="hms-input !h-8 !text-[0.7rem]" placeholder={tx("1 tab", "۱ قرص")} value={l.dosage} onChange={(e) => setLines((ls) => ls.map((x, j) => (j === i ? { ...x, dosage: e.target.value } : x)))} />
              <input className="hms-input !h-8 !text-[0.7rem]" placeholder={tx("TDS", "سه بار در روز")} value={l.frequency} onChange={(e) => setLines((ls) => ls.map((x, j) => (j === i ? { ...x, frequency: e.target.value } : x)))} />
              <input className="hms-input !h-8 !text-[0.7rem]" placeholder={tx("5 days", "۵ روز")} value={l.duration} onChange={(e) => setLines((ls) => ls.map((x, j) => (j === i ? { ...x, duration: e.target.value } : x)))} />
              <input className="hms-input !h-8 !text-[0.7rem]" type="number" min={1} value={l.qty} onChange={(e) => setLines((ls) => ls.map((x, j) => (j === i ? { ...x, qty: Number(e.target.value) } : x)))} />
              <button className="hms-btn hms-btn-sm hms-btn-ghost" onClick={() => setLines((ls) => (ls.length === 1 ? [{ ...EMPTY }] : ls.filter((_, j) => j !== i)))}>
                <Trash2 size={11} />
              </button>
            </div>
          ))}
        </div>
        <datalist id="drug-list">
          {QUICK.map((d) => <option key={d} value={d} />)}
        </datalist>
      </div>

      {/* safety */}
      {safety && (
        <div
          className="rounded-lg border p-2.5"
          style={{
            borderColor: safety.verdict === "stop" ? "color-mix(in srgb,#ef4444 40%, transparent)" : safety.verdict === "caution" ? "color-mix(in srgb,#f59e0b 40%, transparent)" : "color-mix(in srgb,#10b981 36%, transparent)",
            background: safety.verdict === "stop" ? "color-mix(in srgb,#ef4444 6%, var(--hms-surface))" : safety.verdict === "caution" ? "color-mix(in srgb,#f59e0b 7%, var(--hms-surface))" : "color-mix(in srgb,#10b981 6%, var(--hms-surface))",
          }}
        >
          <div className="flex items-center gap-1.5">
            {safety.verdict === "clear" ? <CheckCircle2 size={13} style={{ color: "#0b7a58" }} /> : <AlertTriangle size={13} style={{ color: safety.verdict === "stop" ? "#b91c1c" : "#b45309" }} />}
            <p className="text-[0.72rem] font-semibold">{tx("Safety screen", "بررسی ایمنی")} · {digitsOf(lang, safety.score)}/100 · <span className="capitalize">{safety.verdict === "clear" ? tx("clear", "پاک") : safety.verdict === "caution" ? tx("caution", "احتیاط") : tx("stop", "توقف")}</span></p>
            <Pill tone={verdictTone as "good"}>{tx("{n} flag(s)", "{n} علامت", { n: digitsOf(lang, safety.interactions.length) })}</Pill>
          </div>
          <p className="mt-1 text-[0.68rem] leading-relaxed" style={{ color: "var(--hms-muted)" }}>{safety.summary}</p>
          {safety.interactions.length > 0 && (
            <ul className="mt-1 space-y-0.5">
              {safety.interactions.map((it, i) => (
                <li key={i} className="text-[0.66rem] leading-snug">
                  <b className="capitalize">{statusText(lang, it.severity)}</b> — {it.detail}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      <div className="grid gap-2 sm:grid-cols-[1fr_1fr_auto_auto]">
        <Field label={tx("Follow-up", "پیگیری")}>
          <input className="hms-input" value={followUp} onChange={(e) => setFollowUp(e.target.value)} placeholder={tx("Review in 7 days", "مراجعهٔ مجدد پس از ۷ روز")} />
        </Field>
        <Field label={tx("Print design", "طرح چاپ")}>
          <select className="hms-input" value={template} onChange={(e) => setTemplate(Number(e.target.value))}>
            {templates.map((t) => <option key={t.id} value={t.id}>{t.id}. {t.name}</option>)}
          </select>
        </Field>
        <div className="flex items-end">
          <Btn onClick={() => save(false)} loading={busy === "draft"} icon={<ClipboardPlus size={12} />} disabled={!canPrescribe}>{tx("Save draft", "ذخیرهٔ پیش‌نویس")}</Btn>
        </div>
        <div className="flex items-end">
          <Btn variant="primary" onClick={() => save(true)} loading={busy === "sign"} icon={<Stethoscope size={12} />} disabled={!canPrescribe}>{tx("Sign & issue", "امضا و صدور")}</Btn>
        </div>
      </div>

      {!canPrescribe && (
        <p className="text-[0.66rem]" style={{ color: "var(--hms-faint)" }}>
          {tx("Your role can open the consult room but only physicians can sign prescriptions.", "نقش شما می‌تواند اتاق معاینه را باز کند، اما تنها داکتران می‌توانند نسخه امضا کنند.")}
        </p>
      )}

      {msg && (
        <p className="rounded-lg px-2.5 py-2 text-[0.7rem]" style={{ background: msg.tone === "ok" ? "color-mix(in srgb,#10b981 12%, transparent)" : "color-mix(in srgb,#ef4444 12%, transparent)", color: msg.tone === "ok" ? "#0b6b4d" : "#991b1b" }}>
          {msg.text}
        </p>
      )}

      {rxId && (
        <a href={`/hms/rx/${rxId}?template=${template}`} target="_blank" rel="noreferrer" className="hms-btn hms-btn-soft inline-flex">
          <Printer size={12} /> {tx("Open print sheet", "باز کردن برگهٔ چاپ")}
        </a>
      )}

      <p className="flex items-center gap-1 text-[0.62rem]" style={{ color: "var(--hms-faint)" }}>
        <Sparkles size={10} /> {tx("The assistant reads only this consult — nothing leaves this machine.", "دستیار فقط همین معاینه را می‌خواند — هیچ چیزی از این دستگاه بیرون نمی‌رود.")}
      </p>
    </div>
  );
}
