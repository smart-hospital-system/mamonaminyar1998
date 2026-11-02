"use client";

import { BookingModal } from "@/components/dashboard/booking-modal";
import {
  Avatar, Badge, Button, Card, CardHeader, EmptyState, StatusBadge,
} from "@/components/ui/primitives";
import { Modal } from "@/components/ui/modal";
import { useToast } from "@/components/ui/toast";
import { api } from "@/lib/fetcher";
import type { WaitlistEntry } from "@/lib/types";
import { cn, fmtDate, relativeTime } from "@/lib/utils";
import {
  BellRing, CalendarPlus, Clock, Plus, Sparkles, Trash2, UserPlus, Users,
} from "lucide-react";
import { useState } from "react";

type ServiceOpt = { id: string; name: string };
type StaffOpt = { id: string; name: string };
type CustomerOpt = { id: string; name: string };

export function WaitlistClient({
  initial,
  services,
  staff,
  customers,
}: {
  initial: WaitlistEntry[];
  services: ServiceOpt[];
  staff: StaffOpt[];
  customers: CustomerOpt[];
}) {
  const toast = useToast();
  const [items, setItems] = useState(initial);
  const [addOpen, setAddOpen] = useState(false);
  const [bookingFor, setBookingFor] = useState<WaitlistEntry | null>(null);

  const waiting = items.filter((i) => i.status === "waiting");
  const offered = items.filter((i) => i.status === "offered");
  const booked = items.filter((i) => i.status === "booked");

  async function setStatus(entry: WaitlistEntry, status: string) {
    const snapshot = items;
    setItems((prev) => prev.map((i) => (i.id === entry.id ? { ...i, status: status as WaitlistEntry["status"] } : i)));
    try {
      await api(`/api/waitlist/${entry.id}`, "PATCH", { status, action: status === "offered" ? "notify" : undefined });
      toast.success(
        status === "offered" ? "Slot offered" : status === "booked" ? "Marked as booked" : "Waitlist updated",
        entry.customer_name
      );
    } catch (e) {
      setItems(snapshot);
      toast.error("Couldn't update", e instanceof Error ? e.message : undefined);
    }
  }

  async function remove(entry: WaitlistEntry) {
    const snapshot = items;
    setItems((prev) => prev.filter((i) => i.id !== entry.id));
    try {
      await api(`/api/waitlist/${entry.id}`, "DELETE");
      toast.success("Removed from waitlist", entry.customer_name);
    } catch (e) {
      setItems(snapshot);
      toast.error("Couldn't remove", e instanceof Error ? e.message : undefined);
    }
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[
          { label: "Waiting", value: waiting.length, hint: "clients queued", icon: <Clock size={13} />, tone: "text-amber-500" },
          { label: "Offers out", value: offered.length, hint: "awaiting response", icon: <BellRing size={13} />, tone: "text-sky-500" },
          { label: "Converted", value: booked.length, hint: "filled from waitlist", icon: <CalendarPlus size={13} />, tone: "text-emerald-500" },
          { label: "Recovery rate", value: `${items.length ? Math.round((booked.length / items.length) * 100) : 0}%`, hint: "waitlist → booking", icon: <Sparkles size={13} />, tone: "text-brand" },
        ].map((s) => (
          <Card key={s.label} className="flex items-center gap-3 p-3.5">
            <span className={cn("flex h-8 w-8 items-center justify-center rounded-lg bg-surface-2", s.tone)}>{s.icon}</span>
            <div>
              <p className="text-[0.64rem] uppercase tracking-wide text-faint">{s.label}</p>
              <p className="text-[1.05rem] font-semibold leading-tight">{s.value}</p>
              <p className="text-[0.62rem] text-faint">{s.hint}</p>
            </div>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader
          title="Waitlist queue"
          subtitle="Fill cancellations automatically — first come, first served"
          icon={<Users size={15} />}
          action={
            <Button variant="primary" size="sm" onClick={() => setAddOpen(true)} icon={<Plus size={13} />}>
              Add to waitlist
            </Button>
          }
        />
        <div className="border-t border-line">
          {items.length === 0 ? (
            <EmptyState
              icon={<Clock size={20} />}
              title="Waitlist is empty"
              description="When clients ask for a fully-booked slot, add them here. You'll see them first when a cancellation lands."
              action={<Button variant="primary" size="sm" onClick={() => setAddOpen(true)}>Add first client</Button>}
            />
          ) : (
            <div className="divide-y divide-line">
              {items.map((entry) => (
                <div key={entry.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
                  <Avatar name={entry.customer_name} size={34} />
                  <div className="min-w-[10rem] flex-1">
                    <div className="flex items-center gap-1.5">
                      <p className="text-[0.8rem] font-medium">{entry.customer_name}</p>
                      <StatusBadge status={entry.status} />
                    </div>
                    <p className="mt-0.5 truncate text-[0.68rem] text-muted">
                      {entry.service_name}
                      {entry.staff_name ? ` with ${entry.staff_name}` : " · any specialist"}
                    </p>
                    <p className="truncate text-[0.62rem] text-faint">
                      {entry.preferred_time ?? "Flexible"}
                      {entry.desired_from && ` · ${fmtDate(entry.desired_from)} → ${fmtDate(entry.desired_to)}`}
                      {" · added "}
                      {relativeTime(entry.created_at)}
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-1.5">
                    {entry.status === "waiting" && (
                      <Button size="sm" variant="soft" onClick={() => setStatus(entry, "offered")} icon={<BellRing size={11} />}>
                        Offer slot
                      </Button>
                    )}
                    {entry.status !== "booked" && (
                      <Button size="sm" variant="outline" onClick={() => setBookingFor(entry)} icon={<CalendarPlus size={11} />}>
                        Book
                      </Button>
                    )}
                    <button
                      onClick={() => remove(entry)}
                      className="rounded-lg p-1.5 text-faint transition hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-500/10"
                      aria-label="Remove"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </Card>

      <Card className="flex flex-wrap items-center gap-3 p-4">
        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-soft text-brand">
          <Sparkles size={16} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[0.8rem] font-semibold">Auto-fill cancellations</p>
          <p className="text-[0.7rem] text-muted">
            When a booking is cancelled, Slotly offers the slot to the best-matched waitlisted client by SMS within 60 seconds.
          </p>
        </div>
        <Badge tone="paid">Enabled</Badge>
      </Card>

      <AddWaitlistModal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        services={services}
        staff={staff}
        customers={customers}
        onSaved={(items) => setItems(items)}
      />

      <BookingModal
        open={Boolean(bookingFor)}
        onClose={() => setBookingFor(null)}
        defaults={{ date: bookingFor?.desired_from ?? undefined, customerId: bookingFor?.customer_id ?? undefined }}
        onSaved={() => {
          if (bookingFor) setStatus(bookingFor, "booked");
        }}
      />
    </div>
  );
}

function AddWaitlistModal({
  open,
  onClose,
  services,
  staff,
  customers,
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  services: ServiceOpt[];
  staff: StaffOpt[];
  customers: CustomerOpt[];
  onSaved: (items: WaitlistEntry[]) => void;
}) {
  const toast = useToast();
  const [customerId, setCustomerId] = useState("");
  const [serviceId, setServiceId] = useState("");
  const [staffId, setStaffId] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [preferred, setPreferred] = useState("");
  const [saving, setSaving] = useState(false);

  async function save() {
    if (!customerId || !serviceId) {
      toast.error("Pick a customer and service");
      return;
    }
    setSaving(true);
    try {
      const res = await api<{ items: WaitlistEntry[] }>("/api/waitlist", "POST", {
        customer_id: customerId,
        service_id: serviceId,
        staff_id: staffId || null,
        desired_from: from || null,
        desired_to: to || null,
        preferred_time: preferred,
      });
      onSaved(res.items);
      toast.success("Added to waitlist");
      onClose();
      setCustomerId("");
      setServiceId("");
      setPreferred("");
    } catch (e) {
      toast.error("Couldn't add to waitlist", e instanceof Error ? e.message : undefined);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="md"
      title="Add to waitlist"
      description="Capture demand for fully-booked slots"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button variant="primary" onClick={save} loading={saving} icon={<UserPlus size={13} />}>Add to waitlist</Button>
        </>
      }
    >
      <div className="space-y-3">
        <div className="grid gap-2 sm:grid-cols-2">
          <div>
            <label className="label">Customer</label>
            <select className="input" value={customerId} onChange={(e) => setCustomerId(e.target.value)}>
              <option value="">Select…</option>
              {customers.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Service</label>
            <select className="input" value={serviceId} onChange={(e) => setServiceId(e.target.value)}>
              <option value="">Select…</option>
              {services.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Preferred staff</label>
            <select className="input" value={staffId} onChange={(e) => setStaffId(e.target.value)}>
              <option value="">Any specialist</option>
              {staff.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Preferred time</label>
            <input className="input" value={preferred} onChange={(e) => setPreferred(e.target.value)} placeholder="Saturday mornings" />
          </div>
          <div>
            <label className="label">Available from</label>
            <input type="date" className="input" value={from} onChange={(e) => setFrom(e.target.value)} />
          </div>
          <div>
            <label className="label">Until</label>
            <input type="date" className="input" value={to} onChange={(e) => setTo(e.target.value)} />
          </div>
        </div>
        <p className="text-[0.65rem] text-faint">We&apos;ll text this client first when a matching cancellation comes in.</p>
      </div>
    </Modal>
  );
}
