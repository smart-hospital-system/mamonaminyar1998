import { body, json, route } from "@/lib/api";
import { requireHmsApi } from "@/lib/hms/auth";
import { hAudit, hNow, hRun, hUid } from "@/lib/hms/db";
import { listEncounters } from "@/lib/hms/queries";
import { triage } from "@/lib/hms/ai";

export const GET = route(async () => {
  await requireHmsApi();
  return json({ items: listEncounters(40) });
});

export const POST = route(async (req) => {
  const user = await requireHmsApi(["admin", "doctor"]);
  const p = await body<{
    patient_id?: string; appointment_id?: string; diagnosis?: string; icd10?: string;
    summary?: string; vitals?: Record<string, unknown>; visit_type?: string;
  }>(req);
  if (!p.patient_id) return json({ error: "A patient is required." }, 422);
  const t = triage((p.vitals ?? {}) as never);
  const id = hUid("enc");
  hRun(
    `INSERT INTO hms_encounters (id, patient_id, doctor_id, department, visit_type, diagnosis, icd10, summary, vitals, status, created_at)
     VALUES (?,?,?,?,?,?,?,?,?, 'closed', ?)`,
    [
      id, p.patient_id, user.id, user.department ?? "OPD", p.visit_type ?? "new", p.diagnosis ?? null,
      p.icd10 ?? null, p.summary ?? null, JSON.stringify({ ...(p.vitals ?? {}), triage: t.score }), hNow(),
    ]
  );
  if (p.appointment_id) hRun("UPDATE hms_appointments SET status = 'completed' WHERE id = ?", [p.appointment_id]);
  hAudit(user, "created", "encounter", id, `Documented a consult (triage score ${t.score})`);
  return json({ ok: true, id, triage: t }, 201);
});

export const dynamic = "force-dynamic";
