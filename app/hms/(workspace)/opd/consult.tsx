"use client";

import {
  AlertTriangle, CheckCircle2, ClipboardPlus, Loader2, Plus, Printer, Sparkles, Stethoscope, Trash2, Wand2,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Btn, Field, Pill, Status } from "@/components/hms/ui";
import { age } from "@/lib/hms/format";

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
}: {
  patients: Patient[];
  appointments: Appt[];
  templates: { id: number; name: string }[];
  canPrescribe: boolean;
}) {
  const router = useRouter();
  const [patientId, setPatientId] = useState(appointments[0]?.patient_id ?? patients[0]?.id ?? "");
  const [apptId, setApptId] = useState(appointments[0]?.id ?? "");
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
    if (!diagnosis.trim()) return setMsg({ tone: "bad", text: "Type a working diagnosis first — the assistant needs it to draft the note." });
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
    setMsg({ tone: "ok", text: `Drafted from the diagnosis. Suggested print design: ${templates.find((t) => t.id === tpl.suggested)?.name ?? `template ${tpl.suggested}`}.` });
  }

  async function save(sign: boolean) {
    if (!patientId) return setMsg({ tone: "bad", text: "Choose a patient first." });
    const valid = lines.filter((l) => l.drug.trim());
    if (!valid.length) return setMsg({ tone: "bad", text: "Add at least one medicine before finishing the consult." });
    setBusy(sign ? "sign" : "draft");
    setMsg(null);
    try {
      if (diagnosis.trim() || summary.trim()) {
        await fetch("/api/hms/encounters", {
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
        setMsg({ tone: "bad", text: data.error ?? "The consult could not be saved." });
        if (data.safety) setSafety(data.safety);
      } else {
        setMsg({ tone: "ok", text: sign ? `Signed ${data.rx_no}. Open the print sheet to hand it to the patient.` : `Draft ${data.rx_no} saved — sign it when you are ready.` });
        setRxId(data.id);
        router.refresh();
      }
    } catch {
      setMsg({ tone: "bad", text: "Network error while saving." });
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
          <span className="hms-label">Patient</span>
          <input className="hms-input" placeholder="Search name or MRN…" value={q} onChange={(e) => setQ(e.target.value)} />
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
          <span className="hms-label">Linked appointment</span>
          <select className="hms-input" value={apptId} onChange={(e) => { setApptId(e.target.value); const a = appointments.find((x) => x.id === e.target.value); if (a) setPatientId(a.patient_id); }}>
            <option value="">Walk-in (no appointment)</option>
            {appointments.filter((a) => a.patient_id === patientId || !patientId).map((a) => (
              <option key={a.id} value={a.id}>{a.patient_name} · {new Date(a.start_at).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}</option>
            ))}
          </select>
          {patient && (
            <div className="mt-1.5 rounded-lg px-2 py-1.5 text-[0.66rem]" style={{ background: "var(--hms-surface-2)" }}>
              <b>{patient.name}</b> · {patient.mrn} · {patient.gender ?? "—"} · {age(patient.dob)}
              {patient.allergies && patient.allergies !== "None" && (
                <span className="ml-1 font-semibold" style={{ color: "#b91c1c" }}>· allergy: {patient.allergies}</span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* vitals */}
      <div className="rounded-lg border p-2.5" style={{ borderColor: "var(--hms-border)" }}>
        <div className="flex items-center justify-between">
          <span className="text-[0.62rem] font-bold uppercase tracking-[0.06em]" style={{ color: "var(--hms-faint)" }}>Vitals & triage</span>
          {triage && (
            <span className="flex items-center gap-1 text-[0.64rem] font-semibold">
              <Status value={triage.level === "critical" ? "critical" : triage.level === "urgent" ? "warning" : "active"} />
              NEWS {triage.score}
            </span>
          )}
        </div>
        <div className="mt-1.5 grid grid-cols-3 gap-1.5 sm:grid-cols-6">
          {VITALS.map((v) => (
            <label key={v.key} className="block">
              <span className="text-[0.56rem] uppercase tracking-wide" style={{ color: "var(--hms-faint)" }}>{v.label} <span className="normal-case">({v.unit})</span></span>
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
        <Field label="Working diagnosis">
          <input className="hms-input" value={diagnosis} onChange={(e) => setDiagnosis(e.target.value)} placeholder="e.g. Acute appendicitis" />
        </Field>
        <Field label="ICD-10">
          <input className="hms-input" value={icd10} onChange={(e) => setIcd10(e.target.value)} placeholder="K35.8" />
        </Field>
        <div className="flex items-end">
          <Btn variant="soft" onClick={suggest} loading={busy === "note"} icon={<Wand2 size={12} />}>AI draft</Btn>
        </div>
      </div>

      <Field label="Clinical note & plan">
        <textarea className="hms-input" rows={3} value={summary} onChange={(e) => setSummary(e.target.value)} placeholder="History, examination, plan. Use the AI draft button to start from the diagnosis." />
      </Field>

      {/* medicines */}
      <div>
        <div className="flex items-center justify-between">
          <span className="hms-label !mb-0">Medicines ({lines.filter((l) => l.drug).length})</span>
          <div className="flex gap-1">
            {QUICK.slice(0, 3).map((d) => (
              <button key={d} className="hms-btn hms-btn-sm" onClick={() => setLines((ls) => [...ls, { ...EMPTY, drug: d }])}>
                <Plus size={10} /> {d.split(" ")[0]}
              </button>
            ))}
            <button className="hms-btn hms-btn-sm hms-btn-soft" onClick={() => setLines((ls) => [...ls, { ...EMPTY }])}><Plus size={10} /> Add line</button>
          </div>
        </div>
        <div className="mt-1.5 space-y-1.5">
          {lines.map((l, i) => (
            <div key={i} className="grid items-center gap-1 rounded-lg border p-1.5" style={{ borderColor: "var(--hms-border)", gridTemplateColumns: "1.5fr 0.7fr 0.8fr 1fr 0.8fr 0.55fr auto" }}>
              <input className="hms-input !h-8 !text-[0.7rem]" list="drug-list" placeholder="Medicine" value={l.drug} onChange={(e) => setLines((ls) => ls.map((x, j) => (j === i ? { ...x, drug: e.target.value } : x)))} />
              <input className="hms-input !h-8 !text-[0.7rem]" placeholder="500 mg" value={l.strength} onChange={(e) => setLines((ls) => ls.map((x, j) => (j === i ? { ...x, strength: e.target.value } : x)))} />
              <input className="hms-input !h-8 !text-[0.7rem]" placeholder="1 tab" value={l.dosage} onChange={(e) => setLines((ls) => ls.map((x, j) => (j === i ? { ...x, dosage: e.target.value } : x)))} />
              <input className="hms-input !h-8 !text-[0.7rem]" placeholder="TDS" value={l.frequency} onChange={(e) => setLines((ls) => ls.map((x, j) => (j === i ? { ...x, frequency: e.target.value } : x)))} />
              <input className="hms-input !h-8 !text-[0.7rem]" placeholder="5 days" value={l.duration} onChange={(e) => setLines((ls) => ls.map((x, j) => (j === i ? { ...x, duration: e.target.value } : x)))} />
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
            <p className="text-[0.72rem] font-semibold">Safety screen · {safety.score}/100 · <span className="capitalize">{safety.verdict}</span></p>
            <Pill tone={verdictTone as "good"}>{safety.interactions.length} flag(s)</Pill>
          </div>
          <p className="mt-1 text-[0.68rem] leading-relaxed" style={{ color: "var(--hms-muted)" }}>{safety.summary}</p>
          {safety.interactions.length > 0 && (
            <ul className="mt-1 space-y-0.5">
              {safety.interactions.map((it, i) => (
                <li key={i} className="text-[0.66rem] leading-snug">
                  <b className="capitalize">{it.severity}</b> — {it.detail}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      <div className="grid gap-2 sm:grid-cols-[1fr_1fr_auto_auto]">
        <Field label="Follow-up">
          <input className="hms-input" value={followUp} onChange={(e) => setFollowUp(e.target.value)} placeholder="Review in 7 days" />
        </Field>
        <Field label="Print design">
          <select className="hms-input" value={template} onChange={(e) => setTemplate(Number(e.target.value))}>
            {templates.map((t) => <option key={t.id} value={t.id}>{t.id}. {t.name}</option>)}
          </select>
        </Field>
        <div className="flex items-end">
          <Btn onClick={() => save(false)} loading={busy === "draft"} icon={<ClipboardPlus size={12} />} disabled={!canPrescribe}>Save draft</Btn>
        </div>
        <div className="flex items-end">
          <Btn variant="primary" onClick={() => save(true)} loading={busy === "sign"} icon={<Stethoscope size={12} />} disabled={!canPrescribe}>Sign & issue</Btn>
        </div>
      </div>

      {!canPrescribe && (
        <p className="text-[0.66rem]" style={{ color: "var(--hms-faint)" }}>
          Your role can open the consult room but only physicians can sign prescriptions.
        </p>
      )}

      {msg && (
        <p className="rounded-lg px-2.5 py-2 text-[0.7rem]" style={{ background: msg.tone === "ok" ? "color-mix(in srgb,#10b981 12%, transparent)" : "color-mix(in srgb,#ef4444 12%, transparent)", color: msg.tone === "ok" ? "#0b6b4d" : "#991b1b" }}>
          {msg.text}
        </p>
      )}

      {rxId && (
        <a href={`/hms/rx/${rxId}?template=${template}`} target="_blank" rel="noreferrer" className="hms-btn hms-btn-soft inline-flex">
          <Printer size={12} /> Open print sheet
        </a>
      )}

      <p className="flex items-center gap-1 text-[0.62rem]" style={{ color: "var(--hms-faint)" }}>
        <Sparkles size={10} /> The assistant reads only this consult — nothing leaves this machine.
      </p>
    </div>
  );
}
