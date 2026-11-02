"use client";

import { BookingModal } from "@/components/dashboard/booking-modal";
import {
  Avatar, Badge, Button, Card, EmptyState, LinkButton, Segmented, Skeleton, StatusBadge,
} from "@/components/ui/primitives";
import { ConfirmDialog } from "@/components/ui/modal";
import { useToast } from "@/components/ui/toast";
import { api, fetcher } from "@/lib/fetcher";
import type { BookingFull } from "@/lib/types";
import { cn, fmtDateShort, fmtTime, money } from "@/lib/utils";
import {
  AlertCircle, CalendarPlus, CalendarX2, Check, CheckCheck, ChevronDown, Clock, Copy,
  Filter, Pencil, Plus, RefreshCw, Search, Trash2, UserX, X,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import useSWR from "swr";

type Resp = { items: BookingFull[]; total: number; counts: Record<string, number> };
type StaffLite = { id: string; name: string; avatar_color: string | null };

const STATUS_TABS = [
  { value: "all", label: "All" },
  { value: "pending", label: "Pending" },
  { value: "confirmed", label: "Confirmed" },
  { value: "completed", label: "Completed" },
  { value: "cancelled", label: "Cancelled" },
  { value: "no_show", label: "No-show" },
];

export function BookingsClient({
  initial,
  staff,
  initialStatus,
  initialQuery,
  openNew,
  scopeCustomerId,
  lockedStaffId,
}: {
  initial: Resp;
  staff: StaffLite[];
  initialStatus?: string;
  initialQuery?: string;
  openNew?: boolean;
  scopeCustomerId?: string;
  lockedStaffId?: string;
}) {
  const toast = useToast();
  const [q, setQ] = useState(initialQuery ?? "");
  const [status, setStatus] = useState(initialStatus ?? "all");
  const [staffId, setStaffId] = useState(lockedStaffId ?? "");
  const [sort, setSort] = useState("upcoming");
  const [limit, setLimit] = useState(25);
  const [modalOpen, setModalOpen] = useState(Boolean(openNew));
  const [editing, setEditing] = useState<BookingFull | null>(null);
  const [confirm, setConfirm] = useState<{ kind: "cancel" | "delete"; booking: BookingFull } | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const params = new URLSearchParams();
  if (q) params.set("q", q);
  if (status !== "all") params.set("status", status);
  if (staffId) params.set("staff_id", staffId);
  if (scopeCustomerId) params.set("customer_id", scopeCustomerId);
  params.set("sort", sort);
  params.set("limit", String(limit));

  const key = `/api/bookings?${params.toString()}`;
  const { data, isLoading, mutate } = useSWR<Resp>(key, fetcher, {
    fallbackData: !q && status === (initialStatus ?? "all") && !staffId && sort === "upcoming" && limit === 25 ? initial : undefined,
    keepPreviousData: true,
  });

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setOpenMenu(null);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const rows = data?.items ?? [];
  const counts = data?.counts ?? initial.counts;

  const grouped = useMemo(() => {
    const map = new Map<string, BookingFull[]>();
    for (const b of rows) {
      const k = fmtDateShort(b.start_at);
      map.set(k, [...(map.get(k) ?? []), b]);
    }
    return Array.from(map.entries());
  }, [rows]);

  async function patchStatus(booking: BookingFull, next: string) {
    setOpenMenu(null);
    const optimistic = { ...data!, items: data!.items.map((b) => (b.id === booking.id ? { ...b, status: next as BookingFull["status"] } : b)) };
    const label =
      next === "confirmed" ? "Booking confirmed" : next === "completed" ? "Booking completed" : next === "cancelled" ? "Booking cancelled" : "Booking updated";
    try {
      await mutate(
        async () => {
          await api(`/api/bookings/${booking.id}`, "PATCH", {
            status: next,
            cancelled_reason: next === "cancelled" ? "Cancelled from dashboard" : undefined,
          });
          return fetcher<Resp>(key);
        },
        { optimisticData: optimistic, rollbackOnError: true, revalidate: false }
      );
      toast.success(label, `${booking.customer_name} · ${booking.service_name}`);
    } catch (e) {
      toast.error("Update failed", e instanceof Error ? e.message : undefined);
    }
  }

  async function duplicate(booking: BookingFull) {
    setOpenMenu(null);
    setBusy(booking.id);
    try {
      await api(`/api/bookings/${booking.id}`, "POST", {});
      toast.success("Booking duplicated", "A new confirmed booking was created at the same time.");
      mutate();
    } catch (e) {
      toast.error("Couldn't duplicate", e instanceof Error ? e.message : undefined);
    } finally {
      setBusy(null);
    }
  }

  async function doConfirm() {
    if (!confirm) return;
    setBusy(confirm.booking.id);
    try {
      if (confirm.kind === "cancel") {
        await patchStatus(confirm.booking, "cancelled");
      } else {
        await api(`/api/bookings/${confirm.booking.id}`, "DELETE");
        toast.success("Booking deleted", "The appointment and its payment record were removed.");
        mutate();
      }
    } catch (e) {
      toast.error("Action failed", e instanceof Error ? e.message : undefined);
    } finally {
      setBusy(null);
      setConfirm(null);
    }
  }

  return (
    <div className="space-y-4">
      {/* toolbar */}
      <Card className="p-3">
        <div className="flex flex-col gap-2.5">
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative min-w-[11rem] flex-1">
              <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-faint" />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search customer, code, service…"
                className="input h-9 pl-9"
              />
              {q && (
                <button onClick={() => setQ("")} className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-faint hover:text-ink">
                  <X size={12} />
                </button>
              )}
            </div>

            {!lockedStaffId ? (
              <select className="input h-9 w-auto" value={staffId} onChange={(e) => setStaffId(e.target.value)}>
                <option value="">All staff</option>
                {staff.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            ) : (
              <span className="rounded-lg border border-line bg-surface-2 px-2.5 py-1.5 text-[0.7rem] text-muted">
                My bookings only
              </span>
            )}

            <select className="input h-9 w-auto" value={sort} onChange={(e) => setSort(e.target.value)}>
              <option value="upcoming">Soonest first</option>
              <option value="latest">Latest first</option>
              <option value="newest">Recently booked</option>
              <option value="price_high">Highest value</option>
            </select>

            <Button variant="ghost" size="sm" onClick={() => mutate()} icon={<RefreshCw size={13} className={isLoading ? "animate-spin" : ""} />}>
              Refresh
            </Button>

            <Button
              variant="primary"
              size="sm"
              onClick={() => {
                setEditing(null);
                setModalOpen(true);
              }}
              icon={<Plus size={14} />}
            >
              New booking
            </Button>
          </div>

          <div className="flex flex-wrap items-center gap-1 overflow-x-auto">
            {STATUS_TABS.map((t) => {
              const count = counts[t.value] ?? 0;
              const active = status === t.value;
              return (
                <button
                  key={t.value}
                  onClick={() => setStatus(t.value)}
                  className={cn(
                    "flex shrink-0 items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[0.72rem] font-medium transition",
                    active ? "bg-brand-soft text-brand-ink" : "text-muted hover:bg-surface-3 hover:text-ink"
                  )}
                >
                  {t.label}
                  <span className={cn("rounded px-1 text-[0.6rem] tabular-nums", active ? "bg-brand/15" : "bg-surface-3 text-faint")}>
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </Card>

      {/* table */}
      <Card className="overflow-hidden">
        <div className="flex items-center justify-between border-b border-line px-4 py-2.5">
          <p className="text-[0.72rem] text-muted">
            <span className="font-semibold text-ink">{data?.total ?? 0}</span> bookings
            {q && <> matching “{q}”</>}
          </p>
          <div className="flex items-center gap-2 text-[0.68rem] text-faint">
            <Filter size={11} /> {status === "all" ? "All statuses" : status.replace("_", " ")}
          </div>
        </div>

        {isLoading && !data ? (
          <div className="divide-y divide-line">
            {Array.from({ length: 7 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 px-4 py-3">
                <Skeleton className="h-8 w-8 rounded-full" />
                <div className="flex-1 space-y-1.5">
                  <Skeleton className="h-3 w-36" />
                  <Skeleton className="h-2.5 w-24" />
                </div>
                <Skeleton className="h-3 w-20" />
                <Skeleton className="h-5 w-16 rounded-full" />
              </div>
            ))}
          </div>
        ) : rows.length === 0 ? (
          <EmptyState
            icon={<CalendarX2 size={20} />}
            title={q ? "No bookings match your search" : "No bookings here yet"}
            description={
              q
                ? "Try a different name, booking code or service — or clear your filters."
                : "Once a client books online or you add an appointment, it will show up here."
            }
            action={
              <div className="flex gap-2">
                {q && (
                  <Button variant="outline" size="sm" onClick={() => { setQ(""); setStatus("all"); setStaffId(""); }}>
                    Clear filters
                  </Button>
                )}
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => { setEditing(null); setModalOpen(true); }}
                  icon={<CalendarPlus size={13} />}
                >
                  Create booking
                </Button>
              </div>
            }
          />
        ) : (
          <>
            {/* desktop table */}
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full border-collapse text-left">
                <thead>
                  <tr className="border-b border-line bg-surface-2 text-[0.62rem] uppercase tracking-[0.06em] text-faint">
                    <th className="px-4 py-2 font-semibold">Customer</th>
                    <th className="px-3 py-2 font-semibold">Service</th>
                    <th className="px-3 py-2 font-semibold">Staff</th>
                    <th className="px-3 py-2 font-semibold">When</th>
                    <th className="px-3 py-2 text-right font-semibold">Price</th>
                    <th className="px-3 py-2 font-semibold">Payment</th>
                    <th className="px-3 py-2 font-semibold">Status</th>
                    <th className="px-3 py-2" />
                  </tr>
                </thead>
                <tbody>
                  {rows.map((b) => (
                    <tr key={b.id} className="table-row-hover border-b border-line/70 transition">
                      <td className="px-4 py-2.5">
                        <div className="flex items-center gap-2.5">
                          <Avatar name={b.customer_name} size={28} color={b.staff_color} />
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <p className="truncate text-[0.78rem] font-medium">{b.customer_name}</p>
                              {b.customer_vip ? <Badge tone="VIP">VIP</Badge> : null}
                            </div>
                            <p className="truncate text-[0.63rem] text-faint">{b.code} · {b.source.replace("_", " ")}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-2.5">
                        <div className="flex items-center gap-1.5">
                          <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: b.service_color ?? "var(--brand)" }} />
                          <div className="min-w-0">
                            <p className="truncate text-[0.75rem]">{b.service_name}</p>
                            <p className="text-[0.62rem] text-faint">{b.service_duration} min</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-2.5">
                        <p className="text-[0.75rem]">{b.staff_name}</p>
                        <p className="text-[0.62rem] text-faint">{b.staff_color ? "Specialist" : ""}</p>
                      </td>
                      <td className="px-3 py-2.5">
                        <p className="text-[0.75rem] font-medium">{fmtDateShort(b.start_at)}</p>
                        <p className="text-[0.62rem] text-faint">{fmtTime(b.start_at)} – {fmtTime(b.end_at)}</p>
                      </td>
                      <td className="px-3 py-2.5 text-right text-[0.75rem] font-semibold tabular-nums">{money(b.price)}</td>
                      <td className="px-3 py-2.5">
                        <StatusBadge status={b.payment_status} />
                      </td>
                      <td className="px-3 py-2.5">
                        <StatusBadge status={b.status} />
                      </td>
                      <td className="relative px-3 py-2.5 text-right">
                        <button
                          onClick={() => setOpenMenu(openMenu === b.id ? null : b.id)}
                          className="rounded-lg p-1 text-faint transition hover:bg-surface-3 hover:text-ink"
                        >
                          <ChevronDown size={14} />
                        </button>
                        {openMenu === b.id && (
                          <div
                            ref={menuRef}
                            className="anim-pop absolute right-3 top-9 z-30 w-44 overflow-hidden rounded-xl border border-line bg-surface py-1 text-left shadow-xl"
                          >
                            {b.status === "pending" && (
                              <MenuItem icon={<Check size={13} />} onClick={() => patchStatus(b, "confirmed")}>
                                Confirm booking
                              </MenuItem>
                            )}
                            {b.status === "confirmed" && (
                              <MenuItem icon={<CheckCheck size={13} />} onClick={() => patchStatus(b, "completed")}>
                                Mark completed
                              </MenuItem>
                            )}
                            <MenuItem
                              icon={<Pencil size={13} />}
                              onClick={() => {
                                setEditing(b);
                                setModalOpen(true);
                                setOpenMenu(null);
                              }}
                            >
                              Edit details
                            </MenuItem>
                            <MenuItem icon={<Copy size={13} />} onClick={() => duplicate(b)}>
                              Book again
                            </MenuItem>
                            <MenuItem icon={<UserX size={13} />} onClick={() => patchStatus(b, "no_show")}>
                              Mark no-show
                            </MenuItem>
                            <div className="my-1 h-px bg-line" />
                            <MenuItem icon={<X size={13} />} danger onClick={() => { setConfirm({ kind: "cancel", booking: b }); setOpenMenu(null); }}>
                              Cancel booking
                            </MenuItem>
                            <MenuItem icon={<Trash2 size={13} />} danger onClick={() => { setConfirm({ kind: "delete", booking: b }); setOpenMenu(null); }}>
                              Delete
                            </MenuItem>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* mobile cards */}
            <div className="divide-y divide-line md:hidden">
              {rows.map((b) => (
                <div key={b.id} className="p-3">
                  <div className="flex items-center gap-2.5">
                    <Avatar name={b.customer_name} size={32} color={b.staff_color} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[0.8rem] font-medium">{b.customer_name}</p>
                      <p className="truncate text-[0.68rem] text-muted">
                        {b.service_name} · {fmtTime(b.start_at)}
                      </p>
                    </div>
                    <p className="text-[0.78rem] font-semibold">{money(b.price)}</p>
                  </div>
                  <div className="mt-2 flex flex-wrap items-center gap-1.5">
                    <StatusBadge status={b.status} />
                    <StatusBadge status={b.payment_status} />
                    <span className="text-[0.65rem] text-faint">{fmtDateShort(b.start_at)}</span>
                    <div className="ml-auto flex gap-1">
                      <Button size="sm" variant="ghost" onClick={() => { setEditing(b); setModalOpen(true); }}>
                        Edit
                      </Button>
                      {b.status === "pending" && (
                        <Button size="sm" variant="soft" onClick={() => patchStatus(b, "confirmed")}>
                          Confirm
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {rows.length > 0 && (data?.total ?? 0) > rows.length && (
          <div className="border-t border-line p-3 text-center">
            <Button variant="outline" size="sm" onClick={() => setLimit((l) => l + 25)} loading={isLoading} icon={<ChevronDown size={13} />}>
              Load more bookings
            </Button>
          </div>
        )}
      </Card>

      <BookingModal
        open={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setEditing(null);
        }}
        editing={editing}
        onSaved={() => mutate()}
      />

      <ConfirmDialog
        open={Boolean(confirm)}
        onClose={() => setConfirm(null)}
        onConfirm={doConfirm}
        loading={Boolean(busy)}
        danger
        title={confirm?.kind === "cancel" ? "Cancel this booking?" : "Delete this booking?"}
        confirmLabel={confirm?.kind === "cancel" ? "Cancel booking" : "Delete permanently"}
        description={
          confirm
            ? confirm.kind === "cancel"
              ? `${confirm.booking.customer_name}'s ${confirm.booking.service_name} on ${fmtDateShort(confirm.booking.start_at)} will be cancelled and the customer notified. Paid amounts are flagged for refund.`
              : `This permanently removes ${confirm.booking.customer_name}'s booking and its payment record. This cannot be undone.`
            : ""
        }
      />
    </div>
  );
}

function MenuItem({
  children,
  icon,
  onClick,
  danger,
}: {
  children: React.ReactNode;
  icon?: React.ReactNode;
  onClick: () => void;
  danger?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex w-full items-center gap-2 px-2.5 py-1.5 text-[0.74rem] transition hover:bg-surface-2",
        danger ? "text-rose-600 dark:text-rose-400" : "text-ink"
      )}
    >
      {icon}
      {children}
    </button>
  );
}
