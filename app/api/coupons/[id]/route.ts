import { requireUser, logActivity } from "@/lib/auth";
import { body, fail, json, route } from "@/lib/api";
import { listCoupons } from "@/lib/queries";
import { get, run } from "@/lib/db";

export const PATCH = route<{ id: string }>(async (req, { params }) => {
  const user = await requireUser(["owner", "manager"]);
  const { id } = await params;
  const coupon = get<Record<string, unknown>>("SELECT * FROM coupons WHERE id = ?", [id]);
  if (!coupon) return fail("Coupon not found", 404);
  const p = await body<Record<string, unknown>>(req);
  run(
    `UPDATE coupons SET description = ?, type = ?, value = ?, min_amount = ?, max_uses = ?, expires_at = ?, active = ? WHERE id = ?`,
    [
      p.description !== undefined ? ((p.description as string) || null) : (coupon.description as string),
      (p.type as string) ?? (coupon.type as string),
      p.value !== undefined ? Number(p.value) : Number(coupon.value),
      p.min_amount !== undefined ? Number(p.min_amount) : Number(coupon.min_amount),
      p.max_uses !== undefined ? Number(p.max_uses) : Number(coupon.max_uses),
      p.expires_at !== undefined ? ((p.expires_at as string) || null) : (coupon.expires_at as string),
      p.active !== undefined ? (p.active ? 1 : 0) : Number(coupon.active),
      id,
    ]
  );
  logActivity(user, "updated", "coupon", id, `Updated coupon ${coupon.code}`);
  return json({ ok: true, items: listCoupons() });
});

export const DELETE = route<{ id: string }>(async (_req, { params }) => {
  const user = await requireUser(["owner", "manager"]);
  const { id } = await params;
  run("DELETE FROM coupons WHERE id = ?", [id]);
  logActivity(user, "deleted", "coupon", id, "Deleted a coupon");
  return json({ ok: true, items: listCoupons() });
});
