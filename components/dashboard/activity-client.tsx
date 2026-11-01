"use client";

import { Avatar, Badge, Button, Card, CardHeader, EmptyState } from "@/components/ui/primitives";
import { fetcher } from "@/lib/fetcher";
import type { ActivityLog } from "@/lib/types";
import { cn, fmtDateTime, relativeTime } from "@/lib/utils";
import {
  Calendar, CreditCard, Database, Filter, Megaphone, RefreshCw, Search, Settings, Shield, Star, Users,
} from "lucide-react";
import { useState } from "react";
import useSWR from "swr";

const ENTITIES = [
  { value: "all", label: "Everything" },
  { value: "booking", label: "Bookings" },
  { value: "customer", label: "Customers" },
  { value: "staff", label: "Staff" },
  { value: "payment", label: "Payments" },
  { value: "service", label: "Services" },
  { value: "campaign", label: "Marketing" },
  { value: "settings", label: "Settings" },
];

const ICONS: Record<string, React.ReactNode> = {
  booking: <Calendar size={12} />,
  customer: <Users size={12} />,
  staff: <Shield size={12} />,
  payment: <CreditCard size={12} />,
  service: <Settings size={12} />,
  campaign: <Megaphone size={12} />,
  coupon: <Megaphone size={12} />,
  review: <Star size={12} />,
  settings: <Settings size={12} />,
  system: <Database size={12} />,
  ai: <RefreshCw size={12} />,
};

export function ActivityClient({ initial }: { initial: ActivityLog[] }) {
  const [entity, setEntity] = useState("all");
  const [q, setQ] = useState("");

  const key = `/api/activity?entity=${entity}&q=${encodeURIComponent(q)}&limit=150`;
  const { data, isLoading, mutate } = useSWR<{ items: ActivityLog[] }>(key, fetcher, {
    fallbackData: entity === "all" && !q ? { items: initial } : undefined,
    keepPreviousData: true,
  });

  const items = data?.items ?? [];
  const grouped: { day: string; items: ActivityLog[] }[] = [];
  for (const item of items) {
    const day = fmtDateTime(item.created_at).split(",")[0];
    const bucket = grouped.find((g) => g.day === day);
    if (bucket) bucket.items.push(item);
    else grouped.push({ day, items: [item] });
  }

  return (
    <div className="space-y-4">
      <Card className="p-3">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative min-w-[12rem] flex-1">
            <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-faint" />
            <input className="input h-9 pl-9" placeholder="Search the audit trail…" value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
          <div className="flex flex-wrap items-center gap-1">
            {ENTITIES.map((e) => (
              <button
                key={e.value}
                onClick={() => setEntity(e.value)}
                className={cn(
                  "rounded-lg px-2.5 py-1.5 text-[0.72rem] font-medium transition",
                  entity === e.value ? "bg-brand-soft text-brand-ink" : "text-muted hover:bg-surface-3 hover:text-ink"
                )}
              >
                {e.label}
              </button>
            ))}
          </div>
          <Button variant="ghost" size="sm" onClick={() => mutate()} icon={<RefreshCw size={12} className={isLoading ? "animate-spin" : ""} />}>
            Refresh
          </Button>
        </div>
      </Card>

      <Card>
        <CardHeader
          title="Audit trail"
          subtitle={`${items.length} events · immutable log of every change`}
          icon={<Filter size={14} />}
          action={<Badge tone="paid" className="gap-1"><Shield size={9} /> Compliance</Badge>}
        />
        <div className="border-t border-line">
          {items.length === 0 ? (
            <EmptyState compact icon={<Shield size={18} />} title="No activity yet" description="Every create, update and deletion lands here." />
          ) : (
            grouped.map((group) => (
              <div key={group.day}>
                <div className="bg-surface-2 px-4 py-1.5 text-[0.62rem] font-semibold uppercase tracking-wide text-faint">
                  {group.day}
                </div>
                {group.items.map((a) => (
                  <div key={a.id} className="flex items-start gap-2.5 border-b border-line/60 px-4 py-2.5 last:border-b-0">
                    <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-surface-3 text-muted">
                      {ICONS[a.entity] ?? <Database size={12} />}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-[0.76rem] leading-snug">{a.detail}</p>
                      <p className="mt-0.5 flex flex-wrap items-center gap-1.5 text-[0.62rem] text-faint">
                        <Avatar name={a.actor_name} size={12} />
                        {a.actor_name}
                        <span>·</span>
                        <span className="capitalize">{a.action}</span>
                        <span>·</span>
                        <span className="capitalize">{a.entity}</span>
                        <span>·</span>
                        {relativeTime(a.created_at)}
                      </p>
                    </div>
                    <span className="hidden shrink-0 text-[0.6rem] text-faint sm:block">{fmtDateTime(a.created_at)}</span>
                  </div>
                ))}
              </div>
            ))
          )}
        </div>
      </Card>
    </div>
  );
}
