"use client";

import { RevenueChart } from "@/components/charts";
import { Card, CardHeader, Segmented, Skeleton, StatDelta } from "@/components/ui/primitives";
import type { AnalyticsPayload } from "@/lib/payloads";
import { money } from "@/lib/utils";
import { ArrowUpRight } from "lucide-react";
import Link from "next/link";
import { useState, useTransition } from "react";

export function RevenuePanel({ initial }: { initial: AnalyticsPayload }) {
  const [range, setRange] = useState<"7" | "30" | "90">("30");
  const [data, setData] = useState<AnalyticsPayload>(initial);
  const [pending, startTransition] = useTransition();

  async function loadRange(next: "7" | "30" | "90") {
    setRange(next);
    startTransition(async () => {
      const res = await fetch(`/api/analytics?range=${next}`);
      if (res.ok) setData(await res.json());
    });
  }

  const k = data.kpis;
  const series = range === "7" ? data.series.slice(-7) : range === "90" ? data.series : data.series;

  return (
    <Card className="overflow-hidden">
      <CardHeader
        title="Revenue performance"
        subtitle={`Net revenue · last ${range} days`}
        action={
          <div className="flex items-center gap-2">
            <Segmented
              size="sm"
              value={range}
              onChange={(v) => loadRange(v)}
              options={[
                { value: "7", label: "7d" },
                { value: "30", label: "30d" },
                { value: "90", label: "90d" },
              ]}
            />
            <Link href="/dashboard/analytics" className="hidden items-center gap-1 text-[0.7rem] font-medium text-brand hover:underline sm:flex">
              Details <ArrowUpRight size={12} />
            </Link>
          </div>
        }
      />
      <div className="flex flex-wrap items-end gap-x-6 gap-y-2 px-5 pb-1">
        <div>
          <p className="text-[1.65rem] font-semibold leading-none tracking-[-0.02em]">{money(k.revenue)}</p>
          <div className="mt-1.5 flex items-center gap-1.5 text-[0.68rem] text-faint">
            <StatDelta value={k.revenueDelta} />
            vs previous {range} days
          </div>
        </div>
        <div className="flex gap-5 pb-1">
          <div>
            <p className="text-[0.6rem] uppercase tracking-wide text-faint">Bookings</p>
            <p className="text-[0.82rem] font-semibold">{k.bookings}</p>
          </div>
          <div>
            <p className="text-[0.6rem] uppercase tracking-wide text-faint">Avg ticket</p>
            <p className="text-[0.82rem] font-semibold">{money(k.avgTicket)}</p>
          </div>
          <div>
            <p className="text-[0.6rem] uppercase tracking-wide text-faint">Utilisation</p>
            <p className="text-[0.82rem] font-semibold">{k.utilization}%</p>
          </div>
        </div>
      </div>
      <div className="px-1 pb-2 pt-2">
        {pending ? <Skeleton className="mx-4 h-[240px]" /> : <RevenueChart data={series} height={240} />}
      </div>
    </Card>
  );
}
