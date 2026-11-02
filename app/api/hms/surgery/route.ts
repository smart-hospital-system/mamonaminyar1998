import { body, json, route } from "@/lib/api";
import { requireHmsApi } from "@/lib/hms/auth";
import { hAudit, hNow, hRun, hUid , hGet} from "@/lib/hms/db";
import { listSurgeries } from "@/lib/hms/queries";

export const GET = route(async () => {
  await requireHmsApi();
  return json({ items: listSurgeries() });
});

export const POST = route(async (req) => {
  const user = await requireHmsApi(["admin", "doctor"]);
  const p = await body<{
    action?: "book" | "start" | "complete" | "cancel";
    id?: string; patient_id?: string; procedure_name?: string; theatre?: string; scheduled_at?: string;
    duration_min?: number; anesthesia?: string; notes?: string;
  }>(req);
  const action = p.action ?? "book";

  if (action === "book") {
    if (!p.patient_id || !p.procedure_name || !p.scheduled_at) return json({ error: "Patient, procedure and time are required." }, 422);
    const id = hUid("srg");
    hRun(
      `INSERT INTO hms_surgeries (id, patient_id, surgeon, procedure_name, theatre, scheduled_at, duration_min, status, anesthesia, notes, created_at)
       VALUES (?,?,?,?,?,?,?, 'scheduled', ?, ?, ?)`,
      [id, p.patient_id, user.id, p.procedure_name, p.theatre ?? "Theatre A", p.scheduled_at, Number(p.duration_min ?? 60), p.anesthesia ?? "General anaesthesia", p.notes ?? null, hNow()]
    );
    hAudit(user, "scheduled", "surgery", id, `Scheduled ${p.procedure_name} in ${p.theatre ?? "Theatre A"}`);
    return json({ ok: true, id }, 201);
  }

  if (!p.id) return json({ error: "Case id is required." }, 422);
  if (!hGet<{ id: string }>("SELECT id FROM hms_surgeries WHERE id = ?", [p.id])) return json({ error: "Surgical case not found." }, 404);
  const status = action === "start" ? "in_progress" : action === "complete" ? "completed" : "cancelled";
  hRun("UPDATE hms_surgeries SET status = ?, notes = COALESCE(?, notes) WHERE id = ?", [status, p.notes ?? null, p.id]);
  hAudit(user, "updated", "surgery", p.id, `Set surgical case to ${status.replace("_", " ")}`);
  return json({ ok: true });
});

export const dynamic = "force-dynamic";
