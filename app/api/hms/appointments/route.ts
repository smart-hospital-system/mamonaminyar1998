import { body, json, qp, route } from "@/lib/api";
import { requireHmsApi } from "@/lib/hms/auth";
import { hAudit, hNow, hRun, hUid, hGet } from "@/lib/hms/db";
import { listAppointments } from "@/lib/hms/queries";

export const GET = route(async (req) => {
  await requireHmsApi();
  const p = qp(req);
  return json({ items: listAppointments(p.get("date") ?? undefined) });
});

export const POST = route(async (req) => {
  const user = await requireHmsApi(["admin", "doctor", "nurse", "reception"]);
  const p = await body<{ patient_id?: string; doctor_id?: string; start_at?: string; reason?: string; notes?: string }>(req);
  if (!p.patient_id || !p.doctor_id || !p.start_at) return json({ error: "Patient, physician and time are required." }, 422);
  const doctor = hGet<{ department: string }>("SELECT department FROM hms_users WHERE id = ?", [p.doctor_id]);
  const id = hUid("apt");
  hRun(
    `INSERT INTO hms_appointments (id, patient_id, doctor_id, department, start_at, status, reason, notes, created_at)
     VALUES (?,?,?,?,?, 'confirmed', ?, ?, ?)`,
    [id, p.patient_id, p.doctor_id, doctor?.department === "Surgery" ? "Surgery" : "OPD", p.start_at, p.reason ?? null, p.notes ?? null, hNow()]
  );
  const patient = hGet<{ name: string }>("SELECT name FROM hms_patients WHERE id = ?", [p.patient_id]);
  hAudit(user, "created", "appointment", id, `Booked appointment for ${patient?.name ?? "a patient"}`);
  return json({ ok: true, id }, 201);
});

export const dynamic = "force-dynamic";
