import { requireUser, logActivity } from "@/lib/auth";
import { body, json, qp, route } from "@/lib/api";
import { listCustomers } from "@/lib/queries";
import { run, uid } from "@/lib/db";

export const GET = route(async (req) => {
  await requireUser();
  const p = qp(req);
  return json(
    listCustomers({
      q: p.get("q") ?? undefined,
      tag: p.get("tag") ?? undefined,
      sort: p.get("sort") ?? undefined,
      limit: p.get("limit") ? Number(p.get("limit")) : undefined,
      offset: p.get("offset") ? Number(p.get("offset")) : undefined,
    })
  );
});

export const POST = route(async (req) => {
  const user = await requireUser(["owner", "manager", "staff"]);
  const input = await body<{
    name?: string; email?: string; phone?: string; dob?: string; notes?: string;
    preferences?: string; tags?: string[]; vip?: boolean; marketing_opt_in?: boolean; loyalty_points?: number;
  }>(req);
  if (!input.name?.trim()) return json({ error: "A customer name is required" }, 422);
  const id = uid("cus");
  run(
    `INSERT INTO customers (id, name, email, phone, dob, notes, preferences, tags, loyalty_points, vip, marketing_opt_in, visits, total_spent, created_at)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,0,0,?)`,
    [
      id,
      input.name.trim(),
      input.email?.trim() || null,
      input.phone?.trim() || null,
      input.dob || null,
      input.notes || null,
      input.preferences || null,
      JSON.stringify(input.tags ?? []),
      Number(input.loyalty_points ?? 0),
      input.vip ? 1 : 0,
      input.marketing_opt_in === false ? 0 : 1,
      new Date().toISOString(),
    ]
  );
  logActivity(user, "created", "customer", id, `Added new customer ${input.name}`);
  return json({ ok: true, id }, 201);
});
