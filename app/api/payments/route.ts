import { requireUser, logActivity } from "@/lib/auth";
import { body, json, qp, route } from "@/lib/api";
import { listPayments } from "@/lib/queries";
import { get, run, uid } from "@/lib/db";
import { invoiceNo } from "@/lib/utils";

export const GET = route(async (req) => {
  await requireUser();
  const p = qp(req);
  return json(
    listPayments({
      q: p.get("q") ?? undefined,
      status: p.get("status") ?? undefined,
      method: p.get("method") ?? undefined,
      from: p.get("from") ?? undefined,
      to: p.get("to") ?? undefined,
      limit: p.get("limit") ? Number(p.get("limit")) : undefined,
    })
  );
});

export const POST = route(async (req) => {
  const user = await requireUser(["owner", "manager"]);
  const p = await body<{
    booking_id?: string; customer_id?: string; amount?: number; tip?: number;
    method?: string; status?: string; notes?: string;
  }>(req);

  let customerId = p.customer_id;
  let amount = Number(p.amount ?? 0);
  if (p.booking_id) {
    const booking = get<{ customer_id: string; price: number; payment_status: string }>(
      "SELECT * FROM bookings WHERE id = ?",
      [p.booking_id]
    );
    if (!booking) return json({ error: "Booking not found" }, 404);
    customerId = booking.customer_id;
    if (!amount) amount = Number(booking.price);
    run("UPDATE bookings SET payment_status = 'paid' WHERE id = ?", [p.booking_id]);
  }
  if (!customerId) return json({ error: "A customer is required" }, 422);

  const tip = Number(p.tip ?? 0);
  const total = amount + tip;
  const id = uid("pay");
  run(
    `INSERT INTO payments (id, booking_id, customer_id, invoice_no, amount, tip, tax, total, method, status,
      refunded_amount, paid_at, notes, created_at)
     VALUES (?,?,?,?,?,?,?,?,?,?,0,?,?,?)`,
    [
      id,
      p.booking_id ?? null,
      customerId,
      invoiceNo(),
      amount,
      tip,
      Math.round(((amount / 1.09) * 0.09) * 100) / 100,
      total,
      p.method ?? "card",
      p.status ?? "paid",
      p.status === "pending" ? null : new Date().toISOString(),
      p.notes ?? null,
      new Date().toISOString(),
    ]
  );
  const booking = p.booking_id ? get<{ customer_name: string }>("SELECT c.name AS customer_name FROM bookings b JOIN customers c ON c.id = b.customer_id WHERE b.id = ?", [p.booking_id]) : null;
  logActivity(user, "created", "payment", id, `Recorded ${p.method ?? "card"} payment of S$${total.toFixed(2)}${booking ? ` for ${booking.customer_name}` : ""}`);
  return json({ ok: true, id }, 201);
});
