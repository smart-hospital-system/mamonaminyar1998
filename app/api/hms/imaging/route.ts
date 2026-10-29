import { body, json, qp, route } from "@/lib/api";
import { requireHmsApi } from "@/lib/hms/auth";
import { hAudit, hNow, hRun, hUid } from "@/lib/hms/db";
import { listImagingOrders } from "@/lib/hms/queries";

export const GET = route(async (req) => {
  await requireHmsApi();
  const p = qp(req);
  return json({ items: listImagingOrders({ status: p.get("status") ?? undefined, modality: p.get("modality") ?? undefined }) });
});

export const POST = route(async (req) => {
  const user = await requireHmsApi(["admin", "doctor"]);
  const p = await body<{ patient_id?: string; modality?: string; body_part?: string; priority?: string; price?: number; encounter_id?: string }>(req);
  if (!p.patient_id || !p.body_part) return json({ error: "Patient and body part are required." }, 422);
  const id = hUid("img");
  hRun(
    `INSERT INTO hms_imaging_orders (id, patient_id, encounter_id, ordered_by, modality, body_part, priority, status, price, created_at)
     VALUES (?,?,?,?,?,?,?, 'requested', ?, ?)`,
    [id, p.patient_id, p.encounter_id ?? null, user.id, p.modality ?? "X-Ray", p.body_part, p.priority ?? "routine", Number(p.price ?? 30), hNow()]
  );
  hAudit(user, "ordered", "imaging", id, `Ordered ${p.modality} — ${p.body_part}`);
  return json({ ok: true, id }, 201);
});

export const dynamic = "force-dynamic";
