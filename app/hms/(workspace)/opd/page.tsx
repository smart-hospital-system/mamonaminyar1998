import { Stethoscope } from "lucide-react";
import { Panel, SectionTitle, Stat } from "@/components/hms/ui";
import { requireHmsPage } from "@/lib/hms/auth";
import { hmsReady } from "@/lib/hms/db";
import { listAppointments, listEncounters, listPatients, hmsKpis } from "@/lib/hms/queries";
import { RX_TEMPLATES } from "@/lib/hms/templates";
import { ConsultConsole } from "./consult";
import { Queue } from "./queue";

export const dynamic = "force-dynamic";

export default async function OpdPage() {
  const user = await requireHmsPage(["admin", "doctor", "nurse", "reception"]);
  await hmsReady();
  const today = new Date().toISOString().slice(0, 10);
  const appts = listAppointments(today);
  const patients = listPatients({ limit: 400 }).items;
  const encounters = listEncounters(12);
  const kpis = hmsKpis();
  const canPrescribe = ["admin", "doctor"].includes(user.role);

  return (
    <div className="space-y-3.5">
      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
        <Stat label="Booked today" value={appts.length} hint={`${appts.filter((a) => a.status === "waiting").length} in the waiting room`} tone="info" icon={<Stethoscope size={14} />} />
        <Stat label="Completed" value={appts.filter((a) => a.status === "completed").length} hint="Consult closed with notes" tone="good" />
        <Stat label="No-shows" value={appts.filter((a) => a.status === "no_show").length} hint="Patients not reached" tone="warn" />
        <Stat label="Prescriptions pending" value={kpis.pendingRx} hint="Awaiting signature" tone="brand" />
      </div>

      <div className="grid gap-3.5 xl:grid-cols-[1fr_1.35fr]">
        <div className="space-y-3.5">
          <Panel>
            <SectionTitle
              title="Today's queue"
              subtitle="Drag-free workflow: call in, record vitals, complete. Every change is audited."
              icon={<Stethoscope size={14} />}
            />
            <Queue rows={appts} role={user.role} />
          </Panel>

          <Panel>
            <SectionTitle title="Recent consults" subtitle="Last twelve documented encounters" />
            <div className="mt-2 divide-y" style={{ borderColor: "var(--hms-border)" }}>
              {encounters.map((e) => (
                <div key={e.id} className="flex items-center gap-2 py-1.5">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[0.72rem] font-medium">{e.patient_name}</p>
                    <p className="truncate text-[0.62rem]" style={{ color: "var(--hms-faint)" }}>
                      {e.diagnosis ?? "No diagnosis recorded"} · {e.doctor_name}
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
            title="Consult room"
            subtitle="Triage, safety screening and prescribing in a single pass"
            icon={<Stethoscope size={14} />}
          />
          <ConsultConsole
            patients={patients.map((p) => ({ id: p.id, name: p.name, mrn: p.mrn, dob: p.dob, gender: p.gender, allergies: p.allergies }))}
            appointments={appts.map((a) => ({ id: a.id, patient_id: a.patient_id, patient_name: a.patient_name, start_at: a.start_at, reason: a.reason }))}
            templates={RX_TEMPLATES.map((t) => ({ id: t.id, name: t.name }))}
            canPrescribe={canPrescribe}
          />
        </Panel>
      </div>
    </div>
  );
}
