"use client";

import {
  Activity, AlertTriangle, Beaker, Calculator, CheckCircle2, ChevronRight, FlaskConical, HeartPulse, Info,
  ShieldCheck, Stethoscope, Thermometer, XCircle,
} from "lucide-react";
import { useMemo, useState } from "react";
import { useLang } from "@/components/hms/lang-provider";
import {
  PEDS_DOSES, REFERENCE, RENAL_RULES, alternativesFor, bodyMetrics, checkInteraction, interpretLab,
  news2, pedsDose, qsofa, renalAdjust,
} from "@/lib/hms/clinical";

/**
 * The clinical toolkit: five small instruments a ward doctor actually reaches
 * for during a shift. Each one runs entirely in the browser from a local rule
 * table — nothing is transmitted, and every result states the rule it used.
 */

type Tab = "ews" | "meds" | "lab" | "body";

const TABS: { id: Tab; en: string; fa: string; icon: typeof Activity }[] = [
  { id: "ews", en: "Early warning", fa: "هشدار زودهنگام", icon: HeartPulse },
  { id: "meds", en: "Medicines", fa: "دواها", icon: Beaker },
  { id: "lab", en: "Laboratory", fa: "لابراتوار", icon: FlaskConical },
  { id: "body", en: "Body & scores", fa: "بدن و محاسبات", icon: Calculator },
];

function Field({ label, children, hint }: { label: string; children: React.ReactNode; hint?: string }) {
  return (
    <label className="block">
      <span className="hms-label">{label}</span>
      {children}
      {hint && <span className="mt-0.5 block text-[0.58rem]" style={{ color: "var(--hms-faint)" }}>{hint}</span>}
    </label>
  );
}

function Result({ tone, title, body, extra }: { tone: string; title: string; body: string; extra?: React.ReactNode }) {
  return (
    <div className="rounded-xl border p-3" style={{ borderColor: `color-mix(in srgb, ${tone} 40%, var(--hms-border))`, background: `color-mix(in srgb, ${tone} 7%, var(--hms-surface))` }}>
      <p className="text-[0.86rem] font-semibold" style={{ color: tone }}>{title}</p>
      <p className="mt-1 text-[0.7rem] leading-relaxed" style={{ color: "var(--hms-muted)" }}>{body}</p>
      {extra}
    </div>
  );
}

export function ClinicalTools() {
  const { tx, lang } = useLang();
  const [tab, setTab] = useState<Tab>("ews");

  /* ------------------------------------------------------------ NEWS2 state */
  const [v, setV] = useState({
    respiratoryRate: 18, spo2: 96, onOxygen: false, systolic: 120, pulse: 82,
    consciousness: "alert", temperature: 37, scale2: false,
  });
  const ews = useMemo(() => news2(v, lang), [v, lang]);
  const sepsis = useMemo(() => qsofa({ respiratoryRate: v.respiratoryRate, systolic: v.systolic, alteredMentation: v.consciousness !== "alert" }, lang), [v, lang]);

  /* ----------------------------------------------------------- medicines state */
  const [drugA, setDrugA] = useState("");
  const [drugB, setDrugB] = useState("");
  const [checked, setChecked] = useState<ReturnType<typeof checkInteraction> | null>(null);
  const [pedsDrug, setPedsDrug] = useState(PEDS_DOSES[0].drug);
  const [weight, setWeight] = useState(14);
  const [renalDrug, setRenalDrug] = useState(RENAL_RULES[0].drug);
  const [crCl, setCrCl] = useState(75);
  const peds = useMemo(() => pedsDose(pedsDrug, weight, lang), [pedsDrug, weight, lang]);
  const renal = useMemo(() => renalAdjust(renalDrug, crCl, lang), [renalDrug, crCl, lang]);

  /* ------------------------------------------------------------- lab state */
  const [labName, setLabName] = useState(REFERENCE[0].name);
  const [labValue, setLabValue] = useState(13);
  const lab = useMemo(() => interpretLab(labName, labValue, lang), [labName, labValue, lang]);

  /* ------------------------------------------------------------ body state */
  const [bw, setBw] = useState(70);
  const [bh, setBh] = useState(170);
  const [bage, setBage] = useState(45);
  const [bsex, setBsex] = useState<"male" | "female">("male");
  const [creat, setCreat] = useState(1);
  const body = useMemo(() => bodyMetrics({ weightKg: bw, heightCm: bh, age: bage, sex: bsex, creatinine: creat }, lang), [bw, bh, bage, bsex, creat, lang]);

  return (
    <div className="space-y-3">
      <div className="hms-hero p-4 anim-rise">
        <p className="hms-eyebrow">{tx("Clinical intelligence", "هوشمندی کلینیکی")}</p>
        <h2 className="hms-hero-title mt-1">{tx("Five instruments, one screen, no internet needed.", "پنج ابزار، یک صفحه، بدون نیاز به انترنت.")}</h2>
        <p className="mt-1 max-w-2xl text-[0.72rem] leading-relaxed" style={{ color: "var(--hms-muted)" }}>
          {tx(
            "Early-warning scoring, sepsis screening, interaction checking, weight-based and renal dosing, laboratory interpretation, and body metrics. Each answer names the rule it used, so it can be checked by a second clinician.",
            "امتیاز هشدار زودهنگام، اسکرین سپسیس، بررسی تداخل دواها، دوز بر اساس وزن و کار کلیه، تفسیر لابراتوار و محاسبات بدن. هر جواب قاعدهٔ خود را نام می‌برد تا کلینیسین دوم هم بتواند بررسی کند."
          )}
        </p>
      </div>

      <div className="hms-tabbar">
        {TABS.map((x) => (
          <button key={x.id} data-active={tab === x.id} onClick={() => setTab(x.id)} className="hms-tab">
            <x.icon size={13} /> {tx(x.en, x.fa)}
          </button>
        ))}
      </div>

      {/* ============================================================ EWS */}
      {tab === "ews" && (
        <div className="grid gap-3 lg:grid-cols-[1.15fr_1fr] anim-rise">
          <div className="hms-card p-3.5">
            <p className="text-[0.82rem] font-semibold">{tx("Observations", "معاینات حیاتی")}</p>
            <p className="mt-0.5 text-[0.66rem]" style={{ color: "var(--hms-muted)" }}>
              {tx("Enter what the nurse has just recorded. The score updates as you type.", "آنچه نرس همین حالا ثبت کرده وارد کنید. امتیاز با تایپ به‌روز می‌شود.")}
            </p>
            <div className="mt-2.5 grid grid-cols-2 gap-2.5 sm:grid-cols-3">
              <Field label={tx("Resp rate /min", "تنفس در دقیقه")}>
                <input type="number" className="hms-input" value={v.respiratoryRate} onChange={(e) => setV({ ...v, respiratoryRate: Number(e.target.value) })} />
              </Field>
              <Field label={tx("SpO₂ %", "اکسیجن خون %")}>
                <input type="number" className="hms-input" value={v.spo2} onChange={(e) => setV({ ...v, spo2: Number(e.target.value) })} />
              </Field>
              <Field label={tx("Systolic BP", "فشار سیستولیک")}>
                <input type="number" className="hms-input" value={v.systolic} onChange={(e) => setV({ ...v, systolic: Number(e.target.value) })} />
              </Field>
              <Field label={tx("Pulse /min", "نبض در دقیقه")}>
                <input type="number" className="hms-input" value={v.pulse} onChange={(e) => setV({ ...v, pulse: Number(e.target.value) })} />
              </Field>
              <Field label={tx("Temperature °C", "حرارت °C")}>
                <input type="number" step="0.1" className="hms-input" value={v.temperature} onChange={(e) => setV({ ...v, temperature: Number(e.target.value) })} />
              </Field>
              <Field label={tx("Consciousness", "هوشیاری")}>
                <select className="hms-input" value={v.consciousness} onChange={(e) => setV({ ...v, consciousness: e.target.value })}>
                  <option value="alert">Alert</option>
                  <option value="new-confusion">{tx("New confusion", "گیجی جدید")}</option>
                  <option value="voice">Voice</option>
                  <option value="pain">Pain</option>
                  <option value="unresponsive">Unresponsive</option>
                </select>
              </Field>
            </div>
            <div className="mt-2.5 flex flex-wrap gap-3">
              <label className="flex items-center gap-1.5 text-[0.7rem]">
                <input type="checkbox" checked={v.onOxygen} onChange={(e) => setV({ ...v, onOxygen: e.target.checked })} />
                {tx("On supplemental oxygen", "اکسیجن اضافی")}
              </label>
              <label className="flex items-center gap-1.5 text-[0.7rem]">
                <input type="checkbox" checked={v.scale2} onChange={(e) => setV({ ...v, scale2: e.target.checked })} />
                {tx("Scale 2 (target 88–92%, hypercapnia)", "مقیاس ۲ (هدف ۸۸–۹۲، هایپرکاپنی)")}
              </label>
            </div>
          </div>

          <div className="space-y-2.5">
            <div className="hms-card p-3.5">
              <div className="flex items-end justify-between">
                <div>
                  <p className="hms-eyebrow">NEWS2</p>
                  <p className="mt-0.5 text-[2.4rem] font-semibold leading-none tracking-[-0.04em]" style={{ color: ews.band.color }}>{ews.total}</p>
                </div>
                <span className="rounded-full px-2.5 py-1 text-[0.66rem] font-bold" style={{ background: `color-mix(in srgb, ${ews.band.color} 16%, transparent)`, color: ews.band.color }}>
                  {tx(ews.band.label[0], ews.band.label[1])}
                </span>
              </div>
              <p className="mt-2 text-[0.7rem] font-medium">{tx(ews.band.action[0], ews.band.action[1])}</p>
              <p className="mt-1 text-[0.66rem]" style={{ color: "var(--hms-muted)" }}>{tx(ews.band.escalation[0], ews.band.escalation[1])}</p>
              {ews.single3 && (
                <p className="mt-2 flex items-start gap-1.5 rounded-md px-2 py-1 text-[0.64rem]" style={{ background: "color-mix(in srgb,#ef4444 10%, transparent)", color: "#991b1b" }}>
                  <AlertTriangle size={11} className="mt-0.5 shrink-0" /> {tx("A single parameter scored 3 — this alone warrants urgent review.", "یک پارامتر نمرهٔ ۳ گرفته — همین به‌تنهایی بازبینی فوری می‌خواهد.")}
                </p>
              )}
            </div>

            <div className="hms-card overflow-hidden">
              <table className="w-full">
                <tbody>
                  {ews.parts.map((p) => (
                    <tr key={p.key} className="hms-row">
                      <td className="hms-td" style={{ color: "var(--hms-muted)" }}>{p.label}</td>
                      <td className="hms-td" data-num>{p.value}</td>
                      <td className="hms-td text-right">
                        <span className="inline-flex h-5 w-5 items-center justify-center rounded-md text-[0.62rem] font-bold" style={{
                          background: p.score === 0 ? "color-mix(in srgb,#10b981 14%, transparent)" : p.score === 1 ? "color-mix(in srgb,#f59e0b 16%, transparent)" : "color-mix(in srgb,#ef4444 16%, transparent)",
                          color: p.score === 0 ? "#0b7a58" : p.score === 1 ? "#92570a" : "#a51c1c",
                        }}>{p.score}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <Result
              tone={sepsis.positive ? "#dc2626" : "#0f9d6e"}
              title={`qSOFA ${sepsis.score}/3 — ${sepsis.positive ? tx("screen positive", "اسکرین مثبت") : tx("screen negative", "اسکرین منفی")}`}
              body={sepsis.verdict}
              extra={
                <ul className="mt-1.5 space-y-0.5">
                  {sepsis.items.map((i) => (
                    <li key={i.label} className="flex items-center gap-1.5 text-[0.64rem]">
                      {i.hit ? <XCircle size={10} style={{ color: "#dc2626" }} /> : <CheckCircle2 size={10} style={{ color: "#0f9d6e" }} />}
                      {i.label}
                    </li>
                  ))}
                </ul>
              }
            />
          </div>
        </div>
      )}

      {/* =========================================================== MEDS */}
      {tab === "meds" && (
        <div className="space-y-3 anim-rise">
          <div className="hms-card p-3.5">
            <p className="flex items-center gap-1.5 text-[0.82rem] font-semibold"><ShieldCheck size={13} /> {tx("Interaction checker", "بررسی تداخل")}</p>
            <div className="mt-2 flex flex-wrap items-end gap-1.5">
              <div className="min-w-[9rem] flex-1"><Field label={tx("First medicine", "دواى اول")}><input className="hms-input" value={drugA} onChange={(e) => setDrugA(e.target.value)} placeholder="Warfarin" /></Field></div>
              <span className="pb-2 text-[0.8rem]" style={{ color: "var(--hms-faint)" }}>+</span>
              <div className="min-w-[9rem] flex-1"><Field label={tx("Second medicine", "دواى دوم")}><input className="hms-input" value={drugB} onChange={(e) => setDrugB(e.target.value)} placeholder="Aspirin" /></Field></div>
              <button className="hms-btn hms-btn-primary" onClick={() => setChecked(checkInteraction(drugA, drugB, lang))}>{tx("Check", "بررسی")}</button>
              <button className="hms-btn" onClick={() => { setDrugA(""); setDrugB(""); setChecked(null); }}>{tx("Clear", "پاک")}</button>
            </div>

            {checked && (
              checked.found ? (
                <div className="mt-2.5">
                  <Result
                    tone={checked.severity === "critical" ? "#dc2626" : checked.severity === "major" ? "#d97706" : "#0ea5e9"}
                    title={`${checked.severity.toUpperCase()} — ${checked.pair[0]} + ${checked.pair[1]}`}
                    body={checked.effect}
                    extra={
                      <>
                        <p className="mt-1.5 text-[0.68rem] font-medium">{tx("What to do", "چه باید کرد")}</p>
                        <p className="text-[0.66rem]" style={{ color: "var(--hms-muted)" }}>{checked.action}</p>
                        {alternativesFor(checked.pair[0], lang).length > 0 && (
                          <p className="mt-1 text-[0.64rem]">
                            <b>{tx("Consider instead", "به‌جای آن")}:</b> {alternativesFor(checked.pair[0], lang).join(" · ")}
                          </p>
                        )}
                      </>
                    }
                  />
                </div>
              ) : (
                <p className="mt-2.5 rounded-lg border px-2.5 py-2 text-[0.68rem]" style={{ borderColor: "var(--hms-border)", color: "var(--hms-muted)" }}>{checked.message}</p>
              )
            )}
            <p className="mt-2 text-[0.6rem]" style={{ color: "var(--hms-faint)" }}>
              {tx("The same library screens every prescription before signing, in the consultation room.", "همین کتابخانه هر نسخه را پیش از امضا در اتاق معاینه بررسی می‌کند.")}
            </p>
          </div>

          <div className="grid gap-3 lg:grid-cols-2">
            <div className="hms-card p-3.5">
              <p className="flex items-center gap-1.5 text-[0.82rem] font-semibold"><Calculator size={13} /> {tx("Paediatric dose by weight", "دوز اطفال بر اساس وزن")}</p>
              <div className="mt-2 grid grid-cols-[1.4fr_0.8fr] gap-1.5">
                <Field label={tx("Medicine", "دوا")}>
                  <select className="hms-input" value={pedsDrug} onChange={(e) => setPedsDrug(e.target.value)}>
                    {PEDS_DOSES.map((d) => <option key={d.drug} value={d.drug}>{d.drug}</option>)}
                  </select>
                </Field>
                <Field label={tx("Weight kg", "وزن (کلوگرام)")}>
                  <input type="number" className="hms-input" value={weight} onChange={(e) => setWeight(Number(e.target.value))} />
                </Field>
              </div>
              <div className="mt-2">
                {peds.found ? (
                  <Result
                    tone="#0e9488"
                    title={peds.dose}
                    body={`${peds.perKg} · ${peds.frequency} · ${peds.route}`}
                    extra={
                      <>
                        {peds.capped && <p className="mt-1 text-[0.64rem] font-medium" style={{ color: "#92400e" }}>{tx("Capped at the adult maximum.", "به حداکثر دوز بزرگسالان محدود شد.")}</p>}
                        {peds.caution && <p className="mt-1 text-[0.64rem]" style={{ color: "var(--hms-muted)" }}>⚠ {peds.caution}</p>}
                        <p className="mt-1 text-[0.62rem]" style={{ color: "var(--hms-faint)" }}>{peds.indication}</p>
                      </>
                    }
                  />
                ) : <p className="text-[0.68rem]" style={{ color: "var(--hms-muted)" }}>{peds.message}</p>}
              </div>
            </div>

            <div className="hms-card p-3.5">
              <p className="flex items-center gap-1.5 text-[0.82rem] font-semibold"><Activity size={13} /> {tx("Renal dose adjustment", "تنظیم دوز بر اساس کار کلیه")}</p>
              <div className="mt-2 grid grid-cols-[1.4fr_0.8fr] gap-1.5">
                <Field label={tx("Medicine", "دوا")}>
                  <select className="hms-input" value={renalDrug} onChange={(e) => setRenalDrug(e.target.value)}>
                    {RENAL_RULES.map((r) => <option key={r.drug} value={r.drug}>{r.drug}</option>)}
                  </select>
                </Field>
                <Field label={tx("CrCl ml/min", "کلیرنس کراتینین")}>
                  <input type="number" className="hms-input" value={crCl} onChange={(e) => setCrCl(Number(e.target.value))} />
                </Field>
              </div>
              <div className="mt-2">
                {renal.found ? (
                  <Result
                    tone={renal.changed ? "#d97706" : "#0f9d6e"}
                    title={renal.dose}
                    body={`${renal.band} · ${renal.note}`}
                    extra={renal.changed ? <p className="mt-1 text-[0.64rem] font-medium" style={{ color: "#92400e" }}>{tx("Dose changed from the normal renal function dose.", "دوز نسبت به کار طبیعی کلیه تغییر کرده است.")}</p> : null}
                  />
                ) : <p className="text-[0.68rem]" style={{ color: "var(--hms-muted)" }}>{renal.message}</p>}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================ LAB */}
      {tab === "lab" && (
        <div className="grid gap-3 lg:grid-cols-[0.85fr_1.15fr] anim-rise">
          <div className="hms-card p-3.5">
            <p className="flex items-center gap-1.5 text-[0.82rem] font-semibold"><FlaskConical size={13} /> {tx("Interpret a value", "تفسیر یک مقدار")}</p>
            <div className="mt-2 space-y-2">
              <Field label={tx("Test", "تست")}>
                <select className="hms-input" value={labName} onChange={(e) => setLabName(e.target.value)}>
                  {REFERENCE.map((r) => <option key={r.name} value={r.name}>{lang === "fa" ? `${r.fa} — ${r.name}` : r.name}</option>)}
                </select>
              </Field>
              <Field label={tx("Measured value", "مقدار اندازه‌گیری‌شده")} hint={lab.found ? `${lab.ref.low} – ${lab.ref.high} ${lab.ref.unit}` : undefined}>
                <input type="number" step="0.1" className="hms-input" value={labValue} onChange={(e) => setLabValue(Number(e.target.value))} />
              </Field>
            </div>
            <div className="mt-2.5">
              {lab.found ? (
                <Result
                  tone={lab.color}
                  title={`${lab.label} — ${lab.value} ${lab.ref.unit}`}
                  body={`${tx("Reference", "مرجع")}: ${lab.ref.low} – ${lab.ref.high} ${lab.ref.unit}${lab.ref.criticalLow !== undefined ? ` · ${tx("critical", "بحرانی")} ≤ ${lab.ref.criticalLow}` : ""}${lab.ref.criticalHigh !== undefined ? ` / ≥ ${lab.ref.criticalHigh}` : ""}`}
                  extra={lab.ref.note ? <p className="mt-1 text-[0.64rem]" style={{ color: "var(--hms-muted)" }}>{lab.ref.note[lang === "fa" ? 1 : 0]}</p> : null}
                />
              ) : <p className="text-[0.68rem]" style={{ color: "var(--hms-muted)" }}>{lab.message}</p>}
            </div>
          </div>

          <div className="hms-card overflow-hidden">
            <div className="flex items-center justify-between border-b px-3 py-2" style={{ borderColor: "var(--hms-border)" }}>
              <p className="text-[0.82rem] font-semibold">{tx("Reference ranges", "محدوده‌های مرجع")}</p>
              <span className="text-[0.6rem]" style={{ color: "var(--hms-faint)" }}>{REFERENCE.length} {tx("tests", "تست")}</span>
            </div>
            <div className="max-h-[26rem] overflow-auto">
              <table className="w-full">
                <thead>
                  <tr>
                    <th className="hms-th">{tx("Test", "تست")}</th>
                    <th className="hms-th">{tx("Range", "محدوده")}</th>
                    <th className="hms-th">{tx("Unit", "واحد")}</th>
                    <th className="hms-th">{tx("Critical", "بحرانی")}</th>
                  </tr>
                </thead>
                <tbody>
                  {REFERENCE.map((r) => (
                    <tr key={r.name} className="hms-row">
                      <td className="hms-td font-medium">{lang === "fa" ? r.fa : r.name}</td>
                      <td className="hms-td" data-num>{r.low} – {r.high}</td>
                      <td className="hms-td" style={{ color: "var(--hms-muted)" }}>{r.unit}</td>
                      <td className="hms-td" data-num style={{ color: "var(--hms-muted)" }}>
                        {r.criticalLow !== undefined ? `≤${r.criticalLow}` : "—"}{r.criticalHigh !== undefined ? ` / ≥${r.criticalHigh}` : ""}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================ BODY */}
      {tab === "body" && (
        <div className="grid gap-3 lg:grid-cols-[0.9fr_1.1fr] anim-rise">
          <div className="hms-card p-3.5">
            <p className="flex items-center gap-1.5 text-[0.82rem] font-semibold"><Stethoscope size={13} /> {tx("Patient measurements", "اندازه‌های بیمار")}</p>
            <div className="mt-2 grid grid-cols-2 gap-2">
              <Field label={tx("Weight kg", "وزن (کلوگرام)")}><input type="number" className="hms-input" value={bw} onChange={(e) => setBw(Number(e.target.value))} /></Field>
              <Field label={tx("Height cm", "قد (سانتی‌متر)")}><input type="number" className="hms-input" value={bh} onChange={(e) => setBh(Number(e.target.value))} /></Field>
              <Field label={tx("Age", "سن")}><input type="number" className="hms-input" value={bage} onChange={(e) => setBage(Number(e.target.value))} /></Field>
              <Field label={tx("Sex", "جنس")}>
                <select className="hms-input" value={bsex} onChange={(e) => setBsex(e.target.value as "male" | "female")}>
                  <option value="male">{tx("Male", "مرد")}</option>
                  <option value="female">{tx("Female", "زن")}</option>
                </select>
              </Field>
              <div className="col-span-2">
                <Field label={tx("Creatinine mg/dL (optional)", "کراتینین mg/dL (اختیاری)")} hint={tx("Used for Cockcroft–Gault clearance", "برای کلیرنس کاکرافت-گالت")}>
                  <input type="number" step="0.1" className="hms-input" value={creat} onChange={(e) => setCreat(Number(e.target.value))} />
                </Field>
              </div>
            </div>
          </div>

          <div className="space-y-2.5">
            <div className="grid grid-cols-2 gap-2.5">
              {[
                { label: "BMI", value: body.bmi, sub: body.bmiBand.label, color: body.bmiBand.color },
                { label: tx("Body surface area", "سطح بدن"), value: `${body.bsa} m²`, sub: tx("Mosteller", "موستلر"), color: "var(--hms-brand)" },
                { label: tx("Ideal body weight", "وزن ایده‌آل"), value: `${body.ibw} kg`, sub: tx("Devine", "دواین"), color: "var(--hms-brand)" },
                { label: tx("Creatinine clearance", "کلیرنس کراتینین"), value: body.crCl === null ? "—" : `${body.crCl}`, sub: body.renalBand ? `CKD ${body.renalBand}` : "", color: body.renalBand && ["G4", "G5"].includes(body.renalBand) ? "#dc2626" : "#0f9d6e" },
              ].map((c) => (
                <div key={c.label} className="hms-card p-3">
                  <p className="hms-eyebrow">{c.label}</p>
                  <p className="mt-0.5 text-[1.35rem] font-semibold leading-none tracking-[-0.03em]" style={{ color: c.color }}>{c.value}</p>
                  <p className="mt-1 text-[0.62rem]" style={{ color: "var(--hms-muted)" }}>{c.sub}</p>
                </div>
              ))}
            </div>
            <Result tone="#0e9488" title={tx("How to read this", "چطور بخوانیم")} body={body.note} extra={
              <p className="mt-1 flex items-start gap-1.5 text-[0.64rem]" style={{ color: "var(--hms-muted)" }}>
                <Info size={11} className="mt-0.5 shrink-0" />
                {tx("These are prompts for a clinician, not a diagnosis. A value near a threshold deserves a second look, not a reflex.", "این‌ها یادآوری برای کلینیسین است، نه تشخیص. مقدار نزدیک به مرز نیاز به بازبینی دارد، نه واکنش خودکار.")}
              </p>
            } />
          </div>
        </div>
      )}

      <p className="flex items-start gap-1.5 px-1 text-[0.6rem]" style={{ color: "var(--hms-faint)" }}>
        <Thermometer size={11} className="mt-0.5 shrink-0" />
        {tx(
          "Rules follow NEWS2 (Royal College of Physicians), qSOFA (Sepsis-3), Cockcroft–Gault, Mosteller, Devine and standard adult reference ranges. The dose ceilings are conservative — confirm against your printed formulary before prescribing.",
          "قواعد بر اساس NEWS2 (کالج سلطنتی پزشکان)، qSOFA (Sepsis-3)، کاکرافت-گالت، موستلر، دواین و محدوده‌های مرجع بزرگسالان است. سقف دوزها محافظه‌کارانه است — پیش از تجویز با فورملری چاپی خود تأیید کنید."
        )}
      </p>
    </div>
  );
}
