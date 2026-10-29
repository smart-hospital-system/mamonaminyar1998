"use client";

import { cn } from "@/lib/utils";
import { initials } from "@/lib/hms/format";
import type { ReactNode } from "react";

/* --------------------------------------------------------------- surfaces */

export function Panel({
  children,
  className,
  padded = true,
}: {
  children: ReactNode;
  className?: string;
  padded?: boolean;
}) {
  return <div className={cn("hms-card", padded && "p-3.5", className)}>{children}</div>;
}

export function SectionTitle({
  title,
  subtitle,
  icon,
  action,
  className,
}: {
  title: string;
  subtitle?: string;
  icon?: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex items-start justify-between gap-3", className)}>
      <div className="flex min-w-0 items-start gap-2.5">
        {icon && (
          <span
            className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg"
            style={{ background: "var(--hms-brand-soft)", color: "var(--hms-brand-ink)" }}
          >
            {icon}
          </span>
        )}
        <div className="min-w-0">
          <h3 className="truncate text-[0.84rem] font-semibold tracking-[-0.01em]">{title}</h3>
          {subtitle && <p className="mt-0.5 text-[0.68rem] leading-snug" style={{ color: "var(--hms-muted)" }}>{subtitle}</p>}
        </div>
      </div>
      {action}
    </div>
  );
}

/* ------------------------------------------------------------------ tiles */

export function Stat({
  label,
  value,
  hint,
  tone = "brand",
  icon,
  trend,
  onClick,
}: {
  label: string;
  value: ReactNode;
  hint?: string;
  tone?: "brand" | "good" | "warn" | "bad" | "info";
  icon?: ReactNode;
  trend?: number;
  onClick?: () => void;
}) {
  const tones: Record<string, { bg: string; fg: string }> = {
    brand: { bg: "var(--hms-brand-soft)", fg: "var(--hms-brand-ink)" },
    good: { bg: "color-mix(in srgb, #10b981 14%, transparent)", fg: "#0b7a58" },
    warn: { bg: "color-mix(in srgb, #f59e0b 16%, transparent)", fg: "#92570a" },
    bad: { bg: "color-mix(in srgb, #ef4444 14%, transparent)", fg: "#a51c1c" },
    info: { bg: "color-mix(in srgb, #3b82f6 14%, transparent)", fg: "#1d4ed8" },
  };
  const t = tones[tone];
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn("hms-card flex items-center gap-3 p-3 text-left transition", onClick && "hover:-translate-y-px hover:shadow-md")}
    >
      {icon && (
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl" style={{ background: t.bg, color: t.fg }}>
          {icon}
        </span>
      )}
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[0.62rem] font-semibold uppercase tracking-[0.06em]" style={{ color: "var(--hms-faint)" }}>
          {label}
        </span>
        <span className="mt-0.5 flex items-baseline gap-1.5">
          <span className="text-[1.15rem] font-semibold leading-none tracking-[-0.02em]">{value}</span>
          {typeof trend === "number" && (
            <span
              className="text-[0.62rem] font-semibold"
              style={{ color: trend >= 0 ? "#0b7a58" : "#b91c1c" }}
            >
              {trend >= 0 ? "▲" : "▼"} {Math.abs(trend)}%
            </span>
          )}
        </span>
        {hint && <span className="mt-0.5 block truncate text-[0.63rem]" style={{ color: "var(--hms-muted)" }}>{hint}</span>}
      </span>
    </button>
  );
}

/* ----------------------------------------------------------------- status */

export type Tone = "good" | "warn" | "bad" | "info" | "neutral" | "brand";

const TONE_STYLE: Record<Tone, { bg: string; fg: string; border: string }> = {
  good: { bg: "color-mix(in srgb, #10b981 13%, transparent)", fg: "#0b7a58", border: "color-mix(in srgb, #10b981 30%, transparent)" },
  warn: { bg: "color-mix(in srgb, #f59e0b 15%, transparent)", fg: "#8a5209", border: "color-mix(in srgb, #f59e0b 32%, transparent)" },
  bad: { bg: "color-mix(in srgb, #ef4444 13%, transparent)", fg: "#a51c1c", border: "color-mix(in srgb, #ef4444 30%, transparent)" },
  info: { bg: "color-mix(in srgb, #3b82f6 13%, transparent)", fg: "#1d4ed8", border: "color-mix(in srgb, #3b82f6 30%, transparent)" },
  brand: { bg: "var(--hms-brand-soft)", fg: "var(--hms-brand-ink)", border: "color-mix(in srgb, var(--hms-brand) 28%, transparent)" },
  neutral: { bg: "var(--hms-surface-3)", fg: "var(--hms-muted)", border: "var(--hms-border)" },
};

export function Pill({ children, tone = "neutral", dot, className }: { children: ReactNode; tone?: Tone; dot?: boolean; className?: string }) {
  const s = TONE_STYLE[tone];
  return (
    <span className={cn("hms-pill", className)} style={{ background: s.bg, color: s.fg, borderColor: s.border }}>
      {dot && <span className="h-1.5 w-1.5 rounded-full" style={{ background: "currentColor", opacity: 0.75 }} />}
      {children}
    </span>
  );
}

const STATUS_TONE: Record<string, Tone> = {
  completed: "good", confirmed: "info", waiting: "warn", scheduled: "info", in_progress: "warn",
  cancelled: "neutral", no_show: "bad", pending: "warn", dispensed: "good", signed: "good",
  verified: "good", ordered: "warn", collected: "info", reported: "good", requested: "warn",
  occupied: "bad", available: "good", cleaning: "warn", blocked: "neutral", admitted: "info",
  discharged: "neutral", paid: "good", partial: "warn", unpaid: "bad", active: "good", expired: "bad",
  open: "bad", acknowledged: "warn", resolved: "good", critical: "bad", warning: "warn", info: "info",
};

export function Status({ value, className }: { value: string; className?: string }) {
  const tone = STATUS_TONE[value] ?? "neutral";
  return (
    <Pill tone={tone} dot className={cn("capitalize", className)}>
      {value.replace(/_/g, " ")}
    </Pill>
  );
}

/* ----------------------------------------------------------------- inputs */

export function Btn({
  children,
  variant = "outline",
  size = "md",
  loading,
  icon,
  className,
  ...rest
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "outline" | "soft" | "ghost";
  size?: "sm" | "md";
  loading?: boolean;
  icon?: ReactNode;
}) {
  const map = { primary: "hms-btn-primary", outline: "", soft: "hms-btn-soft", ghost: "hms-btn-ghost" };
  return (
    <button className={cn("hms-btn", map[variant], size === "sm" && "hms-btn-sm", className)} disabled={loading || rest.disabled} {...rest}>
      {loading ? <Spinner /> : icon}
      {children}
    </button>
  );
}

export function Spinner({ size = 13 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className="animate-spin">
      <circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" strokeOpacity="0.2" strokeWidth="3" />
      <path d="M21 12a9 9 0 0 0-9-9" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

export function Field({
  label,
  children,
  hint,
  className,
}: {
  label: string;
  children: ReactNode;
  hint?: string;
  className?: string;
}) {
  return (
    <label className={cn("block", className)}>
      <span className="hms-label">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-[0.62rem]" style={{ color: "var(--hms-faint)" }}>{hint}</span>}
    </label>
  );
}

export function Empty({ icon, title, hint, action }: { icon?: ReactNode; title: string; hint?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-10 text-center">
      {icon && (
        <span className="mb-2.5 flex h-10 w-10 items-center justify-center rounded-xl" style={{ background: "var(--hms-surface-3)", color: "var(--hms-faint)" }}>
          {icon}
        </span>
      )}
      <p className="text-[0.82rem] font-semibold">{title}</p>
      {hint && <p className="mt-1 max-w-sm text-[0.7rem] leading-relaxed" style={{ color: "var(--hms-muted)" }}>{hint}</p>}
      {action && <div className="mt-3">{action}</div>}
    </div>
  );
}

/* ------------------------------------------------------------------- bars */

export function Meter({ value, max = 100, tone = "brand", height = 6 }: { value: number; max?: number; tone?: Tone; height?: number }) {
  const pct = Math.max(0, Math.min(100, (value / (max || 1)) * 100));
  const colors: Record<Tone, string> = {
    good: "#10b981", warn: "#f59e0b", bad: "#ef4444", info: "#3b82f6", brand: "var(--hms-brand)", neutral: "#94a3b8",
  };
  return (
    <span className="block w-full overflow-hidden rounded-full" style={{ height, background: "var(--hms-surface-3)" }}>
      <span className="block h-full rounded-full transition-[width] duration-500" style={{ width: `${pct}%`, background: colors[tone] }} />
    </span>
  );
}

export function Ring({ value, size = 54, label }: { value: number; size?: number; label?: string }) {
  const r = (size - 8) / 2;
  const c = 2 * Math.PI * r;
  const pct = Math.max(0, Math.min(100, value));
  const color = pct >= 85 ? "#10b981" : pct >= 60 ? "#f59e0b" : "#ef4444";
  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--hms-surface-3)" strokeWidth={6} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={6}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c - (pct / 100) * c}
        />
      </svg>
      <span className="absolute text-center">
        <span className="block text-[0.72rem] font-semibold leading-none">{Math.round(pct)}</span>
        {label && <span className="block text-[0.48rem] uppercase tracking-wide" style={{ color: "var(--hms-faint)" }}>{label}</span>}
      </span>
    </div>
  );
}

/* ----------------------------------------------------------------- avatar */

const AV = ["#0e9488", "#6366f1", "#ec4899", "#f59e0b", "#8b5cf6", "#0ea5e9", "#10b981", "#f43f5e"];
export function Person({ name, size = 28, color, sub }: { name: string; size?: number; color?: string | null; sub?: string }) {
  const bg = color ?? AV[name.split("").reduce((a, c) => a + c.charCodeAt(0), 0) % AV.length];
  return (
    <span className="flex min-w-0 items-center gap-2">
      <span
        className="flex shrink-0 items-center justify-center rounded-full font-semibold"
        style={{
          width: size,
          height: size,
          fontSize: Math.max(9, size * 0.36),
          background: `color-mix(in srgb, ${bg} 16%, transparent)`,
          color: bg,
        }}
      >
        {initials(name)}
      </span>
      <span className="min-w-0">
        <span className="block truncate text-[0.78rem] font-medium leading-tight">{name}</span>
        {sub && <span className="block truncate text-[0.62rem] leading-tight" style={{ color: "var(--hms-faint)" }}>{sub}</span>}
      </span>
    </span>
  );
}

/* ------------------------------------------------------------------ misc */
