import { requireUser, logActivity, hashPassword } from "@/lib/auth";
import { body, json, route } from "@/lib/api";
import { listStaff } from "@/lib/queries";
import { run, uid, transaction } from "@/lib/db";
import { generateInsights } from "@/lib/ai";

export const GET = route(async () => {
  await requireUser();
  return json({ items: listStaff(true), insights: generateInsights().slice(0, 2) });
});

export const POST = route(async (req) => {
  const user = await requireUser(["owner", "manager"]);
  const p = await body<{
    name?: string; email?: string; phone?: string; title?: string; bio?: string; color?: string;
    hourly_rate?: number; specialties?: string[]; service_ids?: string[]; role?: string;
    password?: string; create_login?: boolean;
  }>(req);
  if (!p.name?.trim()) return json({ error: "A staff name is required" }, 422);
  const id = uid("stf");

  transaction(() => {
    run(
      `INSERT INTO staff (id, name, email, phone, title, avatar_color, bio, specialties, rating, hourly_rate, active, created_at)
       VALUES (?,?,?,?,?,?,?,?,5,?,1,?)`,
      [
        id,
        p.name!.trim(),
        p.email || null,
        p.phone || null,
        p.title || null,
        p.color || "#6366f1",
        p.bio || null,
        JSON.stringify(p.specialties ?? []),
        Number(p.hourly_rate ?? 40),
        new Date().toISOString(),
      ]
    );
    for (let wd = 0; wd < 7; wd++) {
      run(
        "INSERT INTO staff_schedules (id, staff_id, weekday, start_time, end_time, is_working) VALUES (?,?,?,?,?,?)",
        [uid("sch"), id, wd, "09:00", "18:00", wd === 0 ? 0 : 1]
      );
    }
    for (const sid of p.service_ids ?? []) {
      run("INSERT INTO staff_services (staff_id, service_id) VALUES (?,?)", [id, sid]);
    }
    if (p.email && p.create_login !== false) {
      const exists = run("SELECT 1 FROM users WHERE lower(email) = lower(?)", [p.email]);
      void exists;
      run(
        "INSERT INTO users (id, email, password_hash, name, role, staff_id, active, created_at) VALUES (?,?,?,?,?,?,1,?)",
        [uid("usr"), p.email, hashPassword(p.password || "slotly123"), p.name!, p.role || "staff", id, new Date().toISOString()]
      );
    }
  });

  logActivity(user, "created", "staff", id, `Added team member ${p.name}`);
  return json({ ok: true, id, items: listStaff(true) }, 201);
});
