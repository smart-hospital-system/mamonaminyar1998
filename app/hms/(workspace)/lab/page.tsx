import { FlaskConical } from "lucide-react";
import { Panel, SectionTitle, Stat } from "@/components/hms/ui";
import { requireHmsPage } from "@/lib/hms/auth";
import { digitsOf } from "@/lib/hms/format";
import { tx } from "@/lib/hms/i18n";
import { getLang } from "@/lib/hms/lang-server";

import { hmsReady } from "@/lib/hms/db";
import { listLabOrders } from "@/lib/hms/queries";
import { LabBoard } from "./board";

export const dynamic = "force-dynamic";

export default async function LabPage() {
  const user = await requireHmsPage(["admin", "lab", "doctor"]);
  await hmsReady();
  const lang = await getLang();
  const tr = (en: string, fa: string, vars?: Record<string, string | number>) => tx(lang, en, fa, vars);
  const items = listLabOrders();
  const open = items.filter((i) => i.status !== "verified");

  return (
    <div className="space-y-3.5">
      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
        <Stat label={tr("On the worklist", "در فهرست کار")} value={digitsOf(lang, open.length)} hint={tr("Not yet verified", "هنوز تأیید نشده")} tone="info" icon={<FlaskConical size={14} />} />
        <Stat label={tr("Awaiting sample", "منتظر نمونه")} value={digitsOf(lang, items.filter((i) => i.status === "ordered").length)} hint={tr("Phlebotomy pending", "خون‌گیری در انتظار")} tone="warn" />
        <Stat label={tr("In the analyser", "در دستگاه")} value={digitsOf(lang, items.filter((i) => ["collected", "in_progress"].includes(i.status)).length)} hint={tr("Running now", "اکنون در حال اجرا")} tone="brand" />
        <Stat label={tr("Verified today", "تأییدشدهٔ امروز")} value={digitsOf(lang, items.filter((i) => i.status === "verified" && String(i.completed_at ?? "").slice(0, 10) === new Date().toISOString().slice(0, 10)).length)} hint={tr("Released to clinician", "برای داکتر آزاد شد")} tone="good" />
      </div>
      <Panel>
        <SectionTitle
          title={tr("Laboratory worklist", "فهرست کار لابراتوار")}
          subtitle={tr("Collect the sample, type the result — values are parsed automatically and critical ones raise an alarm.", "نمونه را بگیرید و نتیجه را بنویسید — مقادیر خودکار تجزیه می‌شوند و مقادیر بحرانی هشدار می‌دهند.")}
          icon={<FlaskConical size={14} />}
        />
        <LabBoard rows={items} role={user.role} />
      </Panel>
    </div>
  );
}
