"use client";

import { Badge, Button, Skeleton, Stars } from "@/components/ui/primitives";
import { ThemeToggle } from "@/components/theme-toggle";
import { fetcher } from "@/lib/fetcher";
import { BUSINESS } from "@/lib/types";
import {
  addDaysKey, cn, durationLabel, fmDateKey, fmtDate, fmtTime, money, todayKey,
} from "@/lib/utils";
import {
  ArrowLeft, ArrowRight, Check, CheckCircle2, ChevronRight, Clock, Mail, MapPin, Phone,
  ShieldCheck, Sparkles, Star, User,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import useSWR from "swr";

type ServiceOpt = {
  id: string; name: string; category: string; description: string | null;
  duration_min: number; price: number; color: string; popular: number;
  staff_id: string | null; staff_name: string | null;
};
type Slot = { start_at: string; end_at: string; time: string; staff_id: string; staff_name: string; staff_color: string | null };
type Payload = { services: ServiceOpt[]; staff: { id: string; name: string }[]; date: string; slots: Slot[]; days: { date: string; count: number }[] };

export function PublicBooking({ initial }: { initial: Payload }) {
  const [step, setStep] = useState(0);
  const [serviceId, setServiceId] = useState<string | null>(null);
  const [date, setDate] = useState(todayKey());
  const [slot, setSlot] = useState<Slot | null>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmed, setConfirmed] = useState<{ id: string; price: number } | null>(null);

  const key = serviceId
    ? `/api/public/booking?service_id=${serviceId}&date=${date}`
    : "/api/public/booking";
  const { data, isLoading } = useSWR<Payload>(key, fetcher, {
    fallbackData: serviceId ? undefined : initial,
  });

  const services = data?.services ?? [];
  const service = services.find((s) => s.id === serviceId);
  const categories = Array.from(new Set(services.map((s) => s.category)));
  const slots = data?.slots ?? [];
  const days = data?.days ?? [];

  useEffect(() => {
    if (serviceId && step === 0) setStep(1);
  }, [serviceId, step]);

  async function submit() {
    if (!slot || !serviceId) return;
    if (!name.trim()) {
      setError("Please tell us your name.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/public/booking", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          service_id: serviceId,
          staff_id: slot.staff_id,
          start_at: slot.start_at,
          name,
          email,
          phone,
          notes,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Could not create booking");
      setConfirmed({ id: json.booking_id, price: json.price });
      setStep(3);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-bg">
      {/* header */}
      <header className="sticky top-0 z-30 border-b border-line bg-bg/85 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-5xl items-center gap-3 px-4">
          <span className="flex h-8 w-8 items-center justify-center rounded-[0.6rem] bg-gradient-to-br from-violet-500 to-fuchsia-500 text-white">
            <Sparkles size={15} />
          </span>
          <div className="min-w-0">
            <p className="truncate text-[0.82rem] font-semibold leading-tight">{BUSINESS.name}</p>
            <p className="truncate text-[0.6rem] leading-tight text-faint">{BUSINESS.tagline}</p>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <ThemeToggle />
            <Link href="/login" className="btn btn-ghost !text-[0.7rem]">
              Staff sign in
            </Link>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-5xl px-4 py-6">
        {/* hero */}
        {step === 0 && (
          <div className="mb-6 overflow-hidden rounded-2xl border border-line bg-gradient-to-br from-violet-500/10 via-fuchsia-500/5 to-transparent p-5 sm:p-7">
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone="paid" className="gap-1"><Star size={9} /> 4.8 · 900+ reviews</Badge>
              <Badge tone="neutral">Open today · 09:00–19:00</Badge>
            </div>
            <h1 className="mt-3 max-w-lg text-[1.7rem] font-semibold leading-tight tracking-[-0.02em] sm:text-[2rem]">
              Book your next appointment in under a minute.
            </h1>
            <p className="mt-2 max-w-lg text-[0.82rem] leading-relaxed text-muted">
              Choose a treatment, pick a time that suits you, and we&apos;ll confirm instantly. No
              account needed — you&apos;ll get an email and SMS reminder.
            </p>
            <div className="mt-4 flex flex-wrap items-center gap-4 text-[0.7rem] text-muted">
              <span className="flex items-center gap-1.5"><MapPin size={11} /> {BUSINESS.address}</span>
              <span className="flex items-center gap-1.5"><Phone size={11} /> {BUSINESS.phone}</span>
            </div>
          </div>
        )}

        <div className="grid gap-4 lg:grid-cols-[1fr_20rem]">
          <div className="space-y-4">
            {/* progress */}
            <div className="flex items-center gap-1.5 text-[0.68rem]">
              {["Treatment", "Date & time", "Your details"].map((label, i) => (
                <div key={label} className="flex items-center gap-1.5">
                  <span
                    className={cn(
                      "flex h-5 w-5 items-center justify-center rounded-full text-[0.6rem] font-semibold",
                      step > i ? "bg-emerald-500 text-white" : step === i ? "bg-brand text-white" : "bg-surface-3 text-faint"
                    )}
                  >
                    {step > i ? <Check size={10} /> : i + 1}
                  </span>
                  <span className={cn(step === i ? "font-medium text-ink" : "text-faint")}>{label}</span>
                  {i < 2 && <ChevronRight size={11} className="text-faint" />}
                </div>
              ))}
            </div>

            {/* step 0: services */}
            {step === 0 && (
              <div className="space-y-4">
                {categories.map((cat) => (
                  <div key={cat}>
                    <p className="mb-1.5 text-[0.66rem] font-semibold uppercase tracking-[0.08em] text-faint">{cat}</p>
                    <div className="space-y-1.5">
                      {services.filter((s) => s.category === cat).map((s) => (
                        <button
                          key={s.id}
                          onClick={() => setServiceId(s.id)}
                          className="group flex w-full items-center gap-3 rounded-xl border border-line bg-surface p-3 text-left transition hover:border-brand/40 hover:shadow-sm"
                        >
                          <span
                            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-[0.8rem] font-semibold"
                            style={{ background: `color-mix(in srgb, ${s.color} 14%, transparent)`, color: s.color }}
                          >
                            {s.name.charAt(0)}
                          </span>
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-1.5">
                              <p className="truncate text-[0.82rem] font-medium">{s.name}</p>
                              {s.popular ? <Badge tone="VIP">Popular</Badge> : null}
                            </div>
                            <p className="truncate text-[0.68rem] text-muted">{s.description}</p>
                            <p className="mt-0.5 flex items-center gap-1 text-[0.62rem] text-faint">
                              <Clock size={9} /> {durationLabel(s.duration_min)}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-[0.82rem] font-semibold">{money(s.price)}</p>
                            <ArrowRight size={12} className="ml-auto mt-1 text-faint transition group-hover:text-brand" />
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* step 1: date + time */}
            {step === 1 && service && (
              <div className="space-y-3">
                <div className="rounded-xl border border-line bg-surface p-3">
                  <p className="mb-2 text-[0.7rem] font-semibold">Choose a day</p>
                  <div className="flex gap-1.5 overflow-x-auto pb-1">
                    {days.map((d) => {
                      const active = d.date === date;
                      const full = d.count === 0;
                      return (
                        <button
                          key={d.date}
                          onClick={() => {
                            setDate(d.date);
                            setSlot(null);
                          }}
                          className={cn(
                            "flex min-w-[3.4rem] flex-col items-center rounded-lg border px-2 py-1.5 transition",
                            active ? "border-brand bg-brand text-white" : "border-line bg-surface hover:border-brand/40",
                            full && !active && "opacity-45"
                          )}
                        >
                          <span className={cn("text-[0.58rem] uppercase", active ? "text-white/70" : "text-faint")}>
                            {fmDateKey(d.date).split(",")[0]}
                          </span>
                          <span className="text-[0.85rem] font-semibold leading-tight">{d.date.slice(8)}</span>
                          <span className={cn("text-[0.5rem]", active ? "text-white/70" : "text-faint")}>
                            {full ? "full" : `${d.count} slots`}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="rounded-xl border border-line bg-surface p-3">
                  <div className="mb-2 flex items-center justify-between">
                    <p className="text-[0.7rem] font-semibold">{fmDateKey(date)}</p>
                    <p className="text-[0.62rem] text-faint">Times shown in SGT</p>
                  </div>
                  {isLoading ? (
                    <div className="grid grid-cols-4 gap-1.5">
                      {Array.from({ length: 9 }).map((_, i) => <Skeleton key={i} className="h-8" />)}
                    </div>
                  ) : slots.length === 0 ? (
                    <div className="py-6 text-center">
                      <p className="text-[0.8rem] font-medium">No availability on this day</p>
                      <p className="mt-0.5 text-[0.7rem] text-muted">Try another day — or call us on {BUSINESS.phone}.</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-4 gap-1.5 sm:grid-cols-5">
                      {slots.map((s) => (
                        <button
                          key={`${s.start_at}-${s.staff_id}`}
                          onClick={() => setSlot(s)}
                          className={cn(
                            "rounded-lg border px-1 py-1.5 text-[0.72rem] font-medium transition",
                            slot?.start_at === s.start_at && slot?.staff_id === s.staff_id
                              ? "border-brand bg-brand text-white"
                              : "border-line hover:border-brand/40 hover:bg-brand-soft/40"
                          )}
                        >
                          <span className="block tabular-nums">{s.time}</span>
                          <span className={cn("block truncate text-[0.55rem]", slot?.start_at === s.start_at ? "text-white/70" : "text-faint")}>
                            {s.staff_name.split(" ")[0]}
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* step 2: details */}
            {step === 2 && service && slot && (
              <div className="space-y-3 rounded-xl border border-line bg-surface p-4">
                <p className="text-[0.85rem] font-semibold">Your details</p>
                <div className="grid gap-2.5 sm:grid-cols-2">
                  <div>
                    <label className="label">Full name *</label>
                    <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" />
                  </div>
                  <div>
                    <label className="label">Phone</label>
                    <input className="input" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+65 8123 4567" />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="label">Email</label>
                    <input className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="label">Anything we should know?</label>
                    <textarea
                      className="input min-h-[70px] resize-none"
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="Allergies, first visit, running late…"
                    />
                  </div>
                </div>
                {error && <p className="rounded-lg bg-rose-50 px-2.5 py-1.5 text-[0.72rem] text-rose-700 dark:bg-rose-500/10 dark:text-rose-300">{error}</p>}
                <p className="flex items-start gap-1.5 text-[0.65rem] leading-relaxed text-faint">
                  <ShieldCheck size={11} className="mt-0.5 shrink-0 text-emerald-500" />
                  Your details are only used to manage this appointment. No card required to reserve.
                </p>
              </div>
            )}

            {/* step 3: confirmed */}
            {step === 3 && confirmed && service && slot && (
              <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-5 text-center dark:border-emerald-500/20 dark:bg-emerald-500/5">
                <CheckCircle2 size={34} className="mx-auto text-emerald-500" />
                <h2 className="mt-2 text-[1.1rem] font-semibold">You&apos;re booked{name ? `, ${name.split(" ")[0]}` : ""}!</h2>
                <p className="mt-1 text-[0.78rem] text-muted">
                  {service.name} · {fmtDate(slot.start_at)} at {fmtTime(slot.start_at)} with {slot.staff_name}
                </p>
                <p className="mt-2 inline-block rounded-lg border border-emerald-200 bg-white px-3 py-1 font-mono text-[0.72rem] font-semibold text-emerald-700 dark:border-emerald-500/20 dark:bg-white/5 dark:text-emerald-300">
                  {confirmed.id.toUpperCase()}
                </p>
                <p className="mt-2 text-[0.7rem] leading-relaxed text-muted">
                  We&apos;ve sent a confirmation{email ? ` to ${email}` : ""}. You can reschedule up to 24 hours before.
                </p>
                <div className="mt-3 flex justify-center gap-2">
                  <Button variant="outline" size="sm" onClick={() => window.location.reload()}>
                    Book another
                  </Button>
                  <a href={`tel:${BUSINESS.phone}`} className="btn btn-primary btn-sm">
                    Call the studio
                  </a>
                </div>
              </div>
            )}

            {/* nav buttons */}
            {step > 0 && step < 3 && (
              <div className="flex items-center justify-between">
                <Button variant="ghost" onClick={() => setStep(step - 1)} icon={<ArrowLeft size={13} />}>
                  Back
                </Button>
                {step === 1 && (
                  <Button variant="primary" onClick={() => setStep(2)} disabled={!slot} icon={<ArrowRight size={13} />}>
                    Continue
                  </Button>
                )}
                {step === 2 && (
                  <Button variant="primary" onClick={submit} loading={submitting} icon={<Check size={13} />}>
                    Confirm booking
                  </Button>
                )}
              </div>
            )}
          </div>

          {/* summary */}
          <aside className="h-fit space-y-3 lg:sticky lg:top-20">
            <div className="rounded-xl border border-line bg-surface p-4">
              <p className="text-[0.66rem] font-semibold uppercase tracking-wide text-faint">Your appointment</p>
              {service ? (
                <div className="mt-2 space-y-2">
                  <div className="flex items-start gap-2">
                    <span className="mt-1 h-2 w-2 shrink-0 rounded-full" style={{ background: service.color }} />
                    <div className="min-w-0">
                      <p className="text-[0.8rem] font-medium">{service.name}</p>
                      <p className="text-[0.65rem] text-faint">{durationLabel(service.duration_min)} · {service.category}</p>
                    </div>
                  </div>
                  {service.description && <p className="text-[0.68rem] leading-relaxed text-muted">{service.description}</p>}
                  <div className="space-y-1 border-t border-line pt-2 text-[0.7rem]">
                    <p className="flex justify-between"><span className="text-muted">Date</span><span className="font-medium">{step >= 1 && slot ? fmtDate(slot.start_at) : "Not selected"}</span></p>
                    <p className="flex justify-between"><span className="text-muted">Time</span><span className="font-medium">{slot ? fmtTime(slot.start_at) : "—"}</span></p>
                    <p className="flex justify-between"><span className="text-muted">Specialist</span><span className="font-medium">{slot?.staff_name ?? "Any available"}</span></p>
                  </div>
                  <div className="flex items-center justify-between border-t border-line pt-2">
                    <span className="text-[0.72rem] font-medium">Total</span>
                    <span className="text-[1rem] font-semibold">{money(service.price)}</span>
                  </div>
                </div>
              ) : (
                <p className="mt-2 text-[0.72rem] text-faint">Pick a treatment to get started.</p>
              )}
            </div>

            <div className="rounded-xl border border-line bg-surface p-4">
              <p className="flex items-center gap-1.5 text-[0.72rem] font-semibold">
                <Sparkles size={12} className="text-brand" /> Why book online?
              </p>
              <ul className="mt-2 space-y-1.5 text-[0.68rem] text-muted">
                {[
                  "Instant confirmation, no waiting for a reply",
                  "Free reschedule up to 24 hours before",
                  "SMS reminder the day before",
                  "Loyalty points on every visit",
                ].map((t) => (
                  <li key={t} className="flex items-start gap-1.5">
                    <Check size={10} className="mt-1 shrink-0 text-emerald-500" />
                    {t}
                  </li>
                ))}
              </ul>
            </div>

            <div className="rounded-xl border border-line bg-surface p-4">
              <div className="flex items-center gap-1.5">
                <Stars rating={4.8} size={11} />
                <span className="text-[0.7rem] font-semibold">4.8</span>
                <span className="text-[0.65rem] text-faint">· 912 reviews</span>
              </div>
              <p className="mt-1.5 text-[0.68rem] italic leading-relaxed text-muted">
                “Booked in 40 seconds and got a reminder the night before. Easiest appointment
                I&apos;ve ever made.”
              </p>
              <div className="mt-2 flex items-center gap-1.5 text-[0.62rem] text-faint">
                <User size={10} /> Aisha R. · verified client
              </div>
            </div>

            <div className="rounded-xl border border-line bg-surface p-3 text-[0.65rem] text-muted">
              <p className="flex items-center gap-1.5"><Mail size={10} /> {BUSINESS.email}</p>
              <p className="mt-1 flex items-center gap-1.5"><Phone size={10} /> {BUSINESS.phone}</p>
              <p className="mt-1 flex items-start gap-1.5"><MapPin size={10} className="mt-0.5" /> {BUSINESS.address}</p>
            </div>
          </aside>
        </div>
      </div>

      <footer className="border-t border-line px-4 py-4 text-center text-[0.62rem] text-faint">
        Powered by <span className="font-semibold text-muted">Slotly</span> · bookings, payments and reminders in one place
      </footer>
    </div>
  );
}
