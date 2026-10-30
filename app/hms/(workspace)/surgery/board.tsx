"use client";

import { CheckCircle2, Loader2, Play, Plus, Scissors, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Field, Person, Status } from "@/components/hms/ui";
import { dateShort, digitsOf, timeShort } from "@/lib/hms/format";
import { useLang, useTx } from "@/components/hms/lang-provider";
import type { SurgeryRow } from "@/lib/hms/queries";

const COMMON = ["Appendicectomy", "Laparoscopic cholecystectomy", "Inguinal hernia repair", "Caesarean section", "Hydrocelectomy", "Excision biopsy", "Wound debridement"];

export function SurgeryBoard({ rows, patients, canBook, canProgress }: { rows: SurgeryRow[]; patients: { id: string; name: string; mrn: string }[]; canBook: boolean; canProgress: boolean }) {
  const router = useRouter();
  const tx = useTx();
  const { lang } = useLang();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [form, setForm] = useState({ patient_id: patients[0]?.id ?? "", procedure_name: "", theatre: "Theatre A", scheduled_at: "", duration_min: 60, anesthesia: "General anaesthesia", notes: "" });
  const [msg, setMsg] = useState<string | null>(null);

  async function book() {
    if (!form.procedure_name.trim() || !form.scheduled_at) return setMsg(tx("Procedure and start time are required.", "نام عملیات و وقت شروع لازم است."));
    setBusy("book");
    const res = await fetch("/api/hms/surgery", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ action: "book", ...form }) });
    const data = await res.json();
    setBusy(null);
    if (!res.ok) return setMsg(data.error ?? tx("Could not book the case.", "ثبت عملیات انجام نشد."));
    setOpen(false);
    router.refresh();
  }

  async function progress(id: string, action: "start" | "complete" | "cancel") {
    setBusy(id + action);
    await fetch("/api/hms/surgery", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ action, id }) });
    setBusy(null);
    router.refresh();
  }

  return (
    <div className="mt-3">
      <div className="flex items-center justify-between">
        <p className="text-[0.66rem]" style={{ color: "var(--hms-faint)" }}>{tx("{n} case(s) on record · pre-op checks are recorded in the note field", "{n} عملیات ثبت‌شده · بررسی‌های پیش از عمل در بخش یادداشت نوشته می‌شود", { n: digitsOf(lang, rows.length) })}</p>
        {canBook && <button className="hms-btn hms-btn-primary hms-btn-sm" onClick={() => { setOpen(true); setForm({ ...form, scheduled_at: new Date(Date.now() + 864e5).toISOString().slice(0, 16) }); }}><Plus size={11} /> {tx("Book a case", "ثبت عملیات")}</button>}
      </div>

      {msg && <p className="mt-2 rounded-md px-2 py-1 text-[0.68rem]" style={{ background: "#fee2e2", color: "#991b1b" }}>{msg}</p>}

      <div className="mt-2 space-y-1.5">
        {rows.map((s) => (
          <div key={s.id} className="rounded-lg border p-2" style={{ borderColor: "var(--hms-border)" }}>
            <div className="flex flex-wrap items-center gap-2">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <p className="truncate text-[0.78rem] font-semibold">{s.procedure_name}</p>
                  <Status value={s.status} />
                </div>
                <p className="truncate text-[0.66rem]" style={{ color: "var(--hms-muted)" }}>
                  {s.patient_name} · {s.mrn} · {s.theatre} · {dateShort(s.scheduled_at, lang)} {tx("at", "ساعت")} {timeShort(s.scheduled_at, lang)} · {digitsOf(lang, s.duration_min)} {tx("min", "دقیقه")} · {s.anesthesia}
                </p>
              </div>
              {canProgress && (
                <div className="flex gap-1">
                  {s.status === "scheduled" && (
                    <>
                      <button className="hms-btn hms-btn-sm" onClick={() => progress(s.id, "start")} disabled={!!busy}>
                        {busy === s.id + "start" ? <Loader2 size={10} className="animate-spin" /> : <Play size={10} />} {tx("Start", "شروع")}
                      </button>
                      <button className="hms-btn hms-btn-sm hms-btn-ghost" onClick={() => progress(s.id, "cancel")} disabled={!!busy}>{tx("Cancel", "لغو")}</button>
                    </>
                  )}
                  {s.status === "in_progress" && (
                    <button className="hms-btn hms-btn-sm hms-btn-primary" onClick={() => progress(s.id, "complete")} disabled={!!busy}>
                      {busy === s.id + "complete" ? <Loader2 size={10} className="animate-spin" /> : <CheckCircle2 size={10} />} {tx("Complete", "تکمیل")}
                    </button>
                  )}
                </div>
              )}
            </div>
            {s.notes && <p className="mt-1 rounded px-1.5 py-1 text-[0.66rem]" style={{ background: "var(--hms-surface-2)", color: "var(--hms-muted)" }}>{s.notes}</p>}
          </div>
        ))}
        {!rows.length && (
          <div className="py-10 text-center">
            <Scissors size={18} className="mx-auto mb-1" style={{ color: "var(--hms-faint)" }} />
            <p className="text-[0.76rem] font-semibold">{tx("Theatre list is empty", "فهرست عملیات خالی است")}</p>
            <p className="text-[0.68rem]" style={{ color: "var(--hms-muted)" }}>{tx("Book the first case to start the surgical day.", "برای شروع روز جراحی، اولین عملیات را ثبت کنید.")}</p>
          </div>
        )}
      </div>

      {open && (
        <div className="fixed inset-0 z-[70] flex items-start justify-center overflow-y-auto bg-black/45 p-4" onClick={() => setOpen(false)}>
          <div className="my-8 w-full max-w-lg rounded-xl border bg-[var(--hms-surface)] p-4 shadow-2xl" style={{ borderColor: "var(--hms-border)" }} onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between">
              <div>
                <p className="text-[0.84rem] font-semibold">{tx("Book a surgical case", "ثبت یک عملیات جراحی")}</p>
                <p className="text-[0.64rem]" style={{ color: "var(--hms-faint)" }}>{tx("Reserve theatre time and the consultant.", "وقت اتاق عملیات و داکتر معالج را رزرو کنید.")}</p>
              </div>
              <button className="hms-btn hms-btn-sm hms-btn-ghost" onClick={() => setOpen(false)}><X size={13} /></button>
            </div>
            <div className="mt-2 grid gap-2 sm:grid-cols-2">
              <Field label={tx("Patient", "مریض")} className="sm:col-span-2">
                <select className="hms-input" value={form.patient_id} onChange={(e) => setForm({ ...form, patient_id: e.target.value })}>
                  {patients.map((p) => <option key={p.id} value={p.id}>{p.name} · {p.mrn}</option>)}
                </select>
              </Field>
              <Field label={tx("Procedure", "عملیات")} className="sm:col-span-2">
                <input className="hms-input" list="procedure-list" value={form.procedure_name} onChange={(e) => setForm({ ...form, procedure_name: e.target.value })} placeholder="Laparoscopic cholecystectomy" />
                <datalist id="procedure-list">{COMMON.map((c) => <option key={c} value={c} />)}</datalist>
              </Field>
              <Field label={tx("Theatre", "اتاق عملیات")}>
                <select className="hms-input" value={form.theatre} onChange={(e) => setForm({ ...form, theatre: e.target.value })}>
                  {[["Theatre A", "اتاق عملیات الف"], ["Theatre B", "اتاق عملیات ب"], ["Minor procedures", "پروسیجرهای کوچک"]].map(([t, fa]) => <option key={t} value={t}>{tx(t, fa)}</option>)}
                </select>
              </Field>
              <Field label={tx("Start", "شروع")}><input className="hms-input" type="datetime-local" value={form.scheduled_at} onChange={(e) => setForm({ ...form, scheduled_at: e.target.value })} /></Field>
              <Field label={tx("Duration (min)", "مدت (دقیقه)")}><input className="hms-input" type="number" min={15} step={15} value={form.duration_min} onChange={(e) => setForm({ ...form, duration_min: Number(e.target.value) })} /></Field>
              <Field label={tx("Anaesthesia", "بیهوشی")}>
                <select className="hms-input" value={form.anesthesia} onChange={(e) => setForm({ ...form, anesthesia: e.target.value })}>
                  {[["General anaesthesia", "بیهوشی عمومی"], ["Spinal anaesthesia", "بیهوشی نخاعی"], ["Local anaesthesia", "بیهوشی موضعی"], ["Sedation", "آرام‌بخشی"]].map(([a, fa]) => <option key={a} value={a}>{tx(a, fa)}</option>)}
                </select>
              </Field>
              <Field label={tx("Pre-op note", "یادداشت پیش از عمل")} className="sm:col-span-2"><textarea className="hms-input" rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder={tx("Consent signed, NPO since midnight, group & save done…", "رضایت‌نامه امضا شد، از نیمه‌شب ناشتا، گروه خون و ذخیره انجام شد…")} /></Field>
            </div>
            <div className="mt-3 flex justify-end gap-1.5">
              <button className="hms-btn" onClick={() => setOpen(false)}>{tx("Cancel", "لغو")}</button>
              <button className="hms-btn hms-btn-primary" onClick={book} disabled={busy === "book"}>
                {busy === "book" ? <Loader2 size={11} className="animate-spin" /> : <Plus size={11} />} {tx("Book case", "ثبت عملیات")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
