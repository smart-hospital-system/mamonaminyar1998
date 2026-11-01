import { body, json, qp, route } from "@/lib/api";
import { requireHmsApi } from "@/lib/hms/auth";
import { hAudit, hNow, hRun, hUid } from "@/lib/hms/db";
import { listLabOrders } from "@/lib/hms/queries";

export const GET = route(async (req) => {
  await requireHmsApi();
  const p = qp(req);
  return json({ items: listLabOrders({ status: p.get("status") ?? undefined, q: p.get("q") ?? undefined }) });
});

export const POST = route(async (req) => {
  const user = await requireHmsApi(["admin", "doctor"]);
  const p = await body<{ patient_id?: string; panel?: string; test_name?: string; priority?: string; sample_type?: string; price?: number; encounter_id?: string }>(req);
  if (!p.patient_id || !p.test_name) return json({ error: "Patient and test are required." }, 422);
  const id = hUid("lab");
  hRun(
    `INSERT INTO hms_lab_orders (id, patient_id, encounter_id, ordered_by, panel, test_name, priority, status, sample_type, price, created_at)
     VALUES (?,?,?,?,?,?,?, 'ordered', ?, ?, ?)`,
    [id, p.patient_id, p.encounter_id ?? null, user.id, p.panel ?? "General", p.test_name, p.priority ?? "routine", p.sample_type ?? "Serum", Number(p.price ?? 15), hNow()]
  );
  hAudit(user, "ordered", "lab", id, `Ordered ${p.test_name}`);
  return json({ ok: true, id }, 201);
});

export const dynamic = "force-dynamic";
