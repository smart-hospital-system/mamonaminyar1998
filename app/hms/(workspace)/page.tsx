import {
  Activity, AlertTriangle, ArrowUpRight, BedDouble, CalendarClock, ClipboardList, FlaskConical, HeartPulse,
  Pill, Printer, Scissors, ShieldAlert, Sparkles, Stethoscope, TrendingUp, Users, Wallet, Wrench,
} from "lucide-react";
import Link from "next/link";
import { AlertList, ScanButton } from "@/components/hms/alert-list";
import { dateLong, digitsOf, money, relTime, timeShort } from "@/lib/hms/format";
import { statusText, t } from "@/lib/hms/i18n";
import { getLang } from "@/lib/hms/lang-server";
import { AreaLine, Bars, Donut, LoadBar } from "@/components/hms/charts";
import { Btn, Empty, Meter, Panel, Person, Pill as PillTag, SectionTitle, Stat, Status } from "@/components/hms/ui";
import { getHmsUser } from "@/lib/hms/auth";
import { getSection, hGet, hmsReady } from "@/lib/hms/db";
import { departmentLoad, forecastOpd, generateFollowUps, insights, noShowRisk } from "@/lib/hms/ai";
import { healthSummary, openAlerts } from "@/lib/hms/alerts";
import { licenseState } from "@/lib/hms/license";
import {
  departmentMix, hmsKpis, listAdmissions, listAppointments, listBeds, listInvoices, listLabOrders,
  listPrescriptions, listSurgeries, recentActivity, revenueSeries, topDiagnoses,
} from "@/lib/hms/queries";

export const dynamic = "force-dynamic";

export default async function CommandCentre({ searchParams }: { searchParams: Promise<{ denied?: string }> }) {
  await hmsReady();
  const lang = await getLang();
  const sp = await searchParams;
  const tr = (key: string, vars?: Record<string, string | number>) => t(lang, key, vars);
  const user = await getHmsUser();
  const identity = getSection<Record<string, unknown>>("identity");
  const kpis = hmsKpis();
  const revenue = revenueSeries(14);
  const today = new Date().toISOString().slice(0, 10);
  const appointments = listAppointments(today);
  const prescriptions = listPrescriptions({ limit: 6 });
  const labs = listLabOrders();
  const beds = listBeds();
  const admissions = listAdmissions();
  const surgeries = listSurgeries();
  const invoices = listInvoices().slice(0, 6);
  const alerts = openAlerts();
  const health = healthSummary();
  const ideas = insights();
  const load = departmentLoad();
  const forecast = forecastOpd(14);
  const followUps = generateFollowUps().slice(0, 3);
  const risky = noShowRisk(5);
  const activity = recentActivity(12);
  const mix = departmentMix();
  const diagnoses = topDiagnoses(6);
  const lic = licenseState();

  const hour = new Date().getHours();
  const greetingKey = hour < 12 ? "dash.greeting" : hour < 17 ? "dash.greetingPM" : "dash.greetingEve";
  const firstName = (user?.name ?? "Doctor").split(" ").slice(0, 2).join(" ");
  const upcoming = appointments.filter((a) => ["waiting", "confirmed", "scheduled"].includes(a.status));
  const theatreToday = surgeries.filter((s) => String(s.scheduled_at ?? "").slice(0, 10) === today);
  const occupied = beds.filter((b) => b.status === "occupied");
  const pendingReview = labs.filter((l) => l.status !== "verified");
  const criticalAlerts = alerts.filter((a) => a.severity === "critical");

  return (
    <div className="space-y-3.5">
      {sp.denied && (
        <div
          className="flex items-start gap-2 rounded-lg border px-3 py-2 text-[0.72rem]"
          style={{ borderColor: "#fca5a5", background: "#fef2f2", color: "#991b1b" }}
        >
          <ShieldAlert size={14} className="mt-0.5 shrink-0" />
          <div>
            <p className="font-semibold">
              {tr("dash.deniedTitle")}
            </p>
            <p className="mt-0.5">
              {tr("dash.deniedBody")}
            </p>
          </div>
        </div>
      )}
      {/* ------------------------------------------------------------ hero */}
      <Panel className="relative overflow-hidden !p-0">
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.07]"
          style={{ backgroundImage: "radial-gradient(circle at 88% 12%, var(--hms-brand) 0, transparent 42%), radial-gradient(circle at 8% 92%, #38bdf8 0, transparent 38%)" }}
        />
        <div className="relative flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-1.5">
              <PillTag tone="brand" dot>
                {dateLong(new Date().toISOString(), lang)}
              </PillTag>
              <PillTag tone={health.score >= 85 ? "good" : health.score >= 65 ? "warn" : "bad"}>
                {tr("dash.healthPill", { score: digitsOf(lang, health.score) })}
              </PillTag>
              <PillTag tone={lic.status === "active" ? "good" : lic.daysLeft > 0 ? "warn" : "bad"}>
                {lic.status === "active" ? tr("dash.licensed") : lic.daysLeft > 0 ? tr("dash.trial", { days: digitsOf(lang, lic.daysLeft) }) : tr("dash.expired")}
              </PillTag>
            </div>
            <h2 className="mt-2 text-[1.22rem] font-semibold tracking-[-0.025em]">
              {tr(greetingKey, { name: firstName })}
            </h2>
            <p className="mt-0.5 max-w-xl text-[0.75rem] leading-relaxed" style={{ color: "var(--hms-muted)" }}>
              {tr("dash.summary", {
                tagline: String(identity.tagline ?? "Ten beds. One standard."),
                waiting: digitsOf(lang, upcoming.length),
                results: digitsOf(lang, pendingReview.length),
                alarms: digitsOf(lang, alerts.length),
              })}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            <Link href="/hms/opd"><Btn variant="primary" icon={<Stethoscope size={13} />}>{tr("dash.startConsult")}</Btn></Link>
            <Link href="/hms/patients?new=1"><Btn icon={<Users size={13} />}>{tr("dash.register")}</Btn></Link>
            <Link href="/hms/print"><Btn icon={<Printer size={13} />}>{tr("dash.printStudio")}</Btn></Link>
          </div>
        </div>
      </Panel>

      {/* ------------------------------------------------------------ kpis */}
      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 xl:grid-cols-6">
        <Link href="/hms/patients"><Stat label={tr("dash.kpiPatients")} value={digitsOf(lang, kpis.patients)} hint={tr("dash.kpiPatientsHint", { n: digitsOf(lang, kpis.newPatients) })} icon={<Users size={15} />} tone="brand" /></Link>
        <Link href="/hms/opd"><Stat label={tr("dash.kpiClinic")} value={digitsOf(lang, kpis.todayAppts)} hint={tr("dash.kpiClinicHint", { n: digitsOf(lang, upcoming.length) })} icon={<CalendarClock size={15} />} tone="info" /></Link>
        <Link href="/hms/prescriptions"><Stat label={tr("dash.kpiRx")} value={digitsOf(lang, kpis.pendingRx)} hint={tr("dash.kpiRxHint")} icon={<Pill size={15} />} tone="warn" /></Link>
        <Link href="/hms/lab"><Stat label={tr("dash.kpiLab")} value={digitsOf(lang, kpis.labOpen + kpis.imgOpen)} hint={tr("dash.kpiLabHint", { n: digitsOf(lang, kpis.criticalLabs) })} icon={<FlaskConical size={15} />} tone={kpis.criticalLabs ? "bad" : "info"} /></Link>
        <Link href="/hms/inpatients"><Stat label={tr("dash.kpiBeds")} value={`${digitsOf(lang, kpis.bedOccupied)}/${digitsOf(lang, kpis.bedTotal)}`} hint={tr("dash.kpiBedsHint", { pct: digitsOf(lang, kpis.occupancy) })} icon={<BedDouble size={15} />} tone={kpis.occupancy >= 80 ? "bad" : "good"} /></Link>
        <Link href="/hms/billing"><Stat label={tr("dash.kpiMoney")} value={money(kpis.revenueToday, lang)} hint={tr("dash.kpiMoneyHint", { amount: money(kpis.outstanding, lang) })} icon={<Wallet size={15} />} tone="good" /></Link>
      </div>

      {/* ------------------------------------------------- revenue + clinic */}
      <div className="grid gap-3.5 xl:grid-cols-[1.55fr_1fr]">
        <Panel>
          <SectionTitle
            title={tr("dash.collections")}
            subtitle={tr("dash.collectionsSub")}
            icon={<TrendingUp size={14} />}
            action={<PillTag tone="good">{tr("dash.in14", { amount: money(revenue.reduce((a, b) => a + b.revenue, 0), lang) })}</PillTag>}
          />
          <div className="mt-3">
            <AreaLine data={revenue.map((r) => ({ label: r.label.split(" ")[0], value: r.revenue }))} format="money" />
          </div>
          <div className="mt-3 grid gap-3 sm:grid-cols-[1.2fr_1fr]">
            <div className="hms-panel p-2.5">
              <p className="text-[0.6rem] font-bold uppercase tracking-[0.06em]" style={{ color: "var(--hms-faint)" }}>{tr("dash.invoicesPerDay")}</p>
              <div className="mt-1.5">
                <Bars data={revenue.slice(-10).map((r) => ({ label: r.label.split(" ")[0], value: r.invoices }))} height={86} />
              </div>
            </div>
            <div className="hms-panel p-2.5">
              <p className="text-[0.6rem] font-bold uppercase tracking-[0.06em]" style={{ color: "var(--hms-faint)" }}>{tr("dash.whereFrom")}</p>
              <div className="mt-2 space-y-1.5">
                {mix.slice(0, 4).map((m) => (
                  <div key={m.department}>
                    <div className="flex justify-between text-[0.66rem]">
                      <span>{m.department}</span>
                      <span style={{ color: "var(--hms-faint)" }}>{m.n}</span>
                    </div>
                    <Meter value={m.n} max={mix[0]?.n ?? 1} height={4} />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </Panel>

        <Panel className="flex flex-col">
          <SectionTitle
            title={tr("dash.todayClinic")}
            subtitle={tr("dash.clinicSub", { n: digitsOf(lang, appointments.length), done: digitsOf(lang, appointments.filter((a) => a.status === "completed").length) })}
            icon={<Stethoscope size={14} />}
            action={<Link href="/hms/opd" className="text-[0.66rem] font-semibold" style={{ color: "var(--hms-brand)" }}>{tr("dash.openOpd")}</Link>}
          />
          <div className="mt-2.5 max-h-[19rem] flex-1 space-y-1 overflow-y-auto pr-0.5">
            {appointments.length === 0 && <Empty title={tr("dash.noClinic")} hint={tr("dash.noClinicHint")} icon={<CalendarClock size={16} />} />}
            {appointments.slice(0, 12).map((a) => (
              <div key={a.id} className="flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-[var(--hms-surface-2)]">
                <div className="w-11 shrink-0 text-center">
                  <p className="text-[0.66rem] font-semibold leading-none">{timeShort(a.start_at, lang)}</p>
                  <p className="mt-0.5 text-[0.55rem] uppercase" style={{ color: "var(--hms-faint)" }}>{a.department}</p>
                </div>
                <Person name={a.patient_name ?? "Patient"} sub={a.reason ?? a.mrn ?? undefined} size={26} />
                <Status value={a.status} className="ml-auto" />
              </div>
            ))}
          </div>
        </Panel>
      </div>

      {/* --------------------------------------- monitor + load + insights */}
      <div className="grid gap-3.5 xl:grid-cols-3">
        <Panel>
          <SectionTitle
            title={tr("dash.monitorTitle")}
            subtitle={tr("dash.monitorSub")}
            icon={<Wrench size={14} />}
            action={<ScanButton />}
          />
          <div className="mt-2 flex items-center gap-3 rounded-lg p-2" style={{ background: "var(--hms-surface-2)" }}>
            <div className="text-center">
              <p className="text-[1.3rem] font-semibold leading-none" style={{ color: health.score >= 85 ? "#0b7a58" : health.score >= 65 ? "#b45309" : "#b91c1c" }}>
                {digitsOf(lang, health.score)}
              </p>
              <p className="text-[0.55rem] uppercase tracking-wide" style={{ color: "var(--hms-faint)" }}>{tr("dash.score")}</p>
            </div>
            <div className="grid flex-1 grid-cols-3 gap-1.5 text-center">
              {[
                { k: tr("status.critical"), v: health.critical, c: "#b91c1c" },
                { k: tr("status.warning"), v: health.warning, c: "#b45309" },
                { k: tr("status.open"), v: health.open, c: "var(--hms-brand)" },
              ].map((s) => (
                <div key={s.k}>
                  <p className="text-[0.86rem] font-semibold leading-none" style={{ color: s.c }}>{digitsOf(lang, s.v)}</p>
                  <p className="text-[0.54rem] uppercase tracking-wide" style={{ color: "var(--hms-faint)" }}>{s.k}</p>
                </div>
              ))}
            </div>
          </div>
          <div className="mt-2">
            <AlertList alerts={criticalAlerts.length ? criticalAlerts.slice(0, 2) : alerts.slice(0, 2)} compact />
          </div>
          <Link href="/hms/alerts" className="mt-2 block text-center text-[0.66rem] font-semibold" style={{ color: "var(--hms-brand)" }}>
            {tr("dash.allAlarms", { n: digitsOf(lang, alerts.length) })}
          </Link>
        </Panel>

        <Panel>
          <SectionTitle title={tr("dash.deptLoad")} subtitle={tr("dash.deptLoadSub")} icon={<Activity size={14} />} />
          <div className="mt-3 space-y-2">
            {load.slice(0, 6).map((d) => (
              <LoadBar
                key={d.department}
                label={d.department}
                value={d.backlog}
                max={Math.max(12, ...load.map((x) => x.backlog))}
                hint={`${d.department === "OPD" ? tr("nav.opd") : d.department} · ${digitsOf(lang, d.today)} ${tr("c.today2")} · ${digitsOf(lang, d.week)}`}
              />
            ))}
          </div>
          <div className="mt-3 rounded-lg p-2.5" style={{ background: "var(--hms-surface-2)" }}>
            <p className="text-[0.6rem] font-bold uppercase tracking-[0.06em]" style={{ color: "var(--hms-faint)" }}>{tr("dash.forecast")}</p>
            <p className="mt-1 text-[0.72rem] leading-relaxed">
              {tr("dash.forecastText", { avg: digitsOf(lang, forecast.avg), day: forecast.busiest })}
              {forecast.trend !== 0 && (forecast.trend > 0 ? tr("dash.forecastRising") : tr("dash.forecastEasing"))}
            </p>
            <div className="mt-2 flex items-end gap-1">
              {forecast.points.map((p) => (
                <div key={p.date} className="flex-1" title={`${p.date} · ${p.visits} visits · ${p.demandPct}% capacity`}>
                  <div
                    className="w-full rounded-t-[2px]"
                    style={{
                      height: `${Math.max(4, (p.visits / Math.max(...forecast.points.map((x) => x.visits))) * 34)}px`,
                      background: p.level === "high" ? "#f59e0b" : p.level === "steady" ? "var(--hms-brand)" : "color-mix(in srgb, var(--hms-brand) 45%, transparent)",
                    }}
                  />
                </div>
              ))}
            </div>
          </div>
        </Panel>

        <Panel>
          <SectionTitle
            title={tr("dash.insights")}
            subtitle={tr("dash.insightsSub")}
            icon={<Sparkles size={14} />}
            action={<PillTag tone="brand">{ideas.length}</PillTag>}
          />
          <div className="mt-2 space-y-1.5">
            {ideas.slice(0, 5).map((i) => (
              <div key={i.id} className="rounded-lg border p-2" style={{ borderColor: "var(--hms-border)" }}>
                <div className="flex items-start gap-1.5">
                  <span
                    className="mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full"
                    style={{ background: i.severity === "warning" ? "#f59e0b" : i.severity === "win" ? "#10b981" : "var(--hms-brand)" }}
                  />
                  <div className="min-w-0">
                    <p className="text-[0.72rem] font-semibold leading-tight">{i.title}</p>
                    <p className="mt-0.5 line-clamp-2 text-[0.65rem] leading-snug" style={{ color: "var(--hms-muted)" }}>{i.detail}</p>
                    {i.action && (
                      <Link href={i.action.href} className="mt-1 inline-flex items-center gap-0.5 text-[0.63rem] font-semibold" style={{ color: "var(--hms-brand)" }}>
                        {i.action.label} <ArrowUpRight size={10} />
                      </Link>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Panel>
      </div>

      {/* ------------------------------------------------- bed / theatre / money */}
      <div className="grid gap-3.5 xl:grid-cols-3">
        <Panel>
          <SectionTitle
            title={tr("dash.bedBoard")}
            subtitle={tr("dash.bedBoardSub", {
              occ: digitsOf(lang, occupied.length),
              free: digitsOf(lang, beds.filter((b) => b.status === "available").length),
              clean: digitsOf(lang, beds.filter((b) => b.status === "cleaning").length),
            })}
            icon={<HeartPulse size={14} />}
            action={<Link href="/hms/inpatients" className="text-[0.66rem] font-semibold" style={{ color: "var(--hms-brand)" }}>{tr("dash.manage")}</Link>}
          />
          <div className="mt-2.5 grid grid-cols-2 gap-1.5">
            {beds.map((b) => (
              <div
                key={b.id}
                className="rounded-lg border p-2"
                style={{
                  borderColor: b.status === "occupied" ? "color-mix(in srgb,#ef4444 30%, var(--hms-border))" : b.status === "available" ? "color-mix(in srgb,#10b981 28%, var(--hms-border))" : b.status === "cleaning" ? "color-mix(in srgb,#f59e0b 30%, var(--hms-border))" : "var(--hms-border)",
                  background: b.status === "occupied" ? "color-mix(in srgb,#ef4444 5%, var(--hms-surface))" : b.status === "available" ? "color-mix(in srgb,#10b981 5%, var(--hms-surface))" : "var(--hms-surface)",
                }}
              >
                <div className="flex items-center justify-between">
                  <span className="text-[0.68rem] font-semibold">{b.label}</span>
                  <span className="text-[0.54rem] capitalize" style={{ color: "var(--hms-faint)" }}>{b.ward}</span>
                </div>
                <p className="mt-0.5 truncate text-[0.64rem]" style={{ color: "var(--hms-muted)" }}>
                  {b.patient_name ?? (b.status === "cleaning" ? tr("dash.housekeeping") : b.status === "blocked" ? tr("dash.outOfService") : tr("dash.ready"))}
                </p>
              </div>
            ))}
          </div>
        </Panel>

        <Panel>
          <SectionTitle
            title={tr("dash.theatre")}
            subtitle={tr("dash.theatreSub", { n: digitsOf(lang, theatreToday.length), up: digitsOf(lang, surgeries.filter((s) => s.status === "scheduled").length) })}
            icon={<Scissors size={14} />}
            action={<Link href="/hms/surgery" className="text-[0.66rem] font-semibold" style={{ color: "var(--hms-brand)" }}>Open →</Link>}
          />
          <div className="mt-2 space-y-1.5">
            {surgeries.slice(0, 5).map((s) => (
              <div key={s.id} className="flex items-center gap-2 rounded-lg border px-2 py-1.5" style={{ borderColor: "var(--hms-border)" }}>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[0.72rem] font-medium">{s.procedure_name}</p>
                  <p className="truncate text-[0.62rem]" style={{ color: "var(--hms-faint)" }}>
                    {s.patient_name} · {s.theatre} · {timeShort(s.scheduled_at, lang)}
                  </p>
                </div>
                <Status value={s.status} />
              </div>
            ))}
            {!surgeries.length && <Empty title={tr("dash.theatreClear")} hint={tr("dash.theatreClearHint")} icon={<Scissors size={16} />} />}
          </div>
        </Panel>

        <Panel>
          <SectionTitle
            title={tr("dash.money")}
            subtitle={tr("dash.moneySub")}
            icon={<ClipboardList size={14} />}
            action={<Link href="/hms/billing" className="text-[0.66rem] font-semibold" style={{ color: "var(--hms-brand)" }}>Billing →</Link>}
          />
          <div className="mt-2 divide-y" style={{ borderColor: "var(--hms-border)" }}>
            {invoices.map((i) => (
              <div key={i.id} className="flex items-center gap-2 py-1.5">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[0.72rem] font-medium">{i.patient_name}</p>
                  <p className="truncate text-[0.6rem]" style={{ color: "var(--hms-faint)" }}>{i.invoice_no} · {relTime(i.created_at, lang)}</p>
                </div>
                <span className="text-[0.72rem] font-semibold">{money(i.total, lang)}</span>
                <Status value={i.status} />
              </div>
            ))}
          </div>
        </Panel>
      </div>

      {/* ------------------------------------------ ai outreach + activity */}
      <div className="grid gap-3.5 xl:grid-cols-3">
        <Panel className="xl:col-span-2">
          <SectionTitle
            title={tr("dash.outreach")}
            subtitle={tr("dash.outreachSub")}
            icon={<Sparkles size={14} />}
            action={<PillTag tone="brand">{tr("dash.suggestions", { n: digitsOf(lang, followUps.length + risky.length) })}</PillTag>}
          />
          <div className="mt-2.5 grid gap-2.5 md:grid-cols-2">
            <div className="space-y-1.5">
              <p className="text-[0.6rem] font-bold uppercase tracking-[0.06em]" style={{ color: "var(--hms-faint)" }}>{tr("dash.followups")}</p>
              {followUps.map((f) => (
                <div key={f.id + f.channel} className="rounded-lg border p-2" style={{ borderColor: "var(--hms-border)" }}>
                  <div className="flex items-center gap-1.5">
                    <PillTag tone={f.channel === "sms" ? "info" : "brand"}>{f.channel.toUpperCase()}</PillTag>
                    <p className="min-w-0 flex-1 truncate text-[0.7rem] font-medium">{f.patient}</p>
                    <span className="text-[0.56rem] capitalize" style={{ color: "var(--hms-faint)" }}>{f.reason}</span>
                  </div>
                  <p className="mt-1 line-clamp-2 text-[0.64rem] leading-snug" style={{ color: "var(--hms-muted)" }}>{f.body}</p>
                </div>
              ))}
              {!followUps.length && <p className="text-[0.68rem]" style={{ color: "var(--hms-faint)" }}>{tr("dash.noFollowups")}</p>}
            </div>
            <div className="space-y-1.5">
              <p className="text-[0.6rem] font-bold uppercase tracking-[0.06em]" style={{ color: "var(--hms-faint)" }}>{tr("dash.attendance")}</p>
              {risky.map((r) => (
                <div key={r.id} className="flex items-center gap-2 rounded-lg border px-2 py-1.5" style={{ borderColor: "var(--hms-border)" }}>
                  <Person name={r.name} size={24} />
                  <div className="min-w-0 flex-1">
                    <p className="text-[0.6rem]" style={{ color: "var(--hms-faint)" }}>{timeShort(r.start_at, lang)} · {r.department}</p>
                  </div>
                  <div className="w-16">
                    <Meter value={r.risk} max={100} tone={r.risk > 60 ? "bad" : r.risk > 35 ? "warn" : "good"} height={4} />
                  </div>
                  <span className="w-7 text-right text-[0.66rem] font-semibold">{digitsOf(lang, r.risk)}%</span>
                </div>
              ))}
              {!risky.length && <p className="text-[0.68rem]" style={{ color: "var(--hms-faint)" }}>{tr("dash.noRisk")}</p>}
            </div>
          </div>
        </Panel>

        <Panel>
          <SectionTitle title={tr("dash.audit")} subtitle={tr("dash.auditSub")} icon={<ClipboardList size={14} />} />
          <div className="mt-2 max-h-[17rem] space-y-1.5 overflow-y-auto pr-0.5">
            {activity.map((a) => (
              <div key={a.id} className="flex gap-2">
                <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: "var(--hms-brand)", opacity: 0.55 }} />
                <div className="min-w-0">
                  <p className="text-[0.68rem] leading-snug">{a.detail}</p>
                  <p className="text-[0.58rem]" style={{ color: "var(--hms-faint)" }}>
                    {a.user_name} · {a.action} {a.entity} · {relTime(a.created_at, lang)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </Panel>
      </div>

      {/* ------------------------------------------------------ diagnosis mix */}
      <div className="grid gap-3.5 xl:grid-cols-[1fr_1.4fr]">
        <Panel>
          <SectionTitle title={tr("dash.diagnoses")} subtitle={tr("dash.diagnosesSub")} icon={<AlertTriangle size={14} />} />
          <div className="mt-3">
            <Donut
              data={diagnoses.map((d) => ({ label: d.diagnosis, value: d.n }))}
              center={{ top: digitsOf(lang, diagnoses.reduce((a, b) => a + b.n, 0)), bottom: tr("dash.consults") }}
            />
          </div>
        </Panel>
        <Panel>
          <SectionTitle title={tr("dash.rxWaiting")} subtitle={tr("dash.rxWaitingSub")} icon={<Pill size={14} />} action={<Link href="/hms/prescriptions" className="text-[0.66rem] font-semibold" style={{ color: "var(--hms-brand)" }}>{tr("dash.allRx")}</Link>} />
          <div className="mt-2 overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr>
                  <th className="hms-th">{tr("c.patient")}</th>
                  <th className="hms-th">{tr("dash.rxNo")}</th>
                  <th className="hms-th">{tr("rx.diagnosis")}</th>
                  <th className="hms-th">{tr("dash.items")}</th>
                  <th className="hms-th">{tr("c.status")}</th>
                </tr>
              </thead>
              <tbody>
                {prescriptions.map((r) => (
                  <tr key={r.id} className="hms-row">
                    <td className="hms-td"><Person name={r.patient_name ?? "—"} sub={r.patient_mrn ?? undefined} size={24} /></td>
                    <td className="hms-td font-mono text-[0.68rem]">{r.rx_no}</td>
                    <td className="hms-td max-w-[12rem] truncate">{r.diagnosis ?? "—"}</td>
                    <td className="hms-td">{r.items}</td>
                    <td className="hms-td"><Status value={r.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>
      </div>

      <p className="pb-1 text-center text-[0.6rem]" style={{ color: "var(--hms-faint)" }}>
        {String(identity.name)} · {String(identity.license_no ?? "")} · {tr("dash.footer", { n: digitsOf(lang, admissions.length) })}
      </p>
    </div>
  );
}
