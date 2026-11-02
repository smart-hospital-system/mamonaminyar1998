import { requireUser, logActivity, notify } from "@/lib/auth";
import { body, json, qp, route } from "@/lib/api";
import { createBooking, availability, type CreateBookingInput } from "@/lib/bookings";
import { listBookings, getBooking, bookingStatusCounts } from "@/lib/queries";
import { run, get } from "@/lib/db";

export const GET = route(async (req) => {
  await requireUser();
  const p = qp(req);
  const result = listBookings({
    q: p.get("q") ?? undefined,
    status: p.get("status") ?? undefined,
    payment_status: p.get("payment_status") ?? undefined,
    staff_id: p.get("staff_id") ?? undefined,
    customer_id: p.get("customer_id") ?? undefined,
    service_id: p.get("service_id") ?? undefined,
    source: p.get("source") ?? undefined,
    date: p.get("date") ?? undefined,
    from: p.get("from") ?? undefined,
    to: p.get("to") ?? undefined,
    sort: p.get("sort") ?? undefined,
    limit: p.get("limit") ? Number(p.get("limit")) : undefined,
    offset: p.get("offset") ? Number(p.get("offset")) : undefined,
  });
  return json({ ...result, counts: bookingStatusCounts() });
});

export const POST = route(async (req) => {
  const user = await requireUser(["owner", "manager", "staff"]);
  const input = await body<CreateBookingInput>(req);

  if (!input.customer_id) {
    // create the customer inline (walk-in / phone booking)
    const c = input as unknown as { customer_name?: string; customer_email?: string; customer_phone?: string };
    if (!c.customer_name) return json({ error: "A customer is required" }, 422);
    const id = `cus_${Date.now().toString(36)}`;
    run(
      `INSERT INTO customers (id, name, email, phone, notes, tags, loyalty_points, vip, marketing_opt_in, visits, total_spent, created_at)
       VALUES (?,?,?,?,?, '[]', 0, 0, 1, 0, 0, ?)`,
      [id, c.customer_name, c.customer_email ?? null, c.customer_phone ?? null, null, new Date().toISOString()]
    );
    input.customer_id = id;
  }

  if (!input.service_id || !input.staff_id || !input.start_at) {
    return json({ error: "Service, staff member and start time are required" }, 422);
  }

  const result = createBooking({ ...input, created_by: user.id });
  const booking = getBooking(result.ids[0]);
  logActivity(
    user,
    "created",
    "booking",
    result.ids[0],
    `Booked ${booking?.service_name ?? "a service"} for ${booking?.customer_name ?? "a client"} on ${new Date(input.start_at).toLocaleString("en-SG", { timeZone: "Asia/Singapore" })}`
  );
  notify({
    type: "booking",
    title: "Booking confirmed",
    body: `${booking?.customer_name} — ${booking?.service_name} with ${booking?.staff_name}`,
    link: "/dashboard/bookings",
  });
  return json({ ok: true, ...result, booking }, 201);
});
