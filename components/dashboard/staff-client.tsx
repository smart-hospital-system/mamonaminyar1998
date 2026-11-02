"use client";

import {
  Avatar, Badge, Button, Card, CardHeader, EmptyState, Progress, Skeleton, Stars, Switch,
} from "@/components/ui/primitives";
import { Modal, ConfirmDialog } from "@/components/ui/modal";
import { useToast } from "@/components/ui/toast";
import { api } from "@/lib/fetcher";
import type { StaffWithStats } from "@/lib/queries";
import { cn, fmtDate, money, relativeTime } from "@/lib/utils";
import {
  CalendarClock, Check, Clock, Coffee, Mail, Phone, Plus, Power, Star, TrendingUp, Users, X,
} from "lucide-react";
import { useState } from "react";

type TimeOff = { id: string; staff_id: string; start_date: string; end_date: string; reason: string | null; status: string; created_at: string };
type ServiceOpt = { id: string; name: string; category: string; color: string | null };

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function StaffClient({
  initial,
  timeOff,
  services,
  canManage,
}: {
  initial: StaffWithStats[];
  timeOff: TimeOff[];
  services: ServiceOpt[];
  canManage: boolean;
}) {
  const toast = useToast();
  const [staff, setStaff] = useState(initial);
  const [requests, setRequests] = useState(timeOff);
  const [editing, setEditing] = useState<StaffWithStats | null>(null);
  const [creating, setCreating] = useState(false);
  const [scheduleFor, setScheduleFor] = useState<StaffWithStats | null>(null);
  const [timeOffFor, setTimeOffFor] = useState<StaffWithStats | null>(null);
  const [deactivate, setDeactivate] = useState<StaffWithStats | null>(null);
  const [busy, setBusy] = useState(false);

  const totalRevenue = staff.reduce((a, s) => a + s.stats.revenue, 0);
  const avgRating = staff.filter((s) => s.stats.rating).length
    ? staff.filter((s) => s.stats.rating).reduce((a, s) => a + s.stats.rating, 0) / staff.filter((s) => s.stats.rating).length
    : 0;
  const pendingTimeOff = requests.filter((r) => r.status === "pending");

  async function refresh() {
    const res = await fetch("/api/staff");
    if (res.ok) {
      const data = await res.json();
      setStaff(data.items ?? []);
    }
  }

  async function toggleActive(s: StaffWithStats) {
    setBusy(true);
    try {
      await api(`/api/staff/${s.id}`, "PATCH", { active: !s.active });
      await refresh();
      toast.success(s.active ? "Staff deactivated" : "Staff reactivated", s.name);
      setDeactivate(null);
    } catch (e) {
      toast.error("Action failed", e instanceof Error ? e.message : undefined);
    } finally {
      setBusy(false);
    }
  }

  async function decideTimeOff(id: string, status: "approved" | "rejected") {
    setRequests((prev) => prev.map((r) => (r.id === id ? { ...r, status } : r)));
    try {
      await api("/api/time-off", "PATCH", { id, status });
      toast.success(status === "approved" ? "Time off approved" : "Time off declined");
    } catch (e) {
      toast.error("Couldn't update", e instanceof Error ? e.message : undefined);
    }
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[
          { label: "Team size", value: staff.filter((s) => s.active).length, hint: `${staff.length} total`, icon: <Users size={13} /> },
          { label: "Revenue generated", value: money(totalRevenue, true), hint: "all time", icon: <TrendingUp size={13} /> },
          { label: "Average rating", value: `${avgRating.toFixed(1)}★`, hint: "across reviews", icon: <Star size={13} /> },
          { label: "Pending time off", value: pendingTimeOff.length, hint: "awaiting approval", icon: <Coffee size={13} /> },
        ].map((s) => (
          <Card key={s.label} className="flex items-center gap-3 p-3.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-soft text-brand">{s.icon}</span>
            <div>
              <p className="text-[0.64rem] uppercase tracking-wide text-faint">{s.label}</p>
              <p className="text-[1.05rem] font-semibold leading-tight">{s.value}</p>
              <p className="text-[0.62rem] text-faint">{s.hint}</p>
            </div>
          </Card>
        ))}
      </div>

      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-[0.95rem] font-semibold">Your team</h2>
          <p className="text-[0.72rem] text-muted">Schedules, specialties and performance at a glance</p>
        </div>
        {canManage && (
          <Button variant="primary" size="sm" onClick={() => setCreating(true)} icon={<Plus size={13} />}>
            Add staff
          </Button>
        )}
      </div>

      {staff.length === 0 ? (
        <Card>
          <EmptyState icon={<Users size={20} />} title="No team members yet" description="Add your first specialist to start taking bookings." />
        </Card>
      ) : (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {staff.map((s) => {
            const workingDays = s.schedules.filter((x) => x.is_working).length;
            return (
              <Card key={s.id} hover className={cn("flex flex-col p-4", !s.active && "opacity-60")}>
                <div className="flex items-start gap-3">
                  <Avatar name={s.name} size={42} color={s.avatar_color} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <p className="truncate text-[0.88rem] font-semibold">{s.name}</p>
                      {!s.active && <Badge tone="neutral">Inactive</Badge>}
                    </div>
                    <p className="truncate text-[0.7rem] text-muted">{s.title}</p>
                    <div className="mt-1 flex items-center gap-1.5">
                      <Stars rating={s.stats.rating} size={10} />
                      <span className="text-[0.62rem] text-faint">
                        {s.stats.rating || "—"} · {s.stats.reviews} reviews
                      </span>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-[0.82rem] font-semibold tabular-nums">{money(s.stats.revenue, true)}</p>
                    <p className="text-[0.6rem] text-faint">{s.stats.bookings} booked</p>
                  </div>
                </div>

                <div className="mt-2.5 flex flex-wrap gap-1">
                  {s.specialties.slice(0, 3).map((sp) => (
                    <Badge key={sp} tone="neutral">{sp}</Badge>
                  ))}
                  <Badge tone="neutral">${s.hourly_rate}/hr</Badge>
                </div>

                <div className="mt-2.5 space-y-1 text-[0.66rem] text-muted">
                  <p className="flex items-center gap-1.5"><Mail size={10} className="text-faint" /> {s.email ?? "—"}</p>
                  <p className="flex items-center gap-1.5"><Phone size={10} className="text-faint" /> {s.phone ?? "—"}</p>
                  <p className="flex items-center gap-1.5">
                    <CalendarClock size={10} className="text-faint" /> {workingDays} working days · {s.stats.today} today
                  </p>
                </div>

                <div className="mt-3 flex items-center gap-1.5 border-t border-line pt-2.5">
                  <Button size="sm" variant="ghost" onClick={() => setScheduleFor(s)} icon={<Clock size={11} />}>
                    Schedule
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setTimeOffFor(s)} icon={<Coffee size={11} />}>
                    Time off
                  </Button>
                  {canManage && (
                    <>
                      <Button size="sm" variant="ghost" className="ml-auto" onClick={() => setEditing(s)}>
                        Edit
                      </Button>
                      <button
                        onClick={() => setDeactivate(s)}
                        className="rounded-lg p-1.5 text-faint transition hover:bg-surface-3 hover:text-ink"
                        aria-label="Toggle active"
                      >
                        <Power size={12} />
                      </button>
                    </>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader
            title="Time-off requests"
            subtitle={`${pendingTimeOff.length} pending · ${requests.filter((r) => r.status === "approved").length} approved`}
            icon={<Coffee size={14} />}
          />
          <div className="border-t border-line">
            {requests.length === 0 ? (
              <EmptyState compact icon={<Coffee size={18} />} title="No requests" description="Time-off requests from your team will appear here." />
            ) : (
              requests.map((r) => {
                const s = staff.find((x) => x.id === r.staff_id);
                return (
                  <div key={r.id} className="flex items-center gap-2.5 border-b border-line/60 px-4 py-2.5 last:border-b-0">
                    <Avatar name={s?.name ?? "?"} size={26} color={s?.avatar_color} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[0.76rem] font-medium">{s?.name}</p>
                      <p className="truncate text-[0.64rem] text-faint">
                        {fmtDate(r.start_date)} → {fmtDate(r.end_date)} · {r.reason ?? "No reason given"}
                      </p>
                    </div>
                    {r.status === "pending" ? (
                      <div className="flex gap-1">
                        <Button size="icon" variant="soft" onClick={() => decideTimeOff(r.id, "approved")} aria-label="Approve">
                          <Check size={12} />
                        </Button>
                        <Button size="icon" variant="ghost" onClick={() => decideTimeOff(r.id, "rejected")} aria-label="Decline">
                          <X size={12} />
                        </Button>
                      </div>
                    ) : (
                      <Badge tone={r.status} className="capitalize">{r.status}</Badge>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </Card>

        <Card>
          <CardHeader title="Performance leaderboard" subtitle="Revenue, utilisation and rating" icon={<TrendingUp size={14} />} />
          <div className="border-t border-line">
            {[...staff]
              .sort((a, b) => b.stats.revenue - a.stats.revenue)
              .map((s, i) => (
                <div key={s.id} className="flex items-center gap-2.5 border-b border-line/60 px-4 py-2.5 last:border-b-0">
                  <span className="w-4 text-[0.68rem] font-semibold text-faint">{i + 1}</span>
                  <Avatar name={s.name} size={24} color={s.avatar_color} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <p className="truncate text-[0.75rem] font-medium">{s.name}</p>
                      <p className="text-[0.72rem] font-semibold tabular-nums">{money(s.stats.revenue, true)}</p>
                    </div>
                    <div className="mt-1 flex items-center gap-2">
                      <Progress value={(s.stats.revenue / (Math.max(...staff.map((x) => x.stats.revenue)) || 1)) * 100} height={3} color={s.avatar_color ?? "var(--brand)"} />
                      <span className="shrink-0 text-[0.6rem] text-faint">{s.stats.completed} done</span>
                    </div>
                  </div>
                </div>
              ))}
          </div>
        </Card>
      </div>

      <StaffFormModal
        open={creating || Boolean(editing)}
        onClose={() => {
          setCreating(false);
          setEditing(null);
        }}
        staff={editing}
        services={services}
        onSaved={refresh}
      />

      <ScheduleModal
        open={Boolean(scheduleFor)}
        onClose={() => setScheduleFor(null)}
        staff={scheduleFor}
        onSaved={refresh}
      />

      <TimeOffModal open={Boolean(timeOffFor)} onClose={() => setTimeOffFor(null)} staff={timeOffFor} />

      <ConfirmDialog
        open={Boolean(deactivate)}
        onClose={() => setDeactivate(null)}
        onConfirm={() => deactivate && toggleActive(deactivate)}
        loading={busy}
        danger={Boolean(deactivate?.active)}
        title={deactivate?.active ? "Deactivate this team member?" : "Reactivate this team member?"}
        confirmLabel={deactivate?.active ? "Deactivate" : "Reactivate"}
        description={
          deactivate?.active
            ? `${deactivate?.name} will be hidden from booking and their login disabled. Existing bookings are preserved.`
            : `${deactivate?.name} will be available for bookings again.`
        }
      />
    </div>
  );
}

/* ------------------------------------------------------------ staff form */

function StaffFormModal({
  open,
  onClose,
  staff,
  services,
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  staff: StaffWithStats | null;
  services: ServiceOpt[];
  onSaved: () => void;
}) {
  const toast = useToast();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [title, setTitle] = useState("");
  const [bio, setBio] = useState("");
  const [rate, setRate] = useState(45);
  const [specialties, setSpecialties] = useState("");
  const [serviceIds, setServiceIds] = useState<string[]>([]);
  const [createLogin, setCreateLogin] = useState(true);
  const [saving, setSaving] = useState(false);
  const [key, setKey] = useState("");

  // re-seed local state when the target changes
  const identity = staff?.id ?? "new";
  if (open && identity !== key) {
    setKey(identity);
    setName(staff?.name ?? "");
    setEmail(staff?.email ?? "");
    setPhone(staff?.phone ?? "");
    setTitle(staff?.title ?? "");
    setBio(staff?.bio ?? "");
    setRate(staff?.hourly_rate ?? 45);
    setSpecialties((staff?.specialties ?? []).join(", "));
    setServiceIds(staff?.service_ids ?? []);
    setCreateLogin(true);
  }

  async function save() {
    if (!name.trim()) {
      toast.error("A name is required");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        name,
        email,
        phone,
        title,
        bio,
        hourly_rate: rate,
        specialties: specialties.split(",").map((s) => s.trim()).filter(Boolean),
        service_ids: serviceIds,
        create_login: createLogin,
      };
      if (staff) await api(`/api/staff/${staff.id}`, "PATCH", payload);
      else await api("/api/staff", "POST", payload);
      toast.success(staff ? "Profile updated" : "Team member added", name);
      onSaved();
      onClose();
    } catch (e) {
      toast.error("Couldn't save", e instanceof Error ? e.message : undefined);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="lg"
      title={staff ? `Edit ${staff.name}` : "Add team member"}
      description={staff ? "Update profile, services and pay rate" : "Create a profile and optional login"}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button variant="primary" onClick={save} loading={saving}>
            {staff ? "Save changes" : "Add to team"}
          </Button>
        </>
      }
    >
      <div className="space-y-3">
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="label">Full name *</label>
            <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Ava Bennett" />
          </div>
          <div>
            <label className="label">Job title</label>
            <input className="input" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Senior Stylist" />
          </div>
          <div>
            <label className="label">Email</label>
            <input className="input" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@studio.sg" />
          </div>
          <div>
            <label className="label">Phone</label>
            <input className="input" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+65 8123 4567" />
          </div>
          <div>
            <label className="label">Hourly rate (SGD)</label>
            <input type="number" className="input" value={rate} onChange={(e) => setRate(Number(e.target.value))} />
          </div>
          <div>
            <label className="label">Specialties (comma separated)</label>
            <input className="input" value={specialties} onChange={(e) => setSpecialties(e.target.value)} placeholder="Hair, Colour, Bridal" />
          </div>
        </div>

        <div>
          <label className="label">Bio</label>
          <textarea className="input min-h-[60px] resize-none" value={bio} onChange={(e) => setBio(e.target.value)} placeholder="A short intro shown on the booking page" />
        </div>

        <div>
          <label className="label">Services offered</label>
          <div className="flex flex-wrap gap-1.5">
            {services.map((s) => {
              const active = serviceIds.includes(s.id);
              return (
                <button
                  key={s.id}
                  onClick={() => setServiceIds((prev) => (active ? prev.filter((x) => x !== s.id) : [...prev, s.id]))}
                  className={cn(
                    "rounded-lg border px-2 py-1 text-[0.7rem] font-medium transition",
                    active ? "border-brand/40 bg-brand-soft text-brand-ink" : "border-line text-muted hover:border-brand/30 hover:text-ink"
                  )}
                >
                  {s.name}
                </button>
              );
            })}
          </div>
        </div>

        {!staff && (
          <div className="rounded-xl border border-line bg-surface-2 p-3">
            <Switch
              checked={createLogin}
              onChange={setCreateLogin}
              label="Create a staff login"
              description="Default password is slotly123 — they can sign in with the staff role."
            />
          </div>
        )}
      </div>
    </Modal>
  );
}

/* ------------------------------------------------------------ schedule */

function ScheduleModal({
  open,
  onClose,
  staff,
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  staff: StaffWithStats | null;
  onSaved: () => void;
}) {
  const toast = useToast();
  const [key, setKey] = useState("");
  const [days, setDays] = useState<{ weekday: number; start_time: string; end_time: string; is_working: boolean }[]>([]);
  const [saving, setSaving] = useState(false);

  if (open && staff && key !== staff.id) {
    setKey(staff.id);
    setDays(
      Array.from({ length: 7 }, (_, wd) => {
        const existing = staff.schedules.find((s) => s.weekday === wd);
        return {
          weekday: wd,
          start_time: existing?.start_time ?? "09:00",
          end_time: existing?.end_time ?? "18:00",
          is_working: existing ? Boolean(existing.is_working) : wd !== 0,
        };
      })
    );
  }

  async function save() {
    if (!staff) return;
    setSaving(true);
    try {
      await api(`/api/staff/${staff.id}/schedule`, "PUT", { days });
      toast.success("Schedule updated", `${staff.name}'s working hours are live.`);
      onSaved();
      onClose();
    } catch (e) {
      toast.error("Couldn't save schedule", e instanceof Error ? e.message : undefined);
    } finally {
      setSaving(false);
    }
  }

  const totalHours = days.filter((d) => d.is_working).reduce((a, d) => {
    const [sh, sm] = d.start_time.split(":").map(Number);
    const [eh, em] = d.end_time.split(":").map(Number);
    return a + (eh * 60 + em - (sh * 60 + sm)) / 60;
  }, 0);

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="md"
      title={`${staff?.name ?? "Staff"} · weekly schedule`}
      description={`${totalHours.toFixed(1)} scheduled hours per week`}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button variant="primary" onClick={save} loading={saving}>Save schedule</Button>
        </>
      }
    >
      <div className="space-y-1.5">
        {days.map((d, i) => (
          <div
            key={d.weekday}
            className={cn(
              "flex items-center gap-2 rounded-lg border px-2.5 py-2 transition",
              d.is_working ? "border-line bg-surface" : "border-line/60 bg-surface-2"
            )}
          >
            <button
              onClick={() => setDays((prev) => prev.map((x, idx) => (idx === i ? { ...x, is_working: !x.is_working } : x)))}
              className={cn(
                "flex h-5 w-5 items-center justify-center rounded border transition",
                d.is_working ? "border-brand bg-brand text-white" : "border-line bg-surface"
              )}
              aria-label={`Toggle ${DAYS[d.weekday]}`}
            >
              {d.is_working && <Check size={11} />}
            </button>
            <span className="w-9 text-[0.76rem] font-medium">{DAYS[d.weekday]}</span>
            <input
              type="time"
              value={d.start_time}
              disabled={!d.is_working}
              onChange={(e) => setDays((prev) => prev.map((x, idx) => (idx === i ? { ...x, start_time: e.target.value } : x)))}
              className="input h-7 w-auto px-1.5 text-[0.7rem]"
            />
            <span className="text-[0.65rem] text-faint">to</span>
            <input
              type="time"
              value={d.end_time}
              disabled={!d.is_working}
              onChange={(e) => setDays((prev) => prev.map((x, idx) => (idx === i ? { ...x, end_time: e.target.value } : x)))}
              className="input h-7 w-auto px-1.5 text-[0.7rem]"
            />
            <span className="ml-auto text-[0.62rem] text-faint">{d.is_working ? "Working" : "Day off"}</span>
          </div>
        ))}
      </div>
      <p className="mt-3 text-[0.65rem] leading-relaxed text-faint">
        Availability is calculated live from these hours, minus existing bookings and approved time off.
      </p>
    </Modal>
  );
}

/* ------------------------------------------------------------ time off */

function TimeOffModal({ open, onClose, staff }: { open: boolean; onClose: () => void; staff: StaffWithStats | null }) {
  const toast = useToast();
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);

  async function save() {
    if (!start || !end) {
      toast.error("Pick start and end dates");
      return;
    }
    setSaving(true);
    try {
      await api("/api/time-off", "POST", { staff_id: staff?.id, start_date: start, end_date: end, reason });
      toast.success("Time off requested", "Owners and managers can approve it from this page.");
      onClose();
      window.location.reload();
    } catch (e) {
      toast.error("Couldn't request time off", e instanceof Error ? e.message : undefined);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="sm"
      title={`Request time off · ${staff?.name ?? ""}`}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button variant="primary" onClick={save} loading={saving}>Submit request</Button>
        </>
      }
    >
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="label">From</label>
            <input type="date" className="input" value={start} onChange={(e) => setStart(e.target.value)} />
          </div>
          <div>
            <label className="label">To</label>
            <input type="date" className="input" value={end} onChange={(e) => setEnd(e.target.value)} />
          </div>
        </div>
        <div>
          <label className="label">Reason</label>
          <textarea className="input min-h-[60px] resize-none" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Family trip, appointment, training…" />
        </div>
        {staff && staff.time_off.length > 0 && (
          <div>
            <p className="label">Existing requests</p>
            <div className="space-y-1">
              {staff.time_off.map((t) => (
                <div key={t.id} className="flex items-center justify-between rounded-lg bg-surface-2 px-2 py-1.5 text-[0.7rem]">
                  <span>{fmtDate(t.start_date)} → {fmtDate(t.end_date)}</span>
                  <Badge tone={t.status} className="capitalize">{t.status}</Badge>
                </div>
              ))}
            </div>
          </div>
        )}
        <p className="text-[0.62rem] text-faint">{relativeTime(new Date().toISOString())} — requests notify managers instantly.</p>
      </div>
    </Modal>
  );
}
