"use client";

import { money } from "@/lib/utils";
import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Line, LineChart, Pie, PieChart,
  ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";

const AXIS = { fontSize: 11, fill: "var(--text-faint)" } as const;

function TipShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-line bg-surface px-2.5 py-2 text-[0.7rem] shadow-lg">
      {children}
    </div>
  );
}

export function RevenueChart({
  data,
  height = 240,
  showBookings = true,
}: {
  data: { label: string; revenue: number; bookings: number }[];
  height?: number;
  showBookings?: boolean;
}) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
        <defs>
          <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--brand)" stopOpacity={0.32} />
            <stop offset="100%" stopColor="var(--brand)" stopOpacity={0.02} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 6" vertical={false} stroke="var(--border)" />
        <XAxis dataKey="label" tick={AXIS} axisLine={false} tickLine={false} interval="preserveStartEnd" minTickGap={28} />
        <YAxis tick={AXIS} axisLine={false} tickLine={false} tickFormatter={(v) => `$${v >= 1000 ? `${Math.round(v / 1000)}k` : v}`} width={48} />
        <Tooltip
          cursor={{ stroke: "var(--border)", strokeWidth: 1 }}
          content={({ active, payload, label }) =>
            active && payload?.length ? (
              <TipShell>
                <p className="mb-1 font-semibold text-ink">{label}</p>
                <p className="text-muted">
                  Revenue <span className="font-semibold text-ink">{money(Number(payload[0]?.value ?? 0))}</span>
                </p>
                {showBookings && (
                  <p className="text-muted">
                    Bookings <span className="font-semibold text-ink">{payload[0]?.payload?.bookings ?? 0}</span>
                  </p>
                )}
              </TipShell>
            ) : null
          }
        />
        <Area
          type="monotone"
          dataKey="revenue"
          stroke="var(--brand)"
          strokeWidth={2}
          fill="url(#revGrad)"
          activeDot={{ r: 4, strokeWidth: 2, stroke: "var(--surface)" }}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

export function BookingBars({ data, height = 200 }: { data: { label: string; bookings: number }[]; height?: number }) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top: 8, right: 8, left: -24, bottom: 0 }} barCategoryGap="28%">
        <CartesianGrid strokeDasharray="3 6" vertical={false} stroke="var(--border)" />
        <XAxis dataKey="label" tick={AXIS} axisLine={false} tickLine={false} minTickGap={24} />
        <YAxis tick={AXIS} axisLine={false} tickLine={false} width={40} />
        <Tooltip
          cursor={{ fill: "var(--surface-3)", opacity: 0.5 }}
          content={({ active, payload, label }) =>
            active && payload?.length ? (
              <TipShell>
                <p className="mb-0.5 font-semibold text-ink">{label}</p>
                <p className="text-muted">
                  {payload[0].value} bookings
                </p>
              </TipShell>
            ) : null
          }
        />
        <Bar dataKey="bookings" fill="var(--brand)" radius={[4, 4, 0, 0]} maxBarSize={34} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function DonutChart({
  data,
  height = 190,
  innerRadius = 52,
  outerRadius = 74,
}: {
  data: { name: string; value: number; color: string }[];
  height?: number;
  innerRadius?: number;
  outerRadius?: number;
}) {
  const total = data.reduce((a, b) => a + b.value, 0);
  return (
    <div className="relative">
      <ResponsiveContainer width="100%" height={height}>
        <PieChart>
          <Pie data={data} dataKey="value" nameKey="name" innerRadius={innerRadius} outerRadius={outerRadius} paddingAngle={2} strokeWidth={0}>
            {data.map((d) => (
              <Cell key={d.name} fill={d.color} />
            ))}
          </Pie>
          <Tooltip
            content={({ active, payload }) =>
              active && payload?.length ? (
                <TipShell>
                  <p className="font-semibold text-ink">{payload[0].name}</p>
                  <p className="text-muted">
                    {payload[0].value} · {Math.round(((Number(payload[0].value) || 0) / (total || 1)) * 100)}%
                  </p>
                </TipShell>
              ) : null
            }
          />
        </PieChart>
      </ResponsiveContainer>
      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-lg font-semibold leading-none">{total}</span>
        <span className="mt-0.5 text-[0.6rem] uppercase tracking-wide text-faint">total</span>
      </div>
    </div>
  );
}

export function GrowthChart({
  data,
  height = 220,
}: {
  data: { month: string; new: number; active: number }[];
  height?: number;
}) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={data} margin={{ top: 8, right: 10, left: -22, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 6" vertical={false} stroke="var(--border)" />
        <XAxis dataKey="month" tick={AXIS} axisLine={false} tickLine={false} />
        <YAxis tick={AXIS} axisLine={false} tickLine={false} width={38} />
        <Tooltip
          content={({ active, payload, label }) =>
            active && payload?.length ? (
              <TipShell>
                <p className="mb-1 font-semibold text-ink">{label}</p>
                {payload.map((p) => (
                  <p key={String(p.dataKey)} className="text-muted">
                    {p.dataKey === "new" ? "New clients" : "Active clients"} <span className="font-semibold text-ink">{p.value}</span>
                  </p>
                ))}
              </TipShell>
            ) : null
          }
        />
        <Line type="monotone" dataKey="active" stroke="var(--brand)" strokeWidth={2} dot={false} />
        <Line type="monotone" dataKey="new" stroke="#ec4899" strokeWidth={2} strokeDasharray="4 3" dot={false} />
      </LineChart>
    </ResponsiveContainer>
  );
}

export function HorizontalBars({
  data,
}: {
  data: { label: string; value: number; color?: string; display?: string }[];
}) {
  const max = Math.max(...data.map((d) => d.value), 1);
  return (
    <div className="space-y-2.5">
      {data.map((d) => (
        <div key={d.label} className="group">
          <div className="mb-1 flex items-baseline justify-between gap-3">
            <span className="truncate text-[0.72rem] text-muted group-hover:text-ink">{d.label}</span>
            <span className="shrink-0 text-[0.7rem] font-semibold tabular-nums">{d.display ?? d.value}</span>
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface-3">
            <div
              className="h-full rounded-full transition-[width] duration-700"
              style={{ width: `${Math.max(4, (d.value / max) * 100)}%`, background: d.color ?? "linear-gradient(90deg, var(--brand), #a78bfa)" }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

export function CategoryDonut({
  data,
  height = 210,
}: {
  data: { category: string; revenue: number }[];
  height?: number;
}) {
  const colors = ["#6553f5", "#ec4899", "#14b8a6", "#f59e0b", "#0ea5e9", "#8b5cf6"];
  return (
    <DonutChart
      height={height}
      data={data.map((d, i) => ({ name: d.category, value: d.revenue, color: colors[i % colors.length] }))}
      innerRadius={54}
      outerRadius={78}
    />
  );
}
