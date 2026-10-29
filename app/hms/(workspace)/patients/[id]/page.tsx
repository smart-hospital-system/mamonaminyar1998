import { Activity, ArrowLeft, CalendarDays, FlaskConical, Pill, Receipt, ScanLine, Scissors, Stethoscope } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Panel, Pill as Tag, SectionTitle, Stat } from "@/components/hms/ui";
import { requireHmsPage } from "@/lib/hms/auth";
import { age, dateShort, money, relTime } from "@/lib/hms/format";
import { patientChart } from "@/lib/hms/queries";

export const dynamic = "force-dynamic";

type Enc = { id: string; created_at: string; doctor_name: string | null; complaint: string | null; diagnosis: string | null; icd10: string | null; plan: string | null; vitals: string | null; notes: string | null };
type Rx = { id: string; rx_no: string; created_at: string; doctor_name: string | null; diagnosis: string | null; status: string };
type Lab = { id: string; order_no: string; test_name: string; status: string; created_at: string; result_value: string | null };
type Img = { id: string; order_no: string; modality: string; body_part: string; status: string; created_at: string };
type Adm = { id: string; admitted_at: string; discharged_at: string | null; bed_label: string | null; ward: string | null; diagnosis: string | null; admission_type: string | null; status: string };
type Inv = { id: string; invoice_no: string; total: number; paid: number; status: string; created_at: string };
type Surg = { id: string; procedure_name: string; scheduled_at: string; status: string; theatre: string | null };

export default async function PatientPage({ params }: { params: Promise<{ id: string }> }) {
  const me = await requireHmsPage();
  const { id } = await params;
  const chart = patientChart(id);
  const p = chart.patient;
  if (!p) notFound();

  const encounters = chart.encounters as Enc[];
  const prescriptions = chart.prescriptions as Rx[];
  const labs = chart.labs as Lab[];
  const imaging = chart.imaging as Img[];
  const admissions = chart.admissions as Adm[];
  const invoices = chart.invoices as Inv[];
  const surgeries = chart.surgeries as Surg[];
  const outstanding = invoices.reduce((a, i) => a + (i.total - i.paid), 0);

  return (
    <div className="space-y-3.5">
      <Link href="/hms/patients" className="inline-flex items-center gap-1 text-[0.7rem] font-medium" style={{ color: "var(--hms-muted)" }}>
        <ArrowLeft size={12} /> All patients
      </Link>

      <Panel>
        <div className="flex flex-wrap items-start gap-3">
          <div
            className="grid h-12 w-12 shrink-0 place-items-center rounded-xl text-[0.9rem] font-bold text-white"
            style={{ background: "var(--hms-brand)" }}
          >
            {p.name.split(" ").filter((w) => !/^(dr|mr|mrs|ms)\.?$/i.test(w)).slice(0, 2).map((w) => w[0]).join("")}
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="text-[1.05rem] font-semibold leading-tight">{p.name}</h1>
            <p className="mt-0.5 text-[0.7rem]" style={{ color: "var(--hms-muted)" }}>
              {p.mrn} · {p.gender} · {age(p.dob)} · {p.phone ?? "no phone"}
            </p>
            <div className="mt-1.5 flex flex-wrap gap-1">
              <Tag tone="brand">{p.blood_group ?? "blood group n/a"}</Tag>
              {p.allergies ? <Tag tone="bad">allergy: {p.allergies}</Tag> : <Tag tone="good">no known allergy</Tag>}
              {p.chronic && <Tag tone="warn">chronic: {p.chronic}</Tag>}
              {p.insurance && <Tag tone="neutral">{p.insurance}</Tag>}
            </div>
          </div>
          <div className="flex gap-1.5">
            <Link href={`/hms/opd?patient=${p.id}`} className="hms-btn hms-btn-primary hms-btn-sm"><Stethoscope size={11} /> New encounter</Link>
            <Link href="/hms/prescriptions" className="hms-btn hms-btn-sm"><Pill size={11} /> Prescriptions</Link>
          </div>
        </div>

        <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
          <Stat label="Encounters" value={encounters.length} icon={<Stethoscope size={12} />} />
          <Stat label="Prescriptions" value={prescriptions.length} icon={<Pill size={12} />} />
          <Stat label="Admissions" value={admissions.length} icon={<CalendarDays size={12} />} />
          <Stat label="Balance" value={money(outstanding)} icon={<Receipt size={12} />} tone={outstanding > 0 ? "warn" : "good"} />
        </div>

        <div className="mt-3 grid gap-2 text-[0.68rem] sm:grid-cols-3" style={{ color: "var(--hms-muted)" }}>
          <p><span className="font-semibold" style={{ color: "var(--hms-text)" }}>Address</span><br />{p.address ?? "—"}</p>
          <p><span className="font-semibold" style={{ color: "var(--hms-text)" }}>Emergency contact</span><br />{p.emergency_contact ?? "—"}</p>
          <p><span className="font-semibold" style={{ color: "var(--hms-text)" }}>Registered</span><br />{dateShort(p.created_at)} · {relTime(p.created_at)}</p>
        </div>
        {p.notes && <p className="mt-2 rounded-lg p-2 text-[0.7rem]" style={{ background: "var(--hms-surface-2)" }}>{p.notes}</p>}
      </Panel>

      <div className="grid gap-3.5 lg:grid-cols-[1.5fr_1fr]">
        <Panel>
          <SectionTitle title="Clinical timeline" subtitle="Every encounter, newest first" icon={<Activity size={14} />} />
          <div className="mt-2 space-y-2">
            {encounters.map((e) => (
              <div key={e.id} className="relative border-l pl-3" style={{ borderColor: "var(--hms-border)" }}>
                <span className="absolute -left-[3px] top-1.5 h-1.5 w-1.5 rounded-full" style={{ background: "var(--hms-brand)" }} />
                <p className="text-[0.7rem] font-semibold">{e.diagnosis ?? "Clinical review"} {e.icd10 && <span className="font-normal" style={{ color: "var(--hms-faint)" }}>· {e.icd10}</span>}</p>
                <p className="text-[0.62rem]" style={{ color: "var(--hms-faint)" }}>{dateShort(e.created_at)} · {e.doctor_name ?? "—"}</p>
                {e.complaint && <p className="mt-0.5 text-[0.67rem]"><span className="font-medium">Complaint:</span> {e.complaint}</p>}
                {e.plan && <p className="text-[0.67rem]"><span className="font-medium">Plan:</span> {e.plan}</p>}
                {e.vitals && <p className="text-[0.62rem]" style={{ color: "var(--hms-muted)" }}>Vitals · {e.vitals}</p>}
              </div>
            ))}
            {!encounters.length && <p className="py-4 text-center text-[0.7rem]" style={{ color: "var(--hms-faint)" }}>No encounters recorded.</p>}
          </div>
        </Panel>

        <div className="space-y-3.5">
          <Panel>
            <SectionTitle title="Prescriptions" subtitle="Print or re-sign" icon={<Pill size={14} />} />
            <div className="mt-1.5 space-y-1">
              {prescriptions.map((r) => (
                <Link key={r.id} href={`/hms/rx/${r.id}`} className="flex items-center gap-2 border-b py-1.5 text-[0.68rem] last:border-0" style={{ borderColor: "var(--hms-border)" }}>
                  <span className="flex-1 truncate">{r.rx_no} · {r.diagnosis ?? "—"}</span>
                  <Tag tone={r.status === "dispensed" ? "good" : r.status === "signed" ? "brand" : "warn"}>{r.status}</Tag>
                </Link>
              ))}
              {!prescriptions.length && <p className="py-2 text-[0.68rem]" style={{ color: "var(--hms-faint)" }}>None yet.</p>}
            </div>
          </Panel>

          <Panel>
            <SectionTitle title="Investigations" subtitle="Laboratory and imaging" icon={<FlaskConical size={14} />} />
            <div className="mt-1.5 space-y-1 text-[0.68rem]">
              {labs.map((l) => (
                <div key={l.id} className="flex items-center gap-2 border-b py-1 last:border-0" style={{ borderColor: "var(--hms-border)" }}>
                  <FlaskConical size={10} style={{ color: "var(--hms-faint)" }} />
                  <span className="flex-1 truncate">{l.test_name} <span style={{ color: "var(--hms-faint)" }}>{l.result_value ?? ""}</span></span>
                  <Tag tone={l.status === "completed" ? "good" : "warn"}>{l.status}</Tag>
                </div>
              ))}
              {imaging.map((i) => (
                <div key={i.id} className="flex items-center gap-2 border-b py-1 last:border-0" style={{ borderColor: "var(--hms-border)" }}>
                  <ScanLine size={10} style={{ color: "var(--hms-faint)" }} />
                  <span className="flex-1 truncate">{i.modality} · {i.body_part}</span>
                  <Tag tone={i.status === "reported" ? "good" : "warn"}>{i.status}</Tag>
                </div>
              ))}
              {!labs.length && !imaging.length && <p className="py-2" style={{ color: "var(--hms-faint)" }}>No investigations on file.</p>}
            </div>
          </Panel>
        </div>
      </div>

      <div className="grid gap-3.5 lg:grid-cols-3">
        <Panel>
          <SectionTitle title="Admissions" subtitle="Ward stays and beds" icon={<CalendarDays size={14} />} />
          <div className="mt-1.5 space-y-1.5 text-[0.68rem]">
            {admissions.map((a) => (
              <div key={a.id} className="rounded-lg border p-2" style={{ borderColor: "var(--hms-border)" }}>
                <p className="font-medium">{a.ward ?? "Ward"} · {a.bed_label ?? "—"}</p>
                <p style={{ color: "var(--hms-muted)" }}>{dateShort(a.admitted_at)} → {a.discharged_at ? dateShort(a.discharged_at) : "still admitted"}</p>
                <p className="mt-0.5">{a.diagnosis}</p>
              </div>
            ))}
            {!admissions.length && <p style={{ color: "var(--hms-faint)" }}>Never admitted.</p>}
          </div>
        </Panel>

        <Panel>
          <SectionTitle title="Surgery" subtitle="Theatre list" icon={<Scissors size={14} />} />
          <div className="mt-1.5 space-y-1 text-[0.68rem]">
            {surgeries.map((s) => (
              <div key={s.id} className="flex items-center gap-2 border-b py-1 last:border-0" style={{ borderColor: "var(--hms-border)" }}>
                <span className="flex-1 truncate">{s.procedure_name}</span>
                <span style={{ color: "var(--hms-faint)" }}>{dateShort(s.scheduled_at)}</span>
                <Tag tone={s.status === "completed" ? "good" : "warn"}>{s.status}</Tag>
              </div>
            ))}
            {!surgeries.length && <p style={{ color: "var(--hms-faint)" }}>No operations.</p>}
          </div>
        </Panel>

        <Panel>
          <SectionTitle title="Billing" subtitle="Invoices and receipts" icon={<Receipt size={14} />} />
          <div className="mt-1.5 space-y-1 text-[0.68rem]">
            {invoices.map((i) => (
              <Link key={i.id} href={`/hms/receipt/${i.id}`} className="flex items-center gap-2 border-b py-1 last:border-0" style={{ borderColor: "var(--hms-border)" }}>
                <span className="flex-1 truncate">{i.invoice_no}</span>
                <span>{money(i.total)}</span>
                <Tag tone={i.status === "paid" ? "good" : i.status === "partial" ? "warn" : "bad"}>{i.status}</Tag>
              </Link>
            ))}
            {!invoices.length && <p style={{ color: "var(--hms-faint)" }}>No invoices.</p>}
          </div>
        </Panel>
      </div>

      <p className="pb-2 text-center text-[0.6rem]" style={{ color: "var(--hms-faint)" }}>
        Viewed by {me.name} · every access to this chart is recorded in the audit trail.
      </p>
    </div>
  );
}
