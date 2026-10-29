"use client";

import { BookingBars } from "@/components/charts";
import {
  Avatar, Badge, Button, Card, CardHeader, EmptyState, Progress, Segmented, Skeleton, Stars,
} from "@/components/ui/primitives";
import { useToast } from "@/components/ui/toast";
import { BookingModal } from "@/components/dashboard/booking-modal";
import { api } from "@/lib/fetcher";
import type { FollowUp, Insight } from "@/lib/ai";
import { cn, fmtDate, fmtTime, money, titleCase } from "@/lib/utils";
import {
  ArrowRight, ArrowUpRight, Brain, CalendarClock, Check, ChevronRight, Clock, Lightbulb,
  Loader2, MessageSquare, Send, Sparkles, Target, TrendingUp, Users, Wand2, Zap,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";

type Block =
  | { type: "text"; text: string }
  | { type: "metrics"; items: { label: string; value: string; delta?: number }[] }
  | { type: "list"; items: { title: string; subtitle?: string; meta?: string; href?: string }[] }
  | { type: "slots"; items: { time: string; staff: string; color?: string | null; date: string; start_at: string }[] }
  | { type: "bars"; items: { label: string; value: number; display: string; color?: string }[] }
  | { type: "action"; label: string; href: string }
  | { type: "note"; text: string };

type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  text?: string;
  blocks?: Block[];
  suggestions?: string[];
  pending?: boolean;
};

type InsightData = Insight & { metric?: { value: string; label: string } };
type Risk = {
  id: string; customer_name: string; service_name: string; staff_name: string;
  start_at: string; price: number; risk: number; band: string; drivers: string[];
};
type ForecastDay = {
  date: string; label: string; weekday: string; predicted: number; capacity: number;
  demandPct: number; staffNeeded: number; level: "high" | "healthy" | "low";
};
type ForecastPayload = {
  forecast: ForecastDay[];
  trend: number;
  avgDaily: number;
  recommendations: { date: string; label: string; weekday: string; level: string; headline: string; detail: string; action: { label: string; href: string } }[];
};
type Candidate = {
  staff_id: string; name: string; title: string; color: string; rating: number;
  score: number; available: boolean; bookingsToday: number; reasons: string[];
};

const STARTERS = [
  "When is Ava free for a balayage this Saturday?",
  "How much revenue did we make in the last 30 days?",
  "Which services are most popular?",
  "Who are my top performers?",
  "Which clients haven't visited in 60 days?",
  "What's on tomorrow?",
];

export function AiStudio({
  insights,
  risk,
  forecast,
  followUps,
  services,
  staff,
}: {
  insights: InsightData[];
  risk: Risk[];
  forecast: ForecastPayload;
  followUps: FollowUp[];
  services: { id: string; name: string; category: string; duration_min: number }[];
  staff: { id: string; name: string; avatar_color: string | null }[];
}) {
  const toast = useToast();
  const [tab, setTab] = useState<"assistant" | "forecast" | "assign" | "followups" | "insights">("assistant");
  const [slotDraft, setSlotDraft] = useState<{ date: string; startAt: string } | null>(null);

  /* ---------------------------------------------------------- assistant */
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "hello",
      role: "assistant",
      blocks: [
        { type: "text", text: "Hi Mamon 👋 I'm your scheduling co-pilot. I can check live availability, explain your numbers, or draft messages for your clients." },
        { type: "note", text: "Try one of the prompts below — or ask me anything about your calendar." },
      ],
      suggestions: STARTERS.slice(0, 3),
    },
  ]);
  const [input, setInput] = useState("");
  const [thinking, setThinking] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, thinking]);

  async function ask(text: string) {
    if (!text.trim() || thinking) return;
    const id = String(Date.now());
    setMessages((prev) => [...prev, { id, role: "user", text }]);
    setInput("");
    setThinking(true);
    try {
      const res = await api<{ reply: { blocks: Block[]; suggestions: string[] } }>("/api/ai/assistant", "POST", { message: text });
      setMessages((prev) => [
        ...prev,
        { id: `${id}-a`, role: "assistant", blocks: res.reply.blocks, suggestions: res.reply.suggestions },
      ]);
    } catch (e) {
      setMessages((prev) => [
        ...prev,
        { id: `${id}-err`, role: "assistant", blocks: [{ type: "text", text: e instanceof Error ? e.message : "Something went wrong — please try again." }] },
      ]);
    } finally {
      setThinking(false);
    }
  }

  /* ---------------------------------------------------------- assignment */
  const [serviceId, setServiceId] = useState(services[0]?.id ?? "");
  const [startAt, setStartAt] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    d.setHours(14, 0, 0, 0);
    return d.toISOString().slice(0, 16);
  });
  const [assigning, setAssigning] = useState(false);
  const [assignment, setAssignment] = useState<{ candidates: Candidate[]; best: Candidate; rationale: string } | null>(null);

  async function assign() {
    setAssigning(true);
    try {
      const res = await api<{ candidates: Candidate[]; best: Candidate; rationale: string }>("/api/ai/assignment", "POST", {
        service_id: serviceId,
        start_at: new Date(`${startAt}:00+08:00`).toISOString(),
      });
      setAssignment(res);
    } catch (e) {
      toast.error("Assignment failed", e instanceof Error ? e.message : undefined);
    } finally {
      setAssigning(false);
    }
  }

  /* ---------------------------------------------------------- follow-ups */
  const [queued, setQueued] = useState<string[]>([]);
  const [queueing, setQueueing] = useState(false);

  async function queueAll(ids?: string[]) {
    setQueueing(true);
    const targets = ids ?? followUps.map((f) => f.id);
    setQueued((prev) => Array.from(new Set([...prev, ...targets])));
    try {
      await api("/api/ai/followups", "POST", { ids: targets });
      toast.success("Follow-ups queued", `${targets.length} personalised messages scheduled.`);
    } catch (e) {
      setQueued((prev) => prev.filter((q) => !targets.includes(q)));
      toast.error("Couldn't queue", e instanceof Error ? e.message : undefined);
    } finally {
      setQueueing(false);
    }
  }

  const tabs = [
    { key: "assistant", label: "Assistant", icon: <MessageSquare size={12} /> },
    { key: "forecast", label: "Demand forecast", icon: <TrendingUp size={12} /> },
    { key: "assign", label: "Smart assignment", icon: <Wand2 size={12} /> },
    { key: "followups", label: "Follow-ups", icon: <Send size={12} /> },
    { key: "insights", label: "Insights", icon: <Lightbulb size={12} /> },
  ] as const;

  return (
    <>
    <div className="space-y-4">
      <Card className="flex flex-wrap items-center gap-3 overflow-hidden p-3">
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-violet-500 to-fuchsia-500 text-white">
          <Brain size={15} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[0.8rem] font-semibold">Slotly Intelligence</p>
          <p className="text-[0.68rem] text-muted">
            Trained on your bookings, clients and payments · {forecast.trend >= 0 ? "demand up" : "demand down"} {Math.abs(forecast.trend)}% · {risk.filter((r) => r.band === "high").length} high-risk no-shows flagged
          </p>
        </div>
        <Badge tone="paid" className="gap-1"><Sparkles size={9} /> Premium</Badge>
      </Card>

      <div className="flex flex-wrap items-center gap-1">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={cn(
              "flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[0.72rem] font-medium transition",
              tab === t.key ? "bg-brand-soft text-brand-ink" : "text-muted hover:bg-surface-3 hover:text-ink"
            )}
          >
            {t.icon}
            {t.label}
          </button>
        ))}
      </div>

      {/* -------------------------------------------------- assistant */}
      {tab === "assistant" && (
        <div className="grid gap-4 lg:grid-cols-[1.6fr_1fr]">
          <Card className="flex h-[34rem] flex-col overflow-hidden">
            <div ref={scrollRef} className="flex-1 space-y-4 overflow-y-auto p-4">
              {messages.map((m) => (
                <div key={m.id} className={cn("flex gap-2.5", m.role === "user" && "justify-end")}>
                  {m.role === "assistant" && (
                    <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-violet-500 to-fuchsia-500 text-white">
                      <Sparkles size={11} />
                    </span>
                  )}
                  <div className={cn("max-w-[85%] space-y-2", m.role === "user" && "max-w-[75%]")}>
                    {m.text && (
                      <div className={cn("rounded-xl px-3 py-2 text-[0.78rem] leading-relaxed", m.role === "user" ? "bg-brand text-white" : "bg-surface-2")}>
                        {m.text}
                      </div>
                    )}
                    {m.blocks?.map((b, i) => (
                      <AssistantBlock
                        key={i}
                        block={b}
                        onSlot={(slot) => setSlotDraft({ date: slot.date, startAt: slot.start_at })}
                      />
                    ))}
                    {m.suggestions && m.suggestions.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {m.suggestions.map((s) => (
                          <button
                            key={s}
                            onClick={() => ask(s)}
                            className="rounded-full border border-line bg-surface px-2.5 py-1 text-[0.66rem] font-medium text-muted transition hover:border-brand/40 hover:text-brand-ink"
                          >
                            {s}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}
              {thinking && (
                <div className="flex items-center gap-2 text-[0.72rem] text-faint">
                  <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-brand-soft text-brand">
                    <Loader2 size={11} className="animate-spin" />
                  </span>
                  Checking your calendar…
                </div>
              )}
            </div>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                ask(input);
              }}
              className="flex items-center gap-2 border-t border-line p-2.5"
            >
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask about availability, revenue, clients…"
                className="input h-9 flex-1"
              />
              <Button type="submit" variant="primary" size="sm" loading={thinking} icon={<Send size={12} />}>
                Send
              </Button>
            </form>
          </Card>

          <div className="space-y-3">
            <Card>
              <CardHeader title="No-show risk" subtitle="Upcoming appointments" icon={<Target size={14} />} />
              <div className="border-t border-line">
                {risk.slice(0, 5).map((r) => (
                  <div key={r.id} className="flex items-center gap-2 border-b border-line/60 px-3.5 py-2 last:border-b-0">
                    <Avatar name={r.customer_name} size={24} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[0.72rem] font-medium">{r.customer_name}</p>
                      <p className="truncate text-[0.6rem] text-faint">
                        {fmtDate(r.start_at)} {fmtTime(r.start_at)} · {r.service_name}
                      </p>
                    </div>
                    <Badge tone={r.band} className="!px-1.5">{r.risk}%</Badge>
                  </div>
                ))}
              </div>
            </Card>

            <Card>
              <CardHeader title="Quick actions" icon={<Zap size={14} />} />
              <div className="space-y-1 border-t border-line p-2">
                {[
                  { label: "Find an opening this week", prompt: "What slots are available this week?" },
                  { label: "Summarise today", prompt: "What's on today?" },
                  { label: "Who needs re-engagement?", prompt: "Which clients haven't visited in 60 days?" },
                  { label: "Top services by revenue", prompt: "Which services are most popular?" },
                ].map((a) => (
                  <button
                    key={a.label}
                    onClick={() => ask(a.prompt)}
                    className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-[0.72rem] text-muted transition hover:bg-surface-2 hover:text-ink"
                  >
                    <ChevronRight size={11} className="text-faint" />
                    {a.label}
                  </button>
                ))}
              </div>
            </Card>
          </div>
        </div>
      )}

      {/* -------------------------------------------------- forecast */}
      {tab === "forecast" && (
        <div className="grid gap-4 lg:grid-cols-3">
          <Card className="lg:col-span-2">
            <CardHeader
              title="14-day demand forecast"
              subtitle={`Seasonal-naive model · ${forecast.avgDaily} bookings/day predicted · ${forecast.trend >= 0 ? "+" : ""}${forecast.trend}% trend`}
              icon={<TrendingUp size={15} />}
            />
            <div className="px-1 pb-2">
              <BookingBars data={forecast.forecast.map((d) => ({ label: d.label, bookings: d.predicted }))} height={230} />
            </div>
            <div className="grid grid-cols-7 gap-1 border-t border-line p-2">
              {forecast.forecast.slice(0, 14).map((d) => (
                <div
                  key={d.date}
                  title={`${d.label}: ${d.predicted} predicted (${d.demandPct}% of capacity)`}
                  className={cn(
                    "rounded-lg px-1 py-1.5 text-center",
                    d.level === "high" ? "bg-rose-50 dark:bg-rose-500/10" : d.level === "low" ? "bg-amber-50 dark:bg-amber-500/10" : "bg-emerald-50 dark:bg-emerald-500/10"
                  )}
                >
                  <p className="text-[0.55rem] uppercase text-faint">{d.weekday}</p>
                  <p className="text-[0.72rem] font-semibold">{d.predicted}</p>
                  <p className="text-[0.5rem] text-faint">{d.demandPct}%</p>
                </div>
              ))}
            </div>
          </Card>

          <Card>
            <CardHeader title="Recommendations" subtitle="Where to focus staffing" icon={<Sparkles size={14} />} />
            <div className="divide-y divide-line border-t border-line">
              {forecast.recommendations.map((r) => (
                <div key={r.date} className="p-3">
                  <div className="flex items-center gap-1.5">
                    <Badge tone={r.level}>{r.weekday}</Badge>
                    <p className="text-[0.75rem] font-semibold">{r.headline}</p>
                  </div>
                  <p className="mt-1 text-[0.68rem] leading-relaxed text-muted">{r.detail}</p>
                  <a href={r.action.href} className="mt-1 inline-flex items-center gap-0.5 text-[0.68rem] font-medium text-brand hover:underline">
                    {r.action.label} <ArrowUpRight size={10} />
                  </a>
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}

      {/* -------------------------------------------------- assignment */}
      {tab === "assign" && (
        <div className="grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
          <Card>
            <CardHeader title="Smart staff assignment" subtitle="Match the right specialist to any slot" icon={<Wand2 size={15} />} />
            <div className="space-y-3 border-t border-line p-4">
              <div>
                <label className="label">Service</label>
                <select className="input" value={serviceId} onChange={(e) => setServiceId(e.target.value)}>
                  {services.map((s) => (
                    <option key={s.id} value={s.id}>{s.name} · {s.duration_min} min</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label">Proposed start (SGT)</label>
                <input type="datetime-local" className="input" value={startAt} onChange={(e) => setStartAt(e.target.value)} />
              </div>
              <Button variant="primary" className="w-full" onClick={assign} loading={assigning} icon={<Sparkles size={13} />}>
                Score the team
              </Button>
              <p className="flex items-start gap-1.5 text-[0.65rem] leading-relaxed text-faint">
                <Sparkles size={10} className="mt-0.5 shrink-0 text-brand" />
                Scores weigh availability, skill fit, rating, current day load and customer history.
              </p>
            </div>
          </Card>

          <Card>
            <CardHeader title="Ranked matches" subtitle={assignment ? "Best fit first" : "Run a match to see results"} icon={<Users size={15} />} />
            <div className="border-t border-line">
              {!assignment ? (
                <EmptyState
                  compact
                  icon={<Wand2 size={18} />}
                  title="No match yet"
                  description="Pick a service and time, then let the assistant rank your team."
                />
              ) : (
                <>
                  <div className="border-b border-line bg-brand-soft/40 p-3">
                    <p className="text-[0.68rem] font-semibold uppercase tracking-wide text-brand-ink">Recommendation</p>
                    <p className="mt-1 text-[0.75rem] leading-relaxed">{assignment.rationale}</p>
                  </div>
                  {assignment.candidates.map((c, i) => (
                    <div key={c.staff_id} className="flex items-center gap-2.5 border-b border-line/60 px-4 py-2.5 last:border-b-0">
                      <span className="w-4 text-[0.68rem] font-semibold text-faint">{i + 1}</span>
                      <Avatar name={c.name} size={28} color={c.color} />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <p className="truncate text-[0.76rem] font-medium">{c.name}</p>
                          {i === 0 && c.available && <Badge tone="paid">Best match</Badge>}
                          {!c.available && <Badge tone="cancelled">Unavailable</Badge>}
                        </div>
                        <p className="truncate text-[0.62rem] text-faint">{c.reasons.join(" · ")}</p>
                      </div>
                      <div className="w-16">
                        <Progress value={Math.max(4, Math.min(100, c.score))} height={4} color={c.color} />
                        <p className="mt-0.5 text-right text-[0.58rem] text-faint">{c.score} pts</p>
                      </div>
                    </div>
                  ))}
                </>
              )}
            </div>
          </Card>
        </div>
      )}

      {/* -------------------------------------------------- follow-ups */}
      {tab === "followups" && (
        <div className="space-y-3">
          <Card className="flex flex-wrap items-center gap-3 p-3.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-soft text-brand"><Send size={14} /></span>
            <div className="min-w-0 flex-1">
              <p className="text-[0.8rem] font-semibold">{followUps.length} follow-ups ready to send</p>
              <p className="text-[0.68rem] text-muted">
                {followUps.filter((f) => f.type === "win_back").length} win-backs ·{" "}
                {followUps.filter((f) => f.type === "review_request").length} review requests ·{" "}
                {followUps.filter((f) => f.type === "reminder").length} reminders
              </p>
            </div>
            <Button variant="primary" size="sm" onClick={() => queueAll()} loading={queueing} icon={<Send size={12} />}>
              Queue all
            </Button>
          </Card>

          {followUps.map((f) => (
            <Card key={f.id} className="p-3.5">
              <div className="flex flex-wrap items-center gap-2">
                <Badge tone={f.type === "win_back" ? "pending" : f.type === "review_request" ? "offered" : "confirmed"}>
                  {titleCase(f.type)}
                </Badge>
                <p className="text-[0.78rem] font-semibold">{f.customer_name}</p>
                <span className="text-[0.64rem] text-faint">via {f.channel} · due {f.due}</span>
                {f.value > 0 && <span className="text-[0.64rem] font-medium text-emerald-600 dark:text-emerald-400">≈ {money(f.value)} value</span>}
                <div className="ml-auto">
                  {queued.includes(f.id) ? (
                    <Badge tone="paid" className="gap-1"><Check size={9} /> Queued</Badge>
                  ) : (
                    <Button size="sm" variant="ghost" onClick={() => queueAll([f.id])} icon={<Send size={11} />}>
                      Queue
                    </Button>
                  )}
                </div>
              </div>
              <p className="mt-1 text-[0.65rem] text-faint">{f.reason}</p>
              <div className="mt-2 rounded-lg border-l-2 border-brand/40 bg-surface-2 px-2.5 py-2 text-[0.72rem] leading-relaxed text-muted">
                {f.message}
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* -------------------------------------------------- insights */}
      {tab === "insights" && (
        <div className="grid gap-3 md:grid-cols-2">
          {insights.map((i) => (
            <Card key={i.id} className="flex flex-col p-4">
              <div className="flex items-start gap-2.5">
                <span
                  className={cn(
                    "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg",
                    i.severity === "warning"
                      ? "bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400"
                      : i.severity === "win"
                        ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400"
                        : "bg-brand-soft text-brand"
                  )}
                >
                  {i.severity === "warning" ? "!" : i.severity === "win" ? "✓" : "✦"}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-[0.82rem] font-semibold">{i.title}</p>
                    <Badge tone="neutral" className="!border-brand/20 !bg-brand-soft !text-brand-ink">{i.impact}</Badge>
                  </div>
                  <p className="mt-1 text-[0.74rem] leading-relaxed text-muted">{i.detail}</p>
                </div>
              </div>
              <div className="mt-auto flex items-center justify-between pt-3">
                {i.metric && (
                  <div>
                    <p className="text-[1.05rem] font-semibold leading-none">{i.metric.value}</p>
                    <p className="text-[0.6rem] text-faint">{i.metric.label}</p>
                  </div>
                )}
                {i.action && (
                  <a href={i.action.href} className="inline-flex items-center gap-0.5 text-[0.72rem] font-medium text-brand hover:underline">
                    {i.action.label} <ArrowRight size={11} />
                  </a>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}
      </div>

      <BookingModal
        open={Boolean(slotDraft)}
        onClose={() => setSlotDraft(null)}
        defaults={{ date: slotDraft?.date, startAt: slotDraft?.startAt }}
      />
    </>
  );
}

function AssistantBlock({ block, onSlot }: { block: Block; onSlot: (slot: { staff: string; date: string; time: string; start_at: string }) => void }) {
  if (block.type === "text") {
    const html = block.text.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
    return <p className="rounded-xl bg-surface-2 px-3 py-2 text-[0.78rem] leading-relaxed" dangerouslySetInnerHTML={{ __html: html }} />;
  }
  if (block.type === "note") {
    return <p className="px-1 text-[0.68rem] leading-relaxed text-faint">{block.text}</p>;
  }
  if (block.type === "metrics") {
    return (
      <div className="grid grid-cols-2 gap-1.5">
        {block.items.map((m) => (
          <div key={m.label} className="rounded-lg border border-line bg-surface px-2 py-1.5">
            <p className="text-[0.55rem] uppercase tracking-wide text-faint">{m.label}</p>
            <p className="text-[0.8rem] font-semibold">{m.value}</p>
          </div>
        ))}
      </div>
    );
  }
  if (block.type === "list") {
    return (
      <div className="overflow-hidden rounded-xl border border-line bg-surface">
        {block.items.map((item, i) => (
          <div key={`${item.title}-${i}`} className={cn("flex items-center gap-2 px-2.5 py-1.5", i > 0 && "border-t border-line/60")}>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[0.72rem] font-medium">{item.title}</p>
              {item.subtitle && <p className="truncate text-[0.62rem] text-faint">{item.subtitle}</p>}
            </div>
            {item.meta && <span className="shrink-0 text-[0.6rem] capitalize text-faint">{item.meta}</span>}
          </div>
        ))}
      </div>
    );
  }
  if (block.type === "slots") {
    return (
      <div className="flex flex-wrap gap-1.5">
        {block.items.map((s) => (
          <button
            key={`${s.start_at}-${s.staff}`}
            onClick={() => onSlot({ staff: s.staff, date: s.date, time: s.time, start_at: s.start_at })}
            className="flex items-center gap-1.5 rounded-lg border border-line bg-surface px-2 py-1 text-[0.7rem] font-medium transition hover:border-brand/40 hover:bg-brand-soft/40"
          >
            <span className="h-1.5 w-1.5 rounded-full" style={{ background: s.color ?? "var(--brand)" }} />
            {s.time}
            <span className="text-[0.6rem] text-faint">{s.staff.split(" ")[0]}</span>
          </button>
        ))}
      </div>
    );
  }
  if (block.type === "bars") {
    const max = Math.max(...block.items.map((i) => i.value), 1);
    return (
      <div className="space-y-1.5 rounded-xl border border-line bg-surface p-2.5">
        {block.items.map((i) => (
          <div key={i.label}>
            <div className="flex justify-between text-[0.65rem]">
              <span className="truncate text-muted">{i.label}</span>
              <span className="font-semibold">{i.display}</span>
            </div>
            <Progress value={(i.value / max) * 100} height={3} color={i.color} className="mt-0.5" />
          </div>
        ))}
      </div>
    );
  }
  if (block.type === "action") {
    return (
      <a href={block.href} className="inline-flex items-center gap-1 rounded-lg bg-brand px-2.5 py-1.5 text-[0.7rem] font-semibold text-white transition hover:bg-brand-hover">
        {block.label} <ArrowRight size={11} />
      </a>
    );
  }
  return null;
}
