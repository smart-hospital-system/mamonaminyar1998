"use client";

import { Badge, Button, Card, EmptyState, Switch } from "@/components/ui/primitives";
import { Modal, ConfirmDialog } from "@/components/ui/modal";
import { useToast } from "@/components/ui/toast";
import { api } from "@/lib/fetcher";
import type { ServiceWithExtras } from "@/lib/queries";
import { cn, durationLabel, money } from "@/lib/utils";
import {
  Clock, Layers, Pencil, Plus, Scissors, Sparkles, Tag, Trash2, Users,
} from "lucide-react";
import { useMemo, useState } from "react";

type StaffOpt = { id: string; name: string; avatar_color: string | null; active: number };
const COLORS = ["#6553f5", "#ec4899", "#14b8a6", "#f59e0b", "#0ea5e9", "#8b5cf6", "#ef4444", "#10b981"];

export function ServicesClient({
  initial,
  staff,
  canManage,
}: {
  initial: ServiceWithExtras[];
  staff: StaffOpt[];
  canManage: boolean;
}) {
  const toast = useToast();
  const [items, setItems] = useState(initial);
  const [category, setCategory] = useState("all");
  const [editing, setEditing] = useState<ServiceWithExtras | null>(null);
  const [open, setOpen] = useState(false);
  const [confirm, setConfirm] = useState<ServiceWithExtras | null>(null);
  const [busy, setBusy] = useState(false);

  const categories = useMemo(() => Array.from(new Set(items.map((s) => s.category))), [items]);
  const filtered = category === "all" ? items : items.filter((s) => s.category === category);

  const activeCount = items.filter((s) => s.active).length;
  const avgPrice = items.length ? items.reduce((a, s) => a + s.price, 0) / items.length : 0;
  const avgDuration = items.length ? items.reduce((a, s) => a + s.duration_min, 0) / items.length : 0;

  async function toggleActive(s: ServiceWithExtras) {
    const next = s.active ? 0 : 1;
    setItems((prev) => prev.map((x) => (x.id === s.id ? { ...x, active: next } : x)));
    try {
      await api(`/api/services/${s.id}`, "PATCH", { active: Boolean(next) });
      toast.success(next ? "Service published" : "Service hidden", s.name);
    } catch (e) {
      setItems((prev) => prev.map((x) => (x.id === s.id ? { ...x, active: s.active } : x)));
      toast.error("Couldn't update", e instanceof Error ? e.message : undefined);
    }
  }

  async function remove() {
    if (!confirm) return;
    setBusy(true);
    try {
      const res = await api<{ archived?: boolean }>(`/api/services/${confirm.id}`, "DELETE");
      setItems((prev) => prev.filter((x) => x.id !== confirm.id));
      toast.success(res.archived ? "Service archived" : "Service deleted", res.archived ? "It has upcoming bookings, so it was hidden instead." : confirm.name);
      setConfirm(null);
    } catch (e) {
      toast.error("Couldn't delete", e instanceof Error ? e.message : undefined);
    } finally {
      setBusy(false);
    }
  }

  async function refresh() {
    const res = await fetch("/api/services");
    if (res.ok) setItems((await res.json()).items ?? []);
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[
          { label: "Active services", value: activeCount, hint: `${items.length} in catalog`, icon: <Scissors size={13} /> },
          { label: "Average price", value: money(Math.round(avgPrice)), hint: "per appointment", icon: <Tag size={13} /> },
          { label: "Average duration", value: durationLabel(Math.round(avgDuration)), hint: "booking length", icon: <Clock size={13} /> },
          { label: "Add-ons", value: items.reduce((a, s) => a + s.addons.length, 0), hint: "upsell extras", icon: <Layers size={13} /> },
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

      <div className="flex flex-wrap items-center gap-2">
        <button
          onClick={() => setCategory("all")}
          className={cn(
            "rounded-lg px-2.5 py-1.5 text-[0.72rem] font-medium transition",
            category === "all" ? "bg-brand-soft text-brand-ink" : "text-muted hover:bg-surface-3 hover:text-ink"
          )}
        >
          All ({items.length})
        </button>
        {categories.map((c) => (
          <button
            key={c}
            onClick={() => setCategory(c)}
            className={cn(
              "rounded-lg px-2.5 py-1.5 text-[0.72rem] font-medium transition",
              category === c ? "bg-brand-soft text-brand-ink" : "text-muted hover:bg-surface-3 hover:text-ink"
            )}
          >
            {c} ({items.filter((s) => s.category === c).length})
          </button>
        ))}
        {canManage && (
          <Button
            variant="primary"
            size="sm"
            className="ml-auto"
            onClick={() => {
              setEditing(null);
              setOpen(true);
            }}
            icon={<Plus size={13} />}
          >
            New service
          </Button>
        )}
      </div>

      {filtered.length === 0 ? (
        <Card>
          <EmptyState
            icon={<Scissors size={20} />}
            title="No services in this category"
            description="Add a service to start taking bookings for it."
            action={canManage ? <Button variant="primary" size="sm" onClick={() => setOpen(true)}>Add service</Button> : undefined}
          />
        </Card>
      ) : (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((s) => (
            <Card key={s.id} hover className={cn("flex flex-col p-4", !s.active && "opacity-60")}>
              <div className="flex items-start gap-2.5">
                <span
                  className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg"
                  style={{ background: `color-mix(in srgb, ${s.color ?? "#6553f5"} 14%, transparent)`, color: s.color ?? "#6553f5" }}
                >
                  <Scissors size={14} />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <p className="truncate text-[0.85rem] font-semibold">{s.name}</p>
                    {s.popular ? <Badge tone="VIP">Popular</Badge> : null}
                    {!s.active && <Badge tone="neutral">Hidden</Badge>}
                  </div>
                  <p className="text-[0.66rem] text-faint">{s.category} · {durationLabel(s.duration_min)}</p>
                </div>
                <div className="text-right">
                  <p className="text-[0.9rem] font-semibold">{money(s.price)}</p>
                  {s.deposit > 0 && <p className="text-[0.6rem] text-faint">{money(s.deposit)} deposit</p>}
                </div>
              </div>

              <p className="mt-2 line-clamp-2 text-[0.72rem] leading-relaxed text-muted">{s.description}</p>

              {s.addons.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1">
                  {s.addons.map((a) => (
                    <span key={a.id} className="chip border-line bg-surface-2 text-[0.62rem] text-muted">
                      + {a.name} · {money(a.price)}
                    </span>
                  ))}
                </div>
              )}

              <div className="mt-2.5 flex items-center gap-2 text-[0.65rem] text-faint">
                <Users size={10} />
                {s.staff_ids.length} staff
                <span className="mx-1">·</span>
                {s.upcoming} upcoming
                <span className="mx-1">·</span>
                <span className="flex items-center gap-0.5"><Sparkles size={9} /> {s.buffer_min}min buffer</span>
              </div>

              {canManage && (
                <div className="mt-3 flex items-center gap-1.5 border-t border-line pt-2.5">
                  <Button size="sm" variant="ghost" onClick={() => { setEditing(s); setOpen(true); }} icon={<Pencil size={11} />}>
                    Edit
                  </Button>
                  <button
                    onClick={() => toggleActive(s)}
                    className="rounded-lg px-2 py-1 text-[0.7rem] font-medium text-muted transition hover:bg-surface-3 hover:text-ink"
                  >
                    {s.active ? "Hide" : "Publish"}
                  </button>
                  <button
                    onClick={() => setConfirm(s)}
                    className="ml-auto rounded-lg p-1.5 text-faint transition hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-500/10"
                    aria-label="Delete service"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              )}
            </Card>
          ))}
        </div>
      )}

      <ServiceModal
        open={open}
        onClose={() => {
          setOpen(false);
          setEditing(null);
        }}
        service={editing}
        staff={staff}
        onSaved={refresh}
      />

      <ConfirmDialog
        open={Boolean(confirm)}
        onClose={() => setConfirm(null)}
        onConfirm={remove}
        loading={busy}
        danger
        title="Delete this service?"
        confirmLabel="Delete service"
        description={`${confirm?.name} will be removed from your catalog. If it has upcoming bookings it will be archived instead so history stays intact.`}
      />
    </div>
  );
}

/* ------------------------------------------------------------ service modal */

function ServiceModal({
  open,
  onClose,
  service,
  staff,
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  service: ServiceWithExtras | null;
  staff: StaffOpt[];
  onSaved: () => void;
}) {
  const toast = useToast();
  const [key, setKey] = useState("");
  const [name, setName] = useState("");
  const [category, setCategory] = useState("Hair");
  const [description, setDescription] = useState("");
  const [duration, setDuration] = useState(60);
  const [price, setPrice] = useState(80);
  const [deposit, setDeposit] = useState(0);
  const [buffer, setBuffer] = useState(10);
  const [color, setColor] = useState(COLORS[0]);
  const [popular, setPopular] = useState(false);
  const [active, setActive] = useState(true);
  const [staffIds, setStaffIds] = useState<string[]>([]);
  const [addons, setAddons] = useState<{ name: string; price: number; duration_min: number }[]>([]);
  const [saving, setSaving] = useState(false);

  const identity = service?.id ?? "new";
  if (open && key !== identity) {
    setKey(identity);
    setName(service?.name ?? "");
    setCategory(service?.category ?? "Hair");
    setDescription(service?.description ?? "");
    setDuration(service?.duration_min ?? 60);
    setPrice(service?.price ?? 80);
    setDeposit(service?.deposit ?? 0);
    setBuffer(service?.buffer_min ?? 10);
    setColor(service?.color ?? COLORS[0]);
    setPopular(Boolean(service?.popular));
    setActive(service ? Boolean(service.active) : true);
    setStaffIds(service?.staff_ids ?? []);
    setAddons((service?.addons ?? []).map((a) => ({ name: a.name, price: a.price, duration_min: a.duration_min })));
  }

  async function save() {
    if (!name.trim()) {
      toast.error("A service name is required");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        name, category, description, duration_min: duration, price, deposit,
        buffer_min: buffer, color, popular, active, staff_ids: staffIds, addons,
      };
      if (service) await api(`/api/services/${service.id}`, "PATCH", payload);
      else await api("/api/services", "POST", payload);
      toast.success(service ? "Service updated" : "Service added", name);
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
      title={service ? `Edit ${service.name}` : "New service"}
      description="Pricing, duration, add-ons and who can perform it"
      footer={
        <div className="flex w-full items-center justify-between">
          <span className="text-[0.72rem] text-muted">
            {duration} min · {money(price)} · {addons.length} add-on{addons.length === 1 ? "" : "s"}
          </span>
          <div className="flex gap-2">
            <Button variant="ghost" onClick={onClose}>Cancel</Button>
            <Button variant="primary" onClick={save} loading={saving}>{service ? "Save changes" : "Create service"}</Button>
          </div>
        </div>
      }
    >
      <div className="space-y-3">
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="label">Service name *</label>
            <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Signature Haircut & Style" />
          </div>
          <div>
            <label className="label">Category</label>
            <input className="input" value={category} onChange={(e) => setCategory(e.target.value)} placeholder="Hair" list="categories" />
            <datalist id="categories">
              {["Hair", "Skin", "Nails", "Wellness", "Bridal"].map((c) => <option key={c} value={c} />)}
            </datalist>
          </div>
        </div>

        <div>
          <label className="label">Description</label>
          <textarea className="input min-h-[56px] resize-none" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="What's included, who it's for…" />
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div>
            <label className="label">Duration (min)</label>
            <input type="number" className="input" value={duration} onChange={(e) => setDuration(Number(e.target.value))} />
          </div>
          <div>
            <label className="label">Price (SGD)</label>
            <input type="number" className="input" value={price} onChange={(e) => setPrice(Number(e.target.value))} />
          </div>
          <div>
            <label className="label">Deposit</label>
            <input type="number" className="input" value={deposit} onChange={(e) => setDeposit(Number(e.target.value))} />
          </div>
          <div>
            <label className="label">Buffer (min)</label>
            <input type="number" className="input" value={buffer} onChange={(e) => setBuffer(Number(e.target.value))} />
          </div>
        </div>

        <div>
          <label className="label">Calendar colour</label>
          <div className="flex gap-1.5">
            {COLORS.map((c) => (
              <button
                key={c}
                onClick={() => setColor(c)}
                className={cn("h-6 w-6 rounded-full ring-offset-2 ring-offset-surface transition", color === c && "ring-2 ring-brand")}
                style={{ background: c }}
                aria-label={`Colour ${c}`}
              />
            ))}
          </div>
        </div>

        <div>
          <label className="label">Performed by</label>
          <div className="flex flex-wrap gap-1.5">
            {staff.filter((s) => s.active).map((s) => {
              const on = staffIds.includes(s.id);
              return (
                <button
                  key={s.id}
                  onClick={() => setStaffIds((prev) => (on ? prev.filter((x) => x !== s.id) : [...prev, s.id]))}
                  className={cn(
                    "rounded-lg border px-2 py-1 text-[0.7rem] font-medium transition",
                    on ? "border-brand/40 bg-brand-soft text-brand-ink" : "border-line text-muted hover:border-brand/30"
                  )}
                >
                  {s.name}
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <div className="mb-1 flex items-center justify-between">
            <label className="label mb-0">Add-ons & extras</label>
            <button
              onClick={() => setAddons((a) => [...a, { name: "", price: 20, duration_min: 15 }])}
              className="text-[0.68rem] font-medium text-brand hover:underline"
            >
              + Add add-on
            </button>
          </div>
          <div className="space-y-1.5">
            {addons.length === 0 && <p className="rounded-lg bg-surface-2 px-2.5 py-2 text-[0.68rem] text-faint">No add-ons yet. Add one to increase average ticket size.</p>}
            {addons.map((a, i) => (
              <div key={i} className="flex items-center gap-1.5">
                <input
                  className="input h-8 flex-1"
                  placeholder="Add-on name"
                  value={a.name}
                  onChange={(e) => setAddons((prev) => prev.map((x, idx) => (idx === i ? { ...x, name: e.target.value } : x)))}
                />
                <input
                  type="number"
                  className="input h-8 w-20"
                  value={a.price}
                  onChange={(e) => setAddons((prev) => prev.map((x, idx) => (idx === i ? { ...x, price: Number(e.target.value) } : x)))}
                />
                <input
                  type="number"
                  className="input h-8 w-16"
                  value={a.duration_min}
                  onChange={(e) => setAddons((prev) => prev.map((x, idx) => (idx === i ? { ...x, duration_min: Number(e.target.value) } : x)))}
                />
                <button
                  onClick={() => setAddons((prev) => prev.filter((_, idx) => idx !== i))}
                  className="rounded-lg p-1.5 text-faint hover:bg-surface-3 hover:text-rose-600"
                >
                  <Trash2 size={12} />
                </button>
              </div>
            ))}
          </div>
        </div>

        <div className="grid gap-2 rounded-xl border border-line bg-surface-2 p-3 sm:grid-cols-2">
          <Switch checked={active} onChange={setActive} label="Published" description="Bookable online" />
          <Switch checked={popular} onChange={setPopular} label="Mark as popular" description="Featured on booking page" />
        </div>
      </div>
    </Modal>
  );
}
