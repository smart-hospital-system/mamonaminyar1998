import { RevenuePanel } from "@/components/dashboard/revenue-panel";
import { PendingApprovals } from "@/components/dashboard/pending-approvals";
import { KpiCard } from "@/components/dashboard/kpi-card";
import { HorizontalBars } from "@/components/charts";
import {
  Avatar, Badge, Card, CardHeader, EmptyState, LinkButton, PageHeader, Progress, StatusBadge, Stars,
} from "@/components/ui/primitives";
import { getCurrentUser } from "@/lib/auth";
import {
  getBookingStatusCounts, getCustomerGrowth, getKpis, getMonthlyRevenue, getPeakHours,
  getRevenueByCategory, getRevenueSeries, getServiceMix, getStaffPerformance, getTodaySnapshot,
  rangeFor, getRecentActivity,
} from "@/lib/analytics-bundle";
import { aiForecast, generateInsights } from "@/lib/ai";
import { listBookings } from "@/lib/queries";
import { fmtTime, money, relativeTime, titleCase } from "@/lib/utils";
import {
  ArrowUpRight, CalendarClock, ChevronRight, CircleDollarSign, Clock, Sparkles, Star, TrendingUp, Users, Zap,
} from "lucide-react";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function OverviewPage() {
  const user = await getCurrentUser();
  const kpis = getKpis(30);
  const r30 = rangeFor(30);
  const series = getRevenueSeries(30);
  const today = getTodaySnapshot();
  const pending = listBookings({ status: "pending", sort: "upcoming", limit: 6 }).items;
  const staff = getStaffPerformance(r30.fromIso, r30.toIso);
  const services = getServiceMix(30).slice(0, 6);
  const insights = generateInsights();
  const activity = getRecentActivity(6);
  const growth = getCustomerGrowth(6);
  const counts = getBookingStatusCounts(30);

  const payload = {
    range: 30,
    kpis,
    series,
    monthly: getMonthlyRevenue(6),
    statuses: counts,
    services: getServiceMix(30),
    staff,
    growth,
    peak: getPeakHours(30),
    categories: getRevenueByCategory(30),
    forecast: aiForecast(14),
  };

  const hour = Number(
    new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Singapore", hour: "2-digit", hour12: false }).format(new Date())
  );
  const greeting = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
  const todayLabel = new Intl.DateTimeFormat("en-SG", {
    timeZone: "Asia/Singapore", weekday: "long", day: "numeric", month: "long",
  }).format(new Date());

  const staffMax = Math.max(...staff.map((s) => s.revenue), 1);
  const todayValue = today.bookings.reduce((a, b) => a + Number(b.price), 0);
  const topInsights = insights.slice(0, 3);

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow={
          <p className="text-[0.7rem] font-medium uppercase tracking-[0.08em] text-faint">
            {todayLabel} · Lumière Studio
          </p>
        }
        title={`${greeting}, ${user?.name.split(" ")[0] ?? "there"} 👋`}
        subtitle={`${today.bookings.length} appointments today worth ${money(todayValue)} · ${kpis.pendingApproval} requests awaiting approval · ${kpis.utilization}% chair utilisation`}
        actions={
          <>
            <LinkButton href="/dashboard/calendar" icon={<CalendarClock size={14} />}>
              Today&apos;s calendar
            </LinkButton>
            <LinkButton href="/dashboard/analytics" variant="outline" icon={<TrendingUp size={14} />}>
              Analytics
            </LinkButton>
          </>
        }
      />

      {/* ---------------------------------------------------------- KPIs */}
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          label="Revenue · 30 days"
          value={money(kpis.revenue, true)}
          delta={kpis.revenueDelta}
          spark={series.slice(-14).map((s) => s.revenue)}
          icon={<CircleDollarSign size={13} />}
          footnote={`${money(kpis.avgTicket)} avg ticket`}
          accent="#6553f5"
        />
        <KpiCard
          label="Bookings"
          value={kpis.bookings}
          delta={kpis.bookingsDelta}
          spark={series.slice(-14).map((s) => s.bookings)}
          icon={<CalendarClock size={13} />}
          footnote={`${kpis.upcoming} upcoming`}
          accent="#0ea5e9"
        />
        <KpiCard
          label="New customers"
          value={kpis.customers}
          delta={kpis.customersDelta}
          spark={growth.map((g) => g.new)}
          icon={<Users size={13} />}
          footnote={`${kpis.utilization}% utilisation`}
          accent="#ec4899"
        />
        <KpiCard
          label="Client rating"
          value={`${kpis.rating}★`}
          delta={kpis.ratingDelta}
          icon={<Star size={13} />}
          footnote={`${kpis.reviewCount} reviews · ${kpis.noShowRate}% no-show`}
          accent="#f59e0b"
        />
      </div>

      {/* ---------------------------------------------------------- revenue + agenda */}
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <RevenuePanel initial={payload} />
        </div>

        <Card className="flex flex-col">
          <CardHeader
            title="Today's schedule"
            subtitle={`${today.bookings.length} appointments · ${money(todayValue)} expected`}
            icon={<Clock size={15} />}
            action={
              <Link href="/dashboard/calendar" className="flex items-center gap-0.5 text-[0.7rem] font-medium text-brand hover:underline">
                Calendar <ChevronRight size={12} />
              </Link>
            }
          />
          <div className="max-h-[19rem] flex-1 overflow-y-auto border-t border-line">
            {today.bookings.length === 0 ? (
              <EmptyState
                compact
                icon={<CalendarClock size={18} />}
                title="A clear day"
                description="No appointments scheduled today. Perfect time to launch a same-day offer."
                action={<LinkButton href="/dashboard/marketing?compose=weekday" size="sm">Create promo</LinkButton>}
              />
            ) : (
              <div className="divide-y divide-line">
                {today.bookings.slice(0, 8).map((b) => (
                  <div key={b.id} className="flex items-center gap-2.5 px-4 py-2.5">
                    <div className="w-11 shrink-0">
                      <p className="text-[0.7rem] font-semibold tabular-nums leading-none">{fmtTime(b.start_at)}</p>
                      <p className="mt-1 text-[0.6rem] text-faint">{fmtTime(b.end_at)}</p>
                    </div>
                    <span className="h-8 w-[3px] shrink-0 rounded-full" style={{ background: b.staff_color ?? "var(--brand)" }} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[0.78rem] font-medium">{b.customer_name}</p>
                      <p className="truncate text-[0.66rem] text-muted">{b.service_name}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[0.7rem] font-semibold tabular-nums">{money(b.price)}</p>
                      <StatusBadge status={b.status} className="mt-0.5 !px-1.5 !py-0 !text-[0.55rem]" />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className="border-t border-line p-3">
            <LinkButton href="/dashboard/bookings?new=1" variant="soft" className="w-full" icon={<Zap size={13} />}>
              Quick booking
            </LinkButton>
          </div>
        </Card>
      </div>

      {/* ---------------------------------------------------------- insights + team */}
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader
            title={
              <span className="flex items-center gap-2">
                AI business insights
                <span className="rounded bg-gradient-to-r from-violet-500/15 to-fuchsia-500/15 px-1.5 py-0.5 text-[0.55rem] font-bold uppercase tracking-wider text-brand">
                  Premium
                </span>
              </span>
            }
            subtitle="Generated from your calendar, payments and client history"
            icon={<Sparkles size={15} />}
            action={
              <Link href="/dashboard/ai" className="flex items-center gap-0.5 text-[0.7rem] font-medium text-brand hover:underline">
                AI Studio <ArrowUpRight size={12} />
              </Link>
            }
          />
          <div className="border-t border-line">
            {topInsights.map((insight, i) => (
              <div key={insight.id} className={`flex gap-3 px-4 py-3 ${i > 0 ? "border-t border-line" : ""}`}>
                <span
                  className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-[0.65rem] font-bold ${
                    insight.severity === "warning"
                      ? "bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400"
                      : insight.severity === "win"
                        ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400"
                        : "bg-brand-soft text-brand"
                  }`}
                >
                  {insight.severity === "warning" ? "!" : insight.severity === "win" ? "✓" : "✦"}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-[0.8rem] font-semibold">{insight.title}</p>
                    <Badge tone="neutral" className="!border-brand/20 !bg-brand-soft !text-brand-ink">
                      {insight.impact}
                    </Badge>
                  </div>
                  <p className="mt-1 text-[0.72rem] leading-relaxed text-muted">{insight.detail}</p>
                  {insight.action && (
                    <Link href={insight.action.href} className="mt-1.5 inline-flex items-center gap-0.5 text-[0.7rem] font-medium text-brand hover:underline">
                      {insight.action.label} <ChevronRight size={11} />
                    </Link>
                  )}
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card>
          <CardHeader
            title="Team performance"
            subtitle="Last 30 days"
            icon={<Users size={15} />}
            action={
              <Link href="/dashboard/staff" className="text-[0.7rem] font-medium text-brand hover:underline">
                Team
              </Link>
            }
          />
          <div className="divide-y divide-line border-t border-line">
            {staff.slice(0, 5).map((s) => (
              <div key={s.id} className="flex items-center gap-2.5 px-4 py-2.5">
                <Avatar name={s.name} size={28} color={s.avatar_color} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className="truncate text-[0.76rem] font-medium">{s.name}</p>
                    <p className="shrink-0 text-[0.7rem] font-semibold tabular-nums">{money(s.revenue, true)}</p>
                  </div>
                  <div className="mt-1 flex items-center gap-2">
                    <Progress value={(s.revenue / staffMax) * 100} height={4} color={s.avatar_color ?? "var(--brand)"} />
                    <span className="shrink-0 text-[0.6rem] text-faint">{s.bookings}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* ---------------------------------------------------------- bottom row */}
      <div className="grid gap-4 lg:grid-cols-3">
        <PendingApprovals initial={pending} compact total={kpis.pendingApproval} />

        <Card>
          <CardHeader
            title="Popular services"
            subtitle="Revenue by service · 30 days"
            action={
              <Link href="/dashboard/services" className="text-[0.7rem] font-medium text-brand hover:underline">
                Catalog
              </Link>
            }
          />
          <div className="border-t border-line px-4 py-3.5">
            <HorizontalBars
              data={services.map((s) => ({ label: s.name, value: s.revenue, color: s.color ?? undefined, display: money(s.revenue, true) }))}
            />
          </div>
        </Card>

        <Card>
          <CardHeader
            title="Recent activity"
            subtitle="Audit trail"
            action={
              <Link href="/dashboard/activity" className="text-[0.7rem] font-medium text-brand hover:underline">
                All logs
              </Link>
            }
          />
          <div className="border-t border-line">
            {activity.slice(0, 5).map((a) => (
              <div key={a.id} className="flex gap-2.5 px-4 py-2.5">
                <div className="relative mt-1 flex flex-col items-center">
                  <span className="h-1.5 w-1.5 rounded-full bg-brand" />
                  <span className="mt-0.5 h-full w-px bg-line" />
                </div>
                <div className="min-w-0 flex-1 pb-0.5">
                  <p className="truncate text-[0.72rem] leading-snug">{a.detail}</p>
                  <p className="mt-0.5 text-[0.62rem] text-faint">
                    {a.actor_name} · {relativeTime(a.created_at)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* ---------------------------------------------------------- footer strip */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card className="flex items-center justify-between gap-4 p-4">
          <div className="min-w-0">
            <p className="text-[0.7rem] font-medium uppercase tracking-wide text-faint">Next 14 days forecast</p>
            <p className="mt-1 text-[0.85rem] font-semibold">
              {payload.forecast.avgDaily} bookings/day predicted · {payload.forecast.trend >= 0 ? "+" : ""}
              {payload.forecast.trend}% trend
            </p>
            <p className="mt-0.5 text-[0.7rem] text-muted">
              Staffing suggestion: {payload.forecast.forecast.slice(0, 7).reduce((a, b) => a + b.staffNeeded, 0)} shifts this week
            </p>
          </div>
          <LinkButton href="/dashboard/ai" variant="soft" size="sm" icon={<Sparkles size={12} />}>
            Forecast
          </LinkButton>
        </Card>

        <Card className="flex items-center justify-between gap-4 p-4">
          <div className="min-w-0">
            <p className="text-[0.7rem] font-medium uppercase tracking-wide text-faint">Client sentiment</p>
            <div className="mt-1 flex items-center gap-2">
              <p className="text-[0.85rem] font-semibold">{kpis.rating} average</p>
              <Stars rating={kpis.rating} />
            </div>
            <p className="mt-0.5 text-[0.7rem] text-muted">
              {counts.find((c) => c.status === "completed")?.count ?? 0} completed ·{" "}
              {counts.find((c) => c.status === "cancelled")?.count ?? 0} cancelled this period
            </p>
          </div>
          <LinkButton href="/dashboard/reviews" variant="soft" size="sm" icon={<Star size={12} />}>
            Reviews
          </LinkButton>
        </Card>
      </div>

      <p className="pt-1 text-center text-[0.62rem] text-faint">
        {titleCase("data refreshed")} {relativeTime(new Date().toISOString())} · demo workspace
      </p>
    </div>
  );
}
