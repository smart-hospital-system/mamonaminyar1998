"use client";

import { ArrowRight, CornerDownLeft, Loader2, Sparkles } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { useLang } from "@/components/hms/lang-provider";
import type { AskAnswer } from "@/lib/hms/ask";

/**
 * The Ask panel. Every question goes to /api/hms/ask, which reads the local
 * database — so the answer arrives in well under a second, in either language,
 * with the hospital's internet connection switched off.
 */

type Turn = { q: string; a: AskAnswer };

export function AskPanel({ initial, suggestions }: { initial: Turn | null; suggestions: { label: string; q: string }[] }) {
  const { tx, lang } = useLang();
  const [q, setQ] = useState("");
  const [turns, setTurns] = useState<Turn[]>(initial ? [initial] : []);
  const [busy, setBusy] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [turns]);

  const ask = useCallback(
    async (question: string) => {
      const text = question.trim();
      if (!text || busy) return;
      setBusy(true);
      setQ("");
      try {
        const res = await fetch(`/api/hms/ask?q=${encodeURIComponent(text)}`);
        const data = await res.json();
        if (data.answer) setTurns((list) => [...list, { q: text, a: data.answer as AskAnswer }]);
      } catch {
        /* the panel stays usable; the next question retries */
      } finally {
        setBusy(false);
        inputRef.current?.focus();
      }
    },
    [busy]
  );

  const last = turns[turns.length - 1];

  return (
    <div className="space-y-3">
      {/* ------------------------------------------------------------- hero */}
      <div className="hms-hero p-4 anim-rise">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="max-w-xl">
            <p className="hms-eyebrow">{tx("Ask Aybek", "از ایبک بپرسید")}</p>
            <h2 className="hms-hero-title mt-1">
              {tx("Ask the hospital a question. It answers from its own records.", "از شفاخانه بپرسید. از سوابق خودش جواب می‌دهد.")}
            </h2>
            <p className="mt-1 text-[0.72rem] leading-relaxed" style={{ color: "var(--hms-muted)" }}>
              {tx(
                "Plain English or Dari. No internet, no outside service — every answer is computed here, from this database, in under a second. Good for the morning huddle, the pharmacy run and the end-of-day close.",
                "انگلیسی ساده یا دری. بدون انترنت، بدون سرویس بیرونی — هر جواب همین‌جا از همین دیتابیس در کمتر از یک ثانیه محاسبه می‌شود. برای جلسهٔ صبح، رفتن به دواخانه و بستن حساب روز مناسب است."
              )}
            </p>
          </div>
          <div className="flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[0.6rem] font-semibold" style={{ background: "var(--hms-brand-soft)", color: "var(--hms-brand-ink)" }}>
            <Sparkles size={11} /> {tx("Offline · private · auditable", "آفلاین · محرم · قابل بازبینی")}
          </div>
        </div>

        <form
          className="mt-3 flex flex-wrap items-center gap-1.5"
          onSubmit={(e) => {
            e.preventDefault();
            ask(q);
          }}
        >
          <input
            ref={inputRef}
            className="hms-input h-11 flex-1 !text-[0.86rem]"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={tx("e.g. how much came in today? · what is low on stock? · who has not paid?", "مثلاً: امروز چقدر عاید شد؟ · چه دوا کم است؟ · چه کسی پرداخت نکرده؟")}
            aria-label={tx("Your question", "سوال شما")}
          />
          <button className="hms-btn hms-btn-primary h-11 px-4" disabled={busy || !q.trim()}>
            {busy ? <Loader2 size={14} className="animate-spin" /> : <CornerDownLeft size={14} />}
            {tx("Ask", "بپرس")}
          </button>
        </form>

        <div className="mt-2 flex flex-wrap gap-1.5">
          {suggestions.map((s) => (
            <button
              key={s.q}
              onClick={() => ask(s.q)}
              className="rounded-full border px-2.5 py-1 text-[0.66rem] font-medium transition hover:-translate-y-px"
              style={{ borderColor: "var(--hms-border)", background: "var(--hms-surface)", color: "var(--hms-muted)" }}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {/* ---------------------------------------------------------- answers */}
      {turns.length === 0 && (
        <div className="hms-card p-4">
          <p className="text-[0.8rem] font-semibold">{tx("What it can answer", "چه چیزهایی را جواب می‌دهد")}</p>
          <div className="mt-2 grid gap-2 sm:grid-cols-2">
            {[
              [tx("Money", "پول"), tx("Collected today, this week, this month; unpaid bills by patient; the best day this week.", "دریافت امروز، این هفته، این ماه؛ بل‌های پرداخت‌نشده بر اساس بیمار؛ بهترین روز هفته.")],
              [tx("Pharmacy", "دواخانه"), tx("Everything at or below reorder level, expiry inside 90 days, most-prescribed drugs.", "هر دوا در حد سفارش یا کمتر، انقضای ۹۰ روز آینده، پرمصرف‌ترین دواها.")],
              [tx("Wards & theatre", "وارڈ و عملیات"), tx("Bed by bed occupancy, today's theatre list, patients at risk of missing a visit.", "اشغال بستر به بستر، لیست عملیات امروز، بیماران در خطر نیامدن.")],
              [tx("Laboratory & monitor", "لابراتوار و مانیتور"), tx("Open orders, anything past 24 hours, system health and open alarms.", "سفارش‌های باز، هر چیزی بیش از ۲۴ ساعت، سلامت سیستم و هشدارهای باز.")],
            ].map(([title, body]) => (
              <div key={title} className="rounded-lg border p-2.5" style={{ borderColor: "var(--hms-border)" }}>
                <p className="text-[0.74rem] font-semibold">{title}</p>
                <p className="mt-0.5 text-[0.66rem] leading-relaxed" style={{ color: "var(--hms-muted)" }}>{body}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="space-y-2.5">
        {turns.map((turn, i) => (
          <div key={`${turn.q}-${i}`} className="anim-rise">
            <div className="flex justify-end">
              <p
                className="max-w-[85%] rounded-2xl rounded-br-md px-3 py-1.5 text-[0.78rem] font-medium"
                style={{ background: "var(--hms-brand)", color: "#fff" }}
              >
                {turn.q}
              </p>
            </div>

            <div className="hms-card mt-1.5 p-3.5">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="hms-eyebrow">{turn.a.title}</p>
                  <p className="mt-0.5 text-[1.55rem] font-semibold leading-none tracking-[-0.03em]" style={{ color: turn.a.tone === "bad" ? "#dc2626" : turn.a.tone === "warn" ? "#b45309" : "var(--hms-brand-ink)" }}>
                    {turn.a.headline}
                  </p>
                </div>
                {turn.a.link && (
                  <Link href={turn.a.link.href} className="hms-btn hms-btn-sm hms-btn-soft">
                    {turn.a.link.label} <ArrowRight size={11} className="rtl-flip" />
                  </Link>
                )}
              </div>

              <p className="mt-2 max-w-3xl text-[0.74rem] leading-relaxed" style={{ color: "var(--hms-muted)" }}>
                {turn.a.detail}
              </p>

              {turn.a.rows && turn.a.rows.length > 0 && (
                <div className="mt-2.5 overflow-auto rounded-lg border" style={{ borderColor: "var(--hms-border)", maxHeight: "19rem" }}>
                  <table className="w-full">
                    <thead>
                      <tr>
                        {(turn.a.columns ?? []).map((c) => (
                          <th key={c} className="hms-th">{c}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {turn.a.rows.map((row, ri) => (
                        <tr key={ri} className="hms-row">
                          {row.map((cell, ci) => (
                            <td key={ci} className="hms-td" style={{ fontWeight: ci === 0 ? 550 : 400, color: ci === 0 ? "var(--hms-ink)" : "var(--hms-muted)" }}>
                              {cell}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
                <span className="text-[0.6rem]" style={{ color: "var(--hms-faint)" }}>{tx("Ask next", "بعدی را بپرسید")}</span>
                {turn.a.followups.map((f) => (
                  <button key={f.q} onClick={() => ask(f.q)} className="rounded-full border px-2 py-0.5 text-[0.64rem] font-medium" style={{ borderColor: "var(--hms-border)", color: "var(--hms-brand-ink)" }}>
                    {f.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        ))}
        <div ref={endRef} />
      </div>

      {last && (
        <p className="px-1 text-[0.6rem]" style={{ color: "var(--hms-faint)" }}>
          {tx(
            `Answers are computed from the local database (${lang === "fa" ? "دری" : "English"} interface). Nothing is sent anywhere.`,
            `جواب‌ها از دیتابیس محلی محاسبه می‌شوند (زبان رابط: دری). هیچ چیزی به جایی فرستاده نمی‌شود.`
          )}
        </p>
      )}
    </div>
  );
}
