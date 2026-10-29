import { requireUser, logActivity } from "@/lib/auth";
import { body, fail, json, route } from "@/lib/api";
import { listStaff } from "@/lib/queries";
import { get, run, transaction } from "@/lib/db";
import { getStaffPerformance, rangeFor } from "@/lib/analytics";

export const GET = route<{ id: string }>(async (_req, { params }) => {
  await requireUser();
  const { id } = await params;
  const staff = listStaff(true).find((s) => s.id === id);
  if (!staff) return fail("Staff member not found", 404);
  const r = rangeFor(30);
  const perf = getStaffPerformance(r.fromIso, r.toIso).find((p) => p.id === id);
  return json({ staff, performance: perf ?? null });
});

export const PATCH = route<{ id: string }>(async (req, { params }) => {
  const user = await requireUser(["owner", "manager"]);
  const { id } = await params;
  const current = get<Record<string, unknown>>("SELECT * FROM staff WHERE id = ?", [id]);
  if (!current) return fail("Staff not found", 404);
  const p = await body<Record<string, unknown>>(req);

  transaction(() => {
    if (p.action === "time_off") {
      const t = p as unknown as { start_date: string; end_date: string; reason?: string };
      run(
        "INSERT INTO staff_time_off (id, staff_id, start_date, end_date, reason, status, created_at) VALUES (?,?,?,?,?, 'pending', ?)",
        [`toff_${Date.now().toString(36)}`, id, t.start_date, t.end_date, t.reason ?? null, new Date().toISOString()]
      );
      return;
    }
    run(
      `UPDATE staff SET name = ?, email = ?, phone = ?, title = ?, bio = ?, avatar_color = ?, hourly_rate = ?,
        specialties = ?, active = ? WHERE id = ?`,
      [
        (p.name as string) ?? current.name,
        p.email !== undefined ? ((p.email as string) || null) : (current.email as string),
        p.phone !== undefined ? ((p.phone as string) || null) : (current.phone as string),
        p.title !== undefined ? ((p.title as string) || null) : (current.title as string),
        p.bio !== undefined ? ((p.bio as string) || null) : (current.bio as string),
        (p.color as string) ?? (current.avatar_color as string),
        p.hourly_rate !== undefined ? Number(p.hourly_rate) : Number(current.hourly_rate),
        p.specialties !== undefined ? JSON.stringify(p.specialties) : (current.specialties as string),
        p.active !== undefined ? (p.active ? 1 : 0) : Number(current.active),
        id,
      ]
    );
    if (Array.isArray(p.service_ids)) {
      run("DELETE FROM staff_services WHERE staff_id = ?", [id]);
      for (const sid of p.service_ids as string[]) {
        run("INSERT INTO staff_services (staff_id, service_id) VALUES (?,?)", [id, sid]);
      }
    }
  });

  logActivity(user, "updated", "staff", id, `Updated ${(p.name as string) ?? current.name}'s profile`);
  return json({ ok: true, staff: listStaff(true).find((s) => s.id === id) });
});

export const DELETE = route<{ id: string }>(async (_req, { params }) => {
  const user = await requireUser(["owner"]);
  const { id } = await params;
  const staff = get<{ name: string }>("SELECT name FROM staff WHERE id = ?", [id]);
  if (!staff) return fail("Staff member not found", 404);
  const upcoming = get<{ c: number }>(
    "SELECT COUNT(*) AS c FROM bookings WHERE staff_id = ? AND start_at > ? AND status IN ('confirmed','pending')",
    [id, new Date().toISOString()]
  );
  if (Number(upcoming?.c ?? 0) > 0) {
    run("UPDATE staff SET active = 0 WHERE id = ?", [id]);
    run("UPDATE users SET active = 0 WHERE staff_id = ?", [id]);
    logActivity(user, "deactivated", "staff", id, `Deactivated ${staff.name} (has upcoming bookings)`);
    return json({ ok: true, archived: true });
  }
  run("DELETE FROM staff_services WHERE staff_id = ?", [id]);
  run("DELETE FROM staff_schedules WHERE staff_id = ?", [id]);
  run("DELETE FROM staff_time_off WHERE staff_id = ?", [id]);
  run("UPDATE users SET active = 0 WHERE staff_id = ?", [id]);
  run("UPDATE staff SET active = 0 WHERE id = ?", [id]);
  logActivity(user, "deactivated", "staff", id, `Archived ${staff.name}`);
  return json({ ok: true });
});
