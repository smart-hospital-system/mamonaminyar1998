import { all, get } from "./db";
import type {
  ActivityLog, Addon, BookingFull, Campaign, Coupon, Customer, Notification,
  Payment, Review, Service, Staff, WaitlistEntry,
} from "./types";

const BOOKING_SELECT = `
  SELECT b.*, c.name AS customer_name, c.email AS customer_email, c.phone AS customer_phone, c.vip AS customer_vip,
         st.name AS staff_name, st.avatar_color AS staff_color,
         s.name AS service_name, s.category AS service_category, s.duration_min AS service_duration,
         s.color AS service_color
  FROM bookings b
  JOIN customers c ON c.id = b.customer_id
  JOIN staff st ON st.id = b.staff_id
  JOIN services s ON s.id = b.service_id`;

export type BookingFilters = {
  q?: string;
  status?: string;
  payment_status?: string;
  staff_id?: string;
  customer_id?: string;
  service_id?: string;
  date?: string;
  from?: string;
  to?: string;
  source?: string;
  sort?: string;
  limit?: number;
  offset?: number;
};

export function listBookings(f: BookingFilters = {}) {
  const where: string[] = ["1=1"];
  const params: unknown[] = [];
  if (f.q) {
    where.push("(c.name LIKE ? OR c.email LIKE ? OR c.phone LIKE ? OR b.code LIKE ? OR s.name LIKE ?)");
    const like = `%${f.q}%`;
    params.push(like, like, like, like, like);
  }
  if (f.status && f.status !== "all") {
    if (f.status === "upcoming") {
      where.push("b.status IN ('confirmed','pending') AND b.start_at > ?");
      params.push(new Date().toISOString());
    } else if (f.status.includes(",")) {
      where.push(`b.status IN (${f.status.split(",").map(() => "?").join(",")})`);
      params.push(...f.status.split(","));
    } else {
      where.push("b.status = ?");
      params.push(f.status);
    }
  }
  if (f.payment_status && f.payment_status !== "all") {
    where.push("b.payment_status = ?");
    params.push(f.payment_status);
  }
  if (f.staff_id) {
    where.push("b.staff_id = ?");
    params.push(f.staff_id);
  }
  if (f.customer_id) {
    where.push("b.customer_id = ?");
    params.push(f.customer_id);
  }
  if (f.service_id) {
    where.push("b.service_id = ?");
    params.push(f.service_id);
  }
  if (f.source) {
    where.push("b.source = ?");
    params.push(f.source);
  }
  if (f.date) {
    where.push("date(b.start_at, '+8 hours') = ?");
    params.push(f.date);
  }
  if (f.from) {
    where.push("b.start_at >= ?");
    params.push(f.from);
  }
  if (f.to) {
    where.push("b.start_at < ?");
    params.push(f.to);
  }
  const sortMap: Record<string, string> = {
    newest: "b.created_at DESC",
    oldest: "b.created_at ASC",
    upcoming: "CASE WHEN b.start_at >= strftime('%Y-%m-%dT%H:%M:%fZ', 'now') THEN 0 ELSE 1 END ASC, b.start_at ASC",
    latest: "b.start_at DESC",
    price_high: "b.price DESC",
    price_low: "b.price ASC",
  };
  const order = sortMap[f.sort ?? "upcoming"] ?? "b.start_at ASC";
  const limit = Math.min(f.limit ?? 100, 500);
  const offset = f.offset ?? 0;
  const rows = all<BookingFull>(
    `${BOOKING_SELECT} WHERE ${where.join(" AND ")} ORDER BY ${order} LIMIT ? OFFSET ?`,
    [...params, limit, offset]
  );
  const countRow = get<{ c: number }>(
    `SELECT COUNT(*) AS c FROM bookings b JOIN customers c ON c.id = b.customer_id JOIN services s ON s.id = b.service_id WHERE ${where.join(" AND ")}`,
    params
  );
  return { items: rows, total: Number(countRow?.c ?? 0) };
}

export function getBooking(id: string) {
  return get<BookingFull>(`${BOOKING_SELECT} WHERE b.id = ?`, [id]);
}

export function bookingStatusCounts() {
  const rows = all<{ status: string; c: number }>("SELECT status, COUNT(*) AS c FROM bookings GROUP BY status");
  const out: Record<string, number> = { all: 0, pending: 0, confirmed: 0, completed: 0, cancelled: 0, no_show: 0 };
  let total = 0;
  for (const r of rows) {
    out[r.status] = Number(r.c);
    total += Number(r.c);
  }
  out.all = total;
  return out;
}

/* ------------------------------------------------------------------ customers */

export function listCustomers(f: { q?: string; tag?: string; vip?: boolean; sort?: string; limit?: number; offset?: number } = {}) {
  const where: string[] = ["1=1"];
  const params: unknown[] = [];
  if (f.q) {
    where.push("(name LIKE ? OR email LIKE ? OR phone LIKE ?)");
    const like = `%${f.q}%`;
    params.push(like, like, like);
  }
  if (f.tag && f.tag !== "all") {
    if (f.tag === "VIP") where.push("vip = 1");
    else if (f.tag === "At-risk") where.push("last_visit_at IS NOT NULL AND last_visit_at < ?");
    else if (f.tag === "New") where.push("visits <= 1");
    else {
      where.push("tags LIKE ?");
      params.push(`%${f.tag}%`);
    }
    if (f.tag === "At-risk") params.push(new Date(Date.now() - 60 * 864e5).toISOString());
  }
  if (f.vip) where.push("vip = 1");
  const sortMap: Record<string, string> = {
    spent: "total_spent DESC",
    visits: "visits DESC",
    newest: "created_at DESC",
    name: "name ASC",
    recent: "last_visit_at DESC",
  };
  const rows = all<Customer>(
    `SELECT * FROM customers WHERE ${where.join(" AND ")} ORDER BY ${sortMap[f.sort ?? "spent"] ?? "total_spent DESC"} LIMIT ? OFFSET ?`,
    [...params, f.limit ?? 200, f.offset ?? 0]
  );
  const count = get<{ c: number }>(`SELECT COUNT(*) AS c FROM customers WHERE ${where.join(" AND ")}`, params);
  return { items: rows, total: Number(count?.c ?? 0) };
}

export function getCustomer(id: string) {
  return get<Customer>("SELECT * FROM customers WHERE id = ?", [id]);
}

export function customerBookings(id: string) {
  return all<BookingFull>(`${BOOKING_SELECT} WHERE b.customer_id = ? ORDER BY b.start_at DESC`, [id]);
}

export function customerPayments(id: string) {
  return all<Payment>("SELECT * FROM payments WHERE customer_id = ? ORDER BY created_at DESC", [id]);
}

/* ------------------------------------------------------------------ catalog */

export function listServices(includeInactive = false) {
  const services = all<Service>(
    `SELECT * FROM services ${includeInactive ? "" : "WHERE active = 1"} ORDER BY category, name`
  );
  const addons = all<Addon>("SELECT * FROM service_addons ORDER BY price");
  const staffLinks = all<{ staff_id: string; service_id: string }>("SELECT * FROM staff_services");
  const counts = all<{ service_id: string; c: number }>(
    `SELECT service_id, COUNT(*) AS c FROM bookings WHERE start_at > ? GROUP BY service_id`,
    [new Date().toISOString()]
  );
  return services.map((s) => ({
    ...s,
    addons: addons.filter((a) => a.service_id === s.id),
    staff_ids: staffLinks.filter((l) => l.service_id === s.id).map((l) => l.staff_id),
    upcoming: Number(counts.find((c) => c.service_id === s.id)?.c ?? 0),
  }));
}

export type ServiceWithExtras = ReturnType<typeof listServices>[number];

export function listStaff(includeInactive = false) {
  const staff = all<Staff>(`SELECT * FROM staff ${includeInactive ? "" : "WHERE active = 1"} ORDER BY name`);
  const schedules = all<{ id: string; staff_id: string; weekday: number; start_time: string; end_time: string; is_working: number }>(
    "SELECT * FROM staff_schedules ORDER BY weekday"
  );
  const timeOff = all<{ id: string; staff_id: string; start_date: string; end_date: string; reason: string; status: string; created_at: string }>(
    "SELECT * FROM staff_time_off ORDER BY start_date"
  );
  const links = all<{ staff_id: string; service_id: string }>("SELECT * FROM staff_services");
  const stats = all<{ staff_id: string; bookings: number; revenue: number; completed: number; reviews: number; rating: number }>(
    `SELECT b.staff_id,
            COUNT(*) AS bookings,
            COALESCE(SUM(CASE WHEN b.payment_status = 'paid' THEN b.price ELSE 0 END), 0) AS revenue,
            SUM(CASE WHEN b.status = 'completed' THEN 1 ELSE 0 END) AS completed,
            (SELECT COUNT(*) FROM reviews r WHERE r.staff_id = b.staff_id) AS reviews,
            (SELECT COALESCE(AVG(r.rating), 0) FROM reviews r WHERE r.staff_id = b.staff_id) AS rating
     FROM bookings b GROUP BY b.staff_id`
  );
  const todayCounts = all<{ staff_id: string; c: number }>(
    "SELECT staff_id, COUNT(*) AS c FROM bookings WHERE date(start_at, '+8 hours') = date('now', '+8 hours') AND status != 'cancelled' GROUP BY staff_id"
  );
  return staff.map((s) => {
    const st = stats.find((x) => x.staff_id === s.id);
    return {
      ...s,
      specialties: JSON.parse(s.specialties || "[]") as string[],
      schedules: schedules.filter((x) => x.staff_id === s.id),
      time_off: timeOff.filter((x) => x.staff_id === s.id),
      service_ids: links.filter((l) => l.service_id).filter((l) => l.staff_id === s.id).map((l) => l.service_id),
      stats: {
        bookings: Number(st?.bookings ?? 0),
        revenue: Math.round(Number(st?.revenue ?? 0)),
        completed: Number(st?.completed ?? 0),
        reviews: Number(st?.reviews ?? 0),
        rating: Math.round(Number(st?.rating ?? 0) * 10) / 10,
        today: Number(todayCounts.find((t) => t.staff_id === s.id)?.c ?? 0),
      },
    };
  });
}

export type StaffWithStats = ReturnType<typeof listStaff>[number];

/* ------------------------------------------------------------------ payments */

export function listPayments(f: { q?: string; status?: string; method?: string; from?: string; to?: string; limit?: number; offset?: number } = {}) {
  const where: string[] = ["1=1"];
  const params: unknown[] = [];
  if (f.q) {
    where.push("(c.name LIKE ? OR p.invoice_no LIKE ?)");
    params.push(`%${f.q}%`, `%${f.q}%`);
  }
  if (f.status && f.status !== "all") {
    where.push("p.status = ?");
    params.push(f.status);
  }
  if (f.method && f.method !== "all") {
    where.push("p.method = ?");
    params.push(f.method);
  }
  if (f.from) {
    where.push("p.created_at >= ?");
    params.push(f.from);
  }
  if (f.to) {
    where.push("p.created_at < ?");
    params.push(f.to);
  }
  const rows = all<Payment & { customer_name: string; customer_email: string | null; service_name: string | null; booking_code: string | null }>(
    `SELECT p.*, c.name AS customer_name, c.email AS customer_email, s.name AS service_name, b.code AS booking_code
     FROM payments p JOIN customers c ON c.id = p.customer_id
     LEFT JOIN bookings b ON b.id = p.booking_id
     LEFT JOIN services s ON s.id = b.service_id
     WHERE ${where.join(" AND ")} ORDER BY p.created_at DESC LIMIT ? OFFSET ?`,
    [...params, f.limit ?? 100, f.offset ?? 0]
  );
  const count = get<{ c: number }>(`SELECT COUNT(*) AS c FROM payments p JOIN customers c ON c.id = p.customer_id WHERE ${where.join(" AND ")}`, params);
  const totals = get<{ gross: number; refunded: number; tips: number; n: number }>(
    `SELECT COALESCE(SUM(p.total),0) AS gross, COALESCE(SUM(p.refunded_amount),0) AS refunded,
            COALESCE(SUM(p.tip),0) AS tips, COUNT(*) AS n
     FROM payments p JOIN customers c ON c.id = p.customer_id WHERE ${where.join(" AND ")}`,
    params
  );
  return {
    items: rows,
    total: Number(count?.c ?? 0),
    totals: {
      gross: Number(totals?.gross ?? 0),
      refunded: Number(totals?.refunded ?? 0),
      tips: Number(totals?.tips ?? 0),
      net: Number(totals?.gross ?? 0) - Number(totals?.refunded ?? 0),
      count: Number(totals?.n ?? 0),
    },
  };
}

/* ------------------------------------------------------------------ reviews */

export function listReviews(f: { q?: string; rating?: number; staff_id?: string; unreplied?: boolean } = {}) {
  const where: string[] = ["1=1"];
  const params: unknown[] = [];
  if (f.q) {
    where.push("(c.name LIKE ? OR r.comment LIKE ?)");
    params.push(`%${f.q}%`, `%${f.q}%`);
  }
  if (f.rating) {
    where.push("r.rating = ?");
    params.push(f.rating);
  }
  if (f.staff_id) {
    where.push("r.staff_id = ?");
    params.push(f.staff_id);
  }
  if (f.unreplied) where.push("(r.reply IS NULL OR r.reply = '')");
  return all<Review>(
    `SELECT r.*, c.name AS customer_name, st.name AS staff_name, s.name AS service_name
     FROM reviews r JOIN customers c ON c.id = r.customer_id
     LEFT JOIN staff st ON st.id = r.staff_id
     LEFT JOIN bookings b ON b.id = r.booking_id
     LEFT JOIN services s ON s.id = b.service_id
     WHERE ${where.join(" AND ")} ORDER BY r.created_at DESC LIMIT 200`,
    params
  );
}

/* ------------------------------------------------------------------ growth */

export function listCoupons() {
  return all<Coupon>("SELECT * FROM coupons ORDER BY active DESC, created_at DESC");
}

export function listCampaigns() {
  return all<Campaign>("SELECT * FROM campaigns ORDER BY COALESCE(sent_at, scheduled_at, created_at) DESC");
}

export function listReferrals() {
  return all<{ id: string; referrer_customer_id: string; referred_name: string; referred_email: string; code: string; status: string; reward: number; created_at: string; referrer_name: string }>(
    `SELECT r.*, c.name AS referrer_name FROM referrals r JOIN customers c ON c.id = r.referrer_customer_id
     ORDER BY r.created_at DESC`
  );
}

export function listWaitlist() {
  return all<WaitlistEntry>(
    `SELECT w.*, c.name AS customer_name, c.phone AS customer_phone, s.name AS service_name, st.name AS staff_name
     FROM waitlist w JOIN customers c ON c.id = w.customer_id
     JOIN services s ON s.id = w.service_id
     LEFT JOIN staff st ON st.id = w.staff_id
     ORDER BY CASE w.status WHEN 'waiting' THEN 0 WHEN 'offered' THEN 1 ELSE 2 END, w.created_at DESC`
  );
}

/* ------------------------------------------------------------------ system */

export function listNotifications(limit = 30) {
  return all<Notification>("SELECT * FROM notifications ORDER BY created_at DESC LIMIT ?", [limit]);
}

export function listActivity(f: { limit?: number; entity?: string; q?: string } = {}) {
  const where: string[] = ["1=1"];
  const params: unknown[] = [];
  if (f.entity && f.entity !== "all") {
    where.push("entity = ?");
    params.push(f.entity);
  }
  if (f.q) {
    where.push("(detail LIKE ? OR actor_name LIKE ?)");
    params.push(`%${f.q}%`, `%${f.q}%`);
  }
  return all<ActivityLog>(
    `SELECT * FROM activity_logs WHERE ${where.join(" AND ")} ORDER BY created_at DESC LIMIT ?`,
    [...params, f.limit ?? 100]
  );
}

export function getSettings(): Record<string, Record<string, unknown>> {
  const rows = all<{ key: string; value: string }>("SELECT * FROM settings");
  const out: Record<string, Record<string, unknown>> = {};
  for (const r of rows) {
    try {
      out[r.key] = JSON.parse(r.value);
    } catch {
      out[r.key] = {};
    }
  }
  return out;
}

export function getStaffSchedule(id: string) {
  return all<{ id: string; staff_id: string; weekday: number; start_time: string; end_time: string; is_working: number }>(
    "SELECT * FROM staff_schedules WHERE staff_id = ? ORDER BY weekday",
    [id]
  );
}

export function listUsers() {
  return all<{ id: string; email: string; name: string; role: string; staff_id: string | null; active: number; last_login_at: string | null; avatar_url: string | null }>(
    "SELECT id, email, name, role, staff_id, active, last_login_at, avatar_url FROM users ORDER BY created_at"
  );
}
