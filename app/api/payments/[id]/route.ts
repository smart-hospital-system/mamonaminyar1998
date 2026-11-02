import { requireUser, logActivity } from "@/lib/auth";
import { body, fail, json, route } from "@/lib/api";
import { get, run } from "@/lib/db";

export const PATCH = route<{ id: string }>(async (req, { params }) => {
  const user = await requireUser(["owner", "manager"]);
  const { id } = await params;
  const payment = get<{ total: number; refunded_amount: number; booking_id: string | null; invoice_no: string; customer_id: string }>(
    "SELECT * FROM payments WHERE id = ?",
    [id]
  );
  if (!payment) return fail("Payment not found", 404);
  const p = await body<{ action?: string; amount?: number; status?: string; notes?: string }>(req);

  if (p.action === "refund") {
    const amount = Math.min(Number(p.amount ?? payment.total), Number(payment.total));
    const refunded = Number(payment.refunded_amount) + amount;
    const status = refunded >= Number(payment.total) ? "refunded" : "partial_refund";
    run("UPDATE payments SET refunded_amount = ?, status = ? WHERE id = ?", [refunded, status, id]);
    if (payment.booking_id) {
      run("UPDATE bookings SET payment_status = ? WHERE id = ?", [status === "refunded" ? "refunded" : "partial", payment.booking_id]);
    }
    logActivity(user, "refunded", "payment", id, `Refunded S$${amount.toFixed(2)} on ${payment.invoice_no}`);
    return json({ ok: true, refunded });
  }

  run("UPDATE payments SET status = ?, notes = ? WHERE id = ?", [
    p.status ?? "paid",
    p.notes ?? null,
    id,
  ]);
  logActivity(user, "updated", "payment", id, `Updated payment ${payment.invoice_no}`);
  return json({ ok: true });
});

export const DELETE = route<{ id: string }>(async (_req, { params }) => {
  const user = await requireUser(["owner"]);
  const { id } = await params;
  const payment = get<{ invoice_no: string; booking_id: string | null }>("SELECT * FROM payments WHERE id = ?", [id]);
  if (!payment) return fail("Payment not found", 404);
  run("DELETE FROM payments WHERE id = ?", [id]);
  if (payment.booking_id) run("UPDATE bookings SET payment_status = 'unpaid' WHERE id = ?", [payment.booking_id]);
  logActivity(user, "deleted", "payment", id, `Deleted payment ${payment.invoice_no}`);
  return json({ ok: true });
});
