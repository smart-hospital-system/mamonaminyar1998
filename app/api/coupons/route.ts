import { requireUser, logActivity } from "@/lib/auth";
import { body, json, route } from "@/lib/api";
import { listCoupons } from "@/lib/queries";
import { run, uid } from "@/lib/db";

export const GET = route(async () => {
  await requireUser();
  return json({ items: listCoupons() });
});

export const POST = route(async (req) => {
  const user = await requireUser(["owner", "manager"]);
  const p = await body<{
    code?: string; description?: string; type?: string; value?: number; min_amount?: number;
    max_uses?: number; expires_at?: string;
  }>(req);
  if (!p.code?.trim()) return json({ error: "A coupon code is required" }, 422);
  const id = uid("cpn");
  run(
    `INSERT INTO coupons (id, code, description, type, value, min_amount, max_uses, uses, starts_at, expires_at, active, created_at)
     VALUES (?,?,?,?,?,?,?,0,?,?,1,?)`,
    [
      id,
      p.code.trim().toUpperCase(),
      p.description ?? null,
      p.type ?? "percent",
      Number(p.value ?? 10),
      Number(p.min_amount ?? 0),
      Number(p.max_uses ?? 100),
      new Date().toISOString(),
      p.expires_at ?? null,
      new Date().toISOString(),
    ]
  );
  logActivity(user, "created", "coupon", id, `Created coupon ${p.code.toUpperCase()}`);
  return json({ ok: true, id, items: listCoupons() }, 201);
});
