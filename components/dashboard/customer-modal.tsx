"use client";

import { Button, Switch } from "@/components/ui/primitives";
import { Modal } from "@/components/ui/modal";
import { useToast } from "@/components/ui/toast";
import { api } from "@/lib/fetcher";
import type { Customer } from "@/lib/types";
import { cn, parseJson } from "@/lib/utils";
import { useEffect, useState } from "react";

const TAG_OPTIONS = ["VIP", "Loyal", "New", "At-risk", "Bridal", "Corporate"];

export function CustomerModal({
  open,
  onClose,
  customer,
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  customer?: Customer | null;
  onSaved?: (id?: string) => void;
}) {
  const toast = useToast();
  const editing = Boolean(customer);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [dob, setDob] = useState("");
  const [notes, setNotes] = useState("");
  const [preferences, setPreferences] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [vip, setVip] = useState(false);
  const [optIn, setOptIn] = useState(true);
  const [points, setPoints] = useState(0);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setName(customer?.name ?? "");
    setEmail(customer?.email ?? "");
    setPhone(customer?.phone ?? "");
    setDob(customer?.dob ?? "");
    setNotes(customer?.notes ?? "");
    setPreferences(customer?.preferences ?? "");
    setTags(parseJson<string[]>(customer?.tags, []));
    setVip(Boolean(customer?.vip));
    setOptIn(customer ? Boolean(customer.marketing_opt_in) : true);
    setPoints(customer?.loyalty_points ?? 0);
  }, [open, customer]);

  async function save() {
    if (!name.trim()) {
      toast.error("Name is required");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        name: name.trim(),
        email,
        phone,
        dob: dob || null,
        notes,
        preferences,
        tags,
        vip,
        marketing_opt_in: optIn,
        loyalty_points: points,
      };
      if (editing) {
        await api(`/api/customers/${customer!.id}`, "PATCH", payload);
        toast.success("Customer updated", name);
        onSaved?.(customer!.id);
      } else {
        const res = await api<{ id: string }>("/api/customers", "POST", payload);
        toast.success("Customer added", `${name} is ready to book.`);
        onSaved?.(res.id);
      }
      onClose();
    } catch (e) {
      toast.error("Couldn't save customer", e instanceof Error ? e.message : undefined);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={editing ? "Edit customer" : "New customer"}
      description={editing ? "Update contact details, preferences and loyalty" : "Add a client to your book"}
      size="lg"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" onClick={save} loading={saving}>
            {editing ? "Save changes" : "Add customer"}
          </Button>
        </>
      }
    >
      <div className="space-y-3.5">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label className="label">Full name *</label>
            <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Aisha Rahman" />
          </div>
          <div>
            <label className="label">Phone</label>
            <input className="input" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+65 8123 4567" />
          </div>
          <div>
            <label className="label">Email</label>
            <input className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@example.com" />
          </div>
          <div>
            <label className="label">Birthday</label>
            <input className="input" value={dob} onChange={(e) => setDob(e.target.value)} placeholder="MM-DD or YYYY-MM-DD" />
          </div>
        </div>

        <div>
          <label className="label">Tags</label>
          <div className="flex flex-wrap gap-1.5">
            {TAG_OPTIONS.map((t) => {
              const active = tags.includes(t);
              return (
                <button
                  key={t}
                  onClick={() => setTags((prev) => (active ? prev.filter((x) => x !== t) : [...prev, t]))}
                  className={cn(
                    "rounded-full border px-2.5 py-1 text-[0.7rem] font-medium transition",
                    active ? "border-brand/40 bg-brand-soft text-brand-ink" : "border-line text-muted hover:border-brand/30 hover:text-ink"
                  )}
                >
                  {t}
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <label className="label">Preferences</label>
          <input
            className="input"
            value={preferences}
            onChange={(e) => setPreferences(e.target.value)}
            placeholder="Sensitive scalp, prefers morning slots, oat latte…"
          />
        </div>

        <div>
          <label className="label">Internal notes</label>
          <textarea
            className="input min-h-[70px] resize-none"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Referral source, patch-test history, anything the team should know…"
          />
        </div>

        <div className="rounded-xl border border-line bg-surface-2 p-3">
          <Switch checked={vip} onChange={setVip} label="VIP client" description="Priority booking, free upgrades and early access to offers." />
          <div className="my-2.5 h-px bg-line" />
          <Switch checked={optIn} onChange={setOptIn} label="Marketing opt-in" description="Receive campaigns, birthday offers and re-engagement messages." />
          <div className="my-2.5 h-px bg-line" />
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-[0.8125rem] font-medium">Loyalty points</p>
              <p className="mt-0.5 text-xs text-muted">Earned automatically: 1 point per S$10 spent.</p>
            </div>
            <input
              type="number"
              className="input h-8 w-24 text-right"
              value={points}
              onChange={(e) => setPoints(Number(e.target.value))}
            />
          </div>
        </div>
      </div>
    </Modal>
  );
}
