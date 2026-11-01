"use client";

import { cn, initials } from "@/lib/utils";
import { Loader2 } from "lucide-react";
import Link from "next/link";
import React from "react";

/* ------------------------------------------------------------------ avatar */

const AVATAR_BG = [
  "bg-violet-100 text-violet-700 dark:bg-violet-500/15 dark:text-violet-300",
  "bg-pink-100 text-pink-700 dark:bg-pink-500/15 dark:text-pink-300",
  "bg-teal-100 text-teal-700 dark:bg-teal-500/15 dark:text-teal-300",
  "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300",
  "bg-sky-100 text-sky-700 dark:bg-sky-500/15 dark:text-sky-300",
  "bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300",
];

export function Avatar({
  name,
  size = 32,
  color,
  className,
  ring,
}: {
  name: string;
  size?: number;
  color?: string | null;
  className?: string;
  ring?: boolean;
}) {
  const idx = name.split("").reduce((a, c) => a + c.charCodeAt(0), 0) % AVATAR_BG.length;
  const style = color
    ? { background: `color-mix(in srgb, ${color} 16%, transparent)`, color }
    : undefined;
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-full font-semibold tracking-tight",
        !color && AVATAR_BG[idx],
        ring && "ring-2 ring-surface",
        className
      )}
      style={{ width: size, height: size, fontSize: Math.max(9, size * 0.36), ...style }}
      title={name}
    >
      {initials(name)}
    </span>
  );
}

/* ------------------------------------------------------------------ badges */

const STATUS_STYLES: Record<string, string> = {
  confirmed: "bg-emerald-50 text-emerald-700 border-emerald-200/70 dark:bg-emerald-500/10 dark:text-emerald-300 dark:border-emerald-500/20",
  pending: "bg-amber-50 text-amber-700 border-amber-200/70 dark:bg-amber-500/10 dark:text-amber-300 dark:border-amber-500/20",
  completed: "bg-sky-50 text-sky-700 border-sky-200/70 dark:bg-sky-500/10 dark:text-sky-300 dark:border-sky-500/20",
  cancelled: "bg-rose-50 text-rose-700 border-rose-200/70 dark:bg-rose-500/10 dark:text-rose-300 dark:border-rose-500/20",
  no_show: "bg-orange-50 text-orange-700 border-orange-200/70 dark:bg-orange-500/10 dark:text-orange-300 dark:border-orange-500/20",
  paid: "bg-emerald-50 text-emerald-700 border-emerald-200/70 dark:bg-emerald-500/10 dark:text-emerald-300 dark:border-emerald-500/20",
  unpaid: "bg-slate-100 text-slate-600 border-slate-200/70 dark:bg-white/5 dark:text-slate-300 dark:border-white/10",
  refunded: "bg-violet-50 text-violet-700 border-violet-200/70 dark:bg-violet-500/10 dark:text-violet-300 dark:border-violet-500/20",
  partial_refund: "bg-violet-50 text-violet-700 border-violet-200/70 dark:bg-violet-500/10 dark:text-violet-300 dark:border-violet-500/20",
  failed: "bg-rose-50 text-rose-700 border-rose-200/70 dark:bg-rose-500/10 dark:text-rose-300 dark:border-rose-500/20",
  waiting: "bg-amber-50 text-amber-700 border-amber-200/70 dark:bg-amber-500/10 dark:text-amber-300 dark:border-amber-500/20",
  offered: "bg-sky-50 text-sky-700 border-sky-200/70 dark:bg-sky-500/10 dark:text-sky-300 dark:border-sky-500/20",
  booked: "bg-emerald-50 text-emerald-700 border-emerald-200/70 dark:bg-emerald-500/10 dark:text-emerald-300 dark:border-emerald-500/20",
  expired: "bg-slate-100 text-slate-500 border-slate-200/70 dark:bg-white/5 dark:text-slate-400 dark:border-white/10",
  sent: "bg-emerald-50 text-emerald-700 border-emerald-200/70 dark:bg-emerald-500/10 dark:text-emerald-300 dark:border-emerald-500/20",
  scheduled: "bg-sky-50 text-sky-700 border-sky-200/70 dark:bg-sky-500/10 dark:text-sky-300 dark:border-sky-500/20",
  draft: "bg-slate-100 text-slate-600 border-slate-200/70 dark:bg-white/5 dark:text-slate-300 dark:border-white/10",
  approved: "bg-emerald-50 text-emerald-700 border-emerald-200/70 dark:bg-emerald-500/10 dark:text-emerald-300 dark:border-emerald-500/20",
  rejected: "bg-rose-50 text-rose-700 border-rose-200/70 dark:bg-rose-500/10 dark:text-rose-300 dark:border-rose-500/20",
  owner: "bg-violet-50 text-violet-700 border-violet-200/70 dark:bg-violet-500/10 dark:text-violet-300 dark:border-violet-500/20",
  manager: "bg-sky-50 text-sky-700 border-sky-200/70 dark:bg-sky-500/10 dark:text-sky-300 dark:border-sky-500/20",
  staff: "bg-slate-100 text-slate-600 border-slate-200/70 dark:bg-white/5 dark:text-slate-300 dark:border-white/10",
  VIP: "bg-amber-50 text-amber-700 border-amber-200/70 dark:bg-amber-500/10 dark:text-amber-300 dark:border-amber-500/20",
  Loyal: "bg-violet-50 text-violet-700 border-violet-200/70 dark:bg-violet-500/10 dark:text-violet-300 dark:border-violet-500/20",
  "At-risk": "bg-rose-50 text-rose-700 border-rose-200/70 dark:bg-rose-500/10 dark:text-rose-300 dark:border-rose-500/20",
  New: "bg-sky-50 text-sky-700 border-sky-200/70 dark:bg-sky-500/10 dark:text-sky-300 dark:border-sky-500/20",
  high: "bg-rose-50 text-rose-700 border-rose-200/70 dark:bg-rose-500/10 dark:text-rose-300 dark:border-rose-500/20",
  medium: "bg-amber-50 text-amber-700 border-amber-200/70 dark:bg-amber-500/10 dark:text-amber-300 dark:border-amber-500/20",
  low: "bg-emerald-50 text-emerald-700 border-emerald-200/70 dark:bg-emerald-500/10 dark:text-emerald-300 dark:border-emerald-500/20",
  healthy: "bg-emerald-50 text-emerald-700 border-emerald-200/70 dark:bg-emerald-500/10 dark:text-emerald-300 dark:border-emerald-500/20",
};

export function Badge({
  children,
  tone = "neutral",
  className,
  dot,
}: {
  children: React.ReactNode;
  tone?: string;
  className?: string;
  dot?: boolean;
}) {
  const key = tone.toLowerCase();
  const styles = STATUS_STYLES[tone] ?? STATUS_STYLES[key] ?? "bg-surface-3 text-muted border-line";
  return (
    <span className={cn("chip border", styles, className)}>
      {dot && <span className="h-1.5 w-1.5 rounded-full bg-current opacity-70" />}
      {children}
    </span>
  );
}

export function StatusBadge({ status, className }: { status: string; className?: string }) {
  const label = status === "no_show" ? "No-show" : status.replace(/_/g, " ");
  return (
    <Badge
      tone={status}
      className={cn("capitalize", className)}
      dot={["confirmed", "pending", "completed", "cancelled", "no_show", "waiting"].includes(status)}
    >
      {label}
    </Badge>
  );
}

/* ------------------------------------------------------------------ button */

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "outline" | "ghost" | "soft" | "danger";
  size?: "sm" | "md" | "lg" | "icon";
  loading?: boolean;
  icon?: React.ReactNode;
};

const VARIANT_CLASS: Record<string, string> = {
  primary: "btn-primary",
  outline: "btn-outline",
  ghost: "btn-ghost",
  soft: "btn-soft",
  danger: "btn-danger",
};

export function Button({
  variant = "outline",
  size = "md",
  loading,
  icon,
  className,
  children,
  disabled,
  ...props
}: ButtonProps) {
  return (
    <button
      className={cn(
        "btn",
        VARIANT_CLASS[variant] ?? "btn-outline",
        size === "sm" && "text-[0.75rem] px-2.5 py-1.5 gap-1.5",
        size === "lg" && "text-sm px-4 py-2.5",
        size === "icon" && "h-8 w-8 p-0",
        className
      )}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? <Loader2 size={14} className="animate-spin" /> : icon}
      {size !== "icon" && children}
    </button>
  );
}

export function LinkButton({
  href,
  variant = "outline",
  size = "md",
  className,
  children,
  icon,
}: {
  href: string;
  variant?: ButtonProps["variant"];
  size?: "sm" | "md" | "lg";
  className?: string;
  children: React.ReactNode;
  icon?: React.ReactNode;
}) {
  return (
    <Link href={href} className={cn("btn", VARIANT_CLASS[variant] ?? "btn-outline", size === "sm" && "text-[0.75rem] px-2.5 py-1.5", size === "lg" && "text-sm px-4 py-2.5", className)}>
      {icon}
      {children}
    </Link>
  );
}

/* ------------------------------------------------------------------ cards */

export function Card({
  className,
  children,
  hover,
  as: Comp = "div",
}: {
  className?: string;
  children: React.ReactNode;
  hover?: boolean;
  as?: React.ElementType;
}) {
  return (
    <Comp
      className={cn("card", hover && "transition-shadow hover:shadow-[0_2px_4px_rgba(25,22,34,0.05),0_18px_40px_-24px_rgba(25,22,34,0.28)]", className)}
    >
      {children}
    </Comp>
  );
}

export function CardHeader({
  title,
  subtitle,
  action,
  className,
  icon,
}: {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
  icon?: React.ReactNode;
}) {
  return (
    <div className={cn("flex items-start justify-between gap-3 px-5 pt-4 pb-3", className)}>
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          {icon && <span className="text-brand">{icon}</span>}
          <h3 className="truncate text-[0.9375rem] font-semibold tracking-[-0.01em]">{title}</h3>
        </div>
        {subtitle && <p className="mt-0.5 text-xs text-muted">{subtitle}</p>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}

/* ------------------------------------------------------------------ empty state */

export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
  compact,
}: {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
  compact?: boolean;
}) {
  return (
    <div className={cn("flex flex-col items-center justify-center px-6 text-center", compact ? "py-10" : "py-16", className)}>
      <div className="relative mb-4">
        <div className="absolute inset-0 -m-3 rounded-full bg-brand/5 blur-xl" />
        <div className="relative flex h-12 w-12 items-center justify-center rounded-2xl border border-line bg-surface-2 text-faint shadow-sm">
          {icon}
        </div>
      </div>
      <p className="text-sm font-semibold">{title}</p>
      {description && <p className="mt-1 max-w-sm text-xs leading-relaxed text-muted">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

/* ------------------------------------------------------------------ skeleton */

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("skeleton", className)} />;
}

export function SkeletonTable({ rows = 6, cols = 5 }: { rows?: number; cols?: number }) {
  return (
    <div className="divide-y divide-line">
      {Array.from({ length: rows }).map((_, r) => (
        <div key={r} className="flex items-center gap-4 px-4 py-3.5">
          {Array.from({ length: cols }).map((_, c) => (
            <Skeleton
              key={c}
              className={cn("h-3.5", c === 0 ? "w-40" : c === cols - 1 ? "ml-auto w-16" : "w-24")}
            />
          ))}
        </div>
      ))}
    </div>
  );
}

export function SkeletonCards({ count = 4 }: { count?: number }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="card p-5">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="mt-4 h-7 w-32" />
          <Skeleton className="mt-3 h-3 w-20" />
        </div>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ progress */

export function Progress({ value, color = "var(--brand)", height = 6, className }: { value: number; color?: string; height?: number; className?: string }) {
  return (
    <div className={cn("w-full overflow-hidden rounded-full bg-surface-3", className)} style={{ height }}>
      <div
        className="h-full rounded-full transition-[width] duration-500 ease-out"
        style={{ width: `${Math.max(0, Math.min(100, value))}%`, background: color }}
      />
    </div>
  );
}

/* ------------------------------------------------------------------ sparkline */

export function Sparkline({ data, color = "var(--brand)", height = 32, width = 88 }: { data: number[]; color?: string; height?: number; width?: number }) {
  if (!data.length) return null;
  const max = Math.max(...data, 1);
  const min = Math.min(...data, 0);
  const span = max - min || 1;
  const pts = data.map((v, i) => {
    const x = (i / Math.max(1, data.length - 1)) * width;
    const y = height - ((v - min) / span) * (height - 4) - 2;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });
  const id = `sp${Math.abs(color.split("").reduce((a, c) => a + c.charCodeAt(0), 0))}`;
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} className="overflow-visible">
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.25" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon points={`0,${height} ${pts.join(" ")} ${width},${height}`} fill={`url(#${id})`} />
      <polyline points={pts.join(" ")} fill="none" stroke={color} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/* ------------------------------------------------------------------ misc */

export function Divider({ className }: { className?: string }) {
  return <div className={cn("h-px w-full bg-line", className)} />;
}

export function Tooltip({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <span className="group/tt relative inline-flex">
      {children}
      <span className="pointer-events-none absolute bottom-full left-1/2 z-50 mb-1.5 -translate-x-1/2 whitespace-nowrap rounded-md border border-line bg-surface px-2 py-1 text-[0.65rem] font-medium text-ink opacity-0 shadow-lg transition-opacity group-hover/tt:opacity-100">
        {label}
      </span>
    </span>
  );
}

export function Stars({ rating, size = 12, showValue }: { rating: number; size?: number; showValue?: boolean }) {
  const full = Math.round(rating);
  return (
    <span className="inline-flex items-center gap-0.5 align-middle">
      {Array.from({ length: 5 }).map((_, i) => (
        <svg key={i} width={size} height={size} viewBox="0 0 24 24" className={i < full ? "text-amber-400" : "text-line"} fill="currentColor">
          <path d="M12 2.5l2.9 6.1 6.6.9-4.8 4.7 1.2 6.6-5.9-3.2-5.9 3.2 1.2-6.6L2.5 9.5l6.6-.9z" />
        </svg>
      ))}
      {showValue && <span className="ml-1 text-[0.7rem] font-semibold text-muted">{rating.toFixed(1)}</span>}
    </span>
  );
}

export function Segmented<T extends string>({
  options,
  value,
  onChange,
  size = "md",
  className,
}: {
  options: { value: T; label: string; icon?: React.ReactNode }[];
  value: T;
  onChange: (v: T) => void;
  size?: "sm" | "md";
  className?: string;
}) {
  return (
    <div className={cn("inline-flex items-center gap-0.5 rounded-lg border border-line bg-surface-2 p-0.5", className)}>
      {options.map((o) => (
        <button
          key={o.value}
          onClick={() => onChange(o.value)}
          className={cn(
            "inline-flex items-center gap-1.5 rounded-[0.45rem] font-medium transition-all",
            size === "sm" ? "px-2 py-1 text-[0.7rem]" : "px-2.5 py-1.5 text-xs",
            value === o.value ? "bg-surface text-ink shadow-sm" : "text-muted hover:text-ink"
          )}
        >
          {o.icon}
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function Switch({ checked, onChange, label, description }: { checked: boolean; onChange: (v: boolean) => void; label?: string; description?: string }) {
  return (
    <label className="flex cursor-pointer items-start justify-between gap-4">
      {(label || description) && (
        <span className="min-w-0">
          {label && <span className="block text-[0.8125rem] font-medium">{label}</span>}
          {description && <span className="mt-0.5 block text-xs leading-relaxed text-muted">{description}</span>}
        </span>
      )}
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={cn(
          "relative mt-0.5 h-5 w-9 shrink-0 rounded-full transition-colors",
          checked ? "bg-brand" : "bg-surface-3 border border-line"
        )}
      >
        <span
          className={cn(
            "absolute top-0.5 h-4 w-4 rounded-full bg-white shadow-sm transition-transform",
            checked ? "translate-x-[1.125rem]" : "translate-x-0.5"
          )}
        />
      </button>
    </label>
  );
}

export function KeyValue({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-4 py-2">
      <span className="text-xs text-muted">{label}</span>
      <span className="text-right text-xs font-medium">{value}</span>
    </div>
  );
}

export function PageHeader({
  title,
  subtitle,
  actions,
  eyebrow,
}: {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  actions?: React.ReactNode;
  eyebrow?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        {eyebrow && <div className="mb-1">{eyebrow}</div>}
        <h1 className="text-[1.375rem] font-semibold leading-tight tracking-[-0.02em]">{title}</h1>
        {subtitle && <p className="mt-1 text-[0.8125rem] text-muted">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

export function StatDelta({ value, invert }: { value: number; invert?: boolean }) {
  const good = invert ? value <= 0 : value >= 0;
  if (!Number.isFinite(value)) return null;
  return (
    <span className={cn("inline-flex items-center gap-0.5 text-[0.7rem] font-semibold", good ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400")}>
      {value >= 0 ? "↑" : "↓"} {Math.abs(value).toFixed(value % 1 === 0 ? 0 : 1)}%
    </span>
  );
}

/* ------------------------------------------------------------------ pager */

export function Pager({
  page,
  pageSize,
  total,
  onChange,
  className,
}: {
  page: number;
  pageSize: number;
  total: number;
  onChange: (page: number) => void;
  className?: string;
}) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(total, page * pageSize);
  const windowStart = Math.max(1, Math.min(page - 1, pages - 2));
  const numbers = Array.from({ length: Math.min(3, pages) }, (_, i) => windowStart + i).filter(
    (n) => n <= pages
  );

  return (
    <div
      className={cn(
        "flex flex-wrap items-center justify-between gap-2 border-t border-line px-3 py-2.5",
        className
      )}
    >
      <p className="text-[0.68rem] text-faint">
        Showing <span className="font-semibold text-muted">{from}</span>–
        <span className="font-semibold text-muted">{to}</span> of{" "}
        <span className="font-semibold text-muted">{total}</span>
      </p>
      <div className="flex items-center gap-1">
        <button
          onClick={() => onChange(Math.max(1, page - 1))}
          disabled={page <= 1}
          className="btn btn-sm h-7 px-2 disabled:opacity-40"
        >
          Prev
        </button>
        {numbers.map((n) => (
          <button
            key={n}
            onClick={() => onChange(n)}
            data-active={n === page}
            className={cn(
              "h-7 min-w-7 rounded-md px-1.5 text-[0.7rem] font-medium transition",
              n === page
                ? "bg-brand text-white"
                : "text-muted hover:bg-surface-3 hover:text-ink"
            )}
          >
            {n}
          </button>
        ))}
        <button
          onClick={() => onChange(Math.min(pages, page + 1))}
          disabled={page >= pages}
          className="btn btn-sm h-7 px-2 disabled:opacity-40"
        >
          Next
        </button>
      </div>
    </div>
  );
}
