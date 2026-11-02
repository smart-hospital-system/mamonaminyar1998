import { requireUser, logActivity } from "@/lib/auth";
import { body, fail, json, route } from "@/lib/api";
import { getCustomer, customerBookings, customerPayments } from "@/lib/queries";
import { run } from "@/lib/db";

export const GET = route<{ id: string }>(async (_req, { params }) => {
  await requireUser();
  const { id } = await params;
  const customer = getCustomer(id);
  if (!customer) return fail("Customer not found", 404);
  return json({
    customer,
    bookings: customerBookings(id),
    payments: customerPayments(id),
    stats: {
      visits: customer.visits,
      spent: customer.total_spent,
      avgTicket: customer.visits ? Math.round((customer.total_spent / customer.visits) * 100) / 100 : 0,
      loyalty: customer.loyalty_points,
    },
  });
});

export const PATCH = route<{ id: string }>(async (req, { params }) => {
  const user = await requireUser();
  const { id } = await params;
  const current = getCustomer(id);
  if (!current) return fail("Customer not found", 404);
  const p = await body<Record<string, unknown>>(req);
  run(
    `UPDATE customers SET name = ?, email = ?, phone = ?, dob = ?, notes = ?, preferences = ?, tags = ?, vip = ?,
      marketing_opt_in = ?, loyalty_points = ? WHERE id = ?`,
    [
      (p.name as string) ?? current.name,
      p.email !== undefined ? ((p.email as string) || null) : current.email,
      p.phone !== undefined ? ((p.phone as string) || null) : current.phone,
      p.dob !== undefined ? ((p.dob as string) || null) : current.dob,
      p.notes !== undefined ? ((p.notes as string) || null) : current.notes,
      p.preferences !== undefined ? ((p.preferences as string) || null) : current.preferences,
      p.tags !== undefined ? JSON.stringify(p.tags) : current.tags,
      p.vip !== undefined ? (p.vip ? 1 : 0) : current.vip,
      p.marketing_opt_in !== undefined ? (p.marketing_opt_in ? 1 : 0) : current.marketing_opt_in,
      p.loyalty_points !== undefined ? Number(p.loyalty_points) : current.loyalty_points,
      id,
    ]
  );
  logActivity(user, "updated", "customer", id, `Updated ${current.name}'s profile`);
  return json({ ok: true, customer: getCustomer(id) });
});

export const DELETE = route<{ id: string }>(async (_req, { params }) => {
  const user = await requireUser(["owner", "manager"]);
  const { id } = await params;
  const current = getCustomer(id);
  if (!current) return fail("Customer not found", 404);
  run("DELETE FROM bookings WHERE customer_id = ?", [id]);
  run("DELETE FROM payments WHERE customer_id = ?", [id]);
  run("DELETE FROM reviews WHERE customer_id = ?", [id]);
  run("DELETE FROM waitlist WHERE customer_id = ?", [id]);
  run("DELETE FROM customers WHERE id = ?", [id]);
  logActivity(user, "deleted", "customer", id, `Deleted customer ${current.name} and their history`);
  return json({ ok: true });
});
