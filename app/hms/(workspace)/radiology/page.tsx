import { ScanLine } from "lucide-react";
import { Panel, SectionTitle, Stat } from "@/components/hms/ui";
import { requireHmsPage } from "@/lib/hms/auth";
import { hmsReady } from "@/lib/hms/db";
import { listImagingOrders } from "@/lib/hms/queries";
import { ImagingBoard } from "./board";

export const dynamic = "force-dynamic";

export default async function RadiologyPage() {
  const user = await requireHmsPage(["admin", "radiology", "doctor"]);
  await hmsReady();
  const items = listImagingOrders();
  const today = new Date().toISOString().slice(0, 10);

  return (
    <div className="space-y-3.5">
      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
        <Stat label="Requests open" value={items.filter((i) => i.status !== "reported").length} hint="Awaiting acquisition or report" tone="info" icon={<ScanLine size={14} />} />
        <Stat label="Reporting queue" value={items.filter((i) => i.status === "in_progress").length} hint="Images acquired" tone="warn" />
        <Stat label="Reported today" value={items.filter((i) => i.status === "reported" && String(i.reported_at ?? "").slice(0, 10) === today).length} hint="Released" tone="good" />
        <Stat label="Urgent" value={items.filter((i) => i.priority === "urgent" && i.status !== "reported").length} hint="Bump to the top" tone="bad" />
      </div>
      <Panel>
        <SectionTitle
          title="Imaging worklist"
          subtitle="X-ray, ultrasound, CT and MRI requests with structured findings and impressions."
          icon={<ScanLine size={14} />}
        />
        <ImagingBoard rows={items} role={user.role} />
      </Panel>
    </div>
  );
}
