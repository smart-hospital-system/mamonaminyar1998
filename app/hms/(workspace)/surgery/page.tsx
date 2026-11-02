import { Scissors } from "lucide-react";
import { Panel, SectionTitle, Stat } from "@/components/hms/ui";
import { requireHmsPage } from "@/lib/hms/auth";
import { digitsOf } from "@/lib/hms/format";
import { tx } from "@/lib/hms/i18n";
import { getLang } from "@/lib/hms/lang-server";

import { hmsReady } from "@/lib/hms/db";
import { listPatients, listSurgeries } from "@/lib/hms/queries";
import { SurgeryBoard } from "./board";

export const dynamic = "force-dynamic";

export default async function SurgeryPage() {
  const user = await requireHmsPage(["admin", "doctor", "nurse"]);
  await hmsReady();
  const lang = await getLang();
  const tr = (en: string, fa: string, vars?: Record<string, string | number>) => tx(lang, en, fa, vars);
  const surgeries = listSurgeries();
  const patients = listPatients({ limit: 400 }).items;
  const today = new Date().toISOString().slice(0, 10);

  return (
    <div className="space-y-3.5">
      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
<Stat label={tr("Listed today", "فهرست امروز")} value={digitsOf(lang, surgeries.filter((s) => String(s.scheduled_at).slice(0, 10) === today).length)} hint={tr("Theatre A & B", "اتاق الف و ب")} tone="info" icon={<Scissors size={14} />} />
        <Stat label={tr("Scheduled ahead", "زمان‌بندی آینده")} value={digitsOf(lang, surgeries.filter((s) => s.status === "scheduled" && String(s.scheduled_at).slice(0, 10) > today).length)} hint={tr("Booked cases", "عملیات ثبت‌شده")} tone="brand" />
        <Stat label={tr("In theatre", "در اتاق عملیات")} value={digitsOf(lang, surgeries.filter((s) => s.status === "in_progress").length)} hint={tr("Live right now", "همین حالا")} tone="warn" />
        <Stat label={tr("Completed", "تکمیل‌شده")} value={digitsOf(lang, surgeries.filter((s) => s.status === "completed").length)} hint={tr("Operation notes filed", "یادداشت عملیات ثبت شد")} tone="good" />
      </div>
      <Panel>
        <SectionTitle
          title={tr("Theatre list", "فهرست اتاق عملیات")}
          subtitle={tr("Book a case, start it when the patient is on the table, then file the operation note.", "عملیات را ثبت کنید، وقتی مریض روی تخت رفت شروع کنید و سپس یادداشت عملیات را ثبت نمایید.")}
          icon={<Scissors size={14} />}
        />
        <SurgeryBoard
          rows={surgeries}
          patients={patients.map((p) => ({ id: p.id, name: p.name, mrn: p.mrn }))}
          canBook={["admin", "doctor"].includes(user.role)}
          canProgress={["admin", "doctor", "nurse"].includes(user.role)}
        />
      </Panel>
    </div>
  );
}
