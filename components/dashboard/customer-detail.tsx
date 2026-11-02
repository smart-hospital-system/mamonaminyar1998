"use client";

import { BookingModal } from "@/components/dashboard/booking-modal";
import { CustomerModal } from "@/components/dashboard/customer-modal";
import {
  Avatar, Badge, Button, Card, CardHeader, EmptyState, LinkButton, Progress, StatusBadge, Stars,
} from "@/components/ui/primitives";
import type { BookingFull, Customer, Payment } from "@/lib/types";
import {
  cn, durationLabel, fmtDate, fmtDateTime, fmtTime, money, parseJson, relativeTime,
} from "@/lib/utils";
import {
  ArrowLeft, CalendarPlus, Cake, Crown, Heart, Mail, MapPin, MessageSquare, Pencil, Phone,
  Receipt, StickyNote, TrendingUp, Trophy,
} from "lucide-react";
import Link from "next/link";
import { useState } from "react";

type Tab = "history" | "payments" | "notes";

export function CustomerDetail({
  customer,
  bookings,
  payments,
}: {
  customer: Customer;
  bookings: BookingFull[];
  payments: Payment[];
}) {
  const [tab, setTab] = useState<Tab>("history");
  const [bookingOpen, setBookingOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);

  const tags = parseJson<string[]>(customer.tags, []);
  const completed = bookings.filter((b) => b.status === "completed");
  const upcoming = bookings.filter((b) => ["confirmed", "pending"].includes(b.status) && new Date(b.start_at) > new Date());
  const upcomingRevenue = upcoming.reduce((a, b) => a + b.price, 0);
  const avgTicket = completed.length ? customer.total_spent / completed.length : 0;
  const hours = completed.reduce((a, b) => a + b.service_duration, 0) / 60;
  const favourite = (() => {
    const map = new Map<string, number>();
    for (const b of completed) map.set(b.service_name, (map.get(b.service_name) ?? 0) + 1);
    return Array.from(map.entries()).sort((a, b) => b[1] - a[1])[0];
  })();

  const tier = customer.total_spent > 1800 ? "Platinum" : customer.total_spent > 900 ? "Gold" : customer.total_spent > 300 ? "Silver" : "New";
  const nextTier = customer.total_spent > 1800 ? 3000 : customer.total_spent > 900 ? 1800 : customer.total_spent > 300 ? 900 : 300;

  return (
    <div className="space-y-4">
      <Link href="/dashboard/customers" className="inline-flex items-center gap-1 text-[0.72rem] font-medium text-muted hover:text-ink">
        <ArrowLeft size={12} /> All customers
      </Link>

      {/* profile header */}
      <Card className="overflow-hidden">
        <div className="relative h-20 bg-gradient-to-r from-violet-500/15 via-fuchsia-500/10 to-transparent">
          {customer.vip && (
            <span className="absolute right-4 top-3 flex items-center gap-1 rounded-full bg-white/70 px-2 py-1 text-[0.62rem] font-semibold text-amber-700 backdrop-blur dark:bg-white/10 dark:text-amber-300">
              <Crown size={11} /> VIP client
            </span>
          )}
        </div>
        <div className="flex flex-col gap-3 px-5 pb-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="flex items-end gap-3">
            <div className="-mt-8">
              <Avatar name={customer.name} size={64} className="ring-4 ring-surface" />
            </div>
            <div className="pb-0.5">
              <h1 className="text-[1.2rem] font-semibold leading-tight tracking-[-0.02em]">{customer.name}</h1>
              <div className="mt-1 flex flex-wrap items-center gap-2 text-[0.7rem] text-muted">
                <span className="flex items-center gap-1"><Mail size={10} /> {customer.email ?? "No email"}</span>
                <span className="flex items-center gap-1"><Phone size={10} /> {customer.phone ?? "No phone"}</span>
                <span className="flex items-center gap-1"><MapPin size={10} /> Singapore</span>
              </div>
              <div className="mt-1.5 flex flex-wrap gap-1">
                {tags.map((t) => (
                  <Badge key={t} tone={t}>{t}</Badge>
                ))}
                <Badge tone="neutral">{tier} tier</Badge>
              </div>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={() => setEditOpen(true)} icon={<Pencil size={12} />}>
              Edit
            </Button>
            <LinkButton href={`/dashboard/bookings?q=${encodeURIComponent(customer.name)}`} variant="outline" size="sm" icon={<Receipt size={12} />}>
              Bookings
            </LinkButton>
            <Button variant="primary" size="sm" onClick={() => setBookingOpen(true)} icon={<CalendarPlus size={12} />}>
              New booking
            </Button>
          </div>
        </div>
      </Card>

      {/* stats */}
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[
          { label: "Lifetime spend", value: money(customer.total_spent), hint: `${completed.length} completed visits`, icon: <TrendingUp size={13} /> },
          { label: "Average ticket", value: money(avgTicket), hint: favourite ? `Prefers ${favourite[0]}` : "No pattern yet", icon: <Trophy size={13} /> },
          { label: "Loyalty points", value: customer.loyalty_points, hint: `${money(nextTier - customer.total_spent)} to next tier`, icon: <Heart size={13} /> },
          { label: "Time with us", value: `${hours.toFixed(1)}h`, hint: upcoming.length ? `${upcoming.length} upcoming` : "No upcoming visits", icon: <CalendarPlus size={13} /> },
        ].map((s) => (
          <Card key={s.label} className="p-3.5">
            <div className="flex items-center gap-2 text-faint">
              <span className="text-brand">{s.icon}</span>
              <p className="text-[0.65rem] uppercase tracking-wide">{s.label}</p>
            </div>
            <p className="mt-1.5 text-[1.1rem] font-semibold leading-tight">{s.value}</p>
            <p className="mt-0.5 text-[0.65rem] text-muted">{s.hint}</p>
            {s.label === "Loyalty points" && (
              <Progress className="mt-2" value={Math.min(100, (customer.total_spent / nextTier) * 100)} height={4} />
            )}
          </Card>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <Card>
            <div className="flex items-center gap-1 border-b border-line px-3 py-2">
              {([
                ["history", "Booking history", <Receipt key="a" size={12} />],
                ["payments", "Payments", <TrendingUp key="b" size={12} />],
                ["notes", "Notes & preferences", <StickyNote key="c" size={12} />],
              ] as const).map(([key, label, icon]) => (
                <button
                  key={key}
                  onClick={() => setTab(key)}
                  className={cn(
                    "flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[0.72rem] font-medium transition",
                    tab === key ? "bg-brand-soft text-brand-ink" : "text-muted hover:bg-surface-3 hover:text-ink"
                  )}
                >
                  {icon}
                  {label}
                </button>
              ))}
            </div>

            {tab === "history" && (
              <div>
                {bookings.length === 0 ? (
                  <EmptyState compact icon={<Receipt size={18} />} title="No bookings yet" description="Create their first appointment to get started." />
                ) : (
                  <div className="divide-y divide-line">
                    {bookings.map((b) => (
                      <div key={b.id} className="flex items-center gap-3 px-4 py-2.5">
                        <span className="h-8 w-[3px] rounded-full" style={{ background: b.service_color ?? "var(--brand)" }} />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-[0.78rem] font-medium">{b.service_name}</p>
                          <p className="truncate text-[0.66rem] text-faint">
                            {fmtDateTime(b.start_at)} · {b.staff_name} · {durationLabel(b.service_duration)}
                          </p>
                        </div>
                        <StatusBadge status={b.status} />
                        <span className="w-16 text-right text-[0.74rem] font-semibold tabular-nums">{money(b.price)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {tab === "payments" && (
              <div>
                {payments.length === 0 ? (
                  <EmptyState compact icon={<Receipt size={18} />} title="No payments yet" description="Payments appear here after checkout." />
                ) : (
                  <div className="divide-y divide-line">
                    {payments.map((p) => (
                      <div key={p.id} className="flex items-center gap-3 px-4 py-2.5">
                        <div className="min-w-0 flex-1">
                          <p className="text-[0.76rem] font-medium">{p.invoice_no}</p>
                          <p className="text-[0.64rem] text-faint">
                            {fmtDate(p.paid_at ?? p.created_at)} · {p.method.replace("_", " ")}
                          </p>
                        </div>
                        <StatusBadge status={p.status} />
                        <span className="w-20 text-right text-[0.76rem] font-semibold tabular-nums">{money(p.total)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {tab === "notes" && (
              <div className="space-y-4 p-4">
                <div>
                  <p className="mb-1 flex items-center gap-1.5 text-[0.68rem] font-semibold uppercase tracking-wide text-faint">
                    <StickyNote size={11} /> Preferences
                  </p>
                  <p className="rounded-lg bg-surface-2 p-2.5 text-[0.78rem] leading-relaxed">
                    {customer.preferences || "No preferences recorded yet."}
                  </p>
                </div>
                <div>
                  <p className="mb-1 flex items-center gap-1.5 text-[0.68rem] font-semibold uppercase tracking-wide text-faint">
                    <MessageSquare size={11} /> Internal notes
                  </p>
                  <p className="rounded-lg bg-surface-2 p-2.5 text-[0.78rem] leading-relaxed">
                    {customer.notes || "Nothing noted."}
                  </p>
                </div>
                <div className="flex flex-wrap gap-3 text-[0.7rem] text-muted">
                  <span className="flex items-center gap-1"><Cake size={11} /> Birthday {customer.dob || "unknown"}</span>
                  <span>Marketing {customer.marketing_opt_in ? "opted in" : "opted out"}</span>
                  <span>Joined {fmtDate(customer.created_at)}</span>
                </div>
              </div>
            )}
          </Card>
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader title="Next appointment" subtitle={upcoming.length ? `${money(upcomingRevenue)} booked` : "No upcoming visits"} />
            <div className="border-t border-line p-4">
              {upcoming.length ? (
                <div className="space-y-2.5">
                  {upcoming.slice(0, 3).map((b) => (
                    <div key={b.id} className="rounded-lg border border-line p-2.5">
                      <p className="text-[0.76rem] font-medium">{b.service_name}</p>
                      <p className="mt-0.5 text-[0.66rem] text-muted">
                        {fmtDate(b.start_at)} at {fmtTime(b.start_at)} · {b.staff_name}
                      </p>
                      <div className="mt-1.5 flex items-center justify-between">
                        <StatusBadge status={b.status} />
                        <span className="text-[0.74rem] font-semibold">{money(b.price)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <EmptyState
                  compact
                  icon={<CalendarPlus size={18} />}
                  title="Nothing booked"
                  description="This client has no upcoming visits."
                  action={<Button variant="soft" size="sm" onClick={() => setBookingOpen(true)}>Book now</Button>}
                />
              )}
            </div>
          </Card>

          <Card>
            <CardHeader title="Satisfaction" subtitle="From reviews" />
            <div className="space-y-3 border-t border-line p-4">
              <div className="flex items-center gap-2">
                <Stars rating={4.8} size={14} />
                <span className="text-[0.8rem] font-semibold">4.8</span>
                <span className="text-[0.66rem] text-faint">average across visits</span>
              </div>
              <div className="rounded-lg bg-surface-2 p-2.5 text-[0.72rem] italic leading-relaxed text-muted">
                “Always looked after — the team remembers exactly how I like my colour.”
              </div>
              <p className="text-[0.62rem] text-faint">Customer since {fmtDate(customer.created_at)} · {relativeTime(customer.created_at)}</p>
            </div>
          </Card>
        </div>
      </div>

      <BookingModal open={bookingOpen} onClose={() => setBookingOpen(false)} />
      <CustomerModal open={editOpen} onClose={() => setEditOpen(false)} customer={customer} onSaved={() => window.location.reload()} />
    </div>
  );
}
