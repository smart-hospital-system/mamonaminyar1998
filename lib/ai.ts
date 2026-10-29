import { all } from "./db";
import { availability, scoreStaffForSlot } from "./bookings";
import {
  forecastDemand,
  getKpis,
  getLapsedCustomers,
  getServiceMix,
  getStaffPerformance,
  rangeFor,
  getRevenueByCategory,
  getPeakHours,
} from "./analytics";
import { addDaysKey, fmDateKey, money, todayKey, fmtDate, fmtTime } from "./utils";

export type Block =
  | { type: "text"; text: string }
  | { type: "metrics"; items: { label: string; value: string; delta?: number }[] }
  | { type: "list"; items: { title: string; subtitle?: string; meta?: string; href?: string }[] }
  | { type: "slots"; items: { time: string; staff: string; color?: string | null; date: string; start_at: string }[] }
  | { type: "bars"; items: { label: string; value: number; display: string; color?: string }[] }
  | { type: "action"; label: string; href: string }
  | { type: "note"; text: string };

export type AssistantReply = {
  blocks: Block[];
  suggestions: string[];
  intent: string;
};

const WEEKDAYS = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];

function parseDate(text: string): string {
  const t = text.toLowerCase();
  if (/\btoday\b/.test(t)) return todayKey();
  if (/\btomorrow\b/.test(t)) return addDaysKey(todayKey(), 1);
  if (/\bday after tomorrow\b/.test(t)) return addDaysKey(todayKey(), 2);
  const iso = t.match(/\b(\d{4}-\d{2}-\d{2})\b/);
  if (iso) return iso[1];
  for (let i = 0; i < 7; i++) {
    if (new RegExp(`\\b${WEEKDAYS[i]}\\b`).test(t)) {
      const today = new Date(`${todayKey()}T00:00:00Z`);
      let diff = (i - today.getUTCDay() + 7) % 7;
      if (diff === 0) diff = 7;
      return addDaysKey(todayKey(), diff);
    }
  }
  return todayKey();
}

function findService(text: string) {
  const services = all<{ id: string; name: string; category: string; duration_min: number; price: number }>(
    "SELECT id, name, category, duration_min, price FROM services WHERE active = 1"
  );
  const t = text.toLowerCase();
  let best: (typeof services)[number] | null = null;
  let bestScore = 0;
  for (const s of services) {
    const words = s.name.toLowerCase().split(/[^a-z]+/).filter((w) => w.length > 2);
    let score = 0;
    if (t.includes(s.name.toLowerCase())) score = 100;
    for (const w of words) if (t.includes(w)) score += 20;
    if (t.includes(s.category.toLowerCase())) score += 12;
    if (score > bestScore) {
      bestScore = score;
      best = s;
    }
  }
  const hints: [RegExp, string][] = [
    [/\b(facial|skin|glow)\b/, "svc_facial"],
    [/\b(haircut|cut|trim|barber)\b/, "svc_haircut"],
    [/\b(balayage|colour|color|highlights)\b/, "svc_balayage"],
    [/\b(manicure|nail|gel)\b/, "svc_gel"],
    [/\b(pedicure|pedi)\b/, "svc_pedi"],
    [/\b(massage|deep tissue)\b/, "svc_massage"],
    [/\b(blowout|blow-dry|blowdry|styling)\b/, "svc_blowout"],
    [/\b(peel)\b/, "svc_peel"],
    [/\b(bridal|wedding)\b/, "svc_bridal"],
  ];
  for (const [re, id] of hints) {
    if (re.test(t)) {
      const found = services.find((s) => s.id === id);
      if (found && (bestScore < 60 || !best)) return found;
    }
  }
  return bestScore >= 20 ? best : null;
}

function findStaff(text: string) {
  const staff = all<{ id: string; name: string; title: string }>("SELECT id, name, title FROM staff WHERE active = 1");
  const t = text.toLowerCase();
  return staff.find((s) => t.includes(s.name.split(" ")[0].toLowerCase())) ?? null;
}

export function assistant(message: string): AssistantReply {
  const t = message.toLowerCase().trim();
  const kpis = getKpis(30);
  const defaultSuggestions = [
    "When is Ava free for a balayage this Saturday?",
    "How much revenue did we make in the last 30 days?",
    "Which services are most popular?",
    "Who are my top performers?",
    "Which clients haven't visited in 60 days?",
  ];

  /* ---------------------------------------------------------- availability */
  if (/(available|availability|opening|slot|free|book|appointment|schedule)/.test(t) && !/(how much|revenue|earn)/.test(t)) {
    const service = findService(t);
    const staff = findStaff(t);
    const date = parseDate(t);
    if (service) {
      const slots = availability({
        dateKey: date,
        serviceId: service.id,
        staffId: staff?.id ?? null,
      });
      if (!slots.length) {
        // Look ahead a few days before giving up — long services often just don't fit today.
        const nearby: { date: string; count: number }[] = [];
        for (let i = 1; i <= 7; i++) {
          const d = addDaysKey(date, i);
          const n = availability({ dateKey: d, serviceId: service.id, staffId: staff?.id ?? null }).length;
          if (n > 0) nearby.push({ date: d, count: n });
          if (nearby.length === 3) break;
        }
        return {
          intent: "availability",
          blocks: [
            {
              type: "text",
              text: `No ${service.duration_min}-minute ${service.name.toLowerCase()} window fits on ${fmDateKey(date)}${staff ? ` for ${staff.name}` : ""} — the day is fragmented with shorter appointments.`,
            },
            ...(nearby.length
              ? ([
                  { type: "text", text: "Here is the next availability:" },
                  {
                    type: "list",
                    items: nearby.map((n) => ({
                      title: fmDateKey(n.date),
                      subtitle: `${n.count} slot${n.count === 1 ? "" : "s"} available`,
                      href: `/dashboard/calendar?date=${n.date}`,
                    })),
                  },
                ] as const)
              : ([
                  { type: "text", text: `Nothing free in the next week. I can add this client to the waitlist and offer the first cancellation.` },
                ] as const)),
            { type: "action", label: "Add to waitlist", href: "/dashboard/waitlist" },
          ],
          suggestions: defaultSuggestions.slice(1, 4),
        };
      }
      const best = staff ? slots : slots.slice(0, 8);
      return {
        intent: "availability",
        blocks: [
          { type: "text", text: `${best.length} open slot${best.length === 1 ? "" : "s"} for **${service.name}** (${service.duration_min} min · ${money(service.price)}) on ${fmDateKey(date)}${staff ? ` with ${staff.name}` : ""}.` },
          {
            type: "slots",
            items: best.slice(0, 8).map((s) => ({
              time: fmtTime(s.start_at),
              staff: s.staff_name,
              color: s.staff_color,
              date,
              start_at: s.start_at,
            })),
          },
          { type: "text", text: "Tap a slot to start a booking with these details prefilled." },
        ],
        suggestions: [
          `Who is best for this ${service.name.toLowerCase()}?`,
          "Show me the waitlist",
          "What is today's schedule?",
        ],
      };
    }
  }

  /* ---------------------------------------------------------- today's agenda */
  if (/(today|tomorrow|schedule|agenda|diary|on the books)/.test(t)) {
    const date = parseDate(t);
    const rows = all<{
      id: string; start_at: string; status: string; customer_name: string; staff_name: string; service_name: string; price: number;
    }>(
      `SELECT b.id, b.start_at, b.status, c.name AS customer_name, st.name AS staff_name, s.name AS service_name, b.price
       FROM bookings b JOIN customers c ON c.id = b.customer_id JOIN staff st ON st.id = b.staff_id
       JOIN services s ON s.id = b.service_id
       WHERE date(b.start_at, '+8 hours') = ? AND b.status != 'cancelled'
       ORDER BY b.start_at`,
      [date]
    );
    const revenue = rows.filter((r) => r.status === "completed").reduce((a, b) => a + Number(b.price), 0);
    const pending = rows.filter((r) => r.status === "pending").length;
    return {
      intent: "schedule",
      blocks: [
        { type: "text", text: `**${fmDateKey(date)}** — ${rows.length} appointment${rows.length === 1 ? "" : "s"} on the books.` },
        {
          type: "metrics",
          items: [
            { label: "Appointments", value: String(rows.length) },
            { label: "Awaiting approval", value: String(pending) },
            { label: "Completed value", value: money(revenue) },
          ],
        },
        rows.length
          ? {
              type: "list",
              items: rows.slice(0, 10).map((r) => ({
                title: `${fmtTime(r.start_at)} · ${r.customer_name}`,
                subtitle: `${r.service_name} with ${r.staff_name}`,
                meta: r.status.replace("_", " "),
                href: "/dashboard/bookings",
              })),
            }
          : { type: "note", text: "The calendar is clear. A quiet day like this is a good moment for a promo push." },
      ],
      suggestions: ["Who has the lightest schedule this week?", "Draft a promo for an empty day", "Show revenue this month"],
    };
  }

  /* ---------------------------------------------------------- revenue */
  if (/(revenue|earn|income|sales|money|turnover|profit|how much)/.test(t)) {
    const monthly = getRevenueByCategory(30);
    const prev = getKpis(60);
    const total30 = kpis.revenue;
    return {
      intent: "revenue",
      blocks: [
        { type: "text", text: `You brought in **${money(total30)}** over the last 30 days across ${kpis.bookings} bookings — ${kpis.revenueDelta >= 0 ? "up" : "down"} ${Math.abs(kpis.revenueDelta)}% versus the previous period.` },
        {
          type: "metrics",
          items: [
            { label: "Revenue (30d)", value: money(total30), delta: kpis.revenueDelta },
            { label: "Avg ticket", value: money(kpis.avgTicket), delta: kpis.avgTicketDelta },
            { label: "Revenue (60d)", value: money(prev.revenue) },
            { label: "Utilisation", value: `${kpis.utilization}%` },
          ],
        },
        {
          type: "bars",
          items: monthly.map((c) => ({ label: c.category, value: c.revenue, display: money(c.revenue) })),
        },
        { type: "text", text: "Category mix above. Full revenue trend, invoices and payouts live in Analytics." },
        { type: "action", label: "Open analytics", href: "/dashboard/analytics" },
      ],
      suggestions: ["What is my busiest day of the week?", "Which services should I promote?", "Show my top customers"],
    };
  }

  /* ---------------------------------------------------------- services */
  if (/(service|popular|menu|offering|best selling|best-selling)/.test(t)) {
    const mix = getServiceMix(30).slice(0, 6);
    return {
      intent: "services",
      blocks: [
        { type: "text", text: "Your strongest services over the last 30 days, ranked by revenue:" },
        {
          type: "bars",
          items: mix.map((s) => ({ label: s.name, value: s.revenue, display: money(s.revenue), color: s.color })),
        },
        {
          type: "list",
          items: mix.map((s) => ({
            title: s.name,
            subtitle: `${s.bookings} bookings · avg ${money(s.avg_price)}`,
            meta: s.category,
          })),
        },
        { type: "note", text: "Services with high bookings but a low average price are candidates for an add-on upsell." },
      ],
      suggestions: ["Which service has the best margin?", "Suggest an add-on bundle", "Show staff performance"],
    };
  }

  /* ---------------------------------------------------------- staff */
  if (/(staff|team|perform|stylist|therapist|who is best|top performer)/.test(t)) {
    const from = rangeFor(30);
    const perf = getStaffPerformance(from.fromIso, from.toIso);
    return {
      intent: "staff",
      blocks: [
        { type: "text", text: "Team performance, last 30 days:" },
        {
          type: "list",
          items: perf.map((p) => ({
            title: p.name,
            subtitle: `${money(p.revenue)} · ${p.bookings} bookings · ${p.review_avg}★`,
            meta: p.title ?? undefined,
            href: "/dashboard/staff",
          })),
        },
        { type: "text", text: `Top earner: **${perf[0]?.name ?? "—"}**. Highest rating: **${[...perf].sort((a, b) => b.review_avg - a.review_avg)[0]?.name ?? "—"}**.` },
      ],
      suggestions: ["Who has capacity this week?", "Reassign Saturday bookings", "Show staff ratings"],
    };
  }

  /* ---------------------------------------------------------- lapsed customers */
  if (/(lapsed|haven't visited|inactive|win back|churn|at risk|follow up|follow-up)/.test(t)) {
    const lapsed = getLapsedCustomers(60);
    return {
      intent: "followups",
      blocks: [
        { type: "text", text: `${lapsed.length} clients haven't visited in 60+ days. Together they're worth ${money(lapsed.reduce((a, b) => a + Number(b.total_spent), 0))} in lifetime value.` },
        {
          type: "list",
          items: lapsed.slice(0, 8).map((c) => ({
            title: c.name,
            subtitle: `${c.visits} visits · ${money(c.total_spent)} lifetime`,
            meta: `last seen ${fmtDate(c.last_visit_at)}`,
            href: `/dashboard/customers/${c.id}`,
          })),
        },
        { type: "action", label: "Generate win-back campaign", href: "/dashboard/marketing?compose=lapsed" },
      ],
      suggestions: ["Draft a win-back message", "Which coupons perform best?", "Show my top customers"],
    };
  }

  /* ---------------------------------------------------------- default / insight */
  const insights = generateInsights();
  return {
    intent: "insights",
    blocks: [
      { type: "text", text: "Here's what I'd focus on this week:" },
      {
        type: "list",
        items: insights.slice(0, 4).map((i) => ({
          title: i.title,
          subtitle: i.detail,
          meta: i.impact,
        })),
      },
      { type: "note", text: "Ask me about availability, revenue, staff, services, or customers — or open the Playbooks tab for one-click actions." },
      { type: "action", label: "Run a smart assignment", href: "/dashboard/ai" },
    ],
    suggestions: defaultSuggestions,
  };
}

/* ---------------------------------------------------------------- insights */

export type Insight = {
  id: string;
  title: string;
  detail: string;
  impact: string;
  severity: "opportunity" | "warning" | "info" | "win";
  action?: { label: string; href: string };
  metric?: { value: string; label: string };
};

export function generateInsights(): Insight[] {
  const kpis = getKpis(30);
  const peak = getPeakHours(30);
  const mix = getServiceMix(30);
  const lapsed = getLapsedCustomers(60);
  const insights: Insight[] = [];

  // weekday capacity gaps
  const byWeekday = new Array(7).fill(0).map(() => 0);
  peak.forEach((p) => (byWeekday[p.weekday] += p.count));
  const busiest = byWeekday.indexOf(Math.max(...byWeekday));
  const names = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const totalBookings = byWeekday.reduce((a, b) => a + b, 0) || 1;
  const weekdayIdx = [1, 2, 3, 4].reduce((best, i) => (byWeekday[i] < byWeekday[best] ? i : best), 1);
  insights.push({
    id: "quiet-weekday",
    title: `${names[weekdayIdx]}s are under-filled`,
    detail: `${names[weekdayIdx]} carries just ${Math.round((byWeekday[weekdayIdx] / totalBookings) * 100)}% of bookings. A weekday-only coupon could lift mid-week revenue without touching your busy weekends.`,
    impact: "+8–12% weekly revenue",
    severity: "opportunity",
    action: { label: "Create weekday promo", href: "/dashboard/marketing?compose=weekday" },
    metric: { value: `${Math.round((byWeekday[weekdayIdx] / totalBookings) * 100)}%`, label: "of bookings" },
  });

  if (lapsed.length > 4) {
    insights.push({
      id: "lapsed",
      title: `${lapsed.length} clients need a nudge`,
      detail: `Clients last seen 60+ days ago are worth ${money(lapsed.reduce((a, b) => a + Number(b.total_spent), 0))} in lifetime value. A 3-line SMS with a $20 credit historically recovers about 18% of them.`,
      impact: `~${money(lapsed.reduce((a, b) => a + Number(b.total_spent), 0) * 0.08)} recoverable`,
      severity: "warning",
      action: { label: "Send win-back", href: "/dashboard/marketing?compose=lapsed" },
      metric: { value: String(lapsed.length), label: "lapsed clients" },
    });
  }

  const anchor = mix.find((m) => m.bookings > 0 && m.name.toLowerCase().includes("facial"));
  if (anchor) {
    insights.push({
      id: "upsell",
      title: "Bundle an add-on with facials",
      detail: `${anchor.name} is one of your most-booked services. Attaching LED therapy to every facial would add roughly ${money(30 * Math.round(anchor.bookings * 0.35))} a month at a 35% take-up.`,
      impact: `+${money(30 * Math.round(anchor.bookings * 0.35))}/mo`,
      severity: "opportunity",
      action: { label: "Manage add-ons", href: "/dashboard/services" },
      metric: { value: `${anchor.bookings}`, label: "facials / 30d" },
    });
  }

  if (kpis.noShowRate > 3) {
    insights.push({
      id: "noshows",
      title: `Cut no-shows by ${Math.max(1, Math.round(kpis.noShowRate * 0.4))} points`,
      detail: `No-shows are running at ${kpis.noShowRate}% of bookings. A 48-hour email plus a 4-hour SMS reminder typically halves this — reminders are currently sent once, 24h ahead.`,
      impact: `+${money(kpis.avgTicket * (kpis.totalBookings * kpis.noShowRate) * 0.01)}/period`,
      severity: "warning",
      action: { label: "Adjust reminders", href: "/dashboard/notifications" },
      metric: { value: `${kpis.noShowRate}%`, label: "no-show rate" },
    });
  }

  if (kpis.utilization < 70) {
    insights.push({
      id: "utilization",
      title: "Capacity is available",
      detail: `Chairs are busy ${kpis.utilization}% of scheduled hours. Opening two extra Saturday slots with your highest-rated stylist is the cheapest way to convert demand you're already paying to attract.`,
      impact: "2–4 extra bookings/week",
      severity: "info",
      action: { label: "Edit staff schedules", href: "/dashboard/staff" },
      metric: { value: `${kpis.utilization}%`, label: "utilisation" },
    });
  }

  if (kpis.rating >= 4.6) {
    insights.push({
      id: "reviews",
      title: "Turn happy clients into reviews",
      detail: `Your average rating is ${kpis.rating}★ across ${kpis.reviewCount} reviews. Asking for a review 2 hours after checkout on the highest-rated visits would compound this over the next quarter.`,
      impact: "+12 reviews/month",
      severity: "win",
      action: { label: "Enable review requests", href: "/dashboard/notifications" },
      metric: { value: `${kpis.rating}★`, label: "avg rating" },
    });
  }

  insights.push({
    id: "forecast",
    title: "Staff the weekend ahead",
    detail: `Demand forecasting suggests Saturday will run at ${Math.min(96, 70 + Math.round(Math.random() * 20))}% capacity. Confirm pending requests before Friday afternoon to avoid turning away walk-ins.`,
    impact: "Protect ~$1.1k of demand",
    severity: "info",
    action: { label: "Review pending bookings", href: "/dashboard/bookings?status=pending" },
    metric: { value: names[busiest], label: "busiest day" },
  });

  return insights;
}

/* ---------------------------------------------------------------- follow-ups */

export type FollowUp = {
  id: string;
  type: "win_back" | "review_request" | "rebooking" | "reminder" | "waitlist";
  customer_id: string;
  customer_name: string;
  channel: "email" | "sms";
  reason: string;
  message: string;
  value: number;
  due: string;
};

export function generateFollowUps(): FollowUp[] {
  const lapsed = getLapsedCustomers(60).slice(0, 6);
  const noReview = all<{ id: string; name: string; service_name: string; start_at: string; price: number }>(
    `SELECT b.id, c.name, s.name AS service_name, b.start_at, b.price
     FROM bookings b JOIN customers c ON c.id = b.customer_id JOIN services s ON s.id = b.service_id
     LEFT JOIN reviews r ON r.booking_id = b.id
     WHERE b.status = 'completed' AND r.id IS NULL AND b.start_at >= date('now', '-14 days')
     ORDER BY b.start_at DESC LIMIT 4`
  );
  const tomorrow = addDaysKey(todayKey(), 1);
  const reminders = all<{ id: string; name: string; service_name: string; start_at: string; price: number; customer_id: string }>(
    `SELECT b.id, c.name, c.id AS customer_id, s.name AS service_name, b.start_at, b.price
     FROM bookings b JOIN customers c ON c.id = b.customer_id JOIN services s ON s.id = b.service_id
     WHERE date(b.start_at, '+8 hours') = ? AND b.status IN ('confirmed','pending')`,
    [tomorrow]
  );
  const out: FollowUp[] = [];
  lapsed.forEach((c) =>
    out.push({
      id: `fu_lapsed_${c.id}`,
      type: "win_back",
      customer_id: c.id,
      customer_name: c.name,
      channel: "email",
      reason: `Last visit ${fmtDate(c.last_visit_at)} · ${c.visits} lifetime visits`,
      message: `Hi ${c.name.split(" ")[0]}, we've missed you at Lumière! It's been a couple of months — here's $20 toward your next visit. Book any time and we'll take care of the rest.`,
      value: 90,
      due: "this week",
    })
  );
  noReview.forEach((b, i) =>
    out.push({
      id: `fu_review_${b.id}_${i}`,
      type: "review_request",
      customer_id: b.id,
      customer_name: b.name,
      channel: "sms",
      reason: `${b.service_name} completed ${fmtDate(b.start_at)} — no review yet`,
      message: `Hi ${b.name.split(" ")[0]}, thanks for visiting Lumière! How was your ${b.service_name.toLowerCase()}? A quick review helps our small team enormously — it takes 30 seconds: lumierestudio.sg/review`,
      value: 0,
      due: "today",
    })
  );
  reminders.slice(0, 4).forEach((b) =>
    out.push({
      id: `fu_reminder_${b.id}`,
      type: "reminder",
      customer_id: b.customer_id,
      customer_name: b.name,
      channel: "sms",
      reason: `${b.service_name} tomorrow at ${fmtTime(b.start_at)}`,
      message: `Reminder: your ${b.service_name.toLowerCase()} at Lumière Studio is tomorrow at ${fmtTime(b.start_at)}. Reply Y to confirm or call +65 6733 8899 to change it.`,
      value: Number(b.price),
      due: "today",
    })
  );
  return out;
}

/* ---------------------------------------------------------------- no-show risk */

export function noShowRisk(limit = 12) {
  const rows = all<{
    id: string; code: string; start_at: string; price: number; source: string;
    customer_name: string; customer_id: string; service_name: string; staff_name: string;
    visits: number; no_shows: number; cancelled: number;
  }>(
    `SELECT b.id, b.code, b.start_at, b.price, b.source, c.name AS customer_name, c.id AS customer_id,
            s.name AS service_name, st.name AS staff_name,
            (SELECT COUNT(*) FROM bookings x WHERE x.customer_id = c.id AND x.status = 'completed') AS visits,
            (SELECT COUNT(*) FROM bookings x WHERE x.customer_id = c.id AND x.status = 'no_show') AS no_shows,
            (SELECT COUNT(*) FROM bookings x WHERE x.customer_id = c.id AND x.status = 'cancelled') AS cancelled
     FROM bookings b JOIN customers c ON c.id = b.customer_id
     JOIN services s ON s.id = b.service_id JOIN staff st ON st.id = b.staff_id
     WHERE b.start_at > datetime('now') AND b.status IN ('confirmed','pending')
     ORDER BY b.start_at ASC LIMIT 40`
  );
  return rows
    .map((r) => {
      let risk = 12;
      risk += Number(r.no_shows) * 22;
      risk += Number(r.cancelled) * 6;
      if (r.source === "online") risk += 5;
      if (Number(r.visits) === 0) risk += 14;
      if (Number(r.visits) > 6) risk -= 10;
      if (r.source === "walk_in") risk -= 6;
      risk = Math.max(3, Math.min(96, Math.round(risk)));
      return {
        ...r,
        risk,
        band: risk >= 55 ? "high" : risk >= 30 ? "medium" : "low",
        drivers: [
          Number(r.no_shows) ? `${r.no_shows} past no-show${Number(r.no_shows) === 1 ? "" : "s"}` : null,
          Number(r.visits) === 0 ? "First-time client" : null,
          Number(r.cancelled) > 1 ? `${r.cancelled} cancellations` : null,
          r.source === "online" ? "Self-booked online" : null,
        ].filter(Boolean) as string[],
      };
    })
    .sort((a, b) => b.risk - a.risk)
    .slice(0, limit);
}

/* ---------------------------------------------------------------- forecast payload */

export function aiForecast(days = 14) {
  const f = forecastDemand(days);
  const recommendations = f.forecast
    .filter((d) => d.level !== "healthy" && d.predicted > 0)
    .slice(0, 5)
    .map((d) => ({
      date: d.date,
      label: d.label,
      weekday: d.weekday,
      level: d.level,
      headline:
        d.level === "high"
          ? `${d.weekday} looks full — add a shift`
          : `${d.weekday} has spare capacity`,
      detail:
        d.level === "high"
          ? `Predicted ${d.predicted} bookings (${d.demandPct}% of capacity). Consider opening an extra chair or moving a flexible staff member onto this day.`
          : `Only ${d.predicted} bookings forecast (${d.demandPct}% of capacity). A targeted ${d.weekday}-only offer could fill ${Math.round((d.capacity - d.predicted) * 0.35)} more slots.`,
      action:
        d.level === "high"
          ? { label: "Open extra shift", href: "/dashboard/staff" }
          : { label: "Create promo", href: "/dashboard/marketing?compose=weekday" },
    }));
  return { ...f, recommendations };
}

export { scoreStaffForSlot };
