"use client";

import { Card, Sparkline, StatDelta } from "@/components/ui/primitives";
import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

export function KpiCard({
  label,
  value,
  delta,
  invertDelta,
  spark,
  icon,
  footnote,
  accent = "var(--brand)",
  className,
}: {
  label: string;
  value: ReactNode;
  delta?: number;
  invertDelta?: boolean;
  spark?: number[];
  icon?: ReactNode;
  footnote?: ReactNode;
  accent?: string;
  className?: string;
}) {
  return (
    <Card hover className={cn("group relative overflow-hidden p-4", className)}>
      <div
        className="pointer-events-none absolute -right-6 -top-8 h-24 w-24 rounded-full opacity-[0.07] blur-2xl transition-opacity group-hover:opacity-[0.12]"
        style={{ background: accent }}
      />
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          {icon && (
            <span className="flex h-6 w-6 items-center justify-center rounded-md bg-surface-2 text-muted" style={{ color: accent }}>
              {icon}
            </span>
          )}
          <p className="text-[0.7rem] font-medium uppercase tracking-[0.04em] text-faint">{label}</p>
        </div>
      </div>

      <div className="mt-2.5 flex items-end justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-[1.5rem] font-semibold leading-none tracking-[-0.02em]">{value}</p>
          <div className="mt-2 flex items-center gap-1.5">
            {delta !== undefined && <StatDelta value={delta} invert={invertDelta} />}
            {footnote && <span className="truncate text-[0.66rem] text-faint">{footnote}</span>}
          </div>
        </div>
        {spark && spark.length > 1 && (
          <div className="shrink-0 pb-1 opacity-90">
            <Sparkline data={spark} color={accent} width={72} height={30} />
          </div>
        )}
      </div>
    </Card>
  );
}
