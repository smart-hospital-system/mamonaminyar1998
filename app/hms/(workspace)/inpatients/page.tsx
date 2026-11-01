import { BedDouble, HeartPulse } from "lucide-react";
import { Panel, SectionTitle, Stat } from "@/components/hms/ui";
import { requireHmsPage } from "@/lib/hms/auth";
import { tx } from "@/lib/hms/i18n";
import { getLang } from "@/lib/hms/lang-server";

import { hmsReady } from "@/lib/hms/db";
import { listAdmissions, listBeds, listPatients } from "@/lib/hms/queries";
import { dateShort, digitsOf, money, timeShort } from "@/lib/hms/format";
import { WardBoard } from "./board";

export const dynamic = "force-dynamic";

export default async function InpatientsPage() {
  const user = await requireHmsPage(["admin", "nurse", "doctor"]);
  await hmsReady();
  const lang = await getLang();
  const tr = (en: string, fa: string, vars?: Record<string, string | number>) => tx(lang, en, fa, vars);
  const beds = listBeds();
  const admissions = listAdmissions();
  const patients = listPatients({ limit: 400 }).items;
  const occupied = beds.filter((b) => b.status === "occupied");

  return (
    <div className="space-y-3.5">
      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
<Stat label={tr("Occupied", "پُر")} value={`${digitsOf(lang, occupied.length)}/${digitsOf(lang, beds.length)}`} hint={tr("{pct}% occupancy", "{pct}% اشغال", { pct: digitsOf(lang, Math.round((occupied.length / Math.max(1, beds.length)) * 100)) })} tone={occupied.length >= 8 ? "bad" : "good"} icon={<BedDouble size={14} />} />
        <Stat label={tr("Ready to admit", "آمادهٔ بستر")} value={digitsOf(lang, beds.filter((b) => b.status === "available").length)} hint={tr("Cleaned and inspected", "نظافت و بازبینی شده")} tone="brand" />
        <Stat label={tr("Awaiting housekeeping", "منتظر نظافت")} value={digitsOf(lang, beds.filter((b) => b.status === "cleaning").length)} hint={tr("Blocked until cleaned", "تا نظافت مسدود است")} tone="warn" />
        <Stat label={tr("Bed revenue / day", "درآمد بستر / روز")} value={money(occupied.reduce((a, b) => a + b.daily_rate, 0), lang)} hint={tr("Charge if all stay tonight", "اگر همه امشب بمانند")} tone="info" />
      </div>
      <div className="grid gap-3.5 xl:grid-cols-[1.25fr_1fr]">
        <Panel>
          <SectionTitle title={tr("Bed board", "تختهٔ بستر")} subtitle={tr("Ten beds across the surgical ward — tap a bed to admit, transfer, discharge or clean.", "ده بستر در وارڈ جراحی — با لمس بستر، مریض را بستر کنید، انتقال دهید، مرخص کنید یا نظافت را ثبت کنید.")} icon={<HeartPulse size={14} />} />
          <WardBoard beds={beds} admissions={admissions} patients={patients.map((p) => ({ id: p.id, name: p.name, mrn: p.mrn }))} role={user.role} />
        </Panel>
        <Panel>
          <SectionTitle title={tr("Current inpatients", "مریضان بستر فعلی")} subtitle={tr("Live admissions with the treating consultant", "بسترهای فعال با داکتر معالج")} icon={<HeartPulse size={14} />} />
          <div className="mt-2 space-y-1.5">
            {admissions.filter((a) => a.status === "admitted").map((a) => (
              <div key={a.id} className="rounded-lg border p-2" style={{ borderColor: "var(--hms-border)" }}>
                <div className="flex items-center justify-between gap-1">
                  <p className="truncate text-[0.76rem] font-semibold">{a.patient_name}</p>
                  <span className="hms-pill" style={{ background: "var(--hms-brand-soft)", color: "var(--hms-brand-ink)" }}>{a.bed_label ?? tr("no bed", "بدون بستر")}</span>
                </div>
                <p className="truncate text-[0.64rem]" style={{ color: "var(--hms-muted)" }}>{a.diagnosis ?? tr("Diagnosis pending", "تشخیص در انتظار")} · {a.admission_type}</p>
                <p className="text-[0.6rem]" style={{ color: "var(--hms-faint)" }}>{tr("Admitted", "بستر شد")} {dateShort(a.admitted_at, lang)} · {timeShort(a.admitted_at, lang)}</p>
              </div>
            ))}
            {!admissions.some((a) => a.status === "admitted") && <p className="py-6 text-center text-[0.72rem]" style={{ color: "var(--hms-faint)" }}>{tr("The ward is empty — every bed is ready.", "وارڈ خالی است — همهٔ بسترها آماده‌اند.")}</p>}
          </div>
        </Panel>
      </div>
    </div>
  );
}
