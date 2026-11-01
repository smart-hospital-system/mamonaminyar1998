import { requireUser, logActivity } from "@/lib/auth";
import { body, fail, json, route } from "@/lib/api";
import { listWaitlist } from "@/lib/queries";
import { get, run } from "@/lib/db";

export const PATCH = route<{ id: string }>(async (req, { params }) => {
  const user = await requireUser();
  const { id } = await params;
  const entry = get<{ id: string; customer_id: string; service_id: string }>("SELECT * FROM waitlist WHERE id = ?", [id]);
  if (!entry) return fail("Waitlist entry not found", 404);
  const p = await body<Record<string, unknown>>(req);

  if (p.action === "notify") {
    // offer the next available slot and flag it
    run("UPDATE waitlist SET status = 'offered' WHERE id = ?", [id]);
    logActivity(user, "updated", "waitlist", id, "Offered an open slot to a waitlisted client");
    return json({ ok: true, items: listWaitlist() });
  }

  run(
    `UPDATE waitlist SET staff_id = ?, desired_from = ?, desired_to = ?, preferred_time = ?, notes = ?, status = ? WHERE id = ?`,
    [
      p.staff_id !== undefined ? ((p.staff_id as string) || null) : null,
      p.desired_from ?? null,
      p.desired_to ?? null,
      p.preferred_time ?? null,
      p.notes ?? null,
      (p.status as string) ?? "waiting",
      id,
    ]
  );
  logActivity(user, "updated", "waitlist", id, `Waitlist entry marked ${p.status}`);
  return json({ ok: true, items: listWaitlist() });
});

export const DELETE = route<{ id: string }>(async (_req, { params }) => {
  const user = await requireUser();
  const { id } = await params;
  run("DELETE FROM waitlist WHERE id = ?", [id]);
  logActivity(user, "deleted", "waitlist", id, "Removed a waitlist entry");
  return json({ ok: true, items: listWaitlist() });
});
