import { requireUser, logActivity } from "@/lib/auth";
import { body, json, route } from "@/lib/api";
import { listServices } from "@/lib/queries";
import { run, uid, transaction } from "@/lib/db";

export const GET = route(async () => {
  await requireUser();
  return json({ items: listServices(true) });
});

type ServicePayload = {
  name?: string;
  category?: string;
  description?: string;
  duration_min?: number;
  price?: number;
  deposit?: number;
  color?: string;
  buffer_min?: number;
  active?: boolean;
  popular?: boolean;
  staff_ids?: string[];
  addons?: { id?: string; name: string; price: number; duration_min?: number }[];
};

export const POST = route(async (req) => {
  const user = await requireUser(["owner", "manager"]);
  const p = await body<ServicePayload>(req);
  if (!p.name?.trim()) return json({ error: "A service name is required" }, 422);
  const id = uid("svc");
  const now = new Date().toISOString();

  transaction(() => {
    run(
      `INSERT INTO services (id, name, category, description, duration_min, price, deposit, color, buffer_min, active, popular, created_at)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`,
      [
        id,
        p.name!.trim(),
        p.category || "General",
        p.description || null,
        Number(p.duration_min ?? 60),
        Number(p.price ?? 0),
        Number(p.deposit ?? 0),
        p.color || "#6366f1",
        Number(p.buffer_min ?? 10),
        p.active === false ? 0 : 1,
        p.popular ? 1 : 0,
        now,
      ]
    );
    for (const staffId of p.staff_ids ?? []) {
      run("INSERT INTO staff_services (staff_id, service_id) VALUES (?,?)", [staffId, id]);
    }
    for (const a of p.addons ?? []) {
      run(
        "INSERT INTO service_addons (id, service_id, name, price, duration_min, active) VALUES (?,?,?,?,?,1)",
        [uid("add"), id, a.name, Number(a.price), Number(a.duration_min ?? 0)]
      );
    }
  });

  logActivity(user, "created", "service", id, `Added service ${p.name}`);
  return json({ ok: true, id, items: listServices(true) }, 201);
});
