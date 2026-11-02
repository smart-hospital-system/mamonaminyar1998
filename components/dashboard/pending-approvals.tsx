"use client";

import { Avatar, Badge, Button, Card, CardHeader, EmptyState } from "@/components/ui/primitives";
import { useToast } from "@/components/ui/toast";
import { api } from "@/lib/fetcher";
import type { BookingFull } from "@/lib/types";
import { fmtDateShort, fmtTime, money } from "@/lib/utils";
import { CalendarCheck2, Check, Inbox, X } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

export function PendingApprovals({
  initial,
  compact,
  total,
}: {
  initial: BookingFull[];
  compact?: boolean;
  total?: number;
}) {
  const toast = useToast();
  const [items, setItems] = useState(initial.slice(0, compact ? 4 : 30));
  const [busy, setBusy] = useState<string | null>(null);

  async function act(id: string, status: "confirmed" | "cancelled") {
    const snapshot = items;
    setBusy(id);
    // optimistic: remove from the queue immediately
    setItems((prev) => prev.filter((b) => b.id !== id));
    try {
      await api(`/api/bookings/${id}`, "PATCH", {
        status,
        cancelled_reason: status === "cancelled" ? "Declined from dashboard" : undefined,
      });
      toast.success(status === "confirmed" ? "Booking confirmed" : "Booking declined", "The customer has been notified.");
    } catch (e) {
      setItems(snapshot);
      toast.error("Couldn't update booking", e instanceof Error ? e.message : undefined);
    } finally {
      setBusy(null);
    }
  }

  return (
    <Card className="flex flex-col">
      <CardHeader
        title="Awaiting approval"
        subtitle={`${total ?? items.length} request${(total ?? items.length) === 1 ? "" : "s"} need a decision`}
        icon={<Inbox size={15} />}
        action={
          <Link href="/dashboard/bookings?status=pending" className="text-[0.7rem] font-medium text-brand hover:underline">
            View all
          </Link>
        }
      />
      <div className="flex-1 divide-y divide-line border-t border-line">
        {items.length === 0 ? (
          <EmptyState
            compact
            icon={<CalendarCheck2 size={18} />}
            title="Nothing to approve"
            description="Every request has been reviewed. New bookings will appear here."
          />
        ) : (
          items.map((b) => (
            <div key={b.id} className="flex items-center gap-3 px-4 py-2.5 transition hover:bg-surface-2">
              <Avatar name={b.customer_name} size={30} color={b.staff_color} />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <p className="truncate text-[0.78rem] font-medium">{b.customer_name}</p>
                  {b.customer_vip ? <Badge tone="VIP">VIP</Badge> : null}
                </div>
                <p className="truncate text-[0.68rem] text-muted">
                  {b.service_name} · {fmtDateShort(b.start_at)}, {fmtTime(b.start_at)}
                </p>
              </div>
              <div className="hidden text-right sm:block">
                <p className="text-[0.72rem] font-semibold tabular-nums">{money(b.price)}</p>
                <p className="text-[0.62rem] text-faint">with {b.staff_name.split(" ")[0]}</p>
              </div>
              <div className="flex items-center gap-1">
                <Button
                  size="icon"
                  variant="soft"
                  onClick={() => act(b.id, "confirmed")}
                  loading={busy === b.id}
                  aria-label="Confirm"
                >
                  <Check size={13} />
                </Button>
                <Button size="icon" variant="ghost" onClick={() => act(b.id, "cancelled")} aria-label="Decline">
                  <X size={13} />
                </Button>
              </div>
            </div>
          ))
        )}
      </div>
    </Card>
  );
}
