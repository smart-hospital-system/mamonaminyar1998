"use client";

import { Avatar, Badge, Button, Card, CardHeader, Switch } from "@/components/ui/primitives";
import { ConfirmDialog } from "@/components/ui/modal";
import { useToast } from "@/components/ui/toast";
import { api } from "@/lib/fetcher";
import type { SessionUser } from "@/lib/types";
import { cn, fmtDate } from "@/lib/utils";
import {
  Bell, Brain, Building2, CalendarClock, Check, CreditCard, Database, Download, KeyRound,
  Lock, RefreshCw, Shield, Users,
} from "lucide-react";
import { useState } from "react";

type Settings = Record<string, Record<string, unknown>>;
type UserRow = { id: string; email: string; name: string; role: string; last_login_at: string | null; active: number; avatar_url: string | null };

const SECTIONS = [
  { key: "business", label: "Business profile", icon: <Building2 size={13} /> },
  { key: "booking", label: "Booking rules", icon: <CalendarClock size={13} /> },
  { key: "notifications", label: "Notifications", icon: <Bell size={13} /> },
  { key: "payments", label: "Payments & tax", icon: <CreditCard size={13} /> },
  { key: "ai", label: "AI features", icon: <Brain size={13} /> },
  { key: "access", label: "Access & security", icon: <Shield size={13} /> },
  { key: "data", label: "Data & backup", icon: <Database size={13} /> },
];

export function SettingsClient({
  initial,
  users,
  user,
}: {
  initial: Settings;
  users: UserRow[];
  user: SessionUser;
}) {
  const toast = useToast();
  const [section, setSection] = useState("business");
  const [settings, setSettings] = useState(initial);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [resetOpen, setResetOpen] = useState(false);
  const [resetting, setResetting] = useState(false);

  const canManage = user.role === "owner" || user.role === "manager";

  function update(key: string, value: unknown) {
    setSettings((prev) => ({ ...prev, [section]: { ...(prev[section] ?? {}), [key]: value } }));
    setDirty(true);
  }

  async function save() {
    setSaving(true);
    try {
      const res = await api<{ settings: Settings }>("/api/settings", "PUT", { section, values: settings[section] });
      setSettings(res.settings);
      setDirty(false);
      toast.success("Settings saved", "Your changes are live.");
    } catch (e) {
      toast.error("Couldn't save settings", e instanceof Error ? e.message : undefined);
    } finally {
      setSaving(false);
    }
  }

  async function resetDemo() {
    setResetting(true);
    try {
      await api("/api/demo/reset", "POST");
      toast.success("Demo data restored", "The workspace has been reseeded. Reloading…");
      setTimeout(() => window.location.reload(), 900);
    } catch (e) {
      toast.error("Reset failed", e instanceof Error ? e.message : undefined);
      setResetting(false);
    }
  }

  const s = settings[section] ?? {};

  return (
    <div className="grid gap-4 lg:grid-cols-[15rem_1fr]">
      <Card className="h-fit p-2">
        {SECTIONS.map((sec) => (
          <button
            key={sec.key}
            onClick={() => {
              setSection(sec.key);
              setDirty(false);
            }}
            className={cn("nav-item w-full", section === sec.key && "!bg-brand-soft !text-brand-ink")}
            data-active={section === sec.key}
          >
            {sec.icon}
            <span className="flex-1 text-left">{sec.label}</span>
          </button>
        ))}
        <div className="mt-2 border-t border-line p-2">
          <p className="text-[0.6rem] uppercase tracking-wide text-faint">Signed in as</p>
          <p className="mt-1 truncate text-[0.72rem] font-medium">{user.name}</p>
          <Badge tone={user.role} className="mt-1 capitalize">{user.role}</Badge>
        </div>
      </Card>

      <div className="space-y-4">
        {/* ------------------------------------------------ business */}
        {section === "business" && (
          <Card>
            <CardHeader title="Business profile" subtitle="Shown on invoices and your public booking page" />
            <div className="grid gap-3 border-t border-line p-4 sm:grid-cols-2">
              <Field label="Business name" value={String(s.name ?? "")} onChange={(v) => update("name", v)} />
              <Field label="Legal entity" value={String(s.legal_name ?? "")} onChange={(v) => update("legal_name", v)} />
              <Field label="Tagline" value={String(s.tagline ?? "")} onChange={(v) => update("tagline", v)} />
              <Field label="Website" value={String(s.website ?? "")} onChange={(v) => update("website", v)} />
              <Field label="Email" value={String(s.email ?? "")} onChange={(v) => update("email", v)} />
              <Field label="Phone" value={String(s.phone ?? "")} onChange={(v) => update("phone", v)} />
              <Field label="Address" value={String(s.address ?? "")} onChange={(v) => update("address", v)} className="sm:col-span-2" />
              <Field label="Instagram" value={String(s.instagram ?? "")} onChange={(v) => update("instagram", v)} />
              <Field label="Timezone" value={String(s.timezone ?? "")} onChange={(v) => update("timezone", v)} disabled />
              <div className="sm:col-span-2">
                <label className="label">About (shown on the booking page)</label>
                <textarea className="input min-h-[70px] resize-none" value={String(s.description ?? "")} onChange={(e) => update("description", e.target.value)} />
              </div>
            </div>
          </Card>
        )}

        {/* ------------------------------------------------ booking */}
        {section === "booking" && (
          <Card>
            <CardHeader title="Booking rules" subtitle="How clients can book and cancel" />
            <div className="grid gap-3 border-t border-line p-4 sm:grid-cols-2">
              <NumberField label="Slot interval (minutes)" value={Number(s.slot_interval ?? 15)} onChange={(v) => update("slot_interval", v)} />
              <NumberField label="Minimum notice (hours)" value={Number(s.min_notice_hours ?? 2)} onChange={(v) => update("min_notice_hours", v)} />
              <NumberField label="Book ahead (days)" value={Number(s.max_advance_days ?? 60)} onChange={(v) => update("max_advance_days", v)} />
              <NumberField label="Cancellation window (hours)" value={Number(s.cancellation_window_hours ?? 24)} onChange={(v) => update("cancellation_window_hours", v)} />
              <NumberField label="Default buffer (minutes)" value={Number(s.buffer_min ?? 10)} onChange={(v) => update("buffer_min", v)} />
              <div className="sm:col-span-2 space-y-3 rounded-xl border border-line bg-surface-2 p-3">
                <Switch checked={Boolean(s.auto_confirm)} onChange={(v) => update("auto_confirm", v)} label="Auto-confirm online bookings" description="New requests are confirmed instantly. Turn off to review each one first." />
                <div className="h-px bg-line" />
                <Switch checked={Boolean(s.allow_waitlist)} onChange={(v) => update("allow_waitlist", v)} label="Enable waitlist" description="Collect requests when a day is full and offer cancellations." />
                <div className="h-px bg-line" />
                <Switch checked={Boolean(s.require_deposit)} onChange={(v) => update("require_deposit", v)} label="Require deposit at booking" description="Uses the deposit set on each service to reduce no-shows." />
              </div>
            </div>
          </Card>
        )}

        {/* ------------------------------------------------ notifications */}
        {section === "notifications" && (
          <Card>
            <CardHeader title="Notifications" subtitle="Automated reminders and alerts" />
            <div className="space-y-3 border-t border-line p-4">
              <div className="space-y-3 rounded-xl border border-line bg-surface-2 p-3">
                <Switch checked={Boolean(s.email_confirmations)} onChange={(v) => update("email_confirmations", v)} label="Email booking confirmations" description="Send a confirmation as soon as a booking is created." />
                <div className="h-px bg-line" />
                <Switch checked={Boolean(s.email_cancellations)} onChange={(v) => update("email_cancellations", v)} label="Cancellation alerts" description="Notify the client (and team) whenever a booking is cancelled." />
                <div className="h-px bg-line" />
                <Switch checked={Boolean(s.sms_reminders)} onChange={(v) => update("sms_reminders", v)} label="SMS reminders" description="Reduces no-shows by roughly half in most studios." />
                <div className="h-px bg-line" />
                <Switch checked={Boolean(s.staff_notifications)} onChange={(v) => update("staff_notifications", v)} label="Staff notifications" description="Alert specialists when they get a new booking." />
                <div className="h-px bg-line" />
                <Switch checked={Boolean(s.daily_digest)} onChange={(v) => update("daily_digest", v)} label="Daily digest" description="A 7am summary of the day ahead for owners and managers." />
                <div className="h-px bg-line" />
                <Switch checked={Boolean(s.review_requests)} onChange={(v) => update("review_requests", v)} label="Post-visit review requests" description="Ask happy clients for a review 2 hours after checkout." />
              </div>
              <NumberField label="Send reminder before appointment (hours)" value={Number(s.reminder_hours ?? 24)} onChange={(v) => update("reminder_hours", v)} />
            </div>
          </Card>
        )}

        {/* ------------------------------------------------ payments */}
        {section === "payments" && (
          <Card>
            <CardHeader title="Payments & tax" subtitle="Checkout, deposits and payouts" />
            <div className="grid gap-3 border-t border-line p-4 sm:grid-cols-2">
              <NumberField label="GST rate (%)" value={Number(s.gst_rate ?? 9)} onChange={(v) => update("gst_rate", v)} />
              <NumberField label="Default deposit (%)" value={Number(s.deposit_percent ?? 25)} onChange={(v) => update("deposit_percent", v)} />
              <Field label="Payout account" value={String(s.payout_account ?? "")} onChange={(v) => update("payout_account", v)} />
              <div className="sm:col-span-2 space-y-3 rounded-xl border border-line bg-surface-2 p-3">
                <Switch checked={Boolean(s.accept_card)} onChange={(v) => update("accept_card", v)} label="Accept cards" description="Visa, Mastercard and Amex via Stripe." />
                <div className="h-px bg-line" />
                <Switch checked={Boolean(s.accept_paynow)} onChange={(v) => update("accept_paynow", v)} label="Accept PayNow" description="Instant bank transfer with QR codes." />
                <div className="h-px bg-line" />
                <Switch checked={Boolean(s.accept_cash)} onChange={(v) => update("accept_cash", v)} label="Accept cash" description="Record cash payments manually at checkout." />
              </div>
            </div>
          </Card>
        )}

        {/* ------------------------------------------------ ai */}
        {section === "ai" && (
          <Card>
            <CardHeader title="AI features" subtitle="Premium intelligence settings" action={<Badge tone="paid">Premium</Badge>} />
            <div className="space-y-3 border-t border-line p-4">
              <div className="space-y-3 rounded-xl border border-line bg-surface-2 p-3">
                <Switch checked={Boolean(s.assistant_enabled)} onChange={(v) => update("assistant_enabled", v)} label="AI scheduling assistant" description="Ask questions about availability, revenue and clients in plain language." />
                <div className="h-px bg-line" />
                <Switch checked={Boolean(s.smart_assignment)} onChange={(v) => update("smart_assignment", v)} label="Smart staff assignment" description="Score specialists on skill, rating, load and availability for every slot." />
                <div className="h-px bg-line" />
                <Switch checked={Boolean(s.followups)} onChange={(v) => update("followups", v)} label="Automated follow-ups" description="Win-backs, review requests and rebooking nudges, written per client." />
              </div>
              <NumberField label="Forecast horizon (days)" value={Number(s.forecast_horizon ?? 14)} onChange={(v) => update("forecast_horizon", v)} />
              <div className="rounded-xl border border-brand/20 bg-brand-soft/40 p-3">
                <p className="flex items-center gap-1.5 text-[0.72rem] font-semibold text-brand-ink">
                  <Brain size={12} /> Usage this month
                </p>
                <div className="mt-1.5 flex items-end gap-2">
                  <p className="text-[1.1rem] font-semibold leading-none">1,284</p>
                  <p className="text-[0.65rem] text-muted">AI actions · unlimited on Premium</p>
                </div>
              </div>
            </div>
          </Card>
        )}

        {/* ------------------------------------------------ access */}
        {section === "access" && (
          <>
            <Card>
              <CardHeader title="Team access" subtitle="Role-based access control" icon={<Users size={14} />} />
              <div className="border-t border-line">
                {users.map((u) => (
                  <div key={u.id} className="flex items-center gap-2.5 border-b border-line/60 px-4 py-2.5 last:border-b-0">
                    <Avatar name={u.name} size={28} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[0.76rem] font-medium">{u.name}</p>
                      <p className="truncate text-[0.64rem] text-faint">{u.email}</p>
                    </div>
                    <div className="hidden text-right text-[0.62rem] text-faint sm:block">
                      {u.last_login_at ? `last login ${fmtDate(u.last_login_at)}` : "never signed in"}
                    </div>
                    <Badge tone={u.role} className="capitalize">{u.role}</Badge>
                  </div>
                ))}
              </div>
            </Card>

            <Card>
              <CardHeader title="Permissions" subtitle="What each role can do" icon={<Shield size={14} />} />
              <div className="overflow-x-auto border-t border-line">
                <table className="w-full text-left text-[0.7rem]">
                  <thead>
                    <tr className="bg-surface-2 text-[0.6rem] uppercase tracking-wide text-faint">
                      <th className="px-4 py-2 font-semibold">Capability</th>
                      <th className="px-3 py-2 text-center font-semibold">Owner</th>
                      <th className="px-3 py-2 text-center font-semibold">Manager</th>
                      <th className="px-3 py-2 text-center font-semibold">Staff</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      ["View dashboard & calendar", [1, 1, 1]],
                      ["Create & edit bookings", [1, 1, 1]],
                      ["Delete bookings", [1, 1, 0]],
                      ["Manage customers", [1, 1, 1]],
                      ["Manage staff & schedules", [1, 1, 0]],
                      ["Edit services & pricing", [1, 1, 0]],
                      ["Issue refunds", [1, 1, 0]],
                      ["Send campaigns", [1, 1, 0]],
                      ["View analytics", [1, 1, 0]],
                      ["Change business settings", [1, 1, 0]],
                      ["Reset demo data / backups", [1, 0, 0]],
                    ].map(([label, perms]) => (
                      <tr key={label as string} className="border-b border-line/60 last:border-b-0">
                        <td className="px-4 py-1.5">{label as string}</td>
                        {(perms as number[]).map((p, i) => (
                          <td key={i} className="px-3 py-1.5 text-center">
                            {p ? <Check size={12} className="mx-auto text-emerald-500" /> : <span className="text-faint">—</span>}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>

            <Card>
              <CardHeader title="Session security" subtitle="How this workspace stays safe" icon={<Lock size={14} />} />
              <div className="grid gap-2 border-t border-line p-4 sm:grid-cols-2">
                {[
                  { title: "httpOnly session cookies", detail: "Session tokens never touch client JavaScript." },
                  { title: "Hashed passwords", detail: "bcrypt with a per-user salt, never stored in plain text." },
                  { title: "Role-based route guards", detail: "Every API route checks role before mutating data." },
                  { title: "Full audit trail", detail: "Every change is attributed to a user and timestamped." },
                ].map((t) => (
                  <div key={t.title} className="rounded-lg border border-line bg-surface-2 p-2.5">
                    <p className="flex items-center gap-1.5 text-[0.74rem] font-medium">
                      <KeyRound size={11} className="text-emerald-500" /> {t.title}
                    </p>
                    <p className="mt-0.5 text-[0.66rem] leading-relaxed text-muted">{t.detail}</p>
                  </div>
                ))}
              </div>
            </Card>
          </>
        )}

        {/* ------------------------------------------------ data */}
        {section === "data" && (
          <>
            <Card>
              <CardHeader title="Backup & recovery" subtitle="Export a complete snapshot" icon={<Database size={14} />} />
              <div className="space-y-3 border-t border-line p-4">
                <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-line bg-surface-2 p-3">
                  <div>
                    <p className="text-[0.78rem] font-medium">Download JSON backup</p>
                    <p className="text-[0.66rem] text-muted">All tables — customers, bookings, payments, settings.</p>
                  </div>
                  <a href="/api/demo/backup" className="btn btn-outline" download>
                    <Download size={13} /> Export
                  </a>
                </div>
                <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-line bg-surface-2 p-3">
                  <div>
                    <p className="text-[0.78rem] font-medium">Restore demo dataset</p>
                    <p className="text-[0.66rem] text-muted">Wipes current data and reseeds six months of realistic activity.</p>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => setResetOpen(true)} icon={<RefreshCw size={12} />}>
                    Reset demo
                  </Button>
                </div>
                <div className="rounded-xl border border-line p-3">
                  <p className="text-[0.72rem] font-semibold">Storage</p>
                  <p className="mt-0.5 text-[0.66rem] text-muted">
                    Persistent SQLite database with WAL journaling. Data survives restarts; the demo seed runs only when the
                    workspace is empty.
                  </p>
                </div>
              </div>
            </Card>

            <Card>
              <CardHeader title="Danger zone" subtitle="Irreversible actions" />
              <div className="space-y-2 border-t border-line p-4">
                <div className="rounded-xl border border-rose-200 bg-rose-50/60 p-3 dark:border-rose-500/20 dark:bg-rose-500/5">
                  <p className="text-[0.78rem] font-medium text-rose-700 dark:text-rose-300">Reset entire workspace</p>
                  <p className="mt-0.5 text-[0.66rem] leading-relaxed text-rose-600/80 dark:text-rose-300/70">
                    Deletes all bookings, customers and payments, then restores the demo seed. Requires the owner role.
                  </p>
                  <Button variant="danger" size="sm" className="mt-2" onClick={() => setResetOpen(true)}>
                    Reset workspace
                  </Button>
                </div>
              </div>
            </Card>
          </>
        )}

        {canManage && ["business", "booking", "notifications", "payments", "ai"].includes(section) && (
          <div className="sticky bottom-3 flex items-center justify-between gap-3 rounded-xl border border-line bg-surface/95 px-3 py-2.5 shadow-lg backdrop-blur">
            <p className="text-[0.7rem] text-muted">
              {dirty ? "You have unsaved changes." : "All changes saved."}
            </p>
            <div className="flex gap-2">
              <Button variant="ghost" size="sm" onClick={() => setSettings(initial)} disabled={!dirty}>
                Discard
              </Button>
              <Button variant="primary" size="sm" onClick={save} loading={saving} disabled={!dirty} icon={<Check size={12} />}>
                Save changes
              </Button>
            </div>
          </div>
        )}
      </div>

      <ConfirmDialog
        open={resetOpen}
        onClose={() => setResetOpen(false)}
        onConfirm={resetDemo}
        loading={resetting}
        danger
        title="Reset the demo workspace?"
        confirmLabel="Yes, reset everything"
        description="This permanently deletes all current data and reseeds the workspace with fresh demo data. Useful before a demo, destructive otherwise."
      />
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  disabled,
  className,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  disabled?: boolean;
  className?: string;
}) {
  return (
    <div className={className}>
      <label className="label">{label}</label>
      <input className="input" value={value} onChange={(e) => onChange(e.target.value)} disabled={disabled} />
    </div>
  );
}

function NumberField({
  label,
  value,
  onChange,
  className,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  className?: string;
}) {
  return (
    <div className={className}>
      <label className="label">{label}</label>
      <input type="number" className="input" value={value} onChange={(e) => onChange(Number(e.target.value))} />
    </div>
  );
}
