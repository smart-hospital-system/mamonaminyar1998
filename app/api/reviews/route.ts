import { requireUser, logActivity } from "@/lib/auth";
import { body, json, qp, route } from "@/lib/api";
import { listReviews } from "@/lib/queries";
import { get, run, uid } from "@/lib/db";

export const GET = route(async (req) => {
  await requireUser();
  const p = qp(req);
  const items = listReviews({
    q: p.get("q") ?? undefined,
    rating: p.get("rating") ? Number(p.get("rating")) : undefined,
    staff_id: p.get("staff_id") ?? undefined,
    unreplied: p.get("unreplied") === "1",
  });
  const all = listReviews({});
  return json({
    items,
    summary: {
      average: all.length ? Math.round((all.reduce((a, b) => a + b.rating, 0) / all.length) * 10) / 10 : 0,
      count: all.length,
      unreplied: all.filter((r) => !r.reply).length,
      distribution: [5, 4, 3, 2, 1].map((star) => ({ star, count: all.filter((r) => r.rating === star).length })),
    },
  });
});

export const POST = route(async (req) => {
  const user = await requireUser();
  const p = await body<{ booking_id?: string; customer_id?: string; staff_id?: string; rating?: number; comment?: string }>(req);
  if (!p.rating) return json({ error: "A rating is required" }, 422);
  let customerId = p.customer_id;
  let staffId = p.staff_id;
  if (p.booking_id) {
    const b = get<{ customer_id: string; staff_id: string }>("SELECT * FROM bookings WHERE id = ?", [p.booking_id]);
    customerId = customerId ?? b?.customer_id;
    staffId = staffId ?? b?.staff_id;
  }
  if (!customerId) return json({ error: "A customer is required" }, 422);
  const id = uid("rev");
  run(
    "INSERT INTO reviews (id, booking_id, customer_id, staff_id, rating, comment, reply, tags, created_at) VALUES (?,?,?,?,?,?,NULL,'[]',?)",
    [id, p.booking_id ?? null, customerId, staffId ?? null, Number(p.rating), p.comment ?? null, new Date().toISOString()]
  );
  logActivity(user, "created", "review", id, `Logged a ${p.rating}★ review`);
  return json({ ok: true, id }, 201);
});
