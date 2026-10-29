"use client";

import { Check, CircleSlash, Loader2, PhoneCall } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Empty, Person, Status } from "@/components/hms/ui";
import { timeShort } from "@/lib/hms/format";
import type { AppointmentRow } from "@/lib/hms/queries";

export function Queue({ rows, role }: { rows: AppointmentRow[]; role: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const canEdit = ["admin", "doctor", "nurse", "reception"].includes(role);

  async function setStatus(id: string, status: string) {
    setBusy(id + status);
    await fetch(`/api/hms/appointments/${id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ status }),
    });
    setBusy(null);
    router.refresh();
  }

  if (!rows.length) return <Empty title="Nobody booked today" hint="Register a patient and book an appointment from the Patients screen." />;

  return (
    <div className="mt-2 space-y-1">
      {rows.map((a) => (
        <div key={a.id} className="flex items-center gap-2 rounded-lg border px-2 py-1.5" style={{ borderColor: "var(--hms-border)" }}>
          <div className="w-12 shrink-0">
            <p className="text-[0.66rem] font-semibold leading-none">{timeShort(a.start_at)}</p>
            <p className="mt-0.5 text-[0.54rem] uppercase" style={{ color: "var(--hms-faint)" }}>{a.department}</p>
          </div>
          <div className="min-w-0 flex-1">
            <Person name={a.patient_name} sub={a.reason ?? a.mrn} size={24} />
          </div>
          <Status value={a.status} />
          {canEdit && !["completed", "cancelled"].includes(a.status) && (
            <div className="flex gap-0.5">
              <button className="hms-btn hms-btn-sm hms-btn-ghost" title="Call in" onClick={() => setStatus(a.id, "waiting")} disabled={!!busy}>
                {busy === a.id + "waiting" ? <Loader2 size={11} className="animate-spin" /> : <PhoneCall size={11} />}
              </button>
              <button className="hms-btn hms-btn-sm hms-btn-ghost" title="Mark completed" onClick={() => setStatus(a.id, "completed")} disabled={!!busy}>
                {busy === a.id + "completed" ? <Loader2 size={11} className="animate-spin" /> : <Check size={11} />}
              </button>
              <button className="hms-btn hms-btn-sm hms-btn-ghost" title="No-show" onClick={() => setStatus(a.id, "no_show")} disabled={!!busy}>
                {busy === a.id + "no_show" ? <Loader2 size={11} className="animate-spin" /> : <CircleSlash size={11} />}
              </button>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
