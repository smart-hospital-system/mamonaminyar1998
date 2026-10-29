"use client";

import { Badge, Button, Card, CardHeader, EmptyState } from "@/components/ui/primitives";
import { useToast } from "@/components/ui/toast";
import { api } from "@/lib/fetcher";
import type { Notification } from "@/lib/types";
import { cn, relativeTime } from "@/lib/utils";
import {
  Bell, BellRing, Brain, CalendarCheck, CheckCheck, CreditCard, Mail, Megaphone, Star, Users,
} from "lucide-react";
import Link from "next/link";
import { useState } from "react";

const ICONS: Record<string, React.ReactNode> = {
  booking: <CalendarCheck size={14} />,
  payment: <CreditCard size={14} />,
  review: <Star size={14} />,
  waitlist: <Users size={14} />,
  staff: <Users size={14} />,
  marketing: <Megaphone size={14} />,
  ai: <Brain size={14} />,
  system: <Bell size={14} />,
};

const TONE: Record<string, string> = {
  booking: "bg-violet-50 text-violet-600 dark:bg-violet-500/10 dark:text-violet-300",
  payment: "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-300",
  review: "bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-300",
  waitlist: "bg-sky-50 text-sky-600 dark:bg-sky-500/10 dark:text-sky-300",
  staff: "bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-300",
  marketing: "bg-pink-50 text-pink-600 dark:bg-pink-500/10 dark:text-pink-300",
  ai: "bg-fuchsia-50 text-fuchsia-600 dark:bg-fuchsia-500/10 dark:text-fuchsia-300",
  system: "bg-slate-100 text-slate-600 dark:bg-white/5 dark:text-slate-300",
};

export function NotificationsClient({ initial }: { initial: Notification[] }) {
  const toast = useToast();
  const [items, setItems] = useState(initial);
  const [filter, setFilter] = useState<"all" | "unread">("all");

  const visible = filter === "all" ? items : items.filter((i) => !i.read);
  const unread = items.filter((i) => !i.read).length;

  async function markAll() {
    setItems((prev) => prev.map((i) => ({ ...i, read: 1 })));
    try {
      await api("/api/notifications", "PATCH", { all: true });
      toast.success("All caught up", "Every notification is marked as read.");
    } catch {
      toast.error("Couldn't mark all read");
    }
  }

  async function markOne(id: string) {
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, read: 1 } : i)));
    try {
      await api("/api/notifications", "PATCH", { id });
    } catch {
      /* silent */
    }
  }

  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <div className="space-y-4 lg:col-span-2">
        <Card>
          <CardHeader
            title="Inbox"
            subtitle={`${unread} unread · ${items.length} total`}
            icon={<BellRing size={15} />}
            action={
              <div className="flex items-center gap-1.5">
                <div className="inline-flex rounded-lg border border-line bg-surface-2 p-0.5">
                  {(["all", "unread"] as const).map((f) => (
                    <button
                      key={f}
                      onClick={() => setFilter(f)}
                      className={cn(
                        "rounded-[0.45rem] px-2 py-1 text-[0.7rem] font-medium capitalize transition",
                        filter === f ? "bg-surface text-ink shadow-sm" : "text-muted"
                      )}
                    >
                      {f}
                    </button>
                  ))}
                </div>
                <Button variant="ghost" size="sm" onClick={markAll} icon={<CheckCheck size={12} />}>
                  Mark all read
                </Button>
              </div>
            }
          />
          <div className="border-t border-line">
            {visible.length === 0 ? (
              <EmptyState
                icon={<Bell size={20} />}
                title={filter === "unread" ? "Nothing unread" : "No notifications"}
                description="Booking confirmations, cancellations, payments and AI alerts will land here."
              />
            ) : (
              visible.map((n) => (
                <div
                  key={n.id}
                  className={cn("flex gap-3 border-b border-line/60 px-4 py-3 last:border-b-0 transition", !n.read && "bg-brand-soft/30")}
                >
                  <span className={cn("mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg", TONE[n.type] ?? TONE.system)}>
                    {ICONS[n.type] ?? ICONS.system}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <p className="truncate text-[0.78rem] font-medium">{n.title}</p>
                      {!n.read && <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-brand" />}
                    </div>
                    <p className="mt-0.5 text-[0.72rem] leading-relaxed text-muted">{n.body}</p>
                    <div className="mt-1 flex items-center gap-2">
                      <span className="text-[0.62rem] text-faint">{relativeTime(n.created_at)}</span>
                      {n.link && (
                        <Link href={n.link} onClick={() => markOne(n.id)} className="text-[0.65rem] font-medium text-brand hover:underline">
                          Open
                        </Link>
                      )}
                      {!n.read && (
                        <button onClick={() => markOne(n.id)} className="text-[0.65rem] text-faint hover:text-ink">
                          Mark read
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </Card>
      </div>

      <div className="space-y-4">
        <Card>
          <CardHeader title="Delivery channels" subtitle="How your alerts reach you" icon={<Mail size={14} />} />
          <div className="space-y-2 border-t border-line p-4">
            {[
              { label: "Email notifications", detail: "hello@lumierestudio.sg", on: true },
              { label: "SMS reminders", detail: "+65 6733 8899", on: true },
              { label: "Daily digest", detail: "Sent at 08:00 SGT", on: true },
              { label: "AI alerts", detail: "Insights & risk flags", on: true },
            ].map((c) => (
              <div key={c.label} className="flex items-center justify-between gap-2 rounded-lg bg-surface-2 px-2.5 py-2">
                <div>
                  <p className="text-[0.74rem] font-medium">{c.label}</p>
                  <p className="text-[0.62rem] text-faint">{c.detail}</p>
                </div>
                <Badge tone={c.on ? "paid" : "neutral"}>{c.on ? "On" : "Off"}</Badge>
              </div>
            ))}
            <Link href="/dashboard/settings" className="mt-1 block text-center text-[0.7rem] font-medium text-brand hover:underline">
              Manage notification settings
            </Link>
          </div>
        </Card>

        <Card>
          <CardHeader title="What lands here" />
          <div className="space-y-1.5 border-t border-line p-4 text-[0.7rem] text-muted">
            {[
              "New online booking requests",
              "Cancellations & reschedules",
              "Payments, refunds and failed charges",
              "New reviews and waitlist matches",
              "Staff time-off requests",
              "AI insight and churn alerts",
            ].map((t) => (
              <p key={t} className="flex items-start gap-1.5">
                <span className="mt-1 h-1 w-1 shrink-0 rounded-full bg-brand" />
                {t}
              </p>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
