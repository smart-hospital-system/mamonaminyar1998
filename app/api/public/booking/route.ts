import { body, json, route } from "@/lib/api";
import { availability, createBooking } from "@/lib/bookings";
import { get, run } from "@/lib/db";
import { todayKey, addDaysKey } from "@/lib/utils";
import { publicServices as allServices, publicStaff as allStaff, publicDays } from "@/lib/public-booking";

/** Public booking widget — no session required. */
export const GET = route(async (req) => {
  const p = new URL(req.url).searchParams;
  const serviceId = p.get("service_id");
  const date = p.get("date") ?? todayKey();
  const services = allServices();
  if (!serviceId) {
    return json({
      services,
      staff: allStaff(),
      days: publicDays(),
    });
  }
  const slots = availability({ dateKey: date, serviceId, staffId: p.get("staff_id") || null });
  return json({
    services,
    staff: allStaff(),
    date,
    slots,
    days: Array.from({ length: 14 }, (_, i) => {
      const key = addDaysKey(todayKey(), i);
      return { date: key, count: availability({ dateKey: key, serviceId, staffId: p.get("staff_id") || null }).length };
    }),
  });
});

export const POST = route(async (req) => {
  const p = await body<{
    service_id?: string; staff_id?: string; start_at?: string;
    name?: string; email?: string; phone?: string; notes?: string;
  }>(req);
  if (!p.service_id || !p.start_at || !p.name) {
    return json({ error: "Please choose a service, time and enter your name." }, 422);
  }
  let customer = p.email
    ? get<{ id: string }>("SELECT id FROM customers WHERE lower(email) = lower(?)", [p.email])
    : p.phone
      ? get<{ id: string }>("SELECT id FROM customers WHERE phone = ?", [p.phone])
      : undefined;

  let customerId = customer?.id;
  if (!customerId) {
    customerId = `cus_${Date.now().toString(36)}`;
    run(
      `INSERT INTO customers (id, name, email, phone, notes, preferences, tags, loyalty_points, vip, marketing_opt_in, visits, total_spent, created_at)
       VALUES (?,?,?,?,?,NULL,'[]',0,0,1,0,0,?)`,
      [customerId, p.name, p.email ?? null, p.phone ?? null, p.notes ?? null, new Date().toISOString()]
    );
  }

  const staffId =
    p.staff_id ||
    availability({ dateKey: p.start_at.slice(0, 10), serviceId: p.service_id })[0]?.staff_id;
  if (!staffId) return json({ error: "That time is no longer available." }, 409);

  const result = createBooking({
    customer_id: customerId,
    service_id: p.service_id,
    staff_id: staffId,
    start_at: p.start_at,
    notes: p.notes ?? null,
    source: "online",
    status: "pending",
  });

  return json({ ok: true, booking_id: result.ids[0], price: result.price }, 201);
});

export const dynamic = "force-dynamic";

