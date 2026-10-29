import { Scissors } from "lucide-react";
import { Panel, SectionTitle, Stat } from "@/components/hms/ui";
import { requireHmsPage } from "@/lib/hms/auth";
import { hmsReady } from "@/lib/hms/db";
import { listPatients, listSurgeries } from "@/lib/hms/queries";
import { SurgeryBoard } from "./board";

export const dynamic = "force-dynamic";

export default async function SurgeryPage() {
  const user = await requireHmsPage(["admin", "doctor", "nurse"]);
  await hmsReady();
  const surgeries = listSurgeries();
  const patients = listPatients({ limit: 400 }).items;
  const today = new Date().toISOString().slice(0, 10);

  return (
    <div className="space-y-3.5">
      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
        <Stat label="Listed today" value={surgeries.filter((s) => String(s.scheduled_at).slice(0, 10) === today).length} hint="Theatre A & B" tone="info" icon={<Scissors size={14} />} />
        <Stat label="Scheduled ahead" value={surgeries.filter((s) => s.status === "scheduled" && String(s.scheduled_at).slice(0, 10) > today).length} hint="Booked cases" tone="brand" />
        <Stat label="In theatre" value={surgeries.filter((s) => s.status === "in_progress").length} hint="Live right now" tone="warn" />
        <Stat label="Completed" value={surgeries.filter((s) => s.status === "completed").length} hint="Operation notes filed" tone="good" />
      </div>
      <Panel>
        <SectionTitle
          title="Theatre list"
          subtitle="Book a case, start it when the patient is on the table, then file the operation note."
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
