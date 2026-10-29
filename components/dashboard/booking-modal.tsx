"use client";

import { Avatar, Badge, Button, Stars } from "@/components/ui/primitives";
import { Modal } from "@/components/ui/modal";
import { useToast } from "@/components/ui/toast";
import { api, fetcher } from "@/lib/fetcher";
import type { Addon, BookingFull, Customer, Service, Staff } from "@/lib/types";
import { cn, durationLabel, fmtTime, money, todayKey } from "@/lib/utils";
import {
  CalendarDays, Check, Clock, Loader2, Plus, Search, Sparkles, UserPlus, X,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import useSWR from "swr";

type ServiceRow = Service & { addons: Addon[]; staff_ids: string[] };
type StaffRow = Staff & { specialties: string[] };
type Slot = { start_at: string; time: string; staff_id: string; staff_name: string; staff_color: string | null };

export type BookingModalDefaults = {
  date?: string;
  startAt?: string;
  staffId?: string;
  customerId?: string;
  serviceId?: string;
};

export function BookingModal({
  open,
  onClose,
  editing,
  defaults,
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  editing?: BookingFull | null;
  defaults?: BookingModalDefaults;
  onSaved?: () => void;
}) {
  const toast = useToast();
  const { data: servicesData } = useSWR<{ items: ServiceRow[] }>(open ? "/api/services" : null, fetcher);
  const { data: staffData } = useSWR<{ items: StaffRow[] }>(open ? "/api/staff" : null, fetcher);
  const services = servicesData?.items ?? [];
  const staff = staffData?.items ?? [];

  const [customerId, setCustomerId] = useState("");
  const [customerLabel, setCustomerLabel] = useState("");
  const [customerQuery, setCustomerQuery] = useState("");
  const [newCustomer, setNewCustomer] = useState(false);
  const [newName, setNewName] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newPhone, setNewPhone] = useState("");

  const [serviceId, setServiceId] = useState("");
  const [staffId, setStaffId] = useState("");
  const [date, setDate] = useState(todayKey());
  const [startAt, setStartAt] = useState("");
  const [addonIds, setAddonIds] = useState<string[]>([]);
  const [notes, setNotes] = useState("");
  const [internalNotes, setInternalNotes] = useState("");
  const [recurring, setRecurring] = useState("none");
  const [repeatCount, setRepeatCount] = useState(4);
  const [status, setStatus] = useState("confirmed");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setCustomerId(editing?.customer_id ?? defaults?.customerId ?? "");
    setCustomerLabel(editing?.customer_name ?? "");
    setCustomerQuery("");
    setNewCustomer(false);
    setNewName("");
    setNewEmail("");
    setNewPhone("");
    setServiceId(editing?.service_id ?? defaults?.serviceId ?? "");
    setStaffId(editing?.staff_id ?? defaults?.staffId ?? "");
    setDate(editing ? editing.start_at.slice(0, 10) : defaults?.startAt?.slice(0, 10) ?? defaults?.date ?? todayKey());
    setStartAt(editing?.start_at ?? defaults?.startAt ?? "");
    setAddonIds(
      editing ? (JSON.parse(editing.addons || "[]") as { name: string }[]).map((a) => a.name) : []
    );
    setNotes(editing?.notes ?? "");
    setInternalNotes(editing?.internal_notes ?? "");
    setRecurring("none");
    setStatus(editing?.status ?? "pending");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, editing?.id]);

  const { data: customerResults, isValidating: searching } = useSWR<{ items: Customer[]; total: number }>(
    open && customerQuery.length >= 2 ? `/api/customers?q=${encodeURIComponent(customerQuery)}&limit=6` : null,
    fetcher,
    { keepPreviousData: true }
  );

  const service = useMemo(() => services.find((s) => s.id === serviceId), [services, serviceId]);
  const eligibleStaff = useMemo(
    () => (service ? staff.filter((s) => service.staff_ids.includes(s.id)) : staff),
    [service, staff]
  );
  const selectedAddons = useMemo(
    () => (service?.addons ?? []).filter((a) => addonIds.includes(a.name)),
    [service, addonIds]
  );

  useEffect(() => {
    if (staffId && eligibleStaff.length && !eligibleStaff.some((s) => s.id === staffId)) setStaffId("");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [serviceId]);

  const availabilityKey =
    open && serviceId && date
      ? `/api/availability?service_id=${serviceId}&date=${date}${staffId ? `&staff_id=${staffId}` : ""}${
          editing ? `&ignore=${editing.id}` : ""
        }`
      : null;
  const { data: slotData, isLoading: loadingSlots } = useSWR<{ slots: Slot[] }>(availabilityKey, fetcher);

  const slots = slotData?.slots ?? [];
  const grouped = useMemo(() => {
    const groups: { label: string; icon: typeof Clock; items: Slot[] }[] = [
      { label: "Morning", icon: Clock, items: [] },
      { label: "Afternoon", icon: Clock, items: [] },
      { label: "Evening", icon: Clock, items: [] },
    ];
    for (const s of slots) {
      const h = Number(s.time.slice(0, 2));
      const idx = h < 12 ? 0 : h < 17 ? 1 : 2;
      groups[idx].items.push(s);
    }
    return groups.filter((g) => g.items.length);
  }, [slots]);

  const total = (service?.price ?? 0) + selectedAddons.reduce((a, b) => a + b.price, 0);
  const duration = (service?.duration_min ?? 0) + selectedAddons.reduce((a, b) => a + b.duration_min, 0);

  async function submit() {
    if (!serviceId) return toast.error("Pick a service", "A booking needs a treatment before we can save it.");
    if (!newCustomer && !customerId) return toast.error("Pick a client", "Search an existing client or add a new one.");
    if (newCustomer && !newName.trim()) return toast.error("Add the client's name", "We need a name to create the profile.");
    if (!staffId) return toast.error("Pick a specialist", "Choose who is delivering this appointment.");
    if (!startAt) return toast.error("Pick a time", "Select an open slot from the availability list.");

    const addons = selectedAddons.map((a) => ({ name: a.name, price: a.price, duration_min: a.duration_min }));
    setSaving(true);
    try {
      if (editing) {
        await api(`/api/bookings/${editing.id}`, "PATCH", {
          customer_id: customerId || editing.customer_id,
          service_id: serviceId,
          staff_id: staffId,
          start_at: startAt,
          addons,
          notes,
          internal_notes: internalNotes,
        });
        toast.success("Booking updated", `${fmtTime(startAt)} · ${service?.name ?? ""}`);
      } else {
        const res = await api<{ count: number; ids: string[] }>("/api/bookings", "POST", {
          customer_id: newCustomer ? undefined : customerId,
          customer_name: newCustomer ? newName : undefined,
          customer_email: newCustomer ? newEmail : undefined,
          customer_phone: newCustomer ? newPhone : undefined,
          service_id: serviceId,
          staff_id: staffId,
          start_at: startAt,
          addons,
          notes,
          internal_notes: internalNotes,
          status,
          recurring_rule: recurring,
          recurring_count: recurring === "none" ? undefined : repeatCount,
          source: "phone",
        });
        toast.success(
          res.count > 1 ? `${res.count} recurring bookings created` : "Booking created",
          `${service?.name ?? "Appointment"} · ${money(total)}`
        );
      }
      onSaved?.();
      onClose();
    } catch (e) {
      toast.error("Couldn't save booking", e instanceof Error ? e.message : "Please try again.");
    } finally {
      setSaving(false);
    }
  }

  const selectedSlot = slots.find((s) => s.start_at === startAt);

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="xl"
      title={editing ? "Edit booking" : "New booking"}
      description={editing ? `${editing.code} · created ${new Date(editing.created_at).toLocaleDateString("en-SG")}` : "Reserve a chair, assign a specialist and take a deposit if needed."}
      footer={
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="text-[0.72rem] text-muted">
            {service ? (
              <span className="flex items-center gap-2">
                <span className="font-semibold text-ink">{money(total)}</span>
                <span className="text-faint">·</span>
                <span>{durationLabel(duration)}</span>
                {service.deposit > 0 && (
                  <>
                    <span className="text-faint">·</span>
                    <span className="text-brand">{money(service.deposit)} deposit</span>
                  </>
                )}
              </span>
            ) : (
              "Select a service to see pricing"
            )}
          </div>
          <div className="flex gap-2">
            <Button variant="ghost" onClick={onClose}>
              Cancel
            </Button>
            <Button variant="primary" onClick={submit} loading={saving} icon={<Check size={14} />}>
              {editing ? "Save changes" : "Create booking"}
            </Button>
          </div>
        </div>
      }
    >
      <div className="grid gap-5 p-5 sm:grid-cols-5">
        {/* left column */}
        <div className="space-y-4 sm:col-span-3">
          {/* customer */}
          <div>
            <div className="mb-1 flex items-center justify-between">
              <span className="label mb-0">Client</span>
              <button
                type="button"
                onClick={() => {
                  setNewCustomer((v) => !v);
                  setCustomerId("");
                  setCustomerLabel("");
                }}
                className="inline-flex items-center gap-1 text-[0.68rem] font-medium text-brand hover:underline"
              >
                {newCustomer ? <Search size={11} /> : <UserPlus size={11} />}
                {newCustomer ? "Pick existing" : "New client"}
              </button>
            </div>

            {newCustomer ? (
              <div className="grid gap-2 rounded-xl border border-line bg-surface-2 p-2.5 sm:grid-cols-2">
                <input className="input sm:col-span-2" placeholder="Full name" value={newName} onChange={(e) => setNewName(e.target.value)} />
                <input className="input" placeholder="Email" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} />
                <input className="input" placeholder="Phone" value={newPhone} onChange={(e) => setNewPhone(e.target.value)} />
              </div>
            ) : customerId ? (
              <div className="flex items-center justify-between rounded-xl border border-line bg-surface-2 px-3 py-2">
                <span className="flex items-center gap-2 text-[0.82rem] font-medium">
                  <Avatar name={customerLabel} size={24} />
                  {customerLabel}
                </span>
                <button
                  type="button"
                  className="text-faint hover:text-ink"
                  onClick={() => {
                    setCustomerId("");
                    setCustomerLabel("");
                  }}
                >
                  <X size={14} />
                </button>
              </div>
            ) : (
              <div className="relative">
                <Search size={14} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-faint" />
                <input
                  className="input pl-8"
                  placeholder="Search by name, email or phone…"
                  value={customerQuery}
                  onChange={(e) => setCustomerQuery(e.target.value)}
                />
                {customerQuery.length >= 2 && (
                  <div className="absolute z-20 mt-1 max-h-56 w-full overflow-auto rounded-xl border border-line bg-surface p-1 shadow-lg">
                    {searching && !customerResults ? (
                      <div className="flex items-center gap-2 px-2 py-3 text-[0.72rem] text-muted">
                        <Loader2 size={13} className="animate-spin" /> Searching…
                      </div>
                    ) : customerResults?.items.length ? (
                      customerResults.items.map((c) => (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() => {
                            setCustomerId(c.id);
                            setCustomerLabel(c.name);
                            setCustomerQuery("");
                          }}
                          className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left hover:bg-surface-3"
                        >
                          <Avatar name={c.name} size={22} />
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-[0.78rem] font-medium">{c.name}</span>
                            <span className="block truncate text-[0.65rem] text-faint">{c.email ?? c.phone ?? "No contact"}</span>
                          </span>
                          {c.vip ? <Badge tone="vip">VIP</Badge> : null}
                        </button>
                      ))
                    ) : (
                      <div className="px-2 py-3 text-[0.72rem] text-muted">No client found — use “New client”.</div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* service */}
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <span className="label">Service</span>
              <select className="input" value={serviceId} onChange={(e) => setServiceId(e.target.value)}>
                <option value="">Choose a service…</option>
                {Array.from(new Set(services.map((s) => s.category))).map((cat) => (
                  <optgroup key={cat} label={cat}>
                    {services
                      .filter((s) => s.category === cat)
                      .map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name} · {money(s.price)}
                        </option>
                      ))}
                  </optgroup>
                ))}
              </select>
            </div>
            <div>
              <span className="label">Specialist</span>
              <select className="input" value={staffId} onChange={(e) => setStaffId(e.target.value)}>
                <option value="">Choose…</option>
                {eligibleStaff.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} · ★ {s.rating.toFixed(1)}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {service && service.addons.length > 0 && (
            <div>
              <span className="label">Add-ons</span>
              <div className="flex flex-wrap gap-1.5">
                {service.addons.map((a) => {
                  const active = addonIds.includes(a.name);
                  return (
                    <button
                      key={a.id}
                      type="button"
                      onClick={() =>
                        setAddonIds((prev) => (active ? prev.filter((n) => n !== a.name) : [...prev, a.name]))
                      }
                      className={cn(
                        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[0.7rem] font-medium transition",
                        active
                          ? "border-brand bg-brand-soft text-brand-ink"
                          : "border-line bg-surface text-muted hover:border-brand/40 hover:text-ink"
                      )}
                    >
                      {active ? <Check size={11} /> : <Plus size={11} />}
                      {a.name}
                      <span className="text-faint">+{money(a.price)}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* date + slots */}
          <div>
            <div className="mb-1 flex items-center justify-between">
              <span className="label mb-0">Date & time</span>
              <span className="text-[0.65rem] text-faint">{slots.length} open slots</span>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="date"
                className="input w-auto"
                value={date}
                min={todayKey()}
                onChange={(e) => {
                  setDate(e.target.value);
                  setStartAt("");
                }}
              />
              {startAt && (
                <span className="inline-flex items-center gap-1 rounded-lg bg-brand-soft px-2 py-1 text-[0.7rem] font-semibold text-brand-ink">
                  <CalendarDays size={12} /> {fmtTime(startAt)}
                </span>
              )}
            </div>

            <div className="mt-2 max-h-[13.5rem] overflow-y-auto rounded-xl border border-line bg-surface-2 p-2">
              {!serviceId || !staffId ? (
                <p className="px-1 py-4 text-center text-[0.72rem] text-faint">Pick a service and specialist to see live availability.</p>
              ) : loadingSlots ? (
                <div className="grid grid-cols-3 gap-1.5 sm:grid-cols-4">
                  {Array.from({ length: 8 }).map((_, i) => (
                    <div key={i} className="skeleton h-7" />
                  ))}
                </div>
              ) : slots.length === 0 ? (
                <p className="px-1 py-4 text-center text-[0.72rem] text-faint">
                  No open slots on this day for the selected service. Try another date or specialist.
                </p>
              ) : (
                grouped.map((g) => (
                  <div key={g.label} className="mb-2 last:mb-0">
                    <p className="mb-1 px-1 text-[0.58rem] font-semibold uppercase tracking-[0.08em] text-faint">{g.label}</p>
                    <div className="grid grid-cols-3 gap-1.5 sm:grid-cols-4">
                      {g.items.map((s) => {
                        const active = s.start_at === startAt;
                        return (
                          <button
                            key={`${s.time}-${s.staff_id}`}
                            type="button"
                            onClick={() => {
                              setStartAt(s.start_at);
                              setStaffId(s.staff_id);
                            }}
                            className={cn(
                              "rounded-lg border px-1 py-1.5 text-[0.7rem] font-medium transition",
                              active
                                ? "border-brand bg-brand text-white shadow-sm"
                                : "border-line bg-surface hover:border-brand/50 hover:text-brand"
                            )}
                          >
                            {fmtTime(s.start_at)}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))
              )}
            </div>
            {selectedSlot && (
              <p className="mt-1.5 text-[0.65rem] text-faint">
                {selectedSlot.staff_name} is free at {fmtTime(selectedSlot.start_at)} · {durationLabel(duration)} appointment
              </p>
            )}
          </div>

          {/* notes */}
          <div className="grid gap-2 sm:grid-cols-2">
            <div>
              <span className="label">Client notes</span>
              <textarea className="input" rows={2} placeholder="Allergies, requests…" value={notes} onChange={(e) => setNotes(e.target.value)} />
            </div>
            <div>
              <span className="label">Internal note</span>
              <textarea className="input" rows={2} placeholder="Visible to your team only" value={internalNotes} onChange={(e) => setInternalNotes(e.target.value)} />
            </div>
          </div>
        </div>

        {/* right column — summary */}
        <div className="space-y-3 sm:col-span-2">
          <div className="rounded-xl border border-line bg-surface-2 p-3">
            <p className="text-[0.6rem] font-semibold uppercase tracking-[0.09em] text-faint">Summary</p>
            <div className="mt-2 space-y-1.5 text-[0.75rem]">
              <Row label="Client" value={newCustomer ? newName || "New client" : customerLabel || "—"} />
              <Row label="Service" value={service?.name ?? "—"} />
              <Row label="Specialist" value={eligibleStaff.find((s) => s.id === staffId)?.name ?? "—"} />
              <Row label="When" value={startAt ? `${fmtTime(startAt)} · ${date}` : "—"} />
              <Row label="Duration" value={duration ? durationLabel(duration) : "—"} />
              <Row label="Add-ons" value={selectedAddons.length ? selectedAddons.map((a) => a.name).join(", ") : "None"} />
            </div>
            <div className="mt-2.5 flex items-baseline justify-between border-t border-line pt-2">
              <span className="text-[0.7rem] text-muted">Total</span>
              <span className="text-[1.05rem] font-semibold tracking-tight">{money(total)}</span>
            </div>
            {service && service.deposit > 0 && (
              <p className="mt-1 text-[0.62rem] text-faint">
                Deposit {money(service.deposit)} · balance {money(Math.max(0, total - service.deposit))} on the day
              </p>
            )}
          </div>

          {!editing && (
            <div className="rounded-xl border border-line bg-surface-2 p-3">
              <p className="text-[0.6rem] font-semibold uppercase tracking-[0.09em] text-faint">Repeat</p>
              <select className="input mt-1.5" value={recurring} onChange={(e) => setRecurring(e.target.value)}>
                <option value="none">One-off appointment</option>
                <option value="weekly">Every week</option>
                <option value="biweekly">Every two weeks</option>
                <option value="monthly">Every month</option>
              </select>
              {recurring !== "none" && (
                <div className="mt-2 flex items-center gap-2">
                  <input
                    type="number"
                    min={2}
                    max={12}
                    className="input w-16"
                    value={repeatCount}
                    onChange={(e) => setRepeatCount(Number(e.target.value))}
                  />
                  <span className="text-[0.68rem] text-muted">occurrences — conflicts are checked across all of them</span>
                </div>
              )}
            </div>
          )}

          <div className="rounded-xl border border-line bg-surface-2 p-3">
            <p className="text-[0.6rem] font-semibold uppercase tracking-[0.09em] text-faint">Approval</p>
            <div className="mt-1.5 grid grid-cols-2 gap-1.5">
              {[
                { value: "pending", label: "Request", hint: "Awaiting approval" },
                { value: "confirmed", label: "Confirmed", hint: "Locks the slot" },
              ].map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setStatus(opt.value)}
                  className={cn(
                    "rounded-lg border px-2 py-1.5 text-left",
                    status === opt.value ? "border-brand bg-brand-soft" : "border-line bg-surface hover:border-brand/40"
                  )}
                >
                  <span className={cn("block text-[0.72rem] font-semibold", status === opt.value ? "text-brand-ink" : "text-ink")}>
                    {opt.label}
                  </span>
                  <span className="block text-[0.6rem] text-faint">{opt.hint}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-start gap-2 rounded-xl border border-dashed border-line bg-surface p-2.5">
            <Sparkles size={14} className="mt-0.5 shrink-0 text-brand" />
            <p className="text-[0.66rem] leading-relaxed text-muted">
              Slot list already excludes time off, existing bookings and buffers. Staff are sorted by availability.
            </p>
          </div>

          {staffId && (() => {
            const s = eligibleStaff.find((x) => x.id === staffId);
            if (!s) return null;
            return (
              <div className="flex items-center gap-2 rounded-xl border border-line bg-surface-2 p-2.5">
                <Avatar name={s.name} color={s.avatar_color} size={28} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[0.74rem] font-medium">{s.name}</p>
                  <p className="truncate text-[0.62rem] text-faint">{s.title}</p>
                </div>
                <Stars rating={s.rating} size={10} />
              </div>
            );
          })()}
        </div>
      </div>
    </Modal>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <span className="shrink-0 text-muted">{label}</span>
      <span className="min-w-0 truncate text-right font-medium text-ink">{value}</span>
    </div>
  );
}
