import { body, json, route } from "@/lib/api";
import { requireHmsApi } from "@/lib/hms/auth";
import { hAudit, hGet, hNow, hRun, hUid } from "@/lib/hms/db";
import { listAdmissions, listBeds } from "@/lib/hms/queries";

export const GET = route(async () => {
  await requireHmsApi();
  return json({ beds: listBeds(), admissions: listAdmissions() });
});

export const POST = route(async (req) => {
  const user = await requireHmsApi(["admin", "nurse", "doctor"]);
  const p = await body<{
    action?: "admit" | "transfer" | "discharge" | "clean";
    bed_id?: string; patient_id?: string; consultant?: string; diagnosis?: string;
    admission_type?: string; target_bed?: string; admission_id?: string; notes?: string;
  }>(req);
  const action = p.action ?? "admit";

  if (action === "admit") {
    if (!p.bed_id || !p.patient_id) return json({ error: "Bed and patient are required." }, 422);
    const bed = hGet<{ status: string; label: string; daily_rate: number }>("SELECT status, label, daily_rate FROM hms_beds WHERE id = ?", [p.bed_id]);
    if (!bed) return json({ error: "Bed not found" }, 404);
    if (bed.status === "occupied") return json({ error: `${bed.label} is already occupied.` }, 409);
    const id = hUid("adm");
    hRun(
      `INSERT INTO hms_admissions (id, patient_id, bed_id, consultant, diagnosis, admission_type, admitted_at, status, notes, created_at)
       VALUES (?,?,?,?,?,?,?, 'admitted', ?, ?)`,
      [id, p.patient_id, p.bed_id, p.consultant ?? user.id, p.diagnosis ?? null, p.admission_type ?? "elective", hNow(), p.notes ?? null, hNow()]
    );
    hRun("UPDATE hms_beds SET status = 'occupied', patient_id = ?, admitted_at = ? WHERE id = ?", [p.patient_id, hNow(), p.bed_id]);
    const patient = hGet<{ name: string }>("SELECT name FROM hms_patients WHERE id = ?", [p.patient_id]);
    hAudit(user, "admitted", "inpatient", id, `Admitted ${patient?.name ?? "patient"} to ${bed.label}`);
    return json({ ok: true, id }, 201);
  }

  if (action === "transfer") {
    if (!p.admission_id || !p.target_bed) return json({ error: "Admission and target bed are required." }, 422);
    const target = hGet<{ status: string; label: string }>("SELECT status, label FROM hms_beds WHERE id = ?", [p.target_bed]);
    if (!target) return json({ error: "Target bed not found" }, 404);
    if (target.status === "occupied") return json({ error: `${target.label} is occupied.` }, 409);
    const adm = hGet<{ bed_id: string; patient_id: string }>("SELECT bed_id, patient_id FROM hms_admissions WHERE id = ?", [p.admission_id]);
    if (!adm) return json({ error: "Admission not found" }, 404);
    hRun("UPDATE hms_beds SET status = 'cleaning', patient_id = NULL, admitted_at = NULL WHERE id = ?", [adm.bed_id]);
    hRun("UPDATE hms_beds SET status = 'occupied', patient_id = ?, admitted_at = ? WHERE id = ?", [adm.patient_id, hNow(), p.target_bed]);
    hRun("UPDATE hms_admissions SET bed_id = ? WHERE id = ?", [p.target_bed, p.admission_id]);
    hAudit(user, "transferred", "inpatient", p.admission_id, `Transferred to ${target.label}`);
    return json({ ok: true });
  }

  if (action === "discharge") {
    if (!p.admission_id) return json({ error: "Admission is required." }, 422);
    const adm = hGet<{ bed_id: string | null; patient_id: string }>("SELECT bed_id, patient_id FROM hms_admissions WHERE id = ?", [p.admission_id]);
    if (!adm) return json({ error: "Admission not found" }, 404);
    hRun("UPDATE hms_admissions SET status = 'discharged', discharged_at = ?, notes = ? WHERE id = ?", [hNow(), p.notes ?? null, p.admission_id]);
    if (adm.bed_id) hRun("UPDATE hms_beds SET status = 'cleaning', patient_id = NULL, admitted_at = NULL WHERE id = ?", [adm.bed_id]);
    hAudit(user, "discharged", "inpatient", p.admission_id, "Discharged and released the bed for cleaning");
    return json({ ok: true });
  }

  if (action === "clean") {
    if (!p.bed_id) return json({ error: "Bed is required." }, 422);
    if (!hGet<{ id: string }>("SELECT id FROM hms_beds WHERE id = ?", [p.bed_id])) return json({ error: "Bed not found." }, 404);
    hRun("UPDATE hms_beds SET status = 'available' WHERE id = ?", [p.bed_id]);
    hAudit(user, "cleaned", "inpatient", p.bed_id, "Bed cleaned and returned to service");
    return json({ ok: true });
  }

  return json({ error: "Unknown action" }, 422);
});

export const dynamic = "force-dynamic";
