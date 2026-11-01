import { requireUser, logActivity } from "@/lib/auth";
import { body, fail, json, route } from "@/lib/api";
import { listServices } from "@/lib/queries";
import { get, run, transaction, uid } from "@/lib/db";

export const PATCH = route<{ id: string }>(async (req, { params }) => {
  const user = await requireUser(["owner", "manager"]);
  const { id } = await params;
  const current = get<Record<string, unknown>>("SELECT * FROM services WHERE id = ?", [id]);
  if (!current) return fail("Service not found", 404);
  const p = await body<Record<string, unknown>>(req);

  transaction(() => {
    run(
      `UPDATE services SET name = ?, category = ?, description = ?, duration_min = ?, price = ?, deposit = ?,
        color = ?, buffer_min = ?, active = ?, popular = ? WHERE id = ?`,
      [
        (p.name as string) ?? current.name,
        (p.category as string) ?? current.category,
        p.description !== undefined ? ((p.description as string) || null) : (current.description as string),
        p.duration_min !== undefined ? Number(p.duration_min) : Number(current.duration_min),
        p.price !== undefined ? Number(p.price) : Number(current.price),
        p.deposit !== undefined ? Number(p.deposit) : Number(current.deposit),
        (p.color as string) ?? current.color,
        p.buffer_min !== undefined ? Number(p.buffer_min) : Number(current.buffer_min),
        p.active !== undefined ? (p.active ? 1 : 0) : Number(current.active),
        p.popular !== undefined ? (p.popular ? 1 : 0) : Number(current.popular),
        id,
      ]
    );
    if (Array.isArray(p.staff_ids)) {
      run("DELETE FROM staff_services WHERE service_id = ?", [id]);
      for (const staffId of p.staff_ids as string[]) {
        run("INSERT INTO staff_services (staff_id, service_id) VALUES (?,?)", [staffId, id]);
      }
    }
    if (Array.isArray(p.addons)) {
      run("DELETE FROM service_addons WHERE service_id = ?", [id]);
      for (const a of p.addons as { name: string; price: number; duration_min?: number }[]) {
        run(
          "INSERT INTO service_addons (id, service_id, name, price, duration_min, active) VALUES (?,?,?,?,?,1)",
          [uid("add"), id, a.name, Number(a.price), Number(a.duration_min ?? 0)]
        );
      }
    }
  });

  logActivity(user, "updated", "service", id, `Updated service ${(p.name as string) ?? current.name}`);
  return json({ ok: true, items: listServices(true) });
});

export const DELETE = route<{ id: string }>(async (_req, { params }) => {
  const user = await requireUser(["owner"]);
  const { id } = await params;
  const current = get<{ name: string }>("SELECT name FROM services WHERE id = ?", [id]);
  if (!current) return fail("Service not found", 404);
  const upcoming = get<{ c: number }>(
    "SELECT COUNT(*) AS c FROM bookings WHERE service_id = ? AND start_at > ? AND status IN ('confirmed','pending')",
    [id, new Date().toISOString()]
  );
  if (Number(upcoming?.c ?? 0) > 0) {
    // soft delete to protect history and live bookings
    run("UPDATE services SET active = 0 WHERE id = ?", [id]);
    logActivity(user, "archived", "service", id, `Archived ${current.name} (has upcoming bookings)`);
    return json({ ok: true, archived: true });
  }
  run("DELETE FROM staff_services WHERE service_id = ?", [id]);
  run("DELETE FROM service_addons WHERE service_id = ?", [id]);
  run("DELETE FROM services WHERE id = ?", [id]);
  logActivity(user, "deleted", "service", id, `Deleted service ${current.name}`);
  return json({ ok: true });
});
