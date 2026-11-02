import { requireUser, logActivity, notify } from "@/lib/auth";
import { body, json, route } from "@/lib/api";
import { get, run, uid, all } from "@/lib/db";

export const GET = route(async () => {
  await requireUser();
  return json({
    items: all(
      `SELECT t.*, s.name AS staff_name, s.avatar_color FROM staff_time_off t
       JOIN staff s ON s.id = t.staff_id ORDER BY t.start_date`
    ),
  });
});

export const POST = route(async (req) => {
  const user = await requireUser();
  const p = await body<{ staff_id?: string; start_date?: string; end_date?: string; reason?: string }>(req);
  const staffId = p.staff_id || user.staff_id;
  if (!staffId || !p.start_date || !p.end_date) return json({ error: "Staff member and dates are required" }, 422);
  const id = uid("toff");
  run(
    "INSERT INTO staff_time_off (id, staff_id, start_date, end_date, reason, status, created_at) VALUES (?,?,?,?,?, 'pending', ?)",
    [id, staffId, p.start_date, p.end_date, p.reason ?? null, new Date().toISOString()]
  );
  const staff = get<{ name: string }>("SELECT name FROM staff WHERE id = ?", [staffId]);
  logActivity(user, "created", "staff", staffId, `Requested time off (${p.start_date} → ${p.end_date})`);
  notify({ type: "staff", title: "Time-off request", body: `${staff?.name} requested ${p.start_date} → ${p.end_date}`, link: "/dashboard/staff" });
  return json({ ok: true, id }, 201);
});

export const PATCH = route(async (req) => {
  const user = await requireUser(["owner", "manager"]);
  const p = await body<{ id?: string; status?: string }>(req);
  if (!p.id || !p.status) return json({ error: "id and status are required" }, 422);
  run("UPDATE staff_time_off SET status = ? WHERE id = ?", [p.status, p.id]);
  const row = get<{ staff_id: string; start_date: string; end_date: string }>("SELECT * FROM staff_time_off WHERE id = ?", [p.id]);
  if (row) logActivity(user, p.status === "approved" ? "approved" : "rejected", "staff", row.staff_id, `${p.status === "approved" ? "Approved" : "Declined"} time off for ${row.start_date} → ${row.end_date}`);
  return json({ ok: true });
});
