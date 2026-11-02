import { all, get, run, uid, nowIso } from "./db";
import { HttpError } from "./auth";
import { addDaysKey, bookingCode, dateKey, minutesBetween, toIso, addMinutes, todayKey } from "./utils";

export type Slot = {
  start_at: string;
  end_at: string;
  time: string;
  staff_id: string;
  staff_name: string;
  staff_color: string | null;
  score?: number;
};

export function availability(opts: {
  dateKey: string;
  serviceId: string;
  staffId?: string | null;
  interval?: number;
  ignoreBookingId?: string | null;
}): Slot[] {
  const { dateKey: dk, serviceId } = opts;
  const interval = opts.interval ?? 15;
  const service = get<{
    id: string; duration_min: number; buffer_min: number; name: string;
  }>("SELECT id, duration_min, buffer_min, name FROM services WHERE id = ?", [serviceId]);
  if (!service) throw new HttpError(404, "Service not found");

  const weekday = new Date(`${dk}T00:00:00Z`).getUTCDay();
  const staffRows = all<{ id: string; name: string; avatar_color: string | null }>(
    opts.staffId
      ? `SELECT st.id, st.name, st.avatar_color FROM staff st
         JOIN staff_services ss ON ss.staff_id = st.id AND ss.service_id = ?
         WHERE st.active = 1 AND st.id = ?`
      : `SELECT st.id, st.name, st.avatar_color FROM staff st
         JOIN staff_services ss ON ss.staff_id = st.id AND ss.service_id = ?
         WHERE st.active = 1`,
    opts.staffId ? [serviceId, opts.staffId] : [serviceId]
  );

  const dayStart = toIso(dk, "00:00");
  const dayEnd = toIso(addDaysKey(dk, 1), "00:00");

  const out: Slot[] = [];
  for (const st of staffRows) {
    const sched = get<{ start_time: string; end_time: string; is_working: number }>(
      "SELECT * FROM staff_schedules WHERE staff_id = ? AND weekday = ?",
      [st.id, weekday]
    );
    if (!sched || !sched.is_working) continue;

    const timeOff = get<{ id: string }>(
      "SELECT id FROM staff_time_off WHERE staff_id = ? AND status = 'approved' AND start_date <= ? AND end_date >= ?",
      [st.id, dk, dk]
    );
    if (timeOff) continue;

    const bookings = all<{ start_at: string; end_at: string }>(
      `SELECT start_at, end_at FROM bookings
       WHERE staff_id = ? AND start_at >= ? AND start_at < ? AND status IN ('confirmed','pending','completed')
       ${opts.ignoreBookingId ? "AND id != ?" : ""}`,
      opts.ignoreBookingId
        ? [st.id, dayStart, dayEnd, opts.ignoreBookingId]
        : [st.id, dayStart, dayEnd]
    );

    const openMin = toMinutes(sched.start_time);
    const closeMin = toMinutes(sched.end_time);
    const duration = service.duration_min;

    for (let m = openMin; m + duration <= closeMin; m += interval) {
      const startIso = toIso(dk, `${pad(Math.floor(m / 60))}:${pad(m % 60)}`);
      const endIso = addMinutes(startIso, duration);
      const conflict = bookings.some(
        (b) =>
          new Date(startIso).getTime() < new Date(b.end_at).getTime() &&
          new Date(endIso).getTime() + service.buffer_min * 60_000 > new Date(b.start_at).getTime()
      );
      if (conflict) continue;
      out.push({
        start_at: startIso,
        end_at: endIso,
        time: `${pad(Math.floor(m / 60))}:${pad(m % 60)}`,
        staff_id: st.id,
        staff_name: st.name,
        staff_color: st.avatar_color,
      });
    }
  }
  // de-duplicate by (time, staff), sort by time then staff
  const seen = new Set<string>();
  return out
    .filter((s) => {
      const k = `${s.time}|${s.staff_id}`;
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    })
    .sort((a, b) => (a.start_at === b.start_at ? a.staff_name.localeCompare(b.staff_name) : a.start_at.localeCompare(b.start_at)));
}

function pad(n: number) {
  return String(n).padStart(2, "0");
}
function toMinutes(t: string) {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}

export function findConflict(staffId: string, startIso: string, endIso: string, ignoreId?: string | null) {
  return get<{ id: string; code: string }>(
    `SELECT id, code FROM bookings
     WHERE staff_id = ? AND status IN ('confirmed','pending','completed')
       AND start_at < ? AND end_at > ?
       ${ignoreId ? "AND id != ?" : ""}
     LIMIT 1`,
    ignoreId ? [staffId, endIso, startIso, ignoreId] : [staffId, endIso, startIso]
  );
}

export type CreateBookingInput = {
  customer_id: string;
  service_id: string;
  staff_id: string;
  start_at: string;
  addons?: { name: string; price: number }[];
  notes?: string | null;
  internal_notes?: string | null;
  source?: string;
  recurring_rule?: string | null;
  recurring_count?: number;
  status?: string;
  payment_status?: string;
  created_by?: string | null;
};

export function createBooking(input: CreateBookingInput) {
  const service = get<{ id: string; duration_min: number; price: number; buffer_min: number }>(
    "SELECT * FROM services WHERE id = ?",
    [input.service_id]
  );
  if (!service) throw new HttpError(404, "Service not found");
  const customer = get<{ id: string; name: string }>("SELECT id, name FROM customers WHERE id = ?", [input.customer_id]);
  if (!customer) throw new HttpError(404, "Customer not found");

  const addons = input.addons ?? [];
  const addonTotal = addons.reduce((a, b) => a + Number(b.price || 0), 0);
  const addonMinutes = addons.reduce((a, b) => a + Number((b as { duration_min?: number }).duration_min || 0), 0);
  const totalDuration = service.duration_min + addonMinutes;
  const price = service.price + addonTotal;

  const recurring = input.recurring_rule && input.recurring_rule !== "none" ? input.recurring_rule : null;
  const count = recurring ? Math.min(Math.max(Number(input.recurring_count ?? 4), 2), 12) : 1;

  const startDates: string[] = [];
  let cursor = input.start_at;
  for (let i = 0; i < count; i++) {
    startDates.push(cursor);
    if (recurring === "weekly") cursor = addMinutes(cursor, 7 * 24 * 60);
    else if (recurring === "biweekly") cursor = addMinutes(cursor, 14 * 24 * 60);
    else if (recurring === "monthly") {
      const d = new Date(cursor);
      d.setUTCMonth(d.getUTCMonth() + 1);
      cursor = d.toISOString();
    }
  }

  // conflict validation across all occurrences (skip past ones for recurrences)
  const conflicts: string[] = [];
  for (const start of startDates) {
    const end = addMinutes(start, totalDuration);
    const conflict = findConflict(input.staff_id, start, end);
    if (conflict) conflicts.push(start);
  }
  if (conflicts.length) {
    throw new HttpError(
      409,
      conflicts.length === 1
        ? "That time is no longer available — someone else just booked it."
        : `${conflicts.length} of the recurring slots are already booked.`
    );
  }

  const created: string[] = [];
  const parentId = uid("bkg");
  startDates.forEach((start, i) => {
    const id = i === 0 ? parentId : uid("bkg");
    const end = addMinutes(start, totalDuration);
    const ts = nowIso();
    run(
      `INSERT INTO bookings (id, code, customer_id, staff_id, service_id, addons, start_at, end_at, status,
        payment_status, price, notes, internal_notes, source, recurring_rule, parent_id, reminder_sent,
        cancelled_reason, created_at, updated_at)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,0,NULL,?,?)`,
      [
        id,
        bookingCode(),
        input.customer_id,
        input.staff_id,
        input.service_id,
        JSON.stringify(addons),
        start,
        end,
        input.status ?? "confirmed",
        input.payment_status ?? "unpaid",
        price,
        input.notes ?? null,
        input.internal_notes ?? null,
        input.source ?? "online",
        i === 0 ? recurring : null,
        i === 0 ? null : parentId,
        ts,
        ts,
      ]
    );
    created.push(id);
  });

  return { ids: created, price, duration: totalDuration, count };
}

export function cancelBooking(id: string, reason?: string | null) {
  const booking = get<{ id: string; start_at: string; customer_id: string; price: number }>(
    "SELECT * FROM bookings WHERE id = ?",
    [id]
  );
  if (!booking) throw new HttpError(404, "Booking not found");
  if (new Date(booking.start_at).getTime() < Date.now() - 864e5) {
    // still allow, but note it
  }
  run("UPDATE bookings SET status = 'cancelled', cancelled_reason = ?, updated_at = ? WHERE id = ?", [
    reason ?? "Cancelled from dashboard",
    nowIso(),
    id,
  ]);
  run("UPDATE payments SET status = 'refunded' WHERE booking_id = ? AND status = 'paid'", [id]);
  return booking;
}

export function completeBooking(id: string, opts?: { tip?: number; method?: string; markPaid?: boolean }) {
  const booking = get<{
    id: string; start_at: string; customer_id: string; price: number; staff_id: string; service_id: string;
  }>("SELECT * FROM bookings WHERE id = ?", [id]);
  if (!booking) throw new HttpError(404, "Booking not found");

  const ts = nowIso();
  run("UPDATE bookings SET status = 'completed', updated_at = ? WHERE id = ?", [ts, id]);
  const customer = get<{ visits: number; total_spent: number; loyalty_points: number }>(
    "SELECT visits, total_spent, loyalty_points FROM customers WHERE id = ?",
    [booking.customer_id]
  );
  if (customer) {
    run(
      "UPDATE customers SET visits = ?, total_spent = ?, loyalty_points = ?, last_visit_at = ? WHERE id = ?",
      [
        Number(customer.visits) + 1,
        Math.round((Number(customer.total_spent) + Number(booking.price)) * 100) / 100,
        Number(customer.loyalty_points) + Math.round(Number(booking.price) / 10),
        ts,
        booking.customer_id,
      ]
    );
  }
  if (opts?.markPaid !== false) {
    const tip = Number(opts?.tip ?? 0);
    const total = Number(booking.price) + tip;
    run("UPDATE bookings SET payment_status = 'paid' WHERE id = ?", [id]);
    run(
      `INSERT INTO payments (id, booking_id, customer_id, invoice_no, amount, tip, tax, total, method, status,
        refunded_amount, paid_at, notes, created_at)
       VALUES (?,?,?,?,?,?,?,?,?, 'paid', 0, ?, NULL, ?)`,
      [
        uid("pay"),
        id,
        booking.customer_id,
        `INV-${new Date().getFullYear()}-${Math.floor(Math.random() * 9000 + 1000)}`,
        booking.price,
        tip,
        Math.round(((booking.price / 1.09) * 0.09) * 100) / 100,
        total,
        opts?.method ?? "card",
        ts,
        ts,
      ]
    );
  }
  return booking;
}

/** AI-friendly: score each staff member for a candidate slot */
export function scoreStaffForSlot(serviceId: string, startIso: string) {
  const service = get<{ duration_min: number; category: string }>("SELECT * FROM services WHERE id = ?", [serviceId]);
  if (!service) return [];
  const endIso = addMinutes(startIso, service.duration_min);
  const dk = dateKey(startIso);
  const weekday = new Date(`${dk}T00:00:00Z`).getUTCDay();
  const staff = all<{
    id: string; name: string; title: string; avatar_color: string; rating: number;
    start_time: string; end_time: string;
  }>(
    `SELECT st.id, st.name, st.title, st.avatar_color, st.rating, sc.start_time, sc.end_time
     FROM staff st
     JOIN staff_services ss ON ss.staff_id = st.id AND ss.service_id = ?
     JOIN staff_schedules sc ON sc.staff_id = st.id AND sc.weekday = ? AND sc.is_working = 1
     WHERE st.active = 1`,
    [serviceId, weekday]
  );
  const startMin = new Date(startIso).getUTCHours() * 60 + new Date(startIso).getUTCMinutes();
  const adjustMin = (startMin + 8 * 60) % (24 * 60);
  return staff
    .map((s) => {
      const conflict = findConflict(s.id, startIso, endIso);
      const withinShift = adjustMin >= toMinutes(s.start_time) && adjustMin + service.duration_min <= toMinutes(s.end_time);
      const load = get<{ n: number }>(
        "SELECT COUNT(*) AS n FROM bookings WHERE staff_id = ? AND start_at >= ? AND start_at < ? AND status != 'cancelled'",
        [s.id, toIso(dk, "00:00"), toIso(addDaysKey(dk, 1), "00:00")]
      );
      let score = Number(s.rating) * 12;
      score += withinShift ? 20 : -40;
      score -= conflict ? 100 : 0;
      score -= Math.min(20, Number(load?.n ?? 0) * 1.2);
      const reasons: string[] = [];
      if (!conflict && withinShift) reasons.push("Available for the full slot");
      if (Number(s.rating) >= 4.8) reasons.push(`${s.rating}★ customer rating`);
      if (Number(load?.n ?? 0) < 4) reasons.push("Light schedule today");
      if (conflict) reasons.push("Already booked");
      return {
        staff_id: s.id,
        name: s.name,
        title: s.title,
        color: s.avatar_color,
        rating: Number(s.rating),
        score: Math.round(score),
        available: !conflict && withinShift,
        bookingsToday: Number(load?.n ?? 0),
        reasons,
      };
    })
    .sort((a, b) => b.score - a.score);
}

export function tomorrowKey() {
  return addDaysKey(todayKey(), 1);
}

export { minutesBetween };
