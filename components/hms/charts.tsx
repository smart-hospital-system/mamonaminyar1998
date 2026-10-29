"use client";

import { useId } from "react";
import { money } from "@/lib/hms/format";

const fmt = (v: number, kind?: "money" | "number") => (kind === "money" ? money(v) : String(v));

/* ------------------------------------------------------------- sparkline */

export function Spark({
  data,
  height = 44,
  stroke = "var(--hms-brand)",
  fill = true,
}: {
  data: number[];
  height?: number;
  stroke?: string;
  fill?: boolean;
}) {
  const id = useId();
  const w = 100;
  const max = Math.max(1, ...data);
  const min = Math.min(...data);
  const span = max - min || 1;
  const pts = data.map((v, i) => {
    const x = data.length === 1 ? 0 : (i / (data.length - 1)) * w;
    const y = height - 4 - ((v - min) / span) * (height - 10);
    return `${x.toFixed(2)},${y.toFixed(2)}`;
  });

  return (
    <svg viewBox={`0 0 ${w} ${height}`} preserveAspectRatio="none" style={{ width: "100%", height }} aria-hidden>
      <defs>
        <linearGradient id={`g${id}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={stroke} stopOpacity="0.28" />
          <stop offset="100%" stopColor={stroke} stopOpacity="0" />
        </linearGradient>
      </defs>
      {fill && <polygon points={`0,${height} ${pts.join(" ")} ${w},${height}`} fill={`url(#g${id})`} />}
      <polyline points={pts.join(" ")} fill="none" stroke={stroke} strokeWidth="1.6" strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

/* ------------------------------------------------------------------ bars */

export function Bars({
  data,
  height = 130,
  format,
}: {
  data: { label: string; value: number; hint?: string }[];
  height?: number;
  format?: "money" | "number";
}) {
  const max = Math.max(1, ...data.map((d) => d.value));
  return (
    <div className="flex items-end gap-1.5" style={{ height }}>
      {data.map((d) => (
        <div key={d.label} className="group flex min-w-0 flex-1 flex-col items-center justify-end gap-1" title={`${d.label}: ${fmt(d.value, format)}${d.hint ? ` · ${d.hint}` : ""}`}>
          <span className="text-[0.56rem] font-semibold opacity-0 transition group-hover:opacity-100" style={{ color: "var(--hms-muted)" }}>
            {fmt(d.value, format)}
          </span>
          <div
            className="w-full rounded-t-[3px] transition-all"
            style={{
              height: `${Math.max(3, (d.value / max) * (height - 26))}px`,
              background: "linear-gradient(180deg, var(--hms-brand), color-mix(in srgb, var(--hms-brand) 42%, transparent))",
            }}
          />
          <span className="truncate text-[0.55rem]" style={{ color: "var(--hms-faint)" }}>{d.label}</span>
        </div>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ line */

export function AreaLine({
  data,
  height = 150,
  format,
}: {
  data: { label: string; value: number }[];
  height?: number;
  format?: "money" | "number";
}) {
  const id = useId();
  const w = 300;
  const max = Math.max(1, ...data.map((d) => d.value));
  const pts = data.map((d, i) => {
    const x = data.length === 1 ? 0 : (i / (data.length - 1)) * w;
    const y = height - 18 - (d.value / max) * (height - 30);
    return [x, y] as const;
  });
  const line = pts.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(" ");
  return (
    <div>
      <svg viewBox={`0 0 ${w} ${height}`} preserveAspectRatio="none" style={{ width: "100%", height }} aria-hidden>
        <defs>
          <linearGradient id={`a${id}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--hms-brand)" stopOpacity="0.24" />
            <stop offset="100%" stopColor="var(--hms-brand)" stopOpacity="0" />
          </linearGradient>
        </defs>
        {[0.25, 0.5, 0.75].map((f) => (
          <line key={f} x1="0" x2={w} y1={(height - 18) * f + 4} y2={(height - 18) * f + 4} stroke="var(--hms-border)" strokeWidth="0.5" strokeDasharray="3 4" />
        ))}
        <polygon points={`0,${height - 18} ${line} ${w},${height - 18}`} fill={`url(#a${id})`} />
        <polyline points={line} fill="none" stroke="var(--hms-brand)" strokeWidth="1.8" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
        {pts.map(([x, y], i) => (
          <circle key={i} cx={x} cy={y} r="1.7" fill="var(--hms-surface)" stroke="var(--hms-brand)" strokeWidth="1.2" vectorEffect="non-scaling-stroke" />
        ))}
      </svg>
      <div className="mt-1 flex justify-between text-[0.55rem]" style={{ color: "var(--hms-faint)" }}>
        {data.map((d, i) => (
          <span key={i} className={i % 2 === 1 && data.length > 8 ? "hidden sm:inline" : ""}>{d.label}</span>
        ))}
      </div>
      {format && (
        <p className="mt-0.5 text-right text-[0.58rem]" style={{ color: "var(--hms-faint)" }}>
          peak {fmt(max, format)}
        </p>
      )}
    </div>
  );
}

/* ----------------------------------------------------------------- donut */

export function Donut({
  data,
  size = 132,
  thickness = 15,
  center,
}: {
  data: { label: string; value: number; color?: string }[];
  size?: number;
  thickness?: number;
  center?: { top: string; bottom: string };
}) {
  const total = data.reduce((a, b) => a + b.value, 0) || 1;
  const r = (size - thickness) / 2;
  const c = 2 * Math.PI * r;
  let offset = 0;
  const palette = ["var(--hms-brand)", "#38bdf8", "#6366f1", "#f59e0b", "#ec4899", "#10b981", "#8b5cf6"];

  return (
    <div className="flex items-center gap-4">
      <div className="relative shrink-0" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90">
          <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--hms-surface-3)" strokeWidth={thickness} />
          {data.map((d, i) => {
            const len = (d.value / total) * c;
            const el = (
              <circle
                key={d.label}
                cx={size / 2}
                cy={size / 2}
                r={r}
                fill="none"
                stroke={d.color ?? palette[i % palette.length]}
                strokeWidth={thickness}
                strokeDasharray={`${len} ${c - len}`}
                strokeDashoffset={-offset}
                strokeLinecap="butt"
              />
            );
            offset += len;
            return el;
          })}
        </svg>
        {center && (
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-[1rem] font-semibold leading-none">{center.top}</span>
            <span className="mt-0.5 text-[0.55rem] uppercase tracking-wide" style={{ color: "var(--hms-faint)" }}>{center.bottom}</span>
          </div>
        )}
      </div>
      <div className="min-w-0 flex-1 space-y-1">
        {data.map((d, i) => (
          <div key={d.label} className="flex items-center gap-1.5 text-[0.68rem]">
            <span className="h-2 w-2 shrink-0 rounded-sm" style={{ background: d.color ?? palette[i % palette.length] }} />
            <span className="min-w-0 flex-1 truncate" style={{ color: "var(--hms-muted)" }}>{d.label}</span>
            <span className="shrink-0 font-semibold">{Math.round((d.value / total) * 100)}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ----------------------------------------------------------------- gauge */

export function LoadBar({ label, value, max, hint }: { label: string; value: number; max: number; hint?: string }) {
  const pct = Math.min(100, Math.round((value / (max || 1)) * 100));
  const color = pct > 85 ? "#ef4444" : pct > 65 ? "#f59e0b" : "var(--hms-brand)";
  return (
    <div>
      <div className="flex items-baseline justify-between text-[0.68rem]">
        <span className="font-medium">{label}</span>
        <span style={{ color: "var(--hms-faint)" }}>{hint ?? `${value}/${max}`}</span>
      </div>
      <div className="mt-1 h-1.5 overflow-hidden rounded-full" style={{ background: "var(--hms-surface-3)" }}>
        <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: color }} />
      </div>
    </div>
  );
}
