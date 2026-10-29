import { requireUser, logActivity } from "@/lib/auth";
import { body, json, route } from "@/lib/api";
import { listWaitlist } from "@/lib/queries";
import { run, uid } from "@/lib/db";

export const GET = route(async () => {
  await requireUser();
  const items = listWaitlist();
  return json({
    items,
    counts: {
      waiting: items.filter((i) => i.status === "waiting").length,
      offered: items.filter((i) => i.status === "offered").length,
      booked: items.filter((i) => i.status === "booked").length,
    },
  });
});

export const POST = route(async (req) => {
  const user = await requireUser();
  const p = await body<{
    customer_id?: string; service_id?: string; staff_id?: string;
    desired_from?: string; desired_to?: string; preferred_time?: string; notes?: string;
  }>(req);
  if (!p.customer_id || !p.service_id) return json({ error: "Customer and service are required" }, 422);
  const id = uid("wlt");
  run(
    `INSERT INTO waitlist (id, customer_id, service_id, staff_id, desired_from, desired_to, preferred_time, notes, status, created_at)
     VALUES (?,?,?,?,?,?,?,?, 'waiting', ?)`,
    [id, p.customer_id, p.service_id, p.staff_id ?? null, p.desired_from ?? null, p.desired_to ?? null, p.preferred_time ?? null, p.notes ?? null, new Date().toISOString()]
  );
  logActivity(user, "created", "waitlist", id, "Added a client to the waitlist");
  return json({ ok: true, id, items: listWaitlist() }, 201);
});
