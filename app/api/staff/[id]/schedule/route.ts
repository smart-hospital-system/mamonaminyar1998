import { requireUser, logActivity } from "@/lib/auth";
import { body, json, route } from "@/lib/api";
import { get, run, uid } from "@/lib/db";

export const PUT = route<{ id: string }>(async (req, { params }) => {
  const user = await requireUser(["owner", "manager"]);
  const { id } = await params;
  const { days } = await body<{ days: { weekday: number; start_time: string; end_time: string; is_working: boolean }[] }>(req);
  if (!Array.isArray(days)) return json({ error: "days array required" }, 422);

  for (const d of days) {
    const existing = get<{ id: string }>("SELECT id FROM staff_schedules WHERE staff_id = ? AND weekday = ?", [id, d.weekday]);
    if (existing) {
      run("UPDATE staff_schedules SET start_time = ?, end_time = ?, is_working = ? WHERE id = ?", [
        d.start_time,
        d.end_time,
        d.is_working ? 1 : 0,
        existing.id,
      ]);
    } else {
      run("INSERT INTO staff_schedules (id, staff_id, weekday, start_time, end_time, is_working) VALUES (?,?,?,?,?,?)", [
        uid("sch"),
        id,
        d.weekday,
        d.start_time,
        d.end_time,
        d.is_working ? 1 : 0,
      ]);
    }
  }
  const staff = get<{ name: string }>("SELECT name FROM staff WHERE id = ?", [id]);
  logActivity(user, "updated", "staff", id, `Updated weekly schedule for ${staff?.name ?? "staff"}`);
  return json({ ok: true });
});
