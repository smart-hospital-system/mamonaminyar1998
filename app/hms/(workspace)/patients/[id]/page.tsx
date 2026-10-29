import {
  Activity, AlertTriangle, ArrowLeft, BedDouble, CalendarClock, FileText, FlaskConical, Pill as PillIcon,
  Printer, Receipt, ScanLine, Scissors, Stethoscope,
} from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Empty, Panel, Person, SectionTitle, Status } from "@/components/hms/ui";
import { age, dateShort, money, relTime } from "@/lib/hms/format";
import { requireHmsPage } from "@/lib/hms/auth";
import { hmsReady } from "@/lib/hms/db";
import { patientChart } from "@/lib/hms/queries";

export const dynamic = "force-dynamic";

type Row = Record<string, unknown>;
const s = (v: unknown, fallback = "—") => (v === null || v === undefined || v === "" ? fallback : String(v));

export default async function PatientChartPage({ params }: { params: Promise<{ id: string }> }) {
  await requireHmsPage();
  await hmsReady();
  const { id } = await params;
  const chart = patientChart(id);
  const p = chart.patient;
  if (!p) notFound();

  const encounters = chart.encounters as Row[];
  const rx = chart.prescriptions as Row[];
  const labs = chart.labs as Row[];
  const imaging = chart.imaging as Row[];
  const admissions = chart.admissions as Row[];
  const invoices = chart.invoices as Row[];
  const surgeries = chart.surgeries as Row[];
  const outstanding = invoices.reduce((a, i) => a + (Number(i.total) - Number(i.paid)), 0);

  return (
    <div className="space-y-3.5">
      <Panel className="!p-0">
        <div className="flex flex-col gap-3 p-3.5 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-start gap-3">
            <Person name={p.name} size={46} sub={p.mrn} />
            <div>
              <h2 className="text-[1.05rem] font-semibold tracking-[-0.02em]">{p.name}</h2>
              <p className="mt-0.5 text-[0.72rem]" style={{ color: "var(--hms-muted)" }}>
                {p.gender} · {age(p.dob)} ({dateShort(p.dob)}) · {s(p.phone)} · {s(p.insurance, "Self-pay")}
              </p>
              <div className="mt-1.5 flex flex-wrap gap-1">
                {p.blood_group && <span className="hms-pill" style={{ background: "color-mix(in srgb,#ef4444 12%, transparent)", color: "#a51c1c" }}>{p.blood_group}</span>}
                {p.allergies && p.allergies !== "None" ? (
                  <span className="hms-pill" style={{ background: "#fee2e2", color: "#991b1b" }}><AlertTriangle size={10} /> Allergy: {p.allergies}</span>
                ) : (
                  <span className="hms-pill" style={{ background: "var(--hms-surface-3)", color: "var(--hms-muted)" }}>No known allergies</span>
                )}
                {p.chronic && <span className="hms-pill" style={{ background: "var(--hms-brand-soft)", color: "var(--hms-brand-ink)" }}>{p.chronic}</span>}
                {admissions.some((a) => a.status === "admitted") && <span className="hms-pill" style={{ background: "color-mix(in srgb,#3b82f6 14%, transparent)", color: "#1d4ed8" }}><BedDouble size={10} /> Currently admitted</span>}
              </div>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            <Link href="/hms/patients" className="hms-btn hms-btn-sm"><ArrowLeft size={11} /> Register</Link>
            <Link href={`/hms/opd`} className="hms-btn hms-btn-sm hms-btn-primary"><Stethoscope size={11} /> New consult</Link>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-px border-t sm:grid-cols-5" style={{ background: "var(--hms-border)", borderColor: "var(--hms-border)" }}>
          {[
            { k: "Encounters", v: encounters.length },
            { k: "Prescriptions", v: rx.length },
            { k: "Lab orders", v: labs.length },
            { k: "Imaging", v: imaging.length },
            { k: "Balance", v: money(outstanding) },
          ].map((m) => (
            <div key={m.k} className="px-3 py-2" style={{ background: "var(--hms-surface)" }}>
              <p className="text-[0.56rem] uppercase tracking-wide" style={{ color: "var(--hms-faint)" }}>{m.k}</p>
              <p className="text-[0.86rem] font-semibold">{m.v}</p>
            </div>
          ))}
        </div>
      </Panel>

      <div className="grid gap-3.5 xl:grid-cols-[1.3fr_1fr]">
        <div className="space-y-3.5">
          <Panel>
            <SectionTitle title="Clinical timeline" subtitle="Consults, diagnoses and vitals in reverse order" icon={<Activity size={14} />} />
            <div className="mt-2 space-y-2">
              {encounters.map((e) => {
                let vitals: Record<string, unknown> = {};
                try { vitals = JSON.parse(s(e.vitals, "{}")); } catch { vitals = {}; }
                return (
                  <div key={s(e.id)} className="relative border-l-2 pl-3" style={{ borderColor: "var(--hms-brand)" }}>
                    <span className="absolute -left-[5px] top-1 h-2 w-2 rounded-full" style={{ background: "var(--hms-brand)" }} />
                    <div className="flex flex-wrap items-center gap-1.5">
                      <p className="text-[0.76rem] font-semibold">{s(e.diagnosis, "Undocumented consult")}</p>
                      {e.icd10 ? <span className="hms-pill" style={{ background: "var(--hms-surface-3)", color: "var(--hms-muted)" }}>{s(e.icd10)}</span> : null}
                      <span className="text-[0.6rem]" style={{ color: "var(--hms-faint)" }}>{dateShort(s(e.created_at))} · {s(e.doctor_name)} · {s(e.department)}</span>
                    </div>
                    {e.summary ? <p className="mt-0.5 whitespace-pre-line text-[0.68rem] leading-relaxed" style={{ color: "var(--hms-muted)" }}>{s(e.summary)}</p> : null}
                    {Object.keys(vitals).length > 0 && (
                      <p className="mt-0.5 flex flex-wrap gap-1.5 text-[0.6rem]">
                        {Object.entries(vitals).filter(([k]) => k !== "triage").map(([k, v]) => (
                          <span key={k} className="rounded px-1 py-0.5" style={{ background: "var(--hms-surface-2)" }}>{k}: <b>{String(v)}</b></span>
                        ))}
                      </p>
                    )}
                  </div>
                );
              })}
              {!encounters.length && <Empty title="No consults yet" hint="The first consult will appear here with its diagnosis and vitals." icon={<FileText size={15} />} />}
            </div>
          </Panel>

          <Panel>
            <SectionTitle title="Prescriptions" subtitle="Tap a row to open the print sheet" icon={<PillIcon size={14} />} />
            <div className="mt-2 divide-y" style={{ borderColor: "var(--hms-border)" }}>
              {rx.map((r) => (
                <div key={s(r.id)} className="flex items-center gap-2 py-1.5">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[0.72rem] font-medium">{s(r.diagnosis, "No diagnosis")}</p>
                    <p className="text-[0.6rem]" style={{ color: "var(--hms-faint)" }}>{s(r.rx_no)} · {s(r.doctor_name)} · {dateShort(s(r.created_at))}</p>
                  </div>
                  <Status value={s(r.status)} />
                  <Link href={`/hms/rx/${s(r.id)}?template=${s(r.template, "1")}`} target="_blank" className="hms-btn hms-btn-sm hms-btn-ghost"><Printer size={11} /></Link>
                </div>
              ))}
              {!rx.length && <p className="py-3 text-center text-[0.7rem]" style={{ color: "var(--hms-faint)" }}>No prescriptions recorded.</p>}
            </div>
          </Panel>

          <Panel>
            <SectionTitle title="Laboratory & imaging" subtitle="Results released by the laboratory and radiology" icon={<FlaskConical size={14} />} />
            <div className="mt-2 grid gap-2.5 sm:grid-cols-2">
              <div>
                <p className="text-[0.6rem] font-bold uppercase tracking-[0.06em]" style={{ color: "var(--hms-faint)" }}>Laboratory</p>
                <div className="mt-1 space-y-1">
                  {labs.map((l) => (
                    <div key={s(l.id)} className="rounded-md border px-2 py-1" style={{ borderColor: "var(--hms-border)" }}>
                      <div className="flex items-center justify-between gap-1">
                        <p className="truncate text-[0.68rem] font-medium">{s(l.test_name)}</p>
                        <Status value={s(l.status)} />
                      </div>
                      {l.result ? <p className="truncate text-[0.62rem]" style={{ color: "var(--hms-muted)" }}>{s(l.result)}</p> : null}
                    </div>
                  ))}
                  {!labs.length && <p className="text-[0.66rem]" style={{ color: "var(--hms-faint)" }}>None.</p>}
                </div>
              </div>
              <div>
                <p className="text-[0.6rem] font-bold uppercase tracking-[0.06em]" style={{ color: "var(--hms-faint)" }}>Imaging</p>
                <div className="mt-1 space-y-1">
                  {imaging.map((i) => (
                    <div key={s(i.id)} className="rounded-md border px-2 py-1" style={{ borderColor: "var(--hms-border)" }}>
                      <div className="flex items-center justify-between gap-1">
                        <p className="truncate text-[0.68rem] font-medium">{s(i.modality)} — {s(i.body_part)}</p>
                        <Status value={s(i.status)} />
                      </div>
                      {i.impression ? <p className="truncate text-[0.62rem]" style={{ color: "var(--hms-muted)" }}>{s(i.impression)}</p> : null}
                    </div>
                  ))}
                  {!imaging.length && <p className="text-[0.66rem]" style={{ color: "var(--hms-faint)" }}>None.</p>}
                </div>
              </div>
            </div>
          </Panel>
        </div>

        <div className="space-y-3.5">
          <Panel>
            <SectionTitle title="Admissions" subtitle="Ward stays and bed history" icon={<BedDouble size={14} />} />
            <div className="mt-2 space-y-1">
              {admissions.map((a) => (
                <div key={s(a.id)} className="flex items-center gap-2 rounded-md border px-2 py-1.5" style={{ borderColor: "var(--hms-border)" }}>
                  <div className="min-w-0 flex-1">
                    <p className="text-[0.7rem] font-medium">{s(a.bed_label, "Bed released")} · {s(a.ward)}</p>
                    <p className="truncate text-[0.6rem]" style={{ color: "var(--hms-faint)" }}>{s(a.diagnosis)} · {dateShort(s(a.admitted_at))} → {a.discharged_at ? dateShort(s(a.discharged_at)) : "current"}</p>
                  </div>
                  <Status value={s(a.status)} />
                </div>
              ))}
              {!admissions.length && <p className="py-2 text-center text-[0.7rem]" style={{ color: "var(--hms-faint)" }}>Never admitted.</p>}
            </div>
          </Panel>

          <Panel>
            <SectionTitle title="Theatre" subtitle="Operations booked or performed" icon={<Scissors size={14} />} />
            <div className="mt-2 space-y-1">
              {surgeries.map((x) => (
                <div key={s(x.id)} className="flex items-center gap-2 border-b py-1.5 last:border-0" style={{ borderColor: "var(--hms-border)" }}>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[0.7rem] font-medium">{s(x.procedure_name)}</p>
                    <p className="text-[0.6rem]" style={{ color: "var(--hms-faint)" }}>{s(x.theatre)} · {dateShort(s(x.scheduled_at))}</p>
                  </div>
                  <Status value={s(x.status)} />
                </div>
              ))}
              {!surgeries.length && <p className="py-2 text-center text-[0.7rem]" style={{ color: "var(--hms-faint)" }}>No procedures.</p>}
            </div>
          </Panel>

          <Panel>
            <SectionTitle title="Billing" subtitle="Invoices, payments and balance" icon={<Receipt size={14} />} />
            <div className="mt-2 space-y-1">
              {invoices.map((i) => (
                <div key={s(i.id)} className="flex items-center gap-2 py-1.5">
                  <div className="min-w-0 flex-1">
                    <p className="text-[0.7rem] font-medium">{s(i.invoice_no)}</p>
                    <p className="text-[0.6rem]" style={{ color: "var(--hms-faint)" }}>{relTime(s(i.created_at))}</p>
                  </div>
                  <span className="text-[0.72rem] font-semibold">{money(Number(i.total))}</span>
                  <Status value={s(i.status)} />
                </div>
              ))}
              {!invoices.length && <p className="py-2 text-center text-[0.7rem]" style={{ color: "var(--hms-faint)" }}>No invoices.</p>}
            </div>
          </Panel>

          <Panel>
            <SectionTitle title="Contact & administration" icon={<CalendarClock size={14} />} />
            <dl className="mt-2 grid grid-cols-2 gap-2 text-[0.7rem]">
              {[
                ["Phone", s(p.phone)],
                ["Email", s(p.email)],
                ["Emergency contact", s(p.emergency_contact)],
                ["Insurance", s(p.insurance, "Self-pay")],
                ["Address", s(p.address)],
                ["Registered", dateShort(p.created_at)],
              ].map(([k, v]) => (
                <div key={k}>
                  <dt className="text-[0.56rem] uppercase tracking-wide" style={{ color: "var(--hms-faint)" }}>{k}</dt>
                  <dd className="truncate font-medium">{v}</dd>
                </div>
              ))}
            </dl>
            {p.notes ? <p className="mt-2 rounded-md p-2 text-[0.68rem]" style={{ background: "var(--hms-surface-2)", color: "var(--hms-muted)" }}>{p.notes}</p> : null}
          </Panel>
        </div>
      </div>
    </div>
  );
}
