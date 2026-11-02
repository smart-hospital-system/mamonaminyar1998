"use client";

import { BookingModal } from "@/components/dashboard/booking-modal";
import { Avatar, Button, Card, EmptyState, Segmented, Skeleton, StatusBadge } from "@/components/ui/primitives";
import { fetcher } from "@/lib/fetcher";
import type { BookingFull } from "@/lib/types";
import {
  addDaysKey, cn, dateKey, fmDateKey, fmtDateShort, fmtTime, money, startOfWeekKey, timeKey, toIso, todayKey,
} from "@/lib/utils";
import { CalendarDays, ChevronLeft, ChevronRight, Clock, Plus, Users } from "lucide-react";
import { useMemo, useState } from "react";
import useSWR from "swr";

type View = "day" | "week" | "agenda";
type StaffLite = { id: string; name: string; avatar_color: string | null; title: string | null };
type Schedule = { staff_id: string; weekday: number; start_time: string; end_time: string; is_working: number };

const HOUR_PX = 62;
const OPEN_HOUR = 8;
const CLOSE_HOUR = 21;

function minutesOf(iso: string) {
  const [h, m] = timeKey(iso).split(":").map(Number);
  return h * 60 + m;
}

export function CalendarClient({
  initialBookings,
  staff,
  schedules,
  initialDate,
  lockedStaffId,
}: {
  initialBookings: BookingFull[];
  staff: StaffLite[];
  schedules: Schedule[];
  initialDate: string;
  lockedStaffId?: string;
}) {
  const [view, setView] = useState<View>("day");
  const [date, setDate] = useState(initialDate);
  const [staffFilter, setStaffFilter] = useState<string>(lockedStaffId ?? "");
  const [modal, setModal] = useState<{ open: boolean; start?: string; staffId?: string; date?: string }>({ open: false });

  const { from, to } = useMemo(() => {
    if (view === "day") return { from: date, to: addDaysKey(date, 1) };
    if (view === "week") {
      const start = startOfWeekKey(date);
      return { from: start, to: addDaysKey(start, 7) };
    }
    return { from: todayKey(), to: addDaysKey(todayKey(), 14) };
  }, [view, date]);

  const key = `/api/bookings?from=${encodeURIComponent(toIso(from, "00:00"))}&to=${encodeURIComponent(toIso(to, "00:00"))}&limit=400&sort=upcoming`;
  const { data, isLoading } = useSWR<{ items: BookingFull[] }>(key, fetcher, {
    fallbackData: view === "day" && date === initialDate ? { items: initialBookings } : undefined,
    keepPreviousData: true,
    refreshInterval: 60_000,
    revalidateOnFocus: true,
  });

  const allBookings = (data?.items ?? []).filter((b) => b.status !== "cancelled");
  const bookings = staffFilter ? allBookings.filter((b) => b.staff_id === staffFilter) : allBookings;
  const visibleStaff = staffFilter ? staff.filter((s) => s.id === staffFilter) : staff;

  const weekDays = Array.from({ length: 7 }, (_, i) => addDaysKey(startOfWeekKey(date), i));
  const weekday = new Date(`${date}T00:00:00Z`).getUTCDay();

  function shift(delta: number) {
    if (view === "day") setDate(addDaysKey(date, delta));
    else if (view === "week") setDate(addDaysKey(date, delta * 7));
  }

  return (
    <div className="space-y-4">
      {/* toolbar */}
      <Card className="flex flex-wrap items-center gap-2 p-2.5">
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" onClick={() => shift(-1)} aria-label="Previous">
            <ChevronLeft size={15} />
          </Button>
          <button
            onClick={() => setDate(todayKey())}
            className="rounded-lg border border-line bg-surface px-2.5 py-1.5 text-[0.72rem] font-medium hover:bg-surface-3"
          >
            Today
          </button>
          <Button variant="ghost" size="icon" onClick={() => shift(1)} aria-label="Next">
            <ChevronRight size={15} />
          </Button>
        </div>

        <div className="min-w-0">
          <p className="truncate text-[0.85rem] font-semibold">
            {view === "day"
              ? fmDateKey(date)
              : view === "week"
                ? `${fmtDateShort(startOfWeekKey(date))} – ${fmtDateShort(addDaysKey(startOfWeekKey(date), 6))}`
                : "Next 14 days"}
          </p>
          <p className="text-[0.65rem] text-faint">
            {isLoading && !data ? "Loading…" : `${bookings.length} appointments · ${money(bookings.reduce((a, b) => a + b.price, 0))} booked value`}
          </p>
        </div>

        <div className="ml-auto flex flex-wrap items-center gap-2">
          {!lockedStaffId && (
            <select className="input h-8 w-auto text-[0.72rem]" value={staffFilter} onChange={(e) => setStaffFilter(e.target.value)}>
              <option value="">All staff</option>
              {staff.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          )}
          <Segmented
            size="sm"
            value={view}
            onChange={(v) => setView(v)}
            options={[
              { value: "day", label: "Day" },
              { value: "week", label: "Week" },
              { value: "agenda", label: "Agenda" },
            ]}
          />
          <Button variant="primary" size="sm" onClick={() => setModal({ open: true, date })} icon={<Plus size={13} />}>
            New
          </Button>
        </div>
      </Card>

      {/* -------------------------------------------------- day view */}
      {view === "day" && (
        <Card className="overflow-hidden">
          {isLoading && !data ? (
            <div className="p-4">
              <Skeleton className="h-[420px] w-full" />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <div className="min-w-[40rem]">
                {/* header */}
                <div className="sticky top-0 z-10 flex border-b border-line bg-surface">
                  <div className="w-14 shrink-0 border-r border-line py-2 text-center text-[0.6rem] font-medium uppercase text-faint">
                    SGT
                  </div>
                  {visibleStaff.map((s) => {
                    const count = bookings.filter((b) => b.staff_id === s.id).length;
                    const working = schedules.some((sc) => sc.staff_id === s.id && sc.weekday === weekday && sc.is_working);
                    return (
                      <div key={s.id} className="min-w-[9rem] flex-1 border-r border-line px-2 py-1.5 last:border-r-0">
                        <div className="flex items-center gap-1.5">
                          <Avatar name={s.name} size={22} color={s.avatar_color} />
                          <div className="min-w-0">
                            <p className="truncate text-[0.72rem] font-medium leading-tight">{s.name}</p>
                            <p className="truncate text-[0.6rem] text-faint leading-tight">
                              {working ? `${count} booking${count === 1 ? "" : "s"}` : "Day off"}
                            </p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* grid */}
                <div className="relative flex">
                  <div className="w-14 shrink-0 border-r border-line">
                    {Array.from({ length: CLOSE_HOUR - OPEN_HOUR }, (_, i) => (
                      <div key={i} className="relative" style={{ height: HOUR_PX }}>
                        <span className="absolute -top-1.5 right-1.5 text-[0.6rem] tabular-nums text-faint">
                          {String(OPEN_HOUR + i).padStart(2, "0")}:00
                        </span>
                      </div>
                    ))}
                  </div>

                  {visibleStaff.map((s) => {
                    const sched = schedules.find((sc) => sc.staff_id === s.id && sc.weekday === weekday);
                    const shiftStart = sched ? Number(sched.start_time.slice(0, 2)) * 60 + Number(sched.start_time.slice(3)) : 9 * 60;
                    const shiftEnd = sched ? Number(sched.end_time.slice(0, 2)) * 60 + Number(sched.end_time.slice(3)) : 18 * 60;
                    const working = sched?.is_working;
                    const staffBookings = bookings.filter((b) => b.staff_id === s.id);
                    return (
                      <div key={s.id} className="relative min-w-[9rem] flex-1 border-r border-line last:border-r-0">
                        {Array.from({ length: CLOSE_HOUR - OPEN_HOUR }, (_, i) => (
                          <div
                            key={i}
                            className="border-b border-line/60"
                            style={{ height: HOUR_PX }}
                            onClick={() =>
                              setModal({
                                open: true,
                                date,
                                staffId: s.id,
                                start: `${date}T${String(OPEN_HOUR + i).padStart(2, "0")}:00:00+08:00`,
                              })
                            }
                          />
                        ))}

                        {/* shift shading */}
                        {working ? (
                          <div
                            className="pointer-events-none absolute inset-x-1 rounded-md bg-emerald-500/[0.045]"
                            style={{
                              top: ((shiftStart - OPEN_HOUR * 60) / 60) * HOUR_PX,
                              height: ((shiftEnd - shiftStart) / 60) * HOUR_PX,
                            }}
                          />
                        ) : (
                          <div className="pointer-events-none absolute inset-0 bg-[repeating-linear-gradient(45deg,transparent,transparent_6px,var(--surface-3)_6px,var(--surface-3)_12px)] opacity-40" />
                        )}

                        {staffBookings.map((b) => {
                          const start = minutesOf(b.start_at);
                          const end = minutesOf(b.end_at);
                          const top = ((start - OPEN_HOUR * 60) / 60) * HOUR_PX;
                          const height = Math.max(28, ((end - start) / 60) * HOUR_PX - 3);
                          const cancelled = b.status === "cancelled";
                          return (
                            <button
                              key={b.id}
                              onClick={() => setModal({ open: true, date, staffId: s.id })}
                              className={cn(
                                "absolute inset-x-1 overflow-hidden rounded-md border-l-[3px] px-1.5 py-1 text-left transition hover:z-20 hover:shadow-md",
                                cancelled && "opacity-50"
                              )}
                              style={{
                                top,
                                height,
                                borderLeftColor: b.service_color ?? "var(--brand)",
                                background: `color-mix(in srgb, ${b.service_color ?? "#6553f5"} 11%, var(--surface))`,
                              }}
                            >
                              <p className="truncate text-[0.63rem] font-semibold leading-tight">{b.customer_name}</p>
                              {height > 34 && (
                                <p className="truncate text-[0.58rem] leading-tight text-muted">{b.service_name}</p>
                              )}
                              {height > 48 && (
                                <p className="mt-0.5 truncate text-[0.55rem] leading-tight text-faint">
                                  {fmtTime(b.start_at)} · {money(b.price)}
                                </p>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </Card>
      )}

      {/* -------------------------------------------------- week view */}
      {view === "week" && (
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
          {weekDays.map((d) => {
            const dayBookings = bookings.filter((b) => dateKey(b.start_at) === d);
            const isToday = d === todayKey();
            const revenue = dayBookings.reduce((a, b) => a + b.price, 0);
            return (
              <Card key={d} className={cn("flex min-h-[16rem] flex-col overflow-hidden", isToday && "ring-1 ring-brand/40")}>
                <div className={cn("flex items-center justify-between border-b border-line px-2.5 py-2", isToday && "bg-brand-soft/50")}>
                  <div>
                    <p className="text-[0.6rem] font-medium uppercase tracking-wide text-faint">{fmDateKey(d).split(",")[0]}</p>
                    <p className={cn("text-[0.85rem] font-semibold", isToday && "text-brand-ink")}>{d.slice(8)}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[0.6rem] text-faint">{dayBookings.length} appt</p>
                    <p className="text-[0.62rem] font-semibold">{money(revenue, true)}</p>
                  </div>
                </div>
                <div className="flex-1 space-y-1 p-1.5">
                  {dayBookings.slice(0, 7).map((b) => (
                    <button
                      key={b.id}
                      onClick={() => {
                        setDate(d);
                        setView("day");
                      }}
                      className="flex w-full items-center gap-1.5 rounded-md border-l-2 bg-surface-2 px-1.5 py-1 text-left transition hover:bg-surface-3"
                      style={{ borderLeftColor: b.service_color ?? "var(--brand)" }}
                    >
                      <span className="text-[0.58rem] tabular-nums text-faint">{fmtTime(b.start_at)}</span>
                      <span className="min-w-0 flex-1 truncate text-[0.62rem] font-medium">{b.customer_name.split(" ")[0]}</span>
                      <Avatar name={b.staff_name} size={14} color={b.staff_color} />
                    </button>
                  ))}
                  {dayBookings.length === 0 && <p className="px-1 py-4 text-center text-[0.62rem] text-faint">No appointments</p>}
                  {dayBookings.length > 7 && (
                    <button onClick={() => { setDate(d); setView("day"); }} className="w-full rounded px-1 py-0.5 text-[0.6rem] font-medium text-brand hover:underline">
                      +{dayBookings.length - 7} more
                    </button>
                  )}
                </div>
                <button
                  onClick={() => setModal({ open: true, date: d })}
                  className="border-t border-line py-1.5 text-[0.62rem] font-medium text-faint transition hover:bg-surface-2 hover:text-brand"
                >
                  <Plus size={10} className="mr-0.5 inline" /> Add
                </button>
              </Card>
            );
          })}
        </div>
      )}

      {/* -------------------------------------------------- agenda view */}
      {view === "agenda" && (
        <Card className="overflow-hidden">
          {isLoading && !data ? (
            <div className="space-y-3 p-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-12" />
              ))}
            </div>
          ) : bookings.length === 0 ? (
            <EmptyState icon={<CalendarDays size={20} />} title="Nothing booked" description="The next two weeks are wide open." />
          ) : (
            <div>
              {Array.from({ length: 14 }, (_, i) => addDaysKey(todayKey(), i)).map((d) => {
                const dayBookings = allBookings.filter((b) => dateKey(b.start_at) === d);
                if (!dayBookings.length) return null;
                return (
                  <div key={d} className="border-b border-line last:border-b-0">
                    <div className="flex items-center gap-2 bg-surface-2 px-4 py-1.5">
                      <p className="text-[0.7rem] font-semibold">{fmDateKey(d)}</p>
                      <span className="text-[0.62rem] text-faint">
                        {dayBookings.length} appointments · {money(dayBookings.reduce((a, b) => a + b.price, 0))}
                      </span>
                    </div>
                    {dayBookings.map((b) => (
                      <div key={b.id} className="flex items-center gap-3 border-t border-line/50 px-4 py-2">
                        <span className="w-14 text-[0.7rem] tabular-nums text-muted">{fmtTime(b.start_at)}</span>
                        <span className="h-6 w-[3px] rounded-full" style={{ background: b.service_color ?? "var(--brand)" }} />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-[0.76rem] font-medium">{b.customer_name}</p>
                          <p className="truncate text-[0.64rem] text-faint">
                            {b.service_name} · {b.staff_name}
                          </p>
                        </div>
                        <StatusBadge status={b.status} />
                        <span className="hidden text-[0.72rem] font-semibold tabular-nums sm:block">{money(b.price)}</span>
                      </div>
                    ))}
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      )}

      <div className="flex flex-wrap items-center gap-3 text-[0.65rem] text-faint">
        <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-sm bg-emerald-500/30" /> within shift</span>
        <span className="flex items-center gap-1"><Clock size={10} /> {OPEN_HOUR}:00–{CLOSE_HOUR}:00 SGT</span>
        <span className="flex items-center gap-1"><Users size={10} /> click any empty grid cell to book</span>
      </div>

      <BookingModal
        open={modal.open}
        onClose={() => setModal({ open: false })}
        defaults={{ date: modal.date ?? date, startAt: modal.start }}
        onSaved={() => {
          /* SWR revalidates on focus; force a refresh */
          import("swr").then(({ mutate }) => mutate(key));
        }}
      />
    </div>
  );
}
