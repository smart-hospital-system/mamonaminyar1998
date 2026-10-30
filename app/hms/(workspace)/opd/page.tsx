import { Stethoscope } from "lucide-react";
import { Panel, SectionTitle, Stat } from "@/components/hms/ui";
import { requireHmsPage } from "@/lib/hms/auth";
import { digitsOf } from "@/lib/hms/format";
import { tx } from "@/lib/hms/i18n";
import { getLang } from "@/lib/hms/lang-server";
import { hmsReady } from "@/lib/hms/db";
import { listAppointments, listEncounters, listPatients, hmsKpis } from "@/lib/hms/queries";
import { RX_TEMPLATES } from "@/lib/hms/templates";
import { ConsultConsole } from "./consult";
import { Queue } from "./queue";

export const dynamic = "force-dynamic";

export default async function OpdPage({ searchParams }: { searchParams: Promise<{ patient?: string; appt?: string }> }) {
  const user = await requireHmsPage(["admin", "doctor", "nurse", "reception"]);
  await hmsReady();
  const lang = await getLang();
  const sp = await searchParams;
  const tr = (en: string, fa: string, vars?: Record<string, string | number>) => tx(lang, en, fa, vars);
  const today = new Date().toISOString().slice(0, 10);
  const appts = listAppointments(today);
  const patients = listPatients({ limit: 400 }).items;
  const encounters = listEncounters(12);
  const kpis = hmsKpis();
  const canPrescribe = ["admin", "doctor"].includes(user.role);

  return (
    <div className="space-y-3.5">
      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
        <Stat label={tr("Booked today", "وقت‌های امروز")} value={digitsOf(lang, appts.length)} hint={tr("{n} in the waiting room", "{n} در اتاق انتظار", { n: digitsOf(lang, appts.filter((a) => a.status === "waiting").length) })} tone="info" icon={<Stethoscope size={14} />} />
        <Stat label={tr("Completed", "تکمیل‌شده")} value={digitsOf(lang, appts.filter((a) => a.status === "completed").length)} hint={tr("Consult closed with notes", "معاینه با یادداشت بسته شد")} tone="good" />
        <Stat label={tr("No-shows", "نیامده‌ها")} value={digitsOf(lang, appts.filter((a) => a.status === "no_show").length)} hint={tr("Patients not reached", "مریض پیدا نشد")} tone="warn" />
        <Stat label={tr("Prescriptions pending", "نسخه‌های در انتظار")} value={digitsOf(lang, kpis.pendingRx)} hint={tr("Awaiting signature", "منتظر امضا")} tone="brand" />
      </div>

      <div className="grid gap-3.5 xl:grid-cols-[1fr_1.35fr]">
        <div className="space-y-3.5">
          <Panel>
            <SectionTitle
              title={tr("Today's queue", "نوبت امروز")}
              subtitle={tr("Drag-free workflow: call in, record vitals, complete. Every change is audited.", "جریان کاری ساده: صدا زدن، ثبت علایم حیاتی، تکمیل. هر تغییر در سابقه ثبت می‌شود.")}
              icon={<Stethoscope size={14} />}
            />
            <Queue rows={appts} role={user.role} />
          </Panel>

          <Panel>
            <SectionTitle title={tr("Recent consults", "معاینات اخیر")} subtitle={tr("Last twelve documented encounters", "دوازده معاینهٔ آخر ثبت‌شده")} />
            <div className="mt-2 divide-y" style={{ borderColor: "var(--hms-border)" }}>
              {encounters.map((e) => (
                <div key={e.id} className="flex items-center gap-2 py-1.5">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[0.72rem] font-medium">{e.patient_name}</p>
                    <p className="truncate text-[0.62rem]" style={{ color: "var(--hms-faint)" }}>
                      {e.diagnosis ?? tr("No diagnosis recorded", "تشخیص ثبت نشده")} · {e.doctor_name}
                    </p>
                  </div>
                  <span className="shrink-0 text-[0.6rem]" style={{ color: "var(--hms-faint)" }}>{e.department}</span>
                </div>
              ))}
            </div>
          </Panel>
        </div>

        <Panel>
          <SectionTitle
            title={tr("Consult room", "اتاق معاینه")}
            subtitle={tr("Triage, safety screening and prescribing in a single pass", "تریاژ، بررسی ایمنی و نسخه‌نویسی در یک مرحله")}
            icon={<Stethoscope size={14} />}
          />
          <ConsultConsole
            patients={patients.map((p) => ({ id: p.id, name: p.name, mrn: p.mrn, dob: p.dob, gender: p.gender, allergies: p.allergies }))}
            appointments={appts.map((a) => ({ id: a.id, patient_id: a.patient_id, patient_name: a.patient_name, start_at: a.start_at, reason: a.reason }))}
            templates={RX_TEMPLATES.map((t) => ({ id: t.id, name: t.name }))}
            canPrescribe={canPrescribe}
            initialPatientId={sp.patient}
            initialAppointmentId={sp.appt}
          />
        </Panel>
      </div>
    </div>
  );
}
