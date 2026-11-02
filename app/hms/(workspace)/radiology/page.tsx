import { ScanLine } from "lucide-react";
import { Panel, SectionTitle, Stat } from "@/components/hms/ui";
import { requireHmsPage } from "@/lib/hms/auth";
import { digitsOf } from "@/lib/hms/format";
import { tx } from "@/lib/hms/i18n";
import { getLang } from "@/lib/hms/lang-server";

import { hmsReady } from "@/lib/hms/db";
import { listImagingOrders } from "@/lib/hms/queries";
import { ImagingBoard } from "./board";

export const dynamic = "force-dynamic";

export default async function RadiologyPage() {
  const user = await requireHmsPage(["admin", "radiology", "doctor"]);
  await hmsReady();
  const lang = await getLang();
  const tr = (en: string, fa: string, vars?: Record<string, string | number>) => tx(lang, en, fa, vars);
  const items = listImagingOrders();
  const today = new Date().toISOString().slice(0, 10);

  return (
    <div className="space-y-3.5">
      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
        <Stat label={tr("Requests open", "درخواست‌های باز")} value={digitsOf(lang, items.filter((i) => i.status !== "reported").length)} hint={tr("Awaiting acquisition or report", "منتظر تصویربرداری یا گزارش")} tone="info" icon={<ScanLine size={14} />} />
        <Stat label={tr("Reporting queue", "صف گزارش‌نویسی")} value={digitsOf(lang, items.filter((i) => i.status === "in_progress").length)} hint={tr("Images acquired", "تصاویر گرفته شد")} tone="warn" />
        <Stat label={tr("Reported today", "گزارش‌شدهٔ امروز")} value={digitsOf(lang, items.filter((i) => i.status === "reported" && String(i.reported_at ?? "").slice(0, 10) === today).length)} hint={tr("Released", "آزاد شد")} tone="good" />
        <Stat label={tr("Urgent", "فوری")} value={digitsOf(lang, items.filter((i) => i.priority === "urgent" && i.status !== "reported").length)} hint={tr("Bump to the top", "به بالای فهرست می‌رود")} tone="bad" />
      </div>
      <Panel>
        <SectionTitle
          title={tr("Imaging worklist", "فهرست کار تصویربرداری")}
          subtitle={tr("X-ray, ultrasound, CT and MRI requests with structured findings and impressions.", "درخواست‌های اکسری، سونوگرافی، سی‌تی و ام‌آر‌آی با یافته‌ها و نتیجه‌گیری ساخت‌یافته.")}
          icon={<ScanLine size={14} />}
        />
        <ImagingBoard rows={items} role={user.role} />
      </Panel>
    </div>
  );
}
