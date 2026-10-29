import { FlaskConical } from "lucide-react";
import { Panel, SectionTitle, Stat } from "@/components/hms/ui";
import { requireHmsPage } from "@/lib/hms/auth";
import { hmsReady } from "@/lib/hms/db";
import { listLabOrders } from "@/lib/hms/queries";
import { LabBoard } from "./board";

export const dynamic = "force-dynamic";

export default async function LabPage() {
  const user = await requireHmsPage(["admin", "lab", "doctor"]);
  await hmsReady();
  const items = listLabOrders();
  const open = items.filter((i) => i.status !== "verified");

  return (
    <div className="space-y-3.5">
      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
        <Stat label="On the worklist" value={open.length} hint="Not yet verified" tone="info" icon={<FlaskConical size={14} />} />
        <Stat label="Awaiting sample" value={items.filter((i) => i.status === "ordered").length} hint="Phlebotomy pending" tone="warn" />
        <Stat label="In the analyser" value={items.filter((i) => ["collected", "in_progress"].includes(i.status)).length} hint="Running now" tone="brand" />
        <Stat label="Verified today" value={items.filter((i) => i.status === "verified" && String(i.completed_at ?? "").slice(0, 10) === new Date().toISOString().slice(0, 10)).length} hint="Released to clinician" tone="good" />
      </div>
      <Panel>
        <SectionTitle
          title="Laboratory worklist"
          subtitle="Collect the sample, type the result — values are parsed automatically and critical ones raise an alarm."
          icon={<FlaskConical size={14} />}
        />
        <LabBoard rows={items} role={user.role} />
      </Panel>
    </div>
  );
}
