"use client";

import {
  Avatar, Badge, Button, Card, CardHeader, EmptyState, Progress, Stars,
} from "@/components/ui/primitives";
import { Modal } from "@/components/ui/modal";
import { useToast } from "@/components/ui/toast";
import { api } from "@/lib/fetcher";
import type { Review } from "@/lib/types";
import { cn, fmtDate, parseJson, relativeTime } from "@/lib/utils";
import { MessageCircle, MessageSquare, Search, Send, Star, ThumbsUp, Trash2 } from "lucide-react";
import { useState } from "react";

type Summary = {
  average: number;
  count: number;
  unreplied: number;
  distribution: { star: number; count: number }[];
};

export function ReviewsClient({ initial, summary: initialSummary }: { initial: Review[]; summary: Summary }) {
  const toast = useToast();
  const [items, setItems] = useState(initial);
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<"all" | "unreplied" | "5" | "4" | "3">("all");
  const [replyTo, setReplyTo] = useState<Review | null>(null);
  const [replyText, setReplyText] = useState("");
  const [saving, setSaving] = useState(false);

  const filtered = items.filter((r) => {
    if (q && !(`${r.customer_name} ${r.comment ?? ""}`.toLowerCase().includes(q.toLowerCase()))) return false;
    if (filter === "unreplied") return !r.reply;
    if (filter === "5") return r.rating === 5;
    if (filter === "4") return r.rating === 4;
    if (filter === "3") return r.rating <= 3;
    return true;
  });

  const avg = items.length ? items.reduce((a, b) => a + b.rating, 0) / items.length : 0;
  const distribution = [5, 4, 3, 2, 1].map((star) => ({
    star,
    count: items.filter((r) => r.rating === star).length,
  }));

  async function submitReply() {
    if (!replyTo) return;
    setSaving(true);
    const snapshot = items;
    setItems((prev) => prev.map((r) => (r.id === replyTo.id ? { ...r, reply: replyText } : r)));
    try {
      await api(`/api/reviews/${replyTo.id}`, "PATCH", { reply: replyText });
      toast.success("Reply published", `Your response to ${replyTo.customer_name} is live.`);
      setReplyTo(null);
      setReplyText("");
    } catch (e) {
      setItems(snapshot);
      toast.error("Couldn't publish reply", e instanceof Error ? e.message : undefined);
    } finally {
      setSaving(false);
    }
  }

  async function remove(r: Review) {
    const snapshot = items;
    setItems((prev) => prev.filter((x) => x.id !== r.id));
    try {
      await api(`/api/reviews/${r.id}`, "DELETE");
      toast.success("Review removed");
    } catch (e) {
      setItems(snapshot);
      toast.error("Couldn't remove review", e instanceof Error ? e.message : undefined);
    }
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="p-4 lg:col-span-1">
          <div className="flex items-center gap-4">
            <div className="text-center">
              <p className="text-[2.4rem] font-semibold leading-none tracking-[-0.03em]">{avg.toFixed(1)}</p>
              <Stars rating={avg} size={12} />
              <p className="mt-1 text-[0.62rem] text-faint">{items.length} reviews</p>
            </div>
            <div className="flex-1 space-y-1">
              {distribution.map((d) => (
                <div key={d.star} className="flex items-center gap-1.5">
                  <span className="w-2 text-[0.6rem] text-faint">{d.star}</span>
                  <Progress value={(d.count / Math.max(1, items.length)) * 100} height={4} color="#f59e0b" />
                  <span className="w-5 text-right text-[0.58rem] text-faint">{d.count}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2 border-t border-line pt-3 text-center">
            <div>
              <p className="text-[0.9rem] font-semibold">{items.filter((r) => r.reply).length}</p>
              <p className="text-[0.6rem] text-faint">replied</p>
            </div>
            <div>
              <p className="text-[0.9rem] font-semibold text-amber-600">{initialSummary.unreplied}</p>
              <p className="text-[0.6rem] text-faint">awaiting reply</p>
            </div>
          </div>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader
            title="What clients are saying"
            subtitle="Public reviews after completed appointments"
            icon={<Star size={15} />}
            action={
              <div className="flex items-center gap-1.5">
                <div className="relative">
                  <Search size={13} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-faint" />
                  <input
                    value={q}
                    onChange={(e) => setQ(e.target.value)}
                    className="input h-8 w-40 pl-7 text-[0.72rem]"
                    placeholder="Search reviews…"
                  />
                </div>
                <select className="input h-8 w-auto text-[0.72rem]" value={filter} onChange={(e) => setFilter(e.target.value as typeof filter)}>
                  <option value="all">All</option>
                  <option value="unreplied">Needs reply</option>
                  <option value="5">5 stars</option>
                  <option value="4">4 stars</option>
                  <option value="3">3 stars & under</option>
                </select>
              </div>
            }
          />
          <div className="max-h-[32rem] divide-y divide-line overflow-y-auto border-t border-line">
            {filtered.length === 0 ? (
              <EmptyState compact icon={<MessageSquare size={18} />} title="No reviews match" description="Try clearing the filter or search." />
            ) : (
              filtered.slice(0, 50).map((r) => (
                <div key={r.id} className="p-3.5">
                  <div className="flex items-start gap-2.5">
                    <Avatar name={r.customer_name} size={30} />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-[0.78rem] font-medium">{r.customer_name}</p>
                        <Stars rating={r.rating} size={10} />
                        <span className="text-[0.62rem] text-faint">{relativeTime(r.created_at)}</span>
                        {!r.reply && <Badge tone="pending">Needs reply</Badge>}
                      </div>
                      <p className="mt-0.5 text-[0.64rem] text-faint">
                        {r.service_name ?? "Service"} · {r.staff_name ?? "Team"} · {fmtDate(r.created_at)}
                      </p>
                      <p className="mt-1.5 text-[0.78rem] leading-relaxed">{r.comment}</p>
                      <div className="mt-1.5 flex flex-wrap items-center gap-1">
                        {parseJson<string[]>(r.tags, []).map((t) => (
                          <Badge key={t} tone="neutral">{t}</Badge>
                        ))}
                      </div>

                      {r.reply ? (
                        <div className="mt-2 rounded-lg border-l-2 border-brand/40 bg-surface-2 px-2.5 py-2">
                          <p className="text-[0.6rem] font-semibold uppercase tracking-wide text-faint">Your reply</p>
                          <p className="mt-0.5 text-[0.72rem] leading-relaxed text-muted">{r.reply}</p>
                        </div>
                      ) : null}
                    </div>
                    <div className="flex flex-col gap-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          setReplyTo(r);
                          setReplyText(r.reply ?? "");
                        }}
                        icon={<MessageCircle size={11} />}
                      >
                        {r.reply ? "Edit" : "Reply"}
                      </Button>
                      <button
                        onClick={() => remove(r)}
                        className="self-end rounded-lg p-1.5 text-faint transition hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-500/10"
                        aria-label="Delete review"
                      >
                        <Trash2 size={11} />
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {[
          { icon: <ThumbsUp size={14} />, title: "Fast replies win loyalty", text: "Replying within 24 hours correlates with a 12% higher rebooking rate." },
          { icon: <Star size={14} />, title: "5★ drivers", text: "Your top tags are “friendly”, “results” and “relaxing” — lean into those in marketing." },
          { icon: <MessageSquare size={14} />, title: "Quietly unsatisfied", text: "3★ reviews mention timing. Consider adding a 10-minute buffer on colour services." },
        ].map((c) => (
          <Card key={c.title} className="flex gap-2.5 p-3.5">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-brand-soft text-brand">{c.icon}</span>
            <div>
              <p className="text-[0.76rem] font-semibold">{c.title}</p>
              <p className="mt-0.5 text-[0.68rem] leading-relaxed text-muted">{c.text}</p>
            </div>
          </Card>
        ))}
      </div>

      <Modal
        open={Boolean(replyTo)}
        onClose={() => setReplyTo(null)}
        size="md"
        title={`Reply to ${replyTo?.customer_name ?? ""}`}
        description={replyTo ? `${replyTo.rating}★ · ${replyTo.service_name ?? "Service"}` : ""}
        footer={
          <>
            <Button variant="ghost" onClick={() => setReplyTo(null)}>Cancel</Button>
            <Button variant="primary" onClick={submitReply} loading={saving} icon={<Send size={13} />}>
              Publish reply
            </Button>
          </>
        }
      >
        <div className="space-y-3">
          <div className="rounded-lg bg-surface-2 p-2.5">
            <Stars rating={replyTo?.rating ?? 5} size={11} />
            <p className="mt-1 text-[0.75rem] italic leading-relaxed text-muted">“{replyTo?.comment}”</p>
          </div>
          <div>
            <label className="label">Your response</label>
            <textarea
              className="input min-h-[110px] resize-y"
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              placeholder="Thank you so much for the kind words…"
            />
          </div>
          <div className="flex flex-wrap gap-1.5">
            {["Thank you so much for the kind words — we can't wait to see you again!", "We really appreciate the feedback and have shared it with the team."].map((t) => (
              <button
                key={t}
                onClick={() => setReplyText(t)}
                className={cn("rounded-lg border border-line px-2 py-1 text-[0.65rem] text-muted transition hover:border-brand/40 hover:text-ink")}
              >
                {t.slice(0, 42)}…
              </button>
            ))}
          </div>
        </div>
      </Modal>
    </div>
  );
}
