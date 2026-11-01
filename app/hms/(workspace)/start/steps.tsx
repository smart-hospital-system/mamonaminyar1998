"use client";

import {
  ArrowRight, BedDouble, CheckCircle2, Circle, Copy, CreditCard, ExternalLink, FlaskConical, KeyRound,
  Printer, ScanLine, ShieldCheck, Sparkles, Stethoscope, Users,
} from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useLang } from "@/components/hms/lang-provider";

/**
 * "Start here" — the first thing a new person sees, and the only page that
 * answers the two questions everybody actually asks on day one:
 * *where do I go*, and *what do I press*.
 *
 * Each step is a real route with the exact button labels written out, a reason
 * ("why this matters"), and a checkbox that is remembered in this browser so a
 * receptionist can stop halfway and continue after lunch. Nothing here needs
 * training to understand.
 */

type Step = {
  id: string;
  icon: typeof Stethoscope;
  minutes: number;
  title: [string, string];
  where: string;
  href: string;
  why: [string, string];
  actions: [string, string][];
  tip?: [string, string];
  ownerOnly?: boolean;
};

const STEPS: Step[] = [
  {
    id: "signin",
    icon: KeyRound,
    minutes: 1,
    title: ["Sign in and change the starter code", "وارد شوید و رمز اولیه را عوض کنید"],
    where: "/hms/login → /hms/team",
    href: "/hms/team",
    why: [
      "The starter code is printed in every manual. Until you change it, anyone holding this disc can open your hospital.",
      "رمز اولیه در همهٔ راهنماها چاپ شده است. تا آن را عوض نکنید، هر کسی که این دیسک را دارد می‌تواند شفاخانهٔ شما را باز کند.",
    ],
    actions: [
      ["Open **Team** from the side menu, find your own name, press **Reset code** and type a long code (16 characters is enough forever).", "از منوی کنار **کارمندان** را باز کنید، نام خودتان را پیدا کنید، **تغییر رمز** را بزنید و یک رمز طولانی بنویسید (۱۶ حرف تا همیشه کافی است)."],
      ["Write it on the printed card in the disc box — not on the screen, not in a message.", "آن را روی کارت چاپی داخل جعبهٔ دیسک بنویسید — نه روی صفحه، نه در پیام."],
    ],
    tip: ["A long sentence you can remember beats a short code you have to write: “Kabul-surgery-2026-ward”.", "یک جملهٔ طولانی که یادتان می‌ماند از یک رمز کوتاه که باید بنویسید بهتر است: «Kabul-surgery-2026-ward»."],
  },
  {
    id: "identity",
    icon: ShieldCheck,
    minutes: 4,
    title: ["Put your own name on the hospital", "نام خودتان را روی شفاخانه بگذارید"],
    where: "/hms/settings?section=identity",
    href: "/hms/settings?section=identity",
    why: [
      "Everything printed — prescriptions, invoices, referral letters — takes its name, phone and address from this one screen. Change it once and every document is correct.",
      "هر چیزی که چاپ می‌شود — نسخه، بل، نامهٔ ارجاع — نام، تلفن و آدرس را از همین یک صفحه می‌گیرد. یک بار عوض کنید، همهٔ اسناد درست می‌شوند.",
    ],
    actions: [
      ["Fill **Hospital name**, **phone**, **emergency number**, **address** and **city**.", "**نام شفاخانه**، **تلفن**، **شمارهٔ اضطراری**، **آدرس** و **شهر** را پر کنید."],
      ["Press **Save** at the bottom of the section.", "در پایین بخش، **ذخیره** را بزنید."],
      ["Go to **Look & print** and pick a theme and a prescription paper you like.", "به **ظاهر و چاپ** بروید و تم و کاغذ نسخهٔ دلخواه را انتخاب کنید."],
    ],
    ownerOnly: true,
  },
  {
    id: "staff",
    icon: Users,
    minutes: 8,
    title: ["Create one login per person (not one shared login)", "برای هر شخص یک حساب جدا بسازید"],
    where: "/hms/team",
    href: "/hms/team",
    why: [
      "The audit trail records who signed, dispensed and charged. A shared login destroys that — and every serious inspection asks for it.",
      "ثبت وقایع می‌نویسد چه کسی امضا، تحویل و محاسبه کرده است. حساب مشترک این را نابود می‌کند — و هر بازرسی جدی همین را می‌پرسد.",
    ],
    actions: [
      ["Press **Add staff**, type the name and email, choose the role (nurse, pharmacist, doctor, reception…).", "**افزودن کارمند** را بزنید، نام و ایمیل را بنویسید و نقش را انتخاب کنید (نرس، دواساز، داکتر، استقبال…)."],
      ["Press **Generate** next to the initial code — the hospital makes a strong code for you.", "کنار رمز اولیه **تولید** را بزنید — شفاخانه یک رمز قوی برایتان می‌سازد."],
      ["Give the person their code on paper, once. They change it on their first sign-in.", "رمز را یک بار روی کاغذ به آن شخص بدهید. او در اولین ورود عوضش می‌کند."],
    ],
    ownerOnly: true,
    tip: ["Seven roles exist: administrator, doctor, nurse, pharmacist, laboratory, radiology, reception. Give the smallest role that lets the person work.", "هفت نقش وجود دارد: مدیر، داکتر، نرس، دواساز، لابراتوار، اکسری، استقبال. کوچک‌ترین نقشی که کار شخص را راه می‌اندازد بدهید."],
  },
  {
    id: "patient",
    icon: Stethoscope,
    minutes: 5,
    title: ["Register one test patient and walk the whole loop", "یک بیمار آزمایشی ثبت کنید و کل چرخه را ببینید"],
    where: "/hms/patients → /hms/opd",
    href: "/hms/patients",
    why: [
      "Fifteen minutes with a test patient teaches more than a day of reading. It also proves the printer, the stock and the bill are wired together.",
      "پانزده دقیقه با یک بیمار آزمایشی بیشتر از یک روز خواندن یاد می‌دهد. همچنین ثابت می‌کند چاپگر، موجودی و بل به هم وصل‌اند.",
    ],
    actions: [
      ["**Patients → New patient**: name, sex, phone. Save.", "**بیماران → بیمار جدید**: نام، جنس، تلفن. ذخیره کنید."],
      ["Open the chart → **New encounter** → write a complaint and a diagnosis → **Save**.", "پرونده را باز کنید → **معاینهٔ جدید** → شکایت و تشخیص را بنویسید → **ذخیره**."],
      ["In the same room, add a medicine under **Prescription** → press **Sign**.", "در همان اتاق، زیر **نسخه** یک دوا اضافه کنید → **امضا** را بزنید."],
      ["Go to **Pharmacy**, find the signed prescription, press **Dispense** — stock goes down by itself.", "به **دواخانه** بروید، نسخهٔ امضاشده را پیدا کنید، **تحویل** را بزنید — موجودی خودش کم می‌شود."],
      ["Go to **Billing**, press **Create invoice** for that patient, then **Take payment**.", "به **بل‌ها** بروید، برای همان بیمار **ساخت بل** و بعد **دریافت پول** را بزنید."],
    ],
  },
  {
    id: "departments",
    icon: FlaskConical,
    minutes: 6,
    title: ["Lab, X-ray and the ward", "لابراتوار، اکسری و وارڈ"],
    where: "/hms/lab · /hms/radiology · /hms/inpatients",
    href: "/hms/lab",
    why: [
      "Each department has one screen with one obvious next action, so a technician does not have to learn the whole system.",
      "هر دیپارتمنت یک صفحه با یک اقدام واضح بعدی دارد، تا تکنسین مجبور نباشد تمام سیستم را یاد بگیرد.",
    ],
    actions: [
      ["**Laboratory**: open an order → **Collect** → type the result → **Result** → **Verify**.", "**لابراتوار**: سفارش را باز کنید → **نمونه‌گیری** → نتیجه را بنویسید → **نتیجه** → **تأیید**."],
      ["**Radiology**: **Accept** the request, then write the report and press **Report**.", "**اکسری**: درخواست را **قبول** کنید، گزارش را بنویسید و **گزارش** را بزنید."],
      ["**Inpatients**: pick a free bed → **Admit**; when the patient leaves, **Discharge** then **Clean**.", "**بستری**: یک بستر آزاد انتخاب کنید → **بستری**؛ وقتی بیمار رفت، **رخصتی** و بعد **پاک‌سازی**."],
    ],
  },
  {
    id: "print",
    icon: Printer,
    minutes: 3,
    title: ["Print one prescription and check the paper", "یک نسخه چاپ کنید و کاغذ را ببینید"],
    where: "/hms/prescriptions → /hms/rx/…",
    href: "/hms/prescriptions",
    why: [
      "A prescription that leaves the building carries your name. Check the header, the doctor's name and the allergies box before you print it for a real patient.",
      "نسخه‌ای که از شفاخانه بیرون می‌رود نام شما را دارد. پیش از چاپ برای بیمار واقعی، سربرگ، نام داکتر و کادر حساسیت را ببینید.",
    ],
    actions: [
      ["Open a signed prescription → press **Print**.", "یک نسخهٔ امضاشده را باز کنید → **چاپ** را بزنید."],
      ["In the printer dialog choose **A4** and margins **Default** — nothing else.", "در پنجرهٔ چاپ **A4** و حاشیهٔ **پیش‌فرض** را انتخاب کنید — نه چیز دیگر."],
      ["With Dari selected, the sheet prints right-to-left — try both languages once.", "با انتخاب دری، برگه راست‌به‌چپ چاپ می‌شود — یک بار هر دو زبان را امتحان کنید."],
    ],
  },
  {
    id: "backup",
    icon: CreditCard,
    minutes: 2,
    title: ["Take the first backup, then practise the reset", "اولین پشتیبان را بگیرید، بعد بازگردانی را تمرین کنید"],
    where: "/hms/settings?section=data",
    href: "/hms/settings?section=data",
    why: [
      "The whole hospital is one file. A backup you have never restored is a hope, not a backup — so restore the demo once, on purpose, today.",
      "تمام شفاخانه یک فایل است. پشتیبانی که هرگز بازنگردانده‌اید یک امید است، نه پشتیبان — پس همین امروز یک بار عمداً نسخهٔ نمونه را بازگردانید.",
    ],
    actions: [
      ["Press **Download backup** and save the JSON on a USB stick.", "**دانلود پشتیبان** را بزنید و فایل JSON را روی فلش ذخیره کنید."],
      ["Type `RESET` and press **Rebuild demo data** to see how a restore feels.", "کلمهٔ `RESET` را بنویسید و **بازسازی دادهٔ نمونه** را بزنید تا حس بازگردانی را ببینید."],
      ["Then run `aybek-hms\\scripts\\install\\07-backup.ps1 -Schedule -At 20:00` once, so it happens every night without you.", "بعد یک بار `aybek-hms\\scripts\\install\\07-backup.ps1 -Schedule -At 20:00` را اجرا کنید تا هر شب بدون شما انجام شود."],
    ],
  },
  {
    id: "daily",
    icon: Sparkles,
    minutes: 2,
    title: ["Learn the two shortcuts that save the most time", "دو میان‌بری که بیشترین وقت را نجات می‌دهد"],
    where: "/hms/ask · ⌘K",
    href: "/hms/ask",
    why: [
      "One box finds anything, and one sentence answers the morning question. Together they replace most of the clicking.",
      "یک کادر هر چیزی را پیدا می‌کند و یک جمله سوال صبح را جواب می‌دهد. با هم بیشتر کلیک‌ها را حذف می‌کنند.",
    ],
    actions: [
      ["Press **Ctrl+K** anywhere → type a patient name, a prescription number or “billing”.", "هر جا **Ctrl+K** را بزنید → نام بیمار، شمارهٔ نسخه یا «billing» را بنویسید."],
      ["Open **Ask Aybek** and type “summary” — money, beds, stock, lab and alarms in one line.", "**از ایبک بپرسید** را باز کنید و «خلاصه» بنویسید — پول، بستر، موجودی، لابراتوار و هشدارها در یک خط."],
    ],
  },
];

const KEY = "aybek:start-progress";

export function StartSteps({ role }: { role: string }) {
  const { tx } = useLang();
  const [done, setDone] = useState<string[]>([]);
  const [copied, setCopied] = useState<string | null>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) setDone(JSON.parse(raw) as string[]);
    } catch {
      /* private mode */
    }
  }, []);

  const toggle = useCallback((id: string) => {
    setDone((list) => {
      const next = list.includes(id) ? list.filter((x) => x !== id) : [...list, id];
      try {
        localStorage.setItem(KEY, JSON.stringify(next));
      } catch {
        /* ignore */
      }
      return next;
    });
  }, []);

  const steps = useMemo(() => (role === "admin" ? STEPS : STEPS.filter((s) => !s.ownerOnly)), [role]);
  const completed = steps.filter((s) => done.includes(s.id)).length;
  const percent = Math.round((completed / steps.length) * 100);
  const next = steps.find((s) => !done.includes(s.id));

  async function copy(text: string, id: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(id);
      setTimeout(() => setCopied(null), 1600);
    } catch {
      /* clipboard blocked */
    }
  }

  return (
    <div className="mx-auto max-w-4xl space-y-3">
      {/* --------------------------------------------------------------- hero */}
      <div className="hms-hero p-4 anim-rise">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="max-w-xl">
            <p className="hms-eyebrow">{tx("Start here", "از اینجا شروع کنید")}</p>
            <h2 className="hms-hero-title mt-1">{tx("Eight steps from an empty screen to a working hospital.", "هشت قدم از یک صفحهٔ خالی تا شفاخانهٔ کارکننده.")}</h2>
            <p className="mt-1 text-[0.72rem] leading-relaxed" style={{ color: "var(--hms-muted)" }}>
              {tx(
                "Each card tells you where to go, what to press and why it matters. Work top to bottom; come back after lunch and the ticks are still here.",
                "هر کارت می‌گوید کجا بروید، چه را بزنید و چرا مهم است. از بالا به پایین بروید؛ بعد از ناهار برگردید، تیک‌ها همان‌جا هستند."
              )}
            </p>
          </div>
          <div className="min-w-[9rem]">
            <div className="flex items-baseline gap-1">
              <span className="text-[2rem] font-semibold leading-none tracking-[-0.04em]" style={{ color: "var(--hms-brand-ink)" }}>{percent}%</span>
              <span className="text-[0.68rem]" style={{ color: "var(--hms-faint)" }}>{completed}/{steps.length}</span>
            </div>
            <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full" style={{ background: "var(--hms-surface-3)" }}>
              <div className="h-full rounded-full transition-all" style={{ width: `${percent}%`, background: "var(--hms-brand)" }} />
            </div>
            {next ? (
              <Link href={next.href} className="mt-2 inline-flex items-center gap-1 text-[0.66rem] font-semibold" style={{ color: "var(--hms-brand)" }}>
                {tx("Next step", "قدم بعدی")} <ArrowRight size={11} className="rtl-flip" />
              </Link>
            ) : (
              <p className="mt-2 flex items-center gap-1 text-[0.66rem] font-semibold" style={{ color: "#0b7a58" }}>
                <CheckCircle2 size={11} /> {tx("You are running.", "شما راه افتادید.")}
              </p>
            )}
          </div>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-2 rounded-lg border px-2.5 py-2 text-[0.66rem]" style={{ borderColor: "var(--hms-border)", background: "var(--hms-surface)" }}>
          <KeyRound size={12} style={{ color: "var(--hms-brand)" }} />
          <span style={{ color: "var(--hms-muted)" }}>{tx("Starter sign-in", "ورود اولیه")}</span>
          <code className="rounded px-1.5 py-0.5" style={{ background: "var(--hms-surface-3)" }}>doctor@aybek.hospital</code>
          <code className="rounded px-1.5 py-0.5" style={{ background: "var(--hms-surface-3)" }}>mamonaminyar</code>
          <button onClick={() => copy("doctor@aybek.hospital / mamonaminyar", "starter")} className="hms-btn hms-btn-sm hms-btn-ghost !h-6">
            {copied === "starter" ? <CheckCircle2 size={10} /> : <Copy size={10} />} {copied === "starter" ? tx("Copied", "کاپی شد") : tx("Copy", "کاپی")}
          </button>
          <span className="ms-auto font-semibold" style={{ color: "#b45309" }}>{tx("Change it in step 1.", "در قدم ۱ عوضش کنید.")}</span>
        </div>
      </div>

      {/* -------------------------------------------------------------- steps */}
      <ol className="space-y-2.5">
        {steps.map((s, i) => {
          const Icon = s.icon;
          const isDone = done.includes(s.id);
          return (
            <li key={s.id} className="hms-card hms-card-lift p-3.5 anim-rise" style={{ borderInlineStartWidth: 3, borderInlineStartColor: isDone ? "#0f9d6e" : "var(--hms-brand)" }}>
              <div className="flex items-start gap-2.5">
                <button onClick={() => toggle(s.id)} aria-label={tx("Mark done", "تیک انجام شد")} className="mt-0.5 shrink-0">
                  {isDone ? <CheckCircle2 size={18} style={{ color: "#0f9d6e" }} /> : <Circle size={18} style={{ color: "var(--hms-faint)" }} />}
                </button>

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="grid h-5 w-5 place-items-center rounded-md text-[0.62rem] font-bold" style={{ background: "var(--hms-brand-soft)", color: "var(--hms-brand-ink)" }}>{i + 1}</span>
                    <Icon size={13} style={{ color: "var(--hms-brand)" }} />
                    <p className="text-[0.84rem] font-semibold" style={{ textDecoration: isDone ? "line-through" : undefined, opacity: isDone ? 0.65 : 1 }}>
                      {tx(s.title[0], s.title[1])}
                    </p>
                    <span className="rounded-full px-1.5 py-0.5 text-[0.56rem]" style={{ background: "var(--hms-surface-3)", color: "var(--hms-faint)" }}>
                      {s.minutes} {tx("min", "دقیقه")}
                    </span>
                  </div>

                  <p className="mt-1 text-[0.7rem] leading-relaxed" style={{ color: "var(--hms-muted)" }}>{tx(s.why[0], s.why[1])}</p>

                  <div className="mt-1.5 rounded-lg px-2.5 py-1.5" style={{ background: "var(--hms-surface-2)" }}>
                    <p className="flex items-center gap-1 text-[0.6rem] font-bold uppercase tracking-[0.08em]" style={{ color: "var(--hms-faint)" }}>
                      <ExternalLink size={9} /> {s.where}
                    </p>
                    <ul className="mt-1 space-y-1">
                      {s.actions.map((a, k) => (
                        <li key={k} className="flex gap-1.5 text-[0.7rem] leading-relaxed">
                          <span className="mt-[0.32rem] h-1 w-1 shrink-0 rounded-full" style={{ background: "var(--hms-brand)" }} />
                          <span>{tx(a[0], a[1]).split(/\*\*(.+?)\*\*/g).map((part, pi) => (pi % 2 === 1 ? <b key={pi}>{part}</b> : <span key={pi}>{part}</span>))}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {s.tip && (
                    <p className="mt-1.5 flex items-start gap-1 text-[0.64rem]" style={{ color: "var(--hms-faint)" }}>
                      <Sparkles size={10} className="mt-0.5 shrink-0" /> {tx(s.tip[0], s.tip[1])}
                    </p>
                  )}

                  <div className="mt-2 flex flex-wrap items-center gap-1.5">
                    <Link href={s.href} className="hms-btn hms-btn-sm hms-btn-primary">
                      {tx("Take me there", "مرا ببر")} <ArrowRight size={11} className="rtl-flip" />
                    </Link>
                    <button onClick={() => toggle(s.id)} className="hms-btn hms-btn-sm hms-btn-ghost">
                      {isDone ? tx("Mark as not done", "تیک را بردار") : tx("Mark done", "انجام شد")}
                    </button>
                  </div>
                </div>
              </div>
            </li>
          );
        })}
      </ol>

      <div className="hms-card p-3.5">
        <p className="text-[0.8rem] font-semibold">{tx("If something is not where this page says it is", "اگر چیزی جایی که این صفحه می‌گوید نبود")}</p>
        <p className="mt-1 text-[0.7rem] leading-relaxed" style={{ color: "var(--hms-muted)" }}>
          {tx(
            "Press Ctrl+K and type the name of the screen. If the menu hides a page, your role does not include it — ask the owner to change your role in Team.",
            "Ctrl+K را بزنید و نام صفحه را بنویسید. اگر منو صفحه‌ای را پنهان کرده، نقش شما شامل آن نیست — از مالک بخواهید نقش شما را در بخش کارمندان عوض کند."
          )}
        </p>
        <div className="mt-2 flex flex-wrap gap-1.5">
          <Link href="/hms/guide" className="hms-btn hms-btn-sm">{tx("Full playbook", "راهنمای کامل")}</Link>
          <Link href="/hms/intelligence" className="hms-btn hms-btn-sm"><BedDouble size={11} /> {tx("Clinical toolkit", "جعبه‌ابزار کلینیکی")}</Link>
          <Link href="/hms/radiology" className="hidden"><ScanLine size={11} /></Link>
        </div>
      </div>
    </div>
  );
}
