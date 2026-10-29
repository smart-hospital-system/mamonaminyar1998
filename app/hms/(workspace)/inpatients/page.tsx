import { BedDouble, HeartPulse } from "lucide-react";
import { Panel, SectionTitle, Stat } from "@/components/hms/ui";
import { requireHmsPage } from "@/lib/hms/auth";
import { hmsReady } from "@/lib/hms/db";
import { listAdmissions, listBeds, listPatients } from "@/lib/hms/queries";
import { money } from "@/lib/hms/format";
import { WardBoard } from "./board";

export const dynamic = "force-dynamic";

export default async function InpatientsPage() {
  const user = await requireHmsPage(["admin", "nurse", "doctor"]);
  await hmsReady();
  const beds = listBeds();
  const admissions = listAdmissions();
  const patients = listPatients({ limit: 400 }).items;
  const occupied = beds.filter((b) => b.status === "occupied");

  return (
    <div className="space-y-3.5">
      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
        <Stat label="Occupied" value={`${occupied.length}/${beds.length}`} hint={`${Math.round((occupied.length / Math.max(1, beds.length)) * 100)}% occupancy`} tone={occupied.length >= 8 ? "bad" : "good"} icon={<BedDouble size={14} />} />
        <Stat label="Ready to admit" value={beds.filter((b) => b.status === "available").length} hint="Cleaned and inspected" tone="brand" />
        <Stat label="Awaiting housekeeping" value={beds.filter((b) => b.status === "cleaning").length} hint="Blocked until cleaned" tone="warn" />
        <Stat label="Bed revenue / day" value={money(occupied.reduce((a, b) => a + b.daily_rate, 0))} hint="Charge if all stay tonight" tone="info" />
      </div>
      <div className="grid gap-3.5 xl:grid-cols-[1.25fr_1fr]">
        <Panel>
          <SectionTitle title="Bed board" subtitle="Ten beds across the surgical ward — tap a bed to admit, transfer, discharge or clean." icon={<HeartPulse size={14} />} />
          <WardBoard beds={beds} admissions={admissions} patients={patients.map((p) => ({ id: p.id, name: p.name, mrn: p.mrn }))} role={user.role} />
        </Panel>
        <Panel>
          <SectionTitle title="Current inpatients" subtitle="Live admissions with the treating consultant" icon={<HeartPulse size={14} />} />
          <div className="mt-2 space-y-1.5">
            {admissions.filter((a) => a.status === "admitted").map((a) => (
              <div key={a.id} className="rounded-lg border p-2" style={{ borderColor: "var(--hms-border)" }}>
                <div className="flex items-center justify-between gap-1">
                  <p className="truncate text-[0.76rem] font-semibold">{a.patient_name}</p>
                  <span className="hms-pill" style={{ background: "var(--hms-brand-soft)", color: "var(--hms-brand-ink)" }}>{a.bed_label ?? "no bed"}</span>
                </div>
                <p className="truncate text-[0.64rem]" style={{ color: "var(--hms-muted)" }}>{a.diagnosis ?? "Diagnosis pending"} · {a.admission_type}</p>
                <p className="text-[0.6rem]" style={{ color: "var(--hms-faint)" }}>Admitted {new Date(a.admitted_at).toLocaleString("en-GB", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}</p>
              </div>
            ))}
            {!admissions.some((a) => a.status === "admitted") && <p className="py-6 text-center text-[0.72rem]" style={{ color: "var(--hms-faint)" }}>The ward is empty — every bed is ready.</p>}
          </div>
        </Panel>
      </div>
    </div>
  );
}
