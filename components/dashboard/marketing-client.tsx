"use client";

import {
  Badge, Button, Card, CardHeader, EmptyState, Progress, Switch,
} from "@/components/ui/primitives";
import { Modal, ConfirmDialog } from "@/components/ui/modal";
import { useToast } from "@/components/ui/toast";
import { api } from "@/lib/fetcher";
import type { Campaign, Coupon } from "@/lib/types";
import { cn, fmtDate, money, relativeTime } from "@/lib/utils";
import {
  BarChart3, CalendarClock, Check, Copy, Gift, Mail, Megaphone, MessageSquare, MousePointerClick,
  Plus, Send, Sparkles, Tag, Ticket, Trash2, TrendingUp, Users, X,
} from "lucide-react";
import { useEffect, useState } from "react";

type Referral = {
  id: string; referrer_customer_id: string; referred_name: string; referred_email: string;
  code: string; status: string; reward: number; created_at: string; referrer_name: string;
};
type CustomerOpt = { id: string; name: string };

const AUDIENCES = [
  { value: "all", label: "Everyone opted in" },
  { value: "vip", label: "VIP clients" },
  { value: "lapsed", label: "Lapsed 60+ days" },
  { value: "birthday", label: "Birthday this month" },
];

export function MarketingClient({
  initialCampaigns,
  initialCoupons,
  initialReferrals,
  customers,
  initialTab,
  composeFrom,
}: {
  initialCampaigns: Campaign[];
  initialCoupons: Coupon[];
  initialReferrals: Referral[];
  customers: CustomerOpt[];
  initialTab?: string;
  composeFrom?: string;
}) {
  const toast = useToast();
  const [tab, setTab] = useState<"campaigns" | "coupons" | "referrals">(
    (initialTab as "campaigns" | "coupons" | "referrals") ?? "campaigns"
  );
  const [campaigns, setCampaigns] = useState(initialCampaigns);
  const [coupons, setCoupons] = useState(initialCoupons);
  const [referrals, setReferrals] = useState(initialReferrals);
  const [composeOpen, setComposeOpen] = useState(false);
  const [couponOpen, setCouponOpen] = useState(false);
  const [referralOpen, setReferralOpen] = useState(false);
  const [deleting, setDeleting] = useState<{ kind: "campaign" | "coupon"; id: string; name: string } | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (composeFrom) setComposeOpen(true);
  }, [composeFrom]);

  const sent = campaigns.filter((c) => c.status === "sent");
  const recipients = sent.reduce((a, b) => a + b.recipients, 0);
  const opened = sent.reduce((a, b) => a + b.opened, 0);
  const clicked = sent.reduce((a, b) => a + b.clicked, 0);
  const referralValue = referrals.filter((r) => r.status === "rewarded").reduce((a, b) => a + b.reward, 0);

  async function sendCampaign(c: Campaign) {
    setBusy(true);
    setCampaigns((prev) => prev.map((x) => (x.id === c.id ? { ...x, status: "sent", sent_at: new Date().toISOString() } : x)));
    try {
      const res = await api<{ items: Campaign[] }>(`/api/campaigns/${c.id}`, "PATCH", { action: "send" });
      setCampaigns(res.items);
      toast.success("Campaign sent", `“${c.name}” is on its way to your clients.`);
    } catch (e) {
      setCampaigns(initialCampaigns);
      toast.error("Couldn't send campaign", e instanceof Error ? e.message : undefined);
    } finally {
      setBusy(false);
    }
  }

  async function toggleCoupon(c: Coupon) {
    const next = c.active ? 0 : 1;
    setCoupons((prev) => prev.map((x) => (x.id === c.id ? { ...x, active: next } : x)));
    try {
      const res = await api<{ items: Coupon[] }>(`/api/coupons/${c.id}`, "PATCH", { active: Boolean(next) });
      setCoupons(res.items);
      toast.success(next ? "Coupon activated" : "Coupon paused", c.code);
    } catch (e) {
      setCoupons(initialCoupons);
      toast.error("Couldn't update coupon", e instanceof Error ? e.message : undefined);
    }
  }

  async function remove() {
    if (!deleting) return;
    setBusy(true);
    try {
      if (deleting.kind === "campaign") {
        const res = await api<{ items: Campaign[] }>(`/api/campaigns/${deleting.id}`, "DELETE");
        setCampaigns(res.items);
      } else {
        const res = await api<{ items: Coupon[] }>(`/api/coupons/${deleting.id}`, "DELETE");
        setCoupons(res.items);
      }
      toast.success("Deleted", deleting.name);
      setDeleting(null);
    } catch (e) {
      toast.error("Couldn't delete", e instanceof Error ? e.message : undefined);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[
          { label: "Campaigns sent", value: sent.length, hint: `${recipients} recipients`, icon: <Megaphone size={13} /> },
          { label: "Open rate", value: `${recipients ? ((opened / recipients) * 100).toFixed(1) : 0}%`, hint: `${opened} opens`, icon: <Mail size={13} /> },
          { label: "Click rate", value: `${recipients ? ((clicked / recipients) * 100).toFixed(1) : 0}%`, hint: `${clicked} clicks`, icon: <MousePointerClick size={13} /> },
          { label: "Referral rewards", value: money(referralValue), hint: `${referrals.length} referrals`, icon: <Gift size={13} /> },
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

      <div className="flex flex-wrap items-center gap-1">
        {[
          { key: "campaigns", label: "Campaigns", icon: <Megaphone size={12} /> },
          { key: "coupons", label: "Coupons & promo codes", icon: <Ticket size={12} /> },
          { key: "referrals", label: "Referral program", icon: <Gift size={12} /> },
        ].map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key as typeof tab)}
            className={cn(
              "flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[0.72rem] font-medium transition",
              tab === t.key ? "bg-brand-soft text-brand-ink" : "text-muted hover:bg-surface-3 hover:text-ink"
            )}
          >
            {t.icon}
            {t.label}
          </button>
        ))}
        <div className="ml-auto">
          {tab === "campaigns" && (
            <Button variant="primary" size="sm" onClick={() => setComposeOpen(true)} icon={<Plus size={13} />}>
              New campaign
            </Button>
          )}
          {tab === "coupons" && (
            <Button variant="primary" size="sm" onClick={() => setCouponOpen(true)} icon={<Plus size={13} />}>
              Create coupon
            </Button>
          )}
          {tab === "referrals" && (
            <Button variant="primary" size="sm" onClick={() => setReferralOpen(true)} icon={<Plus size={13} />}>
              Log referral
            </Button>
          )}
        </div>
      </div>

      {/* -------------------------------------------------- campaigns */}
      {tab === "campaigns" && (
        <div className="grid gap-3 lg:grid-cols-2">
          {campaigns.length === 0 ? (
            <Card className="lg:col-span-2">
              <EmptyState icon={<Megaphone size={20} />} title="No campaigns yet" description="Bring clients back with a targeted email or SMS." action={<Button variant="primary" size="sm" onClick={() => setComposeOpen(true)}>Create campaign</Button>} />
            </Card>
          ) : (
            campaigns.map((c) => (
              <Card key={c.id} className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className={cn("flex h-6 w-6 items-center justify-center rounded-md", c.channel === "sms" ? "bg-sky-50 text-sky-600 dark:bg-sky-500/10" : "bg-violet-50 text-violet-600 dark:bg-violet-500/10")}>
                        {c.channel === "sms" ? <MessageSquare size={12} /> : <Mail size={12} />}
                      </span>
                      <p className="truncate text-[0.82rem] font-semibold">{c.name}</p>
                      <Badge tone={c.status} className="capitalize">{c.status}</Badge>
                    </div>
                    <p className="mt-1 truncate text-[0.7rem] text-muted">{c.subject ?? c.body?.slice(0, 60)}</p>
                  </div>
                </div>

                <div className="mt-3 grid grid-cols-3 gap-2 rounded-lg bg-surface-2 p-2">
                  {[
                    { label: "Recipients", value: c.recipients },
                    { label: "Opened", value: c.opened },
                    { label: "Clicked", value: c.clicked },
                  ].map((m) => (
                    <div key={m.label}>
                      <p className="text-[0.58rem] uppercase tracking-wide text-faint">{m.label}</p>
                      <p className="text-[0.85rem] font-semibold tabular-nums">{m.value}</p>
                    </div>
                  ))}
                </div>

                <div className="mt-2 flex items-center gap-1.5 text-[0.64rem] text-faint">
                  <Users size={10} /> {AUDIENCES.find((a) => a.value === c.audience)?.label ?? c.audience}
                  <span>·</span>
                  {c.sent_at ? `sent ${relativeTime(c.sent_at)}` : c.scheduled_at ? `scheduled ${fmtDate(c.scheduled_at)}` : "draft"}
                </div>

                <div className="mt-2.5 flex items-center gap-1.5 border-t border-line pt-2.5">
                  {c.status !== "sent" ? (
                    <Button size="sm" variant="soft" onClick={() => sendCampaign(c)} loading={busy} icon={<Send size={11} />}>
                      Send now
                    </Button>
                  ) : (
                    <Button size="sm" variant="ghost" icon={<BarChart3 size={11} />}>
                      View report
                    </Button>
                  )}
                  <div className="ml-auto flex items-center gap-0.5">
                    <button className="rounded-lg p-1.5 text-faint hover:bg-surface-3 hover:text-ink" aria-label="Copy campaign">
                      <Copy size={12} />
                    </button>
                    <button
                      onClick={() => setDeleting({ kind: "campaign", id: c.id, name: c.name })}
                      className="rounded-lg p-1.5 text-faint hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-500/10"
                      aria-label="Delete campaign"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>
      )}

      {/* -------------------------------------------------- coupons */}
      {tab === "coupons" && (
        <Card className="overflow-hidden">
          {coupons.length === 0 ? (
            <EmptyState icon={<Ticket size={20} />} title="No coupons" description="Create a promo code to drive bookings on quiet days." />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-line bg-surface-2 text-[0.62rem] uppercase tracking-wide text-faint">
                    <th className="px-4 py-2 font-semibold">Code</th>
                    <th className="hidden px-3 py-2 font-semibold sm:table-cell">Description</th>
                    <th className="px-3 py-2 font-semibold">Discount</th>
                    <th className="hidden px-3 py-2 font-semibold md:table-cell">Usage</th>
                    <th className="hidden px-3 py-2 font-semibold lg:table-cell">Expires</th>
                    <th className="px-3 py-2 font-semibold">Active</th>
                    <th className="px-3 py-2" />
                  </tr>
                </thead>
                <tbody>
                  {coupons.map((c) => (
                    <tr key={c.id} className="border-b border-line/70 last:border-b-0">
                      <td className="px-4 py-2.5">
                        <span className="rounded-md border border-dashed border-brand/40 bg-brand-soft px-2 py-1 font-mono text-[0.7rem] font-semibold text-brand-ink">
                          {c.code}
                        </span>
                      </td>
                      <td className="hidden px-3 py-2.5 text-[0.72rem] text-muted sm:table-cell">{c.description ?? "—"}</td>
                      <td className="px-3 py-2.5 text-[0.74rem] font-medium">
                        {c.type === "percent" ? `${c.value}%` : money(c.value)}
                        {c.min_amount > 0 && <span className="block text-[0.6rem] font-normal text-faint">min {money(c.min_amount)}</span>}
                      </td>
                      <td className="hidden px-3 py-2.5 md:table-cell">
                        <div className="flex items-center gap-2">
                          <Progress value={(c.uses / Math.max(1, c.max_uses)) * 100} height={4} className="w-16" />
                          <span className="text-[0.65rem] tabular-nums text-muted">{c.uses}/{c.max_uses}</span>
                        </div>
                      </td>
                      <td className="hidden px-3 py-2.5 text-[0.7rem] text-muted lg:table-cell">{c.expires_at ? fmtDate(c.expires_at) : "No expiry"}</td>
                      <td className="px-3 py-2.5">
                        <button
                          onClick={() => toggleCoupon(c)}
                          className={cn(
                            "relative h-4 w-7 rounded-full transition",
                            c.active ? "bg-brand" : "bg-surface-3 border border-line"
                          )}
                          aria-label="Toggle coupon"
                        >
                          <span className={cn("absolute top-0.5 h-3 w-3 rounded-full bg-white transition-transform", c.active ? "translate-x-3.5" : "translate-x-0.5")} />
                        </button>
                      </td>
                      <td className="px-3 py-2.5 text-right">
                        <button
                          onClick={() => setDeleting({ kind: "coupon", id: c.id, name: c.code })}
                          className="rounded-lg p-1.5 text-faint hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-500/10"
                          aria-label="Delete coupon"
                        >
                          <Trash2 size={12} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}

      {/* -------------------------------------------------- referrals */}
      {tab === "referrals" && (
        <div className="grid gap-4 lg:grid-cols-3">
          <Card className="overflow-hidden lg:col-span-2">
            <CardHeader title="Referral activity" subtitle={`${referrals.filter((r) => r.status === "rewarded").length} rewards paid`} icon={<Gift size={14} />} />
            <div className="border-t border-line">
              {referrals.length === 0 ? (
                <EmptyState compact icon={<Gift size={18} />} title="No referrals yet" description="Log a referral when a client brings a friend." />
              ) : (
                referrals.map((r) => (
                  <div key={r.id} className="flex items-center gap-2.5 border-b border-line/60 px-4 py-2.5 last:border-b-0">
                    <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand-soft text-brand"><Gift size={12} /></span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[0.76rem] font-medium">{r.referred_name}</p>
                      <p className="truncate text-[0.64rem] text-faint">
                        referred by {r.referrer_name} · code {r.code}
                      </p>
                    </div>
                    <span className="text-[0.72rem] font-semibold">{money(r.reward)}</span>
                    <Badge tone={r.status === "rewarded" ? "paid" : r.status === "joined" ? "offered" : "pending"} className="capitalize">
                      {r.status}
                    </Badge>
                  </div>
                ))
              )}
            </div>
          </Card>

          <Card>
            <CardHeader title="Program terms" subtitle="Double-sided rewards" icon={<Sparkles size={14} />} />
            <div className="space-y-3 border-t border-line p-4">
              <div className="rounded-xl border border-line bg-surface-2 p-3">
                <p className="text-[0.7rem] font-semibold">Give $25 · Get $25</p>
                <p className="mt-1 text-[0.68rem] leading-relaxed text-muted">
                  When a referred friend completes their first booking, both clients get $25 credit automatically.
                </p>
              </div>
              <div className="space-y-1.5 text-[0.7rem]">
                <p className="flex justify-between"><span className="text-muted">Conversion rate</span><span className="font-semibold">62%</span></p>
                <p className="flex justify-between"><span className="text-muted">Avg. reward paid</span><span className="font-semibold">{money(25)}</span></p>
                <p className="flex justify-between"><span className="text-muted">Revenue from referrals</span><span className="font-semibold">{money(referrals.length * 148)}</span></p>
              </div>
              <Button variant="soft" size="sm" className="w-full" onClick={() => setReferralOpen(true)} icon={<Plus size={12} />}>
                Log a referral
              </Button>
            </div>
          </Card>
        </div>
      )}

      <ComposeModal
        open={composeOpen}
        onClose={() => setComposeOpen(false)}
        preset={composeFrom}
        onSaved={setCampaigns}
      />
      <CouponModal open={couponOpen} onClose={() => setCouponOpen(false)} onSaved={setCoupons} />
      <ReferralModal open={referralOpen} onClose={() => setReferralOpen(false)} customers={customers} onSaved={setReferrals} />

      <ConfirmDialog
        open={Boolean(deleting)}
        onClose={() => setDeleting(null)}
        onConfirm={remove}
        loading={busy}
        danger
        title={`Delete this ${deleting?.kind ?? "item"}?`}
        confirmLabel="Delete"
        description={`${deleting?.name} will be permanently removed.`}
      />
    </div>
  );
}

/* ------------------------------------------------------------ compose */

function ComposeModal({
  open,
  onClose,
  preset,
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  preset?: string;
  onSaved: (items: Campaign[]) => void;
}) {
  const toast = useToast();
  const [name, setName] = useState("");
  const [channel, setChannel] = useState<"email" | "sms">("email");
  const [audience, setAudience] = useState("all");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [scheduled, setScheduled] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    const presetName = preset === "lapsed" ? "We miss you" : preset === "weekday" ? "Midweek treat" : "";
    setName(presetName);
    setAudience(preset === "lapsed" ? "lapsed" : "all");
    setSubject(preset === "lapsed" ? "A little something for your next visit" : preset === "weekday" ? "20% off midweek appointments" : "");
    setBody(
      preset === "lapsed"
        ? "Hi {{first_name}},\n\nIt's been a while! Here's $20 toward your next visit — book any time and we'll take care of the rest.\n\nWith love,\nAva & the Lumière team"
        : preset === "weekday"
          ? "Hi {{first_name}},\n\nTuesdays and Wednesdays are our quietest days, so we're making them sweeter: 20% off any appointment booked Mon–Thu this month.\n\nSee you soon,\nLumière Studio"
          : ""
    );
    setChannel("email");
    setScheduled("");
  }, [open, preset]);

  async function save(status: "draft" | "sent") {
    if (!name.trim()) {
      toast.error("Give your campaign a name");
      return;
    }
    setSaving(true);
    try {
      const res = await api<{ items: Campaign[] }>("/api/campaigns", "POST", {
        name,
        channel,
        audience,
        subject,
        body,
        status,
        scheduled_at: scheduled || null,
      });
      onSaved(res.items);
      toast.success(status === "sent" ? "Campaign sent" : "Draft saved", name);
      onClose();
    } catch (e) {
      toast.error("Couldn't save campaign", e instanceof Error ? e.message : undefined);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="lg"
      title="New campaign"
      description="Reach the right clients with the right message"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button variant="outline" onClick={() => save("draft")} loading={saving}>Save draft</Button>
          <Button variant="primary" onClick={() => save("sent")} loading={saving} icon={<Send size={13} />}>Send now</Button>
        </>
      }
    >
      <div className="space-y-3">
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="label">Campaign name *</label>
            <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="March glow-up" />
          </div>
          <div>
            <label className="label">Channel</label>
            <div className="flex gap-1.5">
              {(["email", "sms"] as const).map((c) => (
                <button
                  key={c}
                  onClick={() => setChannel(c)}
                  className={cn(
                    "flex flex-1 items-center justify-center gap-1.5 rounded-lg border px-2 py-1.5 text-[0.72rem] font-medium capitalize transition",
                    channel === c ? "border-brand/40 bg-brand-soft text-brand-ink" : "border-line text-muted"
                  )}
                >
                  {c === "email" ? <Mail size={11} /> : <MessageSquare size={11} />}
                  {c}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="label">Audience</label>
            <select className="input" value={audience} onChange={(e) => setAudience(e.target.value)}>
              {AUDIENCES.map((a) => (
                <option key={a.value} value={a.value}>{a.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Schedule (optional)</label>
            <input type="datetime-local" className="input" value={scheduled} onChange={(e) => setScheduled(e.target.value)} />
          </div>
        </div>

        {channel === "email" && (
          <div>
            <label className="label">Subject line</label>
            <input className="input" value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Your spring reset starts here ✨" />
          </div>
        )}

        <div>
          <label className="label">Message</label>
          <textarea
            className="input min-h-[140px] resize-y font-mono text-[0.74rem] leading-relaxed"
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder={"Hi {{first_name}},\n\n…"}
          />
          <p className="mt-1 flex items-center gap-1 text-[0.62rem] text-faint">
            <Sparkles size={10} /> Merge tags: {"{{first_name}}"}, {"{{last_service}}"}, {"{{loyalty_points}}"}
          </p>
        </div>
      </div>
    </Modal>
  );
}

/* ------------------------------------------------------------ coupon */

function CouponModal({ open, onClose, onSaved }: { open: boolean; onClose: () => void; onSaved: (c: Coupon[]) => void }) {
  const toast = useToast();
  const [code, setCode] = useState("");
  const [description, setDescription] = useState("");
  const [type, setType] = useState("percent");
  const [value, setValue] = useState(15);
  const [minAmount, setMinAmount] = useState(0);
  const [maxUses, setMaxUses] = useState(100);
  const [expires, setExpires] = useState("");
  const [saving, setSaving] = useState(false);

  async function save() {
    if (!code.trim()) {
      toast.error("Enter a coupon code");
      return;
    }
    setSaving(true);
    try {
      const res = await api<{ items: Coupon[] }>("/api/coupons", "POST", {
        code, description, type, value, min_amount: minAmount, max_uses: maxUses, expires_at: expires || null,
      });
      onSaved(res.items);
      toast.success("Coupon created", code.toUpperCase());
      onClose();
      setCode("");
      setDescription("");
    } catch (e) {
      toast.error("Couldn't create coupon", e instanceof Error ? e.message : undefined);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="sm"
      title="Create a coupon"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button variant="primary" onClick={save} loading={saving}>Create coupon</Button>
        </>
      }
    >
      <div className="space-y-3">
        <div>
          <label className="label">Code *</label>
          <input className="input font-mono uppercase" value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} placeholder="SPRING20" />
        </div>
        <div>
          <label className="label">Description</label>
          <input className="input" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="20% off first visit" />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="label">Type</label>
            <select className="input" value={type} onChange={(e) => setType(e.target.value)}>
              <option value="percent">Percentage</option>
              <option value="fixed">Fixed amount</option>
            </select>
          </div>
          <div>
            <label className="label">Value</label>
            <input type="number" className="input" value={value} onChange={(e) => setValue(Number(e.target.value))} />
          </div>
          <div>
            <label className="label">Min. spend</label>
            <input type="number" className="input" value={minAmount} onChange={(e) => setMinAmount(Number(e.target.value))} />
          </div>
          <div>
            <label className="label">Max uses</label>
            <input type="number" className="input" value={maxUses} onChange={(e) => setMaxUses(Number(e.target.value))} />
          </div>
        </div>
        <div>
          <label className="label">Expires</label>
          <input type="date" className="input" value={expires} onChange={(e) => setExpires(e.target.value)} />
        </div>
      </div>
    </Modal>
  );
}

/* ------------------------------------------------------------ referral */

function ReferralModal({
  open,
  onClose,
  customers,
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  customers: CustomerOpt[];
  onSaved: (r: Referral[]) => void;
}) {
  const toast = useToast();
  const [referrer, setReferrer] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [saving, setSaving] = useState(false);

  async function save() {
    if (!referrer || !name) {
      toast.error("Select a referrer and enter the friend's name");
      return;
    }
    setSaving(true);
    try {
      const res = await api<{ items: Referral[] }>("/api/referrals", "POST", {
        referrer_customer_id: referrer,
        referred_name: name,
        referred_email: email,
      });
      onSaved(res.items);
      toast.success("Referral logged", `${name} was referred by ${customers.find((c) => c.id === referrer)?.name}.`);
      onClose();
      setName("");
      setEmail("");
    } catch (e) {
      toast.error("Couldn't log referral", e instanceof Error ? e.message : undefined);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="sm"
      title="Log a referral"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button variant="primary" onClick={save} loading={saving}>Log referral</Button>
        </>
      }
    >
      <div className="space-y-3">
        <div>
          <label className="label">Referred by</label>
          <select className="input" value={referrer} onChange={(e) => setReferrer(e.target.value)}>
            <option value="">Select a client…</option>
            {customers.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="label">Friend&apos;s name</label>
          <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Nadia Lim" />
        </div>
        <div>
          <label className="label">Friend&apos;s email</label>
          <input className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="nadia@example.com" />
        </div>
        <p className="text-[0.65rem] text-faint">A unique referral code is generated automatically.</p>
      </div>
    </Modal>
  );
}
