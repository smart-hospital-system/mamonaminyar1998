import { all, get } from "./db";
import { addDaysKey, toIso, todayKey, dateKey } from "./utils";

const TZ_OFFSET = "+8 hours";

export type Range = { days: number; fromKey: string; toKey: string; fromIso: string; toIso: string; prevFromIso: string; prevToIso: string };

export function rangeFor(days: number): Range {
  const toKey = todayKey();
  const fromKey = addDaysKey(toKey, -(days - 1));
  const prevToKey = addDaysKey(fromKey, -1);
  const prevFromKey = addDaysKey(prevToKey, -(days - 1));
  return {
    days,
    fromKey,
    toKey,
    fromIso: toIso(fromKey, "00:00"),
    toIso: toIso(addDaysKey(toKey, 1), "00:00"),
    prevFromIso: toIso(prevFromKey, "00:00"),
    prevToIso: toIso(addDaysKey(prevToKey, 1), "00:00"),
  };
}

function delta(current: number, previous: number) {
  if (!previous) return current > 0 ? 100 : 0;
  return Math.round(((current - previous) / previous) * 1000) / 10;
}

function revenueBetween(fromIso: string, toIso: string) {
  const row = get<{ revenue: number; n: number }>(
    `SELECT COALESCE(SUM(total - refunded_amount), 0) AS revenue, COUNT(*) AS n
     FROM payments WHERE paid_at >= ? AND paid_at < ? AND status IN ('paid','partial_refund')`,
    [fromIso, toIso]
  );
  return { revenue: Number(row?.revenue ?? 0), count: Number(row?.n ?? 0) };
}

function bookingsBetween(fromIso: string, toIso: string) {
  const row = get<{ n: number; cancelled: number; noShow: number }>(
    `SELECT COUNT(*) AS n,
            SUM(CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END) AS cancelled,
            SUM(CASE WHEN status = 'no_show' THEN 1 ELSE 0 END) AS noShow
     FROM bookings WHERE start_at >= ? AND start_at < ?`,
    [fromIso, toIso]
  );
  return {
    count: Number(row?.n ?? 0),
    cancelled: Number(row?.cancelled ?? 0),
    noShow: Number(row?.noShow ?? 0),
  };
}

export function getKpis(days: number) {
  const r = rangeFor(days);
  const cur = revenueBetween(r.fromIso, r.toIso);
  const prev = revenueBetween(r.prevFromIso, r.prevToIso);
  const bCur = bookingsBetween(r.fromIso, r.toIso);
  const bPrev = bookingsBetween(r.prevFromIso, r.prevToIso);
  const custCur = get<{ n: number }>(
    "SELECT COUNT(*) AS n FROM customers WHERE created_at >= ? AND created_at < ?",
    [r.fromIso, r.toIso]
  );
  const custPrev = get<{ n: number }>(
    "SELECT COUNT(*) AS n FROM customers WHERE created_at >= ? AND created_at < ?",
    [r.prevFromIso, r.prevToIso]
  );
  const rating = get<{ avg: number; n: number }>(
    "SELECT COALESCE(AVG(rating),0) AS avg, COUNT(*) AS n FROM reviews WHERE created_at >= ? AND created_at < ?",
    [r.fromIso, r.toIso]
  );
  const ratingPrev = get<{ avg: number }>(
    "SELECT COALESCE(AVG(rating),0) AS avg FROM reviews WHERE created_at >= ? AND created_at < ?",
    [r.prevFromIso, r.prevToIso]
  );
  const upcoming = get<{ n: number }>(
    "SELECT COUNT(*) AS n FROM bookings WHERE start_at >= ? AND status IN ('confirmed','pending')",
    [new Date().toISOString()]
  );
  const pending = get<{ n: number }>(
    "SELECT COUNT(*) AS n FROM bookings WHERE status = 'pending' AND start_at >= ?",
    [new Date().toISOString()]
  );
  const unpaid = get<{ n: number; total: number }>(
    `SELECT COUNT(*) AS n, COALESCE(SUM(price),0) AS total FROM bookings
     WHERE status = 'completed' AND payment_status = 'unpaid'`
  );

  const utilization = getUtilization(r.fromIso, r.toIso);
  const utilizationPrev = getUtilization(r.prevFromIso, r.prevToIso);

  return {
    revenue: cur.revenue,
    revenueDelta: delta(cur.revenue, prev.revenue),
    bookings: bCur.count,
    bookingsDelta: delta(bCur.count, bPrev.count),
    customers: Number(custCur?.n ?? 0),
    customersDelta: delta(Number(custCur?.n ?? 0), Number(custPrev?.n ?? 0)),
    avgTicket: cur.count ? Math.round((cur.revenue / cur.count) * 100) / 100 : 0,
    avgTicketDelta: delta(
      cur.count ? cur.revenue / cur.count : 0,
      prev.count ? prev.revenue / prev.count : 0
    ),
    rating: Math.round(Number(rating?.avg ?? 0) * 10) / 10,
    ratingDelta: Math.round((Number(rating?.avg ?? 0) - Number(ratingPrev?.avg ?? 0)) * 10) / 10,
    reviewCount: Number(rating?.n ?? 0),
    utilization: utilization,
    utilizationDelta: Math.round((utilization - utilizationPrev) * 10) / 10,
    noShowRate: bCur.count ? Math.round((bCur.noShow / bCur.count) * 1000) / 10 : 0,
    cancellationRate: bCur.count ? Math.round((bCur.cancelled / bCur.count) * 1000) / 10 : 0,
    totalBookings: bCur.count,
    upcoming: Number(upcoming?.n ?? 0),
    pendingApproval: Number(pending?.n ?? 0),
    unpaidCount: Number(unpaid?.n ?? 0),
    unpaidTotal: Number(unpaid?.total ?? 0),
    range: { from: r.fromKey, to: r.toKey, days },
  };
}

/** booked minutes ÷ scheduled minutes for all active staff in range */
export function getUtilization(fromIso: string, toIso: string) {
  const schedules = all<{ staff_id: string; weekday: number; start_time: string; end_time: string; is_working: number }>(
    "SELECT * FROM staff_schedules WHERE is_working = 1"
  );
  const fromKey = dateKey(fromIso);
  const toKey = dateKey(new Date(new Date(toIso).getTime() - 1).toISOString());
  let available = 0;
  let key = fromKey;
  let guard = 0;
  while (key <= toKey && guard++ < 400) {
    const wd = new Date(`${key}T00:00:00Z`).getUTCDay();
    for (const s of schedules) {
      if (s.weekday !== wd) continue;
      const [sh, sm] = s.start_time.split(":").map(Number);
      const [eh, em] = s.end_time.split(":").map(Number);
      available += eh * 60 + em - (sh * 60 + sm);
    }
    key = addDaysKey(key, 1);
  }
  if (!available) return 0;
  const booked = get<{ m: number }>(
    `SELECT COALESCE(SUM((julianday(end_at) - julianday(start_at)) * 1440), 0) AS m
     FROM bookings WHERE start_at >= ? AND start_at < ? AND status IN ('confirmed','completed')`,
    [fromIso, toIso]
  );
  const value = (Number(booked?.m ?? 0) / available) * 100;
  return Math.round(Math.min(100, value) * 10) / 10;
}

export function getRevenueSeries(days: number) {
  const r = rangeFor(days);
  const rows = all<{ day: string; revenue: number; bookings: number; tips: number }>(
    `SELECT date(paid_at, ?) AS day,
            COALESCE(SUM(total - refunded_amount), 0) AS revenue,
            COUNT(*) AS bookings,
            COALESCE(SUM(tip), 0) AS tips
     FROM payments
     WHERE paid_at >= ? AND paid_at < ? AND status IN ('paid','partial_refund')
     GROUP BY day ORDER BY day`,
    [TZ_OFFSET, r.fromIso, r.toIso]
  );
  const bookingRows = all<{ day: string; n: number }>(
    `SELECT date(start_at, ?) AS day, COUNT(*) AS n FROM bookings
     WHERE start_at >= ? AND start_at < ? AND status != 'cancelled'
     GROUP BY day ORDER BY day`,
    [TZ_OFFSET, r.fromIso, r.toIso]
  );
  const byDay = new Map(bookingRows.map((b) => [b.day, Number(b.n)]));
  const byDayRevenue = new Map(rows.map((b) => [b.day, b]));
  const out: { date: string; label: string; revenue: number; bookings: number; tips: number }[] = [];
  for (let i = 0; i < days; i++) {
    const key = addDaysKey(r.fromKey, i);
    const row = byDayRevenue.get(key);
    out.push({
      date: key,
      label: new Intl.DateTimeFormat("en-SG", { timeZone: "Asia/Singapore", day: "numeric", month: "short" }).format(
        new Date(`${key}T00:00:00+08:00`)
      ),
      revenue: Math.round(Number(row?.revenue ?? 0)),
      bookings: byDay.get(key) ?? 0,
      tips: Math.round(Number(row?.tips ?? 0)),
    });
  }
  return out;
}

export function getMonthlyRevenue(months = 6) {
  const rows = all<{ month: string; revenue: number; bookings: number }>(
    `SELECT strftime('%Y-%m', paid_at, ?) AS month,
            COALESCE(SUM(total - refunded_amount), 0) AS revenue,
            COUNT(*) AS bookings
     FROM payments WHERE status IN ('paid','partial_refund')
     GROUP BY month ORDER BY month DESC LIMIT ?`,
    [TZ_OFFSET, months]
  );
  return rows
    .reverse()
    .map((r) => ({
      month: new Intl.DateTimeFormat("en-SG", { timeZone: "Asia/Singapore", month: "short", year: "2-digit" }).format(
        new Date(`${r.month}-01T00:00:00+08:00`)
      ),
      revenue: Math.round(Number(r.revenue)),
      bookings: Number(r.bookings),
    }));
}

export function getBookingStatusCounts(days: number) {
  const r = rangeFor(days);
  return all<{ status: string; n: number }>(
    `SELECT status, COUNT(*) AS n FROM bookings WHERE start_at >= ? AND start_at < ? GROUP BY status ORDER BY n DESC`,
    [r.fromIso, r.toIso]
  ).map((x) => ({ status: x.status, count: Number(x.n) }));
}

export function getServiceMix(days: number) {
  const r = rangeFor(days);
  return all<{ id: string; name: string; color: string; bookings: number; revenue: number; avg_price: number; category: string }>(
    `SELECT s.id, s.name, s.color, s.category,
            COUNT(b.id) AS bookings,
            COALESCE(SUM(b.price), 0) AS revenue,
            s.price AS avg_price
     FROM services s
     LEFT JOIN bookings b ON b.service_id = s.id AND b.start_at >= ? AND b.start_at < ? AND b.status != 'cancelled'
     GROUP BY s.id ORDER BY revenue DESC`,
    [r.fromIso, r.toIso]
  ).map((x) => ({ ...x, bookings: Number(x.bookings), revenue: Math.round(Number(x.revenue)), avg_price: Number(x.avg_price) }));
}

export function getStaffPerformance(fromIso: string, toIso: string) {
  return all<{
    id: string;
    name: string;
    title: string;
    avatar_color: string;
    rating: number;
    bookings: number;
    completed: number;
    revenue: number;
    no_shows: number;
    review_avg: number;
    review_count: number;
    hours: number;
    utilization: number;
  }>(
    `SELECT st.id, st.name, st.title, st.avatar_color, st.rating,
            COUNT(b.id) AS bookings,
            SUM(CASE WHEN b.status = 'completed' THEN 1 ELSE 0 END) AS completed,
            COALESCE(SUM(CASE WHEN b.payment_status = 'paid' THEN b.price ELSE 0 END), 0) AS revenue,
            SUM(CASE WHEN b.status = 'no_show' THEN 1 ELSE 0 END) AS no_shows,
            (SELECT COALESCE(AVG(r.rating),0) FROM reviews r WHERE r.staff_id = st.id) AS review_avg,
            (SELECT COUNT(*) FROM reviews r WHERE r.staff_id = st.id) AS review_count,
            COALESCE(SUM((julianday(b.end_at) - julianday(b.start_at)) * 24), 0) AS hours
     FROM staff st
     LEFT JOIN bookings b ON b.staff_id = st.id AND b.start_at >= ? AND b.start_at < ? AND b.status != 'cancelled'
     WHERE st.active = 1
     GROUP BY st.id ORDER BY revenue DESC`,
    [fromIso, toIso]
  ).map((r) => ({
    ...r,
    bookings: Number(r.bookings),
    completed: Number(r.completed),
    revenue: Math.round(Number(r.revenue)),
    no_shows: Number(r.no_shows),
    review_avg: Math.round(Number(r.review_avg) * 10) / 10,
    review_count: Number(r.review_count),
    hours: Math.round(Number(r.hours) * 10) / 10,
    utilization: Math.min(100, Math.round((Number(r.hours) / Math.max(1, rangeFor(30).days * 8)) * 100)),
  }));
}

export function getPeakHours(days = 30) {
  const r = rangeFor(days);
  return all<{ weekday: number; hour: number; n: number }>(
    `SELECT CAST(strftime('%w', start_at, ?) AS INTEGER) AS weekday,
            CAST(strftime('%H', start_at, ?) AS INTEGER) AS hour,
            COUNT(*) AS n
     FROM bookings WHERE start_at >= ? AND start_at < ? AND status != 'cancelled'
     GROUP BY weekday, hour`,
    [TZ_OFFSET, TZ_OFFSET, r.fromIso, r.toIso]
  ).map((r2) => ({ weekday: Number(r2.weekday), hour: Number(r2.hour), count: Number(r2.n) }));
}

export function getCustomerGrowth(months = 6) {
  const created = all<{ month: string; n: number }>(
    `SELECT strftime('%Y-%m', created_at, ?) AS month, COUNT(*) AS n FROM customers
     GROUP BY month ORDER BY month`,
    [TZ_OFFSET]
  );
  const returning = all<{ month: string; n: number }>(
    `SELECT strftime('%Y-%m', start_at, ?) AS month, COUNT(DISTINCT customer_id) AS n
     FROM bookings WHERE status = 'completed' GROUP BY month ORDER BY month`,
    [TZ_OFFSET]
  );
  const allMonths = Array.from(
    new Set([...created.map((c) => c.month), ...returning.map((r) => r.month)])
  )
    .sort()
    .slice(-months);
  const newMap = new Map(created.map((c) => [c.month, Number(c.n)]));
  const retMap = new Map(returning.map((c) => [c.month, Number(c.n)]));
  return allMonths.map((m) => ({
    month: new Intl.DateTimeFormat("en-SG", { timeZone: "Asia/Singapore", month: "short" }).format(
      new Date(`${m}-01T00:00:00+08:00`)
    ),
    new: newMap.get(m) ?? 0,
    active: retMap.get(m) ?? 0,
  }));
}

export function getTodaySnapshot() {
  const today = todayKey();
  const from = toIso(today, "00:00");
  const to = toIso(addDaysKey(today, 1), "00:00");
  const rows = all<{
    id: string; start_at: string; end_at: string; status: string; price: number;
    customer_name: string; staff_name: string; service_name: string; service_color: string; staff_color: string;
  }>(
    `SELECT b.id, b.start_at, b.end_at, b.status, b.price,
            c.name AS customer_name, st.name AS staff_name, s.name AS service_name,
            s.color AS service_color, st.avatar_color AS staff_color
     FROM bookings b
     JOIN customers c ON c.id = b.customer_id
     JOIN staff st ON st.id = b.staff_id
     JOIN services s ON s.id = b.service_id
     WHERE b.start_at >= ? AND b.start_at < ? AND b.status != 'cancelled'
     ORDER BY b.start_at`,
    [from, to]
  );
  const revenue = get<{ v: number }>(
    `SELECT COALESCE(SUM(total - refunded_amount),0) AS v FROM payments
     WHERE paid_at >= ? AND paid_at < ? AND status IN ('paid','partial_refund')`,
    [from, to]
  );
  return { bookings: rows, revenue: Math.round(Number(revenue?.v ?? 0)) };
}

export function getRecentActivity(limit = 8) {
  return all<{ id: string; actor_name: string; action: string; entity: string; detail: string; created_at: string }>(
    "SELECT * FROM activity_logs ORDER BY created_at DESC LIMIT ?",
    [limit]
  );
}

export function getTopCustomers(limit = 5) {
  return all<{ id: string; name: string; total_spent: number; visits: number; loyalty_points: number; vip: number }>(
    "SELECT id, name, total_spent, visits, loyalty_points, vip FROM customers ORDER BY total_spent DESC LIMIT ?",
    [limit]
  );
}

export function getLapsedCustomers(days = 60) {
  const cutoff = new Date(Date.now() - days * 864e5).toISOString();
  return all<{ id: string; name: string; email: string; last_visit_at: string; total_spent: number; visits: number }>(
    `SELECT id, name, email, last_visit_at, total_spent, visits FROM customers
     WHERE last_visit_at IS NOT NULL AND last_visit_at < ? ORDER BY total_spent DESC`,
    [cutoff]
  );
}

export function getRevenueByCategory(days = 30) {
  const r = rangeFor(days);
  return all<{ category: string; revenue: number; bookings: number }>(
    `SELECT s.category, COALESCE(SUM(b.price),0) AS revenue, COUNT(b.id) AS bookings
     FROM bookings b JOIN services s ON s.id = b.service_id
     WHERE b.start_at >= ? AND b.start_at < ? AND b.status = 'completed'
     GROUP BY s.category ORDER BY revenue DESC`,
    [r.fromIso, r.toIso]
  ).map((x) => ({ ...x, revenue: Math.round(Number(x.revenue)), bookings: Number(x.bookings) }));
}

/** Simple seasonal-naive demand forecast with weekday seasonality + trend. */
export function forecastDemand(days = 14) {
  const historyDays = 84;
  const r = rangeFor(historyDays);
  const rows = all<{ day: string; n: number }>(
    `SELECT date(start_at, ?) AS day, COUNT(*) AS n FROM bookings
     WHERE start_at >= ? AND start_at < ? AND status != 'cancelled'
     GROUP BY day ORDER BY day`,
    [TZ_OFFSET, r.fromIso, r.toIso]
  );
  const byKey = new Map(rows.map((x) => [x.day, Number(x.n)]));
  const keys: string[] = [];
  for (let i = 0; i < historyDays; i++) keys.push(addDaysKey(r.fromKey, i));
  const values = keys.map((k) => byKey.get(k) ?? 0);
  // weekday averages over the last 8 weeks
  const weekdayTotals = new Array(7).fill(0);
  const weekdayCounts = new Array(7).fill(0);
  const recent = values.slice(-56);
  recent.forEach((v, i) => {
    const key = keys[keys.length - 56 + i];
    const wd = new Date(`${key}T00:00:00Z`).getUTCDay();
    weekdayTotals[wd] += v;
    weekdayCounts[wd] += 1;
  });
  const weekdayAvg = weekdayTotals.map((t, i) => (weekdayCounts[i] ? t / weekdayCounts[i] : 0));
  const last28 = values.slice(-28).reduce((a, b) => a + b, 0);
  const prev28 = values.slice(-56, -28).reduce((a, b) => a + b, 0);
  const trend = prev28 ? last28 / prev28 : 1;
  const today = todayKey();
  const capacityPerDay = 30;
  const out: {
    date: string;
    label: string;
    weekday: string;
    predicted: number;
    capacity: number;
    demandPct: number;
    staffNeeded: number;
    level: "high" | "healthy" | "low";
  }[] = [];
  for (let i = 0; i < days; i++) {
    const key = addDaysKey(today, i);
    const d = new Date(`${key}T00:00:00Z`);
    const wd = d.getUTCDay();
    const predicted = Math.max(0, Math.round(weekdayAvg[wd] * Math.pow(trend, 0.35) * (0.92 + Math.random() * 0.16)));
    const demandPct = Math.min(100, Math.round((predicted / capacityPerDay) * 100));
    out.push({
      date: key,
      label: new Intl.DateTimeFormat("en-SG", { timeZone: "Asia/Singapore", day: "numeric", month: "short" }).format(new Date(`${key}T12:00:00+08:00`)),
      weekday: new Intl.DateTimeFormat("en-SG", { timeZone: "Asia/Singapore", weekday: "short" }).format(new Date(`${key}T12:00:00+08:00`)),
      predicted,
      capacity: capacityPerDay,
      demandPct,
      staffNeeded: Math.max(1, Math.ceil(predicted / 9)),
      level: demandPct >= 72 ? "high" : demandPct >= 45 ? "healthy" : "low",
    });
  }
  return {
    forecast: out,
    trend: Math.round((trend - 1) * 1000) / 10,
    weekdayAvg,
    avgDaily: out.length ? Math.round(out.reduce((a, b) => a + b.predicted, 0) / out.length) : 0,
  };
}

export function businessDate(iso: string) {
  return dateKey(iso);
}
