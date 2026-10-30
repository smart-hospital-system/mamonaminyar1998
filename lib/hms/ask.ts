import { hAll, hGet } from "./db";
import { hmsKpis, listBeds, listInvoices, listLabOrders, listMedicines, listSurgeries, revenueSeries, topDiagnoses } from "./queries";
import { healthSummary, openAlerts } from "./alerts";
import { noShowRisk } from "./ai";
import { money } from "./format";
import type { Lang } from "./i18n";

/**
 * Ask Aybek — a question in plain English or Dari, answered from this
 * hospital's own records.
 *
 * This is deliberately *not* a language model: it is a deterministic intent
 * reader over the local SQLite file. That matters in a ten-bed hospital with
 * unreliable internet — the answer is the same every time, it never leaves the
 * building, and it can be audited. Each intent owns its own query, so a new
 * question is a small, reviewable addition rather than a black box.
 *
 * Everything is bilingual: the intent is matched against English *and* Dari
 * keywords, and the answer is composed in the language the reader chose.
 */

export type AskCell = string | number;
export type AskAnswer = {
  intent: string;
  title: string;
  headline: string;
  detail: string;
  columns?: string[];
  rows?: AskCell[][];
  link?: { href: string; label: string };
  followups: { label: string; q: string }[];
  tone?: "brand" | "good" | "warn" | "bad";
};

type Ctx = { lang: Lang };

const L = (lang: Lang, en: string, fa: string) => (lang === "fa" ? fa : en);
const n = (lang: Lang, v: number | string) => (lang === "fa" ? String(v).replace(/\d/g, (d) => "۰۱۲۳۴۵۶۷۸۹"[Number(d)]) : String(v));

/** Match helpers: every keyword is a substring test on the lower-cased question. */
const has = (q: string, ...words: string[]) => words.some((w) => q.includes(w));

function moneyOf(lang: Lang, v: number) {
  return money(v, lang);
}

/* ------------------------------------------------------------------ intents */

function revenue(ctx: Ctx, q: string): AskAnswer {
  const { lang } = ctx;
  const k = hmsKpis();
  const series = revenueSeries(7);
  const week = series.reduce((a, p) => a + p.revenue, 0);
  const best = series.reduce((a, p) => (p.revenue > a.revenue ? p : a), series[0]);
  return {
    intent: "revenue",
    title: L(lang, "Money coming in", "پول وارد‌شده"),
    headline: moneyOf(lang, k.revenueToday),
    detail: L(
      lang,
      `Collected today. ${moneyOf(lang, week)} in the last seven days and ${moneyOf(lang, k.revenueMonth)} so far this month. ${moneyOf(lang, k.outstanding)} is still outstanding on unpaid bills. Best day this week: ${best?.label ?? "—"}.`,
      `امروز دریافت شد. در هفت روز گذشته ${moneyOf(lang, week)} و از آغاز ماه ${moneyOf(lang, k.revenueMonth)}. هنوز ${moneyOf(lang, k.outstanding)} از بل‌های پرداخت‌نشده باقی است. بهترین روز این هفته: ${best?.label ?? "—"}.`
    ),
    columns: [L(lang, "Day", "روز"), L(lang, "Collected", "دریافت"), L(lang, "Invoices", "بل‌ها")],
    rows: series.map((p) => [p.label, moneyOf(lang, p.revenue), n(lang, p.invoices)]),
    link: { href: "/hms/billing", label: L(lang, "Open billing", "رفتن به بل‌ها") },
    followups: [
      { label: L(lang, "Who has not paid?", "چه کسی پرداخت نکرده؟"), q: L(lang, "unpaid invoices", "بل‌های پرداخت‌نشده") },
      { label: L(lang, "What is low on stock?", "چه دوا کم است؟"), q: L(lang, "low stock", "موجودی کم") },
    ],
    tone: "good",
  };
}

function unpaid(ctx: Ctx): AskAnswer {
  const { lang } = ctx;
  const rows = listInvoices().filter((i) => i.status !== "paid" && Number(i.total) - Number(i.paid) > 0);
  const total = rows.reduce((a, i) => a + (Number(i.total) - Number(i.paid)), 0);
  return {
    intent: "unpaid",
    title: L(lang, "Unpaid bills", "بل‌های پرداخت‌نشده"),
    headline: moneyOf(lang, total),
    detail: L(
      lang,
      `${rows.length} bill(s) are not settled. The oldest is ${rows[rows.length - 1]?.invoice_no ?? "—"}. Reception can take payment from Billing, or send the printed statement home with the patient.`,
      `${rows.length} بل تسویه نشده است. قدیمی‌ترین: ${rows[rows.length - 1]?.invoice_no ?? "—"}. پذیرش می‌تواند از بخش بل‌ها پول بگیرد یا صورت‌حساب چاپی را با بیمار بفرستد.`
    ),
    columns: [L(lang, "Invoice", "بل"), L(lang, "Patient", "بیمار"), L(lang, "Due", "باقی"), L(lang, "Status", "وضعیت")],
    rows: rows.slice(0, 12).map((i) => [i.invoice_no, i.patient_name ?? "—", moneyOf(lang, Number(i.total) - Number(i.paid)), i.status]),
    link: { href: "/hms/billing", label: L(lang, "Open billing", "رفتن به بل‌ها") },
    followups: [
      { label: L(lang, "How much came in today?", "امروز چقدر آمد؟"), q: L(lang, "revenue today", "عاید امروز") },
      { label: L(lang, "Any patients likely to miss visits?", "کدام بیمار ممکن است نیاید؟"), q: L(lang, "no show risk", "خطر نیامدن") },
    ],
    tone: total > 0 ? "warn" : "good",
  };
}

function stock(ctx: Ctx): AskAnswer {
  const { lang } = ctx;
  const meds = listMedicines().filter((m) => Number(m.stock) <= Number(m.reorder_level));
  const soon = listMedicines().filter((m) => m.expiry && new Date(m.expiry).getTime() - Date.now() < 90 * 864e5);
  return {
    intent: "stock",
    title: L(lang, "Pharmacy stock", "موجودی دواخانه"),
    headline: n(lang, meds.length),
    detail: L(
      lang,
      `${meds.length} medicine(s) are at or below their reorder level, and ${soon.length} expire within 90 days. Restock from the pharmacy board — the quantity you enter is added, never replaced.`,
      `${meds.length} دوا به حد سفارش یا کمتر رسیده و ${soon.length} دوا در ۹۰ روز آینده منقضی می‌شود. از صفحهٔ دواخانه موجودی را اضافه کنید — عددی که وارد می‌کنید اضافه می‌شود، نه جایگزین.`
    ),
    columns: [L(lang, "Medicine", "دوا"), L(lang, "In stock", "موجود"), L(lang, "Reorder at", "حد سفارش"), L(lang, "Expiry", "انقضا")],
    rows: meds.slice(0, 12).map((m) => [m.name, n(lang, Number(m.stock)), n(lang, Number(m.reorder_level)), m.expiry ?? "—"]),
    link: { href: "/hms/pharmacy", label: L(lang, "Open pharmacy", "رفتن به دواخانه") },
    followups: [
      { label: L(lang, "What is expiring soon?", "چه چیزی زود منقضی می‌شود؟"), q: L(lang, "expiring medicines", "دواهای منقضی‌شونده") },
      { label: L(lang, "What is waiting in the lab?", "در لابراتوار چه منتظر است؟"), q: L(lang, "pending lab results", "نتایج لابراتوار") },
    ],
    tone: meds.length ? "warn" : "good",
  };
}

function expiry(ctx: Ctx): AskAnswer {
  const { lang } = ctx;
  const soon = listMedicines()
    .filter((m) => m.expiry)
    .sort((a, b) => String(a.expiry).localeCompare(String(b.expiry)))
    .slice(0, 12);
  return {
    intent: "expiry",
    title: L(lang, "Expiry watch", "پایش انقضا"),
    headline: n(lang, soon.filter((m) => new Date(String(m.expiry)).getTime() - Date.now() < 90 * 864e5).length),
    detail: L(
      lang,
      "Medicines sorted by expiry, earliest first. Anything inside 90 days should be used first or returned to the supplier — the pharmacy board flags the same items in red.",
      "دواها بر اساس تاریخ انقضا، زودترین اول. هر چیزی در ۹۰ روز آینده باید اول مصرف یا به تأمین‌کننده برگردانده شود — صفحهٔ دواخانه همان اقلام را سرخ نشان می‌دهد."
    ),
    columns: [L(lang, "Medicine", "دوا"), L(lang, "Batch", "بچ"), L(lang, "Expiry", "انقضا"), L(lang, "Stock", "موجودی")],
    rows: soon.map((m) => [m.name, m.batch ?? "—", m.expiry ?? "—", n(lang, Number(m.stock))]),
    link: { href: "/hms/pharmacy", label: L(lang, "Open pharmacy", "رفتن به دواخانه") },
    followups: [{ label: L(lang, "What is low on stock?", "چه دوا کم است؟"), q: L(lang, "low stock", "موجودی کم") }],
    tone: "warn",
  };
}

function lab(ctx: Ctx): AskAnswer {
  const { lang } = ctx;
  const open = listLabOrders().filter((l) => l.status !== "verified");
  const overdue = open.filter((l) => Date.now() - new Date(l.created_at).getTime() > 24 * 36e5);
  return {
    intent: "lab",
    title: L(lang, "Laboratory worklist", "کارتابل لابراتوار"),
    headline: n(lang, open.length),
    detail: L(
      lang,
      `${open.length} order(s) are not yet verified; ${overdue.length} have been open for more than 24 hours. Collect → result → verify, in that order, so the doctor never reads an unverified number.`,
      `${open.length} سفارش هنوز تأیید نشده؛ ${overdue.length} بیشتر از ۲۴ ساعت باز مانده. نمونه‌گیری ← نتیجه ← تأیید، به همین ترتیب، تا داکتر هرگز عدد تأییدنشده نبیند.`
    ),
    columns: [L(lang, "Order", "سفارش"), L(lang, "Test", "تست"), L(lang, "Patient", "بیمار"), L(lang, "Status", "وضعیت")],
    rows: open.slice(0, 12).map((l) => [l.id.toUpperCase(), l.test_name, l.patient_name ?? "—", l.status]),
    link: { href: "/hms/lab", label: L(lang, "Open laboratory", "رفتن به لابراتوار") },
    followups: [
      { label: L(lang, "How full are the beds?", "بسترها چقدر پر است؟"), q: L(lang, "bed occupancy", "اشغال بستر") },
      { label: L(lang, "Any critical alarms?", "هشدار بحرانی هست؟"), q: L(lang, "alerts", "هشدارها") },
    ],
    tone: overdue.length ? "bad" : "brand",
  };
}

function beds(ctx: Ctx): AskAnswer {
  const { lang } = ctx;
  const list = listBeds();
  const occupied = list.filter((b) => b.status === "occupied");
  const free = list.filter((b) => b.status === "free" || b.status === "available");
  return {
    intent: "beds",
    title: L(lang, "Bed state", "وضعیت بسترها"),
    headline: `${n(lang, occupied.length)}/${n(lang, list.length)}`,
    detail: L(
      lang,
      `${occupied.length} of ${list.length} beds are occupied (${Math.round((occupied.length / Math.max(1, list.length)) * 100)}%). ${free.length} are ready to admit. Cleaning a bed takes one click and returns it to the pool.`,
      `${occupied.length} از ${list.length} بستر اشغال است (${n(lang, Math.round((occupied.length / Math.max(1, list.length)) * 100))}%). ${free.length} بستر آمادهٔ بستری است. پاک کردن بستر با یک کلیک آن را به فهرست برمی‌گرداند.`
    ),
    columns: [L(lang, "Bed", "بستر"), L(lang, "Ward", "وارڈ"), L(lang, "Status", "وضعیت"), L(lang, "Patient", "بیمار")],
    rows: list.map((b) => [b.label, b.ward ?? "—", b.status, b.patient_name ?? "—"]),
    link: { href: "/hms/inpatients", label: L(lang, "Open inpatients", "رفتن به بستری") },
    followups: [{ label: L(lang, "Who is in theatre today?", "امروز در عملیات کیست؟"), q: L(lang, "surgery today", "عملیات امروز") }],
    tone: occupied.length >= list.length ? "bad" : "brand",
  };
}

function surgery(ctx: Ctx): AskAnswer {
  const { lang } = ctx;
  const today = new Date().toISOString().slice(0, 10);
  const all = listSurgeries();
  const todays = all.filter((s) => String(s.scheduled_at).slice(0, 10) === today);
  return {
    intent: "surgery",
    title: L(lang, "Theatre list", "لیست عملیات"),
    headline: n(lang, todays.length),
    detail: L(
      lang,
      `${todays.length} procedure(s) are booked today out of ${all.length} in the register. Start, complete or cancel from the theatre board — the bed and the bill follow the same record.`,
      `امروز ${todays.length} عملیات از ${all.length} ثبت‌شده در دفتر برنامه شده است. شروع، تکمیل یا لغو از صفحهٔ عملیات — بستر و بل از همان سابقه پیروی می‌کنند.`
    ),
    columns: [L(lang, "Time", "زمان"), L(lang, "Procedure", "عملیات"), L(lang, "Patient", "بیمار"), L(lang, "Status", "وضعیت")],
    rows: (todays.length ? todays : all).slice(0, 10).map((s) => [String(s.scheduled_at).slice(11, 16), s.procedure_name, s.patient_name ?? "—", s.status]),
    link: { href: "/hms/surgery", label: L(lang, "Open surgery", "رفتن به عملیات") },
    followups: [{ label: L(lang, "How full are the beds?", "بسترها چقدر پر است؟"), q: L(lang, "bed occupancy", "اشغال بستر") }],
    tone: "brand",
  };
}

function diagnoses(ctx: Ctx): AskAnswer {
  const { lang } = ctx;
  const rows = topDiagnoses(10);
  return {
    intent: "diagnoses",
    title: L(lang, "What the hospital is treating", "بیماری‌های در حال تداوی"),
    headline: rows[0]?.diagnosis ?? "—",
    detail: L(
      lang,
      `Most frequent diagnosis across documented encounters, followed by ${rows[1]?.diagnosis ?? "—"} and ${rows[2]?.diagnosis ?? "—"}. Useful for ordering stock and planning theatre lists.`,
      `شایع‌ترین تشخیص در معاینات ثبت‌شده، سپس ${rows[1]?.diagnosis ?? "—"} و ${rows[2]?.diagnosis ?? "—"}. برای سفارش دوا و برنامه‌ریزی عملیات مفید است.`
    ),
    columns: [L(lang, "Diagnosis", "تشخیص"), L(lang, "Encounters", "معاینات")],
    rows: rows.map((r) => [r.diagnosis, n(lang, r.n)]),
    link: { href: "/hms/analytics", label: L(lang, "Open analytics", "رفتن به تحلیل") },
    followups: [{ label: L(lang, "What medicines do we use most?", "کدام دوا بیشتر استفاده می‌شود؟"), q: L(lang, "top medicines", "دواهای پرمصرف") }],
    tone: "brand",
  };
}

function risk(ctx: Ctx): AskAnswer {
  const { lang } = ctx;
  const risky = noShowRisk(8);
  return {
    intent: "risk",
    title: L(lang, "Patients at risk of missing a visit", "بیماران در خطر نیامدن"),
    headline: n(lang, risky.length),
    detail: L(
      lang,
      "Scored from past no-shows, distance and how far ahead the appointment was booked. A phone call the day before is the cheapest intervention the hospital has.",
      "بر اساس نیامدن‌های گذشته، فاصله و مدت پیش از وقت امتیاز داده شده. یک تلیفون یک روز قبل، ارزان‌ترین راه‌حل شفاخانه است."
    ),
    columns: [L(lang, "Patient", "بیمار"), L(lang, "When", "زمان"), L(lang, "Risk", "خطر")],
    rows: risky.map((r) => [r.name ?? "—", String(r.start_at ?? "").slice(0, 16).replace("T", " "), `${n(lang, r.risk)}%`]),
    link: { href: "/hms/analytics", label: L(lang, "Open analytics", "رفتن به تحلیل") },
    followups: [{ label: L(lang, "Today's appointment list", "لیست وقت‌های امروز"), q: L(lang, "appointments today", "وقت‌های امروز") }],
    tone: "warn",
  };
}

function appointments(ctx: Ctx): AskAnswer {
  const { lang } = ctx;
  const today = new Date().toISOString().slice(0, 10);
  const rows = hAll<{ start_at: string; patient: string | null; doctor: string | null; department: string; status: string }>(
    `SELECT a.start_at, p.name AS patient, u.name AS doctor, a.department, a.status
       FROM hms_appointments a
       LEFT JOIN hms_patients p ON p.id = a.patient_id
       LEFT JOIN hms_users u ON u.id = a.doctor_id
      WHERE substr(a.start_at,1,10) = ? ORDER BY a.start_at`,
    [today]
  );
  return {
    intent: "appointments",
    title: L(lang, "Today's clinic", "کلینیک امروز"),
    headline: n(lang, rows.length),
    detail: L(
      lang,
      `${rows.length} appointment(s) booked today, ${rows.filter((r) => r.status === "completed").length} already seen. ${rows.filter((r) => r.status === "waiting").length} waiting in the queue right now.`,
      `امروز ${rows.length} وقت ثبت شده، ${rows.filter((r) => r.status === "completed").length} معاینه شده. ${rows.filter((r) => r.status === "waiting").length} نفر همین حالا در انتظار است.`
    ),
    columns: [L(lang, "Time", "زمان"), L(lang, "Patient", "بیمار"), L(lang, "Doctor", "داکتر"), L(lang, "Status", "وضعیت")],
    rows: rows.slice(0, 14).map((r) => [r.start_at.slice(11, 16), r.patient ?? "—", r.doctor ?? "—", r.status]),
    link: { href: "/hms/opd", label: L(lang, "Open OPD", "رفتن به معاینات") },
    followups: [{ label: L(lang, "Who might not come?", "چه کسی ممکن است نیاید؟"), q: L(lang, "no show risk", "خطر نیامدن") }],
    tone: "brand",
  };
}

function alertsIntent(ctx: Ctx): AskAnswer {
  const { lang } = ctx;
  const alerts = openAlerts();
  const health = healthSummary();
  return {
    intent: "alerts",
    title: L(lang, "Monitor", "مانیتور"),
    headline: `${n(lang, health.score)}%`,
    detail: L(
      lang,
      `System health ${health.score}%. ${alerts.filter((a) => a.severity === "critical").length} critical and ${alerts.filter((a) => a.severity === "warning").length} warning alarm(s) are open. The monitor re-scans every 30 minutes and can heal the safe fixes itself.`,
      `سلامت سیستم ${n(lang, health.score)}%. ${alerts.filter((a) => a.severity === "critical").length} هشدار بحرانی و ${alerts.filter((a) => a.severity === "warning").length} اخطار باز است. مانیتور هر ۳۰ دقیقه بازبینی می‌کند و رفع‌های ایمن را خودش انجام می‌دهد.`
    ),
    columns: [L(lang, "Severity", "شدت"), L(lang, "Title", "عنوان"), L(lang, "Category", "بخش")],
    rows: alerts.slice(0, 10).map((a) => [a.severity, a.title, a.category]),
    link: { href: "/hms/alerts", label: L(lang, "Open monitor", "رفتن به مانیتور") },
    followups: [{ label: L(lang, "What is low on stock?", "چه دوا کم است؟"), q: L(lang, "low stock", "موجودی کم") }],
    tone: alerts.some((a) => a.severity === "critical") ? "bad" : "good",
  };
}

function patientsIntent(ctx: Ctx): AskAnswer {
  const { lang } = ctx;
  const k = hmsKpis();
  const latest = hAll<{ name: string; mrn: string; created_at: string }>(
    "SELECT name, mrn, created_at FROM hms_patients ORDER BY created_at DESC LIMIT 8"
  );
  return {
    intent: "patients",
    title: L(lang, "Patient register", "دفتر بیماران"),
    headline: n(lang, k.patients),
    detail: L(
      lang,
      `${k.patients} patients are registered, ${k.newPatients} of them this month. ${k.todayAppts} appointment(s) today. Every chart keeps its encounters, prescriptions, labs, imaging, admissions, invoices and operations on one page.`,
      `${k.patients} بیمار ثبت شده، ${k.newPatients} در همین ماه. امروز ${k.todayAppts} وقت. هر پرونده همهٔ معاینات، نسخه‌ها، لابراتوار، اکسری، بستری، بل و عملیات خود را در یک صفحه دارد.`
    ),
    columns: [L(lang, "Patient", "بیمار"), L(lang, "MRN", "MRN"), L(lang, "Registered", "ثبت")],
    rows: latest.map((p) => [p.name, p.mrn, p.created_at.slice(0, 10)]),
    link: { href: "/hms/patients", label: L(lang, "Open patients", "رفتن به بیماران") },
    followups: [{ label: L(lang, "Today's clinic", "کلینیک امروز"), q: L(lang, "appointments today", "وقت‌های امروز") }],
    tone: "brand",
  };
}

function drugs(ctx: Ctx): AskAnswer {
  const { lang } = ctx;
  const rows = hAll<{ drug: string; n: number }>("SELECT drug, COUNT(*) AS n FROM hms_rx_items GROUP BY drug ORDER BY n DESC LIMIT 10");
  return {
    intent: "drugs",
    title: L(lang, "Most prescribed medicines", "دواهای پرمصرف"),
    headline: rows[0]?.drug ?? "—",
    detail: L(
      lang,
      "Counted from every prescription line in the hospital. Watch the top three against stock: they are the ones that run out first.",
      "از همهٔ سطرهای نسخه شمرده شده. سه داوای اول را با موجودی مقایسه کنید — همان‌ها اول تمام می‌شوند."
    ),
    columns: [L(lang, "Medicine", "دوا"), L(lang, "Lines", "سطرها")],
    rows: rows.map((r) => [r.drug, n(lang, r.n)]),
    link: { href: "/hms/pharmacy", label: L(lang, "Open pharmacy", "رفتن به دواخانه") },
    followups: [{ label: L(lang, "What is low on stock?", "چه دوا کم است؟"), q: L(lang, "low stock", "موجودی کم") }],
    tone: "brand",
  };
}

function summary(ctx: Ctx): AskAnswer {
  const { lang } = ctx;
  const k = hmsKpis();
  const health = healthSummary();
  return {
    intent: "summary",
    title: L(lang, "The hospital right now", "شفاخانه در همین لحظه"),
    headline: moneyOf(lang, k.revenueToday),
    detail: L(
      lang,
      `${k.patients} patients · ${k.todayAppts} appointments today · ${k.bedOccupied}/${k.bedTotal} beds · ${k.labOpen} lab orders open · ${k.lowStock} medicines low · ${moneyOf(lang, k.outstanding)} unpaid · health ${health.score}%.`,
      `${k.patients} بیمار · ${k.todayAppts} وقت امروز · ${k.bedOccupied}/${k.bedTotal} بستر · ${k.labOpen} سفارش لابراتوار باز · ${k.lowStock} دوا کم · ${moneyOf(lang, k.outstanding)} پرداخت‌نشده · سلامت ${health.score}%.`
    ),
    columns: [L(lang, "Measure", "شاخص"), L(lang, "Value", "مقدار")],
    rows: [
      [L(lang, "Collected today", "دریافت امروز"), moneyOf(lang, k.revenueToday)],
      [L(lang, "Collected this month", "دریافت این ماه"), moneyOf(lang, k.revenueMonth)],
      [L(lang, "Outstanding", "باقی"), moneyOf(lang, k.outstanding)],
      [L(lang, "Appointments today", "وقت‌های امروز"), n(lang, k.todayAppts)],
      [L(lang, "Bed occupancy", "اشغال بستر"), `${n(lang, k.occupancy)}%`],
      [L(lang, "Open lab orders", "سفارش لابراتوار"), n(lang, k.labOpen)],
      [L(lang, "Low-stock medicines", "دواهای کم"), n(lang, k.lowStock)],
      [L(lang, "System health", "سلامت سیستم"), `${n(lang, health.score)}%`],
    ],
    link: { href: "/hms", label: L(lang, "Open command centre", "رفتن به مرکز فرمان") },
    followups: [
      { label: L(lang, "What is low on stock?", "چه دوا کم است؟"), q: L(lang, "low stock", "موجودی کم") },
      { label: L(lang, "How much came in today?", "امروز چقدر آمد؟"), q: L(lang, "revenue today", "عاید امروز") },
      { label: L(lang, "Any critical alarms?", "هشدار بحرانی هست؟"), q: L(lang, "alerts", "هشدارها") },
    ],
    tone: "brand",
  };
}

/* ------------------------------------------------------------------ routing */

/**
 * Read the question and pick the one intent that fits best.
 *
 * Order matters: the most specific phrases are tested first, so "unpaid
 * invoices" never falls through to the generic money answer. Both languages
 * are matched in the same pass because a Dari sentence often contains an
 * English drug or test name.
 */
export function answer(question: string, lang: Lang): AskAnswer {
  const q = question.toLowerCase().trim();
  if (!q) return summary({ lang });

  if (has(q, "unpaid", "not paid", "due", "debt", "پرداخت‌نشده", "پرداخت نشده", "بدهی", "باقی")) return unpaid({ lang });
  if (has(q, "expir", "انقضا", "تاریخ")) return expiry({ lang });
  if (has(q, "stock", "inventory", "out of", "reorder", "موجودی", "کم", "دواخانه")) return stock({ lang });
  if (has(q, "lab", "laborator", "test result", "لابراتوار", "آزمایش", "نتیجه")) return lab({ lang });
  if (has(q, "bed", "ward", "admit", "بستر", "وارڈ", "بستری")) return beds({ lang });
  if (has(q, "surg", "theatre", "operation", "عملیات", "جراح")) return surgery({ lang });
  if (has(q, "no show", "no-show", "risk", "نیامدن", "خطر", "غیرحاضر")) return risk({ lang });
  if (has(q, "appointment", "clinic today", "queue", "waiting", "وقت", "نوبت", "کلینیک")) return appointments({ lang });
  if (has(q, "alert", "alarm", "monitor", "health", "هشدار", "اخطار", "مانیتور", "سلامت")) return alertsIntent({ lang });
  if (has(q, "diagnos", "disease", "تشخیص", "بیماری", "مریضی")) return diagnoses({ lang });
  if (has(q, "prescri", "drug", "medicine use", "نسخه", "دوا")) return drugs({ lang });
  if (has(q, "revenue", "money", "income", "earn", "paid today", "عاید", "درآمد", "پول", "عایدی")) return revenue({ lang }, q);
  if (has(q, "patient", "how many", "register", "بیمار", "چند")) return patientsIntent({ lang });
  return summary({ lang });
}

/** The chips shown on an empty Ask screen — the questions a hospital asks daily. */
export function suggestions(lang: Lang) {
  return [
    { label: L(lang, "How are we doing today?", "امروز وضعیت چطور است؟"), q: L(lang, "summary", "خلاصه") },
    { label: L(lang, "How much came in today?", "امروز چقدر عاید شد؟"), q: L(lang, "revenue today", "عاید امروز") },
    { label: L(lang, "Who has not paid?", "چه کسی پرداخت نکرده؟"), q: L(lang, "unpaid invoices", "بل‌های پرداخت‌نشده") },
    { label: L(lang, "What is low on stock?", "چه دوا کم است؟"), q: L(lang, "low stock", "موجودی کم") },
    { label: L(lang, "What is waiting in the lab?", "در لابراتوار چه منتظر است؟"), q: L(lang, "pending lab", "لابراتوار") },
    { label: L(lang, "How full are the beds?", "بسترها چقدر پر است؟"), q: L(lang, "bed occupancy", "اشغال بستر") },
    { label: L(lang, "What is expiring soon?", "چه چیزی زود منقضی می‌شود؟"), q: L(lang, "expiring", "انقضا") },
    { label: L(lang, "Any critical alarms?", "هشدار بحرانی هست؟"), q: L(lang, "alerts", "هشدارها") },
  ];
}

/** A one-line banner for the command centre: the single most useful fact now. */
export function dailyBrief(lang: Lang) {
  const k = hmsKpis();
  const parts: string[] = [];
  parts.push(L(lang, `${moneyOf(lang, k.revenueToday)} collected today`, `امروز ${moneyOf(lang, k.revenueToday)} دریافت شد`));
  if (k.lowStock) parts.push(L(lang, `${k.lowStock} medicine(s) low`, `${k.lowStock} دوا کم است`));
  if (k.outstanding) parts.push(L(lang, `${moneyOf(lang, k.outstanding)} unpaid`, `${moneyOf(lang, k.outstanding)} پرداخت‌نشده`));
  if (k.labOpen) parts.push(L(lang, `${k.labOpen} lab order(s) open`, `${k.labOpen} سفارش لابراتوار باز`));
  const row = hGet<{ c: number }>("SELECT COUNT(*) AS c FROM hms_alerts WHERE status = 'open' AND severity = 'critical'");
  if (Number(row?.c ?? 0) > 0) parts.push(L(lang, `${row?.c} critical alarm(s)`, `${row?.c} هشدار بحرانی`));
  return parts.join(" · ");
}
