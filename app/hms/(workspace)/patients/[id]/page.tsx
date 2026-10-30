import { Activity, ArrowLeft, CalendarDays, FlaskConical, Pill, Receipt, ScanLine, Scissors, Stethoscope } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Panel, Pill as Tag, SectionTitle, Stat } from "@/components/hms/ui";
import { PatientTimeline, SafetyStrip, type TimelineEvent } from "@/components/hms/timeline";
import { requireHmsPage } from "@/lib/hms/auth";
import { age, dateShort, digitsOf, money, relTime } from "@/lib/hms/format";
import { statusText, tx } from "@/lib/hms/i18n";
import { getLang } from "@/lib/hms/lang-server";
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
  const lang = await getLang();
  const tr = (en: string, fa: string, vars?: Record<string, string | number>) => tx(lang, en, fa, vars);
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

  /* A single chronological spine for the whole chart. */
  const events: TimelineEvent[] = [
    ...encounters.map((e) => ({ id: e.id, kind: "encounter" as const, at: e.created_at, title: e.diagnosis ?? tr("Clinical review", "بازبینی کلینیکی"), detail: [e.complaint, e.plan].filter(Boolean).join(" · ") || undefined, status: e.icd10 ?? undefined, href: `/hms/opd?patient=${p.id}` })),
    ...prescriptions.map((r) => ({ id: r.id, kind: "rx" as const, at: r.created_at, title: r.rx_no, detail: r.diagnosis ?? undefined, status: r.status, href: `/hms/rx/${r.id}` })),
    ...labs.map((l) => ({ id: l.id, kind: "lab" as const, at: l.created_at, title: l.test_name, detail: l.result_value ?? undefined, status: l.status, href: "/hms/lab" })),
    ...imaging.map((i) => ({ id: i.id, kind: "imaging" as const, at: i.created_at, title: `${i.modality} · ${i.body_part}`, status: i.status, href: "/hms/radiology" })),
    ...admissions.map((a) => ({ id: a.id, kind: "admission" as const, at: a.admitted_at, title: `${a.ward ?? tr("Ward", "وارڈ")} · ${a.bed_label ?? "—"}`, detail: a.diagnosis ?? undefined, status: a.status, href: "/hms/inpatients" })),
    ...surgeries.map((x) => ({ id: x.id, kind: "surgery" as const, at: x.scheduled_at, title: x.procedure_name, detail: x.theatre ?? undefined, status: x.status, href: "/hms/surgery" })),
    ...invoices.map((i) => ({ id: i.id, kind: "invoice" as const, at: i.created_at, title: `${i.invoice_no} · ${money(i.total, lang)}`, detail: tr(`Paid ${money(i.paid, lang)}`, `پرداخت ${money(i.paid, lang)}`), status: i.status, href: `/hms/receipt/${i.id}` })),
  ];

  /* The four things a clinician checks before the next decision. */
  const safety: { tone: "good" | "warn" | "bad"; label: string }[] = [];
  if (outstanding > 0) safety.push({ tone: "warn", label: tr(`${money(outstanding, lang)} unpaid`, `${money(outstanding, lang)} پرداخت‌نشده`) });
  const unsigned = prescriptions.filter((r) => r.status === "pending").length;
  if (unsigned) safety.push({ tone: "warn", label: tr(`${unsigned} prescription(s) unsigned`, `${unsigned} نسخهٔ بدون امضا`) });
  const overdueLab = labs.filter((l) => l.status !== "verified").length;
  if (overdueLab) safety.push({ tone: "warn", label: tr(`${overdueLab} investigation(s) open`, `${overdueLab} بررسی باز`) });
  const activeAdmission = admissions.find((a) => !a.discharged_at);
  if (activeAdmission) safety.push({ tone: "good", label: tr(`In ${activeAdmission.ward ?? "ward"} · ${activeAdmission.bed_label ?? "—"}`, `در ${activeAdmission.ward ?? "وارڈ"} · ${activeAdmission.bed_label ?? "—"}`) });
  if (p.allergies && !/^none$|^—$|^nil$/i.test(String(p.allergies))) safety.push({ tone: "bad", label: tr(`Allergy: ${p.allergies}`, `حساسیت: ${p.allergies}`) });

  return (
    <div className="space-y-3.5">
      <Link href="/hms/patients" className="inline-flex items-center gap-1 text-[0.7rem] font-medium" style={{ color: "var(--hms-muted)" }}>
        <ArrowLeft size={12} /> {tr("All patients", "همهٔ مریضان")}
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
              {p.mrn} · {statusText(lang, String(p.gender ?? ""))} · {age(p.dob, lang)} · {p.phone ?? tr("no phone", "بدون تلفن")}
            </p>
            <div className="mt-1.5 flex flex-wrap gap-1">
              <Tag tone="brand">{p.blood_group ?? tr("blood group n/a", "گروه خون نامعلوم")}</Tag>
              {p.allergies ? <Tag tone="bad">{tr("allergy", "حساسیت")}: {p.allergies}</Tag> : <Tag tone="good">{tr("no known allergy", "حساسیت شناخته‌شده ندارد")}</Tag>}
              {p.chronic && <Tag tone="warn">{tr("chronic", "مزمن")}: {p.chronic}</Tag>}
              {p.insurance && <Tag tone="neutral">{p.insurance}</Tag>}
            </div>
          </div>
          <div className="flex gap-1.5">
            <Link href={`/hms/opd?patient=${p.id}`} className="hms-btn hms-btn-primary hms-btn-sm"><Stethoscope size={11} /> {tr("New encounter", "معاینهٔ جدید")}</Link>
            <Link href="/hms/prescriptions" className="hms-btn hms-btn-sm"><Pill size={11} /> {tr("Prescriptions", "نسخه‌ها")}</Link>
          </div>
        </div>

        <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
          <Stat label={tr("Encounters", "معاینات")} value={digitsOf(lang, encounters.length)} icon={<Stethoscope size={12} />} />
          <Stat label={tr("Prescriptions", "نسخه‌ها")} value={digitsOf(lang, prescriptions.length)} icon={<Pill size={12} />} />
          <Stat label={tr("Admissions", "بستر شدن‌ها")} value={digitsOf(lang, admissions.length)} icon={<CalendarDays size={12} />} />
          <Stat label={tr("Balance", "باقی‌مانده")} value={money(outstanding, lang)} icon={<Receipt size={12} />} tone={outstanding > 0 ? "warn" : "good"} />
        </div>

        <div className="mt-3 grid gap-2 text-[0.68rem] sm:grid-cols-3" style={{ color: "var(--hms-muted)" }}>
          <p><span className="font-semibold" style={{ color: "var(--hms-text)" }}>{tr("Address", "آدرس")}</span><br />{p.address ?? "—"}</p>
          <p><span className="font-semibold" style={{ color: "var(--hms-text)" }}>{tr("Emergency contact", "تماس اضطراری")}</span><br />{p.emergency_contact ?? "—"}</p>
          <p><span className="font-semibold" style={{ color: "var(--hms-text)" }}>{tr("Registered", "ثبت‌شده")}</span><br />{dateShort(p.created_at, lang)} · {relTime(p.created_at, lang)}</p>
        </div>
        {p.notes && <p className="mt-2 rounded-lg p-2 text-[0.7rem]" style={{ background: "var(--hms-surface-2)" }}>{p.notes}</p>}
      </Panel>

      <SafetyStrip items={safety} />
      <PatientTimeline events={events} />

      <div className="grid gap-3.5 lg:grid-cols-[1.5fr_1fr]">
        <Panel>
          <SectionTitle title={tr("Clinical notes", "یادداشت‌های کلینیکی")} subtitle={tr("Every encounter, newest first", "همهٔ معاینات، جدیدترین اول")} icon={<Activity size={14} />} />
          <div className="mt-2 space-y-2">
            {encounters.map((e) => (
              <div key={e.id} className="relative border-l pl-3" style={{ borderColor: "var(--hms-border)" }}>
                <span className="absolute -left-[3px] top-1.5 h-1.5 w-1.5 rounded-full" style={{ background: "var(--hms-brand)" }} />
                <p className="text-[0.7rem] font-semibold">{e.diagnosis ?? tr("Clinical review", "بازبینی کلینیکی")} {e.icd10 && <span className="font-normal" style={{ color: "var(--hms-faint)" }}>· {e.icd10}</span>}</p>
                <p className="text-[0.62rem]" style={{ color: "var(--hms-faint)" }}>{dateShort(e.created_at, lang)} · {e.doctor_name ?? "—"}</p>
                {e.complaint && <p className="mt-0.5 text-[0.67rem]"><span className="font-medium">{tr("Complaint:", "شکایت:")}</span> {e.complaint}</p>}
                {e.plan && <p className="text-[0.67rem]"><span className="font-medium">{tr("Plan:", "پلان:")}</span> {e.plan}</p>}
                {e.vitals && <p className="text-[0.62rem]" style={{ color: "var(--hms-muted)" }}>{tr("Vitals", "علایم حیاتی")} · {e.vitals}</p>}
              </div>
            ))}
            {!encounters.length && <p className="py-4 text-center text-[0.7rem]" style={{ color: "var(--hms-faint)" }}>{tr("No encounters recorded.", "هیچ معاینه‌ای ثبت نشده.")}</p>}
          </div>
        </Panel>

        <div className="space-y-3.5">
          <Panel>
            <SectionTitle title={tr("Prescriptions", "نسخه‌ها")} subtitle={tr("Print or re-sign", "چاپ یا امضای مجدد")} icon={<Pill size={14} />} />
            <div className="mt-1.5 space-y-1">
              {prescriptions.map((r) => (
                <Link key={r.id} href={`/hms/rx/${r.id}`} className="flex items-center gap-2 border-b py-1.5 text-[0.68rem] last:border-0" style={{ borderColor: "var(--hms-border)" }}>
                  <span className="flex-1 truncate">{r.rx_no} · {r.diagnosis ?? "—"}</span>
                  <Tag tone={r.status === "dispensed" ? "good" : r.status === "signed" ? "brand" : "warn"}>{statusText(lang, r.status)}</Tag>
                </Link>
              ))}
              {!prescriptions.length && <p className="py-2 text-[0.68rem]" style={{ color: "var(--hms-faint)" }}>{tr("None yet.", "هنوز نیست.")}</p>}
            </div>
          </Panel>

          <Panel>
            <SectionTitle title={tr("Investigations", "بررسی‌ها")} subtitle={tr("Laboratory and imaging", "لابراتوار و تصویربرداری")} icon={<FlaskConical size={14} />} />
            <div className="mt-1.5 space-y-1 text-[0.68rem]">
              {labs.map((l) => (
                <div key={l.id} className="flex items-center gap-2 border-b py-1 last:border-0" style={{ borderColor: "var(--hms-border)" }}>
                  <FlaskConical size={10} style={{ color: "var(--hms-faint)" }} />
                  <span className="flex-1 truncate">{l.test_name} <span style={{ color: "var(--hms-faint)" }}>{l.result_value ?? ""}</span></span>
                  <Tag tone={l.status === "completed" ? "good" : "warn"}>{statusText(lang, l.status)}</Tag>
                </div>
              ))}
              {imaging.map((i) => (
                <div key={i.id} className="flex items-center gap-2 border-b py-1 last:border-0" style={{ borderColor: "var(--hms-border)" }}>
                  <ScanLine size={10} style={{ color: "var(--hms-faint)" }} />
                  <span className="flex-1 truncate">{i.modality} · {i.body_part}</span>
                  <Tag tone={i.status === "reported" ? "good" : "warn"}>{statusText(lang, i.status)}</Tag>
                </div>
              ))}
              {!labs.length && !imaging.length && <p className="py-2" style={{ color: "var(--hms-faint)" }}>{tr("No investigations on file.", "هیچ بررسی ثبت نشده.")}</p>}
            </div>
          </Panel>
        </div>
      </div>

      <div className="grid gap-3.5 lg:grid-cols-3">
        <Panel>
          <SectionTitle title={tr("Admissions", "بستر شدن‌ها")} subtitle={tr("Ward stays and beds", "اقامت در وارڈ و بسترها")} icon={<CalendarDays size={14} />} />
          <div className="mt-1.5 space-y-1.5 text-[0.68rem]">
            {admissions.map((a) => (
              <div key={a.id} className="rounded-lg border p-2" style={{ borderColor: "var(--hms-border)" }}>
                <p className="font-medium">{a.ward ?? tr("Ward", "وارڈ")} · {a.bed_label ?? "—"}</p>
                <p style={{ color: "var(--hms-muted)" }}>{dateShort(a.admitted_at, lang)} → {a.discharged_at ? dateShort(a.discharged_at, lang) : tr("still admitted", "هنوز بستر است")}</p>
                <p className="mt-0.5">{a.diagnosis}</p>
              </div>
            ))}
            {!admissions.length && <p style={{ color: "var(--hms-faint)" }}>{tr("Never admitted.", "هرگز بستر نشده.")}</p>}
          </div>
        </Panel>

        <Panel>
          <SectionTitle title={tr("Surgery", "جراحی")} subtitle={tr("Theatre list", "فهرست اتاق عملیات")} icon={<Scissors size={14} />} />
          <div className="mt-1.5 space-y-1 text-[0.68rem]">
            {surgeries.map((s) => (
              <div key={s.id} className="flex items-center gap-2 border-b py-1 last:border-0" style={{ borderColor: "var(--hms-border)" }}>
                <span className="flex-1 truncate">{s.procedure_name}</span>
                <span style={{ color: "var(--hms-faint)" }}>{dateShort(s.scheduled_at, lang)}</span>
                <Tag tone={s.status === "completed" ? "good" : "warn"}>{statusText(lang, s.status)}</Tag>
              </div>
            ))}
            {!surgeries.length && <p style={{ color: "var(--hms-faint)" }}>{tr("No operations.", "هیچ عملیاتی نیست.")}</p>}
          </div>
        </Panel>

        <Panel>
          <SectionTitle title={tr("Billing", "حساب")} subtitle={tr("Invoices and receipts", "بل‌ها و رسیدها")} icon={<Receipt size={14} />} />
          <div className="mt-1.5 space-y-1 text-[0.68rem]">
            {invoices.map((i) => (
              <Link key={i.id} href={`/hms/receipt/${i.id}`} className="flex items-center gap-2 border-b py-1 last:border-0" style={{ borderColor: "var(--hms-border)" }}>
                <span className="flex-1 truncate">{i.invoice_no}</span>
                <span>{money(i.total, lang)}</span>
                <Tag tone={i.status === "paid" ? "good" : i.status === "partial" ? "warn" : "bad"}>{statusText(lang, i.status)}</Tag>
              </Link>
            ))}
            {!invoices.length && <p style={{ color: "var(--hms-faint)" }}>{tr("No invoices.", "هیچ بلی نیست.")}</p>}
          </div>
        </Panel>
      </div>

      <p className="pb-2 text-center text-[0.6rem]" style={{ color: "var(--hms-faint)" }}>
        {tr("Viewed by {name} · every access to this chart is recorded in the audit trail.", "دیده‌شده توسط {name} · هر دسترسی به این پرونده در سابقهٔ حسابرسی ثبت می‌شود.", { name: me.name })}
      </p>
    </div>
  );
}
