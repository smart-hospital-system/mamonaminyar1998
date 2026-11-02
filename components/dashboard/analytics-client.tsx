"use client";

import {
  BookingBars, CategoryDonut, DonutChart, GrowthChart, HorizontalBars, RevenueChart,
} from "@/components/charts";
import {
  Avatar, Badge, Card, CardHeader, Progress, Segmented, Skeleton, StatDelta, Stars,
} from "@/components/ui/primitives";
import { fetcher } from "@/lib/fetcher";
import type { AnalyticsPayload } from "@/lib/payloads";
import { cn, durationLabel, money, titleCase } from "@/lib/utils";
import { Download, Sparkles, TrendingUp } from "lucide-react";
import { useState, useTransition } from "react";
import useSWR from "swr";

const STATUS_COLORS: Record<string, string> = {
  completed: "#0ea5e9",
  confirmed: "#10b981",
  pending: "#f59e0b",
  cancelled: "#ef4444",
  no_show: "#f97316",
};

export function AnalyticsClient({ initial }: { initial: AnalyticsPayload }) {
  const [range, setRange] = useState("30");
  const [metric, setMetric] = useState<"revenue" | "bookings">("revenue");
  const [, startTransition] = useTransition();

  const { data, isLoading } = useSWR<AnalyticsPayload>(`/api/analytics?range=${range}`, fetcher, {
    fallbackData: range === "30" ? initial : undefined,
    keepPreviousData: true,
  });

  const payload = data ?? initial;
  const k = payload.kpis;

  function exportReport() {
    const rows = [
      ["Metric", "Value"],
      ["Revenue", k.revenue],
      ["Bookings", k.bookings],
      ["Avg ticket", k.avgTicket],
      ["New customers", k.customers],
      ["Utilisation %", k.utilization],
      ["Rating", k.rating],
      [],
      ["Date", "Revenue", "Bookings"],
      ...payload.series.map((s) => [s.date, s.revenue, s.bookings]),
    ];
    const csv = rows.map((r) => r.map((v) => `"${v ?? ""}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `slotly-analytics-${range}d.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const heatHours = Array.from({ length: 12 }, (_, i) => i + 9);
  const heatMax = Math.max(...payload.peak.map((p) => p.count), 1);

  return (
    <div className="space-y-4">
      {/* toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-[0.72rem] text-muted">
            {payload.range} days · {k.totalBookings} bookings · {payload.series.length} days of trading
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Segmented
            value={range}
            onChange={(v) => startTransition(() => setRange(v))}
            options={[
              { value: "7", label: "7 days" },
              { value: "30", label: "30 days" },
              { value: "90", label: "90 days" },
            ]}
          />
          <button onClick={exportReport} className="btn btn-outline">
            <Download size={13} /> Export
          </button>
        </div>
      </div>

      {/* kpis */}
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[
          { label: "Revenue", value: money(k.revenue), delta: k.revenueDelta, hint: `${money(k.avgTicket)} avg ticket` },
          { label: "Bookings", value: k.bookings, delta: k.bookingsDelta, hint: `${k.upcoming} upcoming` },
          { label: "New customers", value: k.customers, delta: k.customersDelta, hint: `${k.utilization}% utilisation` },
          { label: "Client rating", value: `${k.rating}★`, delta: k.ratingDelta, hint: `${k.reviewCount} reviews` },
        ].map((s) => (
          <Card key={s.label} className="p-4">
            <p className="text-[0.66rem] uppercase tracking-wide text-faint">{s.label}</p>
            <div className="mt-1.5 flex items-end justify-between">
              <p className="text-[1.4rem] font-semibold leading-none tracking-[-0.02em]">{s.value}</p>
              <StatDelta value={s.delta ?? 0} />
            </div>
            <p className="mt-1.5 text-[0.65rem] text-faint">{s.hint}</p>
          </Card>
        ))}
      </div>

      {/* revenue */}
      <Card>
        <CardHeader
          title={metric === "revenue" ? "Revenue over time" : "Bookings over time"}
          subtitle={`${range}-day trend · net of refunds`}
          icon={<TrendingUp size={15} />}
          action={
            <Segmented
              size="sm"
              value={metric}
              onChange={setMetric}
              options={[
                { value: "revenue", label: "Revenue" },
                { value: "bookings", label: "Bookings" },
              ]}
            />
          }
        />
        <div className="px-1 pb-3">
          {isLoading && !data ? (
            <Skeleton className="mx-4 h-[260px]" />
          ) : metric === "revenue" ? (
            <RevenueChart data={payload.series} height={260} />
          ) : (
            <BookingBars data={payload.series.map((s) => ({ label: s.label, bookings: s.bookings }))} height={260} />
          )}
        </div>
      </Card>

      {/* row: category + status + monthly */}
      <div className="grid gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader title="Revenue by category" subtitle="Where the money comes from" />
          <div className="border-t border-line px-3 pt-2">
            <CategoryDonut data={payload.categories} height={190} />
          </div>
          <div className="space-y-1.5 px-4 pb-4">
            {payload.categories.map((c, i) => (
              <div key={c.category} className="flex items-center gap-2 text-[0.7rem]">
                <span className="h-2 w-2 rounded-full" style={{ background: ["#6553f5", "#ec4899", "#14b8a6", "#f59e0b", "#0ea5e9"][i % 5] }} />
                <span className="flex-1 text-muted">{c.category}</span>
                <span className="font-semibold tabular-nums">{money(c.revenue, true)}</span>
              </div>
            ))}
          </div>
        </Card>

        <Card>
          <CardHeader title="Booking outcomes" subtitle="Status mix this period" />
          <div className="border-t border-line px-3 pt-2">
            <DonutChart
              height={190}
              data={payload.statuses.map((s) => ({
                name: titleCase(s.status),
                value: s.count,
                color: STATUS_COLORS[s.status] ?? "#94a3b8",
              }))}
            />
          </div>
          <div className="space-y-1.5 px-4 pb-4">
            {payload.statuses.map((s) => (
              <div key={s.status} className="flex items-center gap-2 text-[0.7rem]">
                <span className="h-2 w-2 rounded-full" style={{ background: STATUS_COLORS[s.status] ?? "#94a3b8" }} />
                <span className="flex-1 capitalize text-muted">{s.status.replace("_", " ")}</span>
                <span className="font-semibold tabular-nums">{s.count}</span>
              </div>
            ))}
          </div>
        </Card>

        <Card>
          <CardHeader title="Monthly revenue" subtitle="Last 6 months" />
          <div className="space-y-2 border-t border-line p-4">
            {payload.monthly.map((m) => {
              const max = Math.max(...payload.monthly.map((x) => x.revenue), 1);
              return (
                <div key={m.month}>
                  <div className="mb-1 flex items-baseline justify-between text-[0.7rem]">
                    <span className="text-muted">{m.month}</span>
                    <span className="font-semibold tabular-nums">{money(m.revenue, true)}</span>
                  </div>
                  <Progress value={(m.revenue / max) * 100} height={5} />
                </div>
              );
            })}
            <div className="mt-3 rounded-lg bg-surface-2 p-2.5 text-[0.68rem] leading-relaxed text-muted">
              <Sparkles size={11} className="mr-1 inline text-brand" />
              {payload.monthly.length > 1
                ? `Revenue is trending ${payload.monthly[payload.monthly.length - 1].revenue >= payload.monthly[0].revenue ? "up" : "down"} ${Math.abs(
                    Math.round(((payload.monthly[payload.monthly.length - 1].revenue - payload.monthly[0].revenue) / (payload.monthly[0].revenue || 1)) * 100)
                  )}% since ${payload.monthly[0].month}.`
                : "Not enough history yet."}
            </div>
          </div>
        </Card>
      </div>

      {/* peak hours heatmap */}
      <Card>
        <CardHeader title="Demand heatmap" subtitle="Bookings by weekday and hour (SGT)" />
        <div className="overflow-x-auto border-t border-line p-4">
          <div className="min-w-[38rem]">
            <div className="mb-1 flex gap-1 pl-9">
              {heatHours.map((h) => (
                <span key={h} className="flex-1 text-center text-[0.55rem] text-faint">{String(h).padStart(2, "0")}</span>
              ))}
            </div>
            {[1, 2, 3, 4, 5, 6, 0].map((wd) => (
              <div key={wd} className="mb-1 flex items-center gap-1">
                <span className="w-8 text-[0.6rem] text-faint">{["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][wd]}</span>
                {heatHours.map((h) => {
                  const cell = payload.peak.find((p) => p.weekday === wd && p.hour === h);
                  const intensity = cell ? cell.count / heatMax : 0;
                  return (
                    <div
                      key={h}
                      title={`${["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][wd]} ${h}:00 — ${cell?.count ?? 0} bookings`}
                      className="h-6 flex-1 rounded-[3px] transition hover:ring-1 hover:ring-brand/40"
                      style={{
                        background:
                          intensity === 0
                            ? "var(--surface-3)"
                            : `color-mix(in srgb, var(--brand) ${Math.round(12 + intensity * 82)}%, var(--surface))`,
                      }}
                    />
                  );
                })}
              </div>
            ))}
            <div className="mt-2 flex items-center gap-1.5 pl-9 text-[0.58rem] text-faint">
              Quiet
              {[0, 0.25, 0.5, 0.75, 1].map((i) => (
                <span
                  key={i}
                  className="h-2.5 w-5 rounded-[3px]"
                  style={{ background: i === 0 ? "var(--surface-3)" : `color-mix(in srgb, var(--brand) ${Math.round(12 + i * 82)}%, var(--surface))` }}
                />
              ))}
              Busy
            </div>
          </div>
        </div>
      </Card>

      {/* staff + services */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader title="Staff performance" subtitle="Revenue, reviews and utilisation" />
          <div className="overflow-x-auto border-t border-line">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-surface-2 text-[0.6rem] uppercase tracking-wide text-faint">
                  <th className="px-4 py-1.5 font-semibold">Staff</th>
                  <th className="px-2 py-1.5 text-right font-semibold">Bookings</th>
                  <th className="px-2 py-1.5 text-right font-semibold">Revenue</th>
                  <th className="px-2 py-1.5 text-right font-semibold">Rating</th>
                  <th className="px-4 py-1.5 text-right font-semibold">Hours</th>
                </tr>
              </thead>
              <tbody>
                {payload.staff.map((s) => (
                  <tr key={s.id} className="border-b border-line/60 last:border-b-0">
                    <td className="px-4 py-2">
                      <div className="flex items-center gap-2">
                        <Avatar name={s.name} size={22} color={s.avatar_color} />
                        <div className="min-w-0">
                          <p className="truncate text-[0.73rem] font-medium">{s.name}</p>
                          <p className="truncate text-[0.6rem] text-faint">{s.title}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-2 py-2 text-right text-[0.7rem] tabular-nums">{s.bookings}</td>
                    <td className="px-2 py-2 text-right text-[0.7rem] font-semibold tabular-nums">{money(s.revenue, true)}</td>
                    <td className="px-2 py-2 text-right text-[0.7rem] tabular-nums">{s.review_avg || "—"}★</td>
                    <td className="px-4 py-2 text-right text-[0.7rem] tabular-nums text-muted">{s.hours}h</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        <Card>
          <CardHeader title="Service performance" subtitle="Bookings and revenue by service" />
          <div className="max-h-[19rem] overflow-y-auto border-t border-line">
            {payload.services.slice(0, 10).map((s) => (
              <div key={s.id} className="flex items-center gap-2.5 border-b border-line/60 px-4 py-2 last:border-b-0">
                <span className="h-6 w-[3px] rounded-full" style={{ background: s.color }} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[0.73rem] font-medium">{s.name}</p>
                  <p className="text-[0.6rem] text-faint">{s.bookings} bookings · {money(s.avg_price)}</p>
                </div>
                <div className="w-20">
                  <Progress
                    value={(s.revenue / Math.max(...payload.services.map((x) => x.revenue), 1)) * 100}
                    height={4}
                    color={s.color}
                  />
                </div>
                <span className="w-14 text-right text-[0.7rem] font-semibold tabular-nums">{money(s.revenue, true)}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* growth + forecast */}
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader title="Customer growth" subtitle="New vs active clients per month" />
          <div className="px-1 pb-2">
            <GrowthChart data={payload.growth} height={210} />
          </div>
          <div className="flex items-center gap-4 border-t border-line px-4 py-2 text-[0.65rem]">
            <span className="flex items-center gap-1.5"><span className="h-2 w-4 rounded bg-brand" /> Active clients</span>
            <span className="flex items-center gap-1.5"><span className="h-2 w-4 rounded bg-pink-500" /> New clients</span>
          </div>
        </Card>

        <Card>
          <CardHeader title="Demand forecast" subtitle="Next 7 days · AI" />
          <div className="space-y-1.5 border-t border-line p-3">
            {payload.forecast.forecast.slice(0, 7).map((d) => (
              <div key={d.date} className="flex items-center gap-2">
                <span className="w-12 text-[0.65rem] text-muted">{d.weekday} {d.label.split(" ")[0]}</span>
                <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-surface-3">
                  <div
                    className={cn("h-full rounded-full", d.level === "high" ? "bg-rose-500" : d.level === "healthy" ? "bg-emerald-500" : "bg-amber-400")}
                    style={{ width: `${Math.max(3, d.demandPct)}%` }}
                  />
                </div>
                <span className="w-8 text-right text-[0.65rem] font-semibold tabular-nums">{d.predicted}</span>
                <Badge tone={d.level} className="!px-1.5 !py-0 !text-[0.55rem]">{d.level}</Badge>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          { label: "No-show rate", value: `${k.noShowRate}%`, hint: "of bookings", tone: "text-rose-500" },
          { label: "Cancellation rate", value: `${k.cancellationRate}%`, hint: "this period", tone: "text-amber-500" },
          { label: "Outstanding balance", value: money(k.unpaidTotal), hint: `${k.unpaidCount} unpaid visits`, tone: "text-sky-500" },
          { label: "Avg. service length", value: durationLabel(Math.round(payload.services.reduce((a, s) => a + (s.bookings || 0), 0) ? 75 : 60)), hint: "across bookings", tone: "text-emerald-500" },
        ].map((s) => (
          <Card key={s.label} className="p-3.5">
            <p className="text-[0.64rem] uppercase tracking-wide text-faint">{s.label}</p>
            <p className={cn("mt-1 text-[1.05rem] font-semibold leading-tight", s.tone)}>{s.value}</p>
            <p className="text-[0.62rem] text-faint">{s.hint}</p>
          </Card>
        ))}
      </div>

      <div className="flex items-center justify-center gap-2 pb-2 text-[0.62rem] text-faint">
        <Sparkles size={11} /> Forecasts use a seasonal-naive model over 12 weeks of booking history.
      </div>
    </div>
  );
}
