"use client";

import {
  Activity, ArrowRight, Beaker, Command, CreditCard, FlaskConical, HeartPulse, KeyRound, LayoutDashboard,
  Loader2, Pill, ScanLine, Search, Settings, Sparkles, Stethoscope, UserPlus, Users, Wallet, X,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLang } from "./lang-provider";

/**
 * ⌘K — one box for the whole hospital.
 *
 * v7 turns the palette into a real jump-to: it searches patients, prescriptions,
 * invoices, medicines, lab/imaging orders and staff through /api/hms/search,
 * keeps the last eight places you went, and offers the handful of actions a
 * clinician actually performs in a hurry. Everything is keyboard-drivable:
 * ↑ ↓ to move, Enter to open, Esc to leave, ⌘K to come back.
 */

type Hit = { id: string; title: string; subtitle?: string; kind: string; href: string; meta?: string };
type Group = { key: string; items: Hit[] };
type Row = { id: string; title: string; subtitle?: string; href: string; kind: string; meta?: string; icon?: typeof Users };

const ICONS: Record<string, typeof Users> = {
  patient: Users,
  prescription: Pill,
  invoice: CreditCard,
  medicine: Beaker,
  lab: FlaskConical,
  imaging: ScanLine,
  staff: Stethoscope,
  page: LayoutDashboard,
  action: Sparkles,
  ask: Sparkles,
};

const GROUP_LABEL: Record<string, [string, string]> = {
  actions: ["Quick actions", "کارهای سریع"],
  ask: ["Ask Aybek", "از ایبک بپرسید"],
  patients: ["Patients", "بیماران"],
  prescriptions: ["Prescriptions", "نسخه‌ها"],
  invoices: ["Invoices", "بل‌ها"],
  medicines: ["Medicines", "دواها"],
  orders: ["Lab & imaging", "لابراتوار و اکسری"],
  staff: ["Staff", "کارمندان"],
  pages: ["Pages", "صفحه‌ها"],
  recent: ["Recent", "اخیر"],
};

const RECENT_KEY = "aybek:recent";

type Recent = { title: string; href: string; kind: string };

export function CommandPalette({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const { tx, t } = useLang();
  const [q, setQ] = useState("");
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(false);
  const [cursor, setCursor] = useState(0);
  const [recent, setRecent] = useState<Recent[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
    try {
      const raw = localStorage.getItem(RECENT_KEY);
      if (raw) setRecent((JSON.parse(raw) as Recent[]).slice(0, 6));
    } catch {
      /* private mode */
    }
  }, []);

  /* ------------------------------------------------------------ live search */
  useEffect(() => {
    const term = q.trim();
    if (term.length < 2) {
      setGroups([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/hms/search?q=${encodeURIComponent(term)}`);
        const data = await res.json();
        setGroups(data.groups ?? []);
      } catch {
        setGroups([]);
      } finally {
        setLoading(false);
      }
    }, 160);
    return () => clearTimeout(timer);
  }, [q]);

  const go = useCallback(
    (href: string, title: string, kind: string) => {
      try {
        const next = [{ title, href, kind }, ...recent.filter((r) => r.href !== href)].slice(0, 8);
        localStorage.setItem(RECENT_KEY, JSON.stringify(next));
      } catch {
        /* ignore */
      }
      router.push(href);
      onClose();
    },
    [onClose, recent, router]
  );

  const actions: Row[] = useMemo(
    () => [
      { id: "a-ask", title: tx("Ask Aybek about today", "از ایبک در مورد امروز بپرسید"), subtitle: tx("Revenue, stock, backlog, risk — in plain words", "عاید، موجودی، کارهای عقب‌مانده، خطر — به زبان ساده"), href: "/hms/ask", kind: "ask", icon: Sparkles },
      { id: "a-patient", title: tx("Register a new patient", "ثبت بیمار جدید"), href: "/hms/patients", kind: "action", icon: UserPlus },
      { id: "a-opd", title: tx("Open the consultation room", "باز کردن اتاق معاینه"), href: "/hms/opd", kind: "action", icon: Stethoscope },
      { id: "a-pharmacy", title: tx("Dispense a prescription", "تحویل نسخه"), href: "/hms/pharmacy", kind: "action", icon: Pill },
      { id: "a-lab", title: tx("Enter a laboratory result", "ثبت نتیجهٔ لابراتوار"), href: "/hms/lab", kind: "action", icon: FlaskConical },
      { id: "a-bed", title: tx("Admit or discharge a patient", "بستری یا رخصتی بیمار"), href: "/hms/inpatients", kind: "action", icon: HeartPulse },
      { id: "a-invoice", title: tx("Take a payment", "دریافت پول"), href: "/hms/billing", kind: "action", icon: Wallet },
      { id: "a-settings", title: tx("Smart settings", "تنظیمات هوشمند"), href: "/hms/settings", kind: "action", icon: Settings },
      { id: "a-licence", title: tx("Licence and serials", "لایسنس و سریال‌ها"), href: "/hms/activate", kind: "action", icon: KeyRound },
    ],
    [tx]
  );

  /* --------------------------------------------------------------- flatten */
  const rows: Row[] = useMemo(() => {
    const term = q.trim().toLowerCase();
    const out: Row[] = [];

    if (term.length >= 2) {
      out.push({
        id: "ask-live",
        title: tx(`Ask Aybek: “${q.trim()}”`, `از ایبک بپرسید: «${q.trim()}»`),
        subtitle: tx("Search the hospital's own records for this", "در سوابق خود شفاخانه بگردید"),
        href: `/hms/ask?q=${encodeURIComponent(q.trim())}`,
        kind: "ask",
      });
      for (const g of groups) {
        for (const item of g.items) out.push({ ...item, kind: item.kind });
      }
    }

    const matchingActions = actions.filter((a) => !term || a.title.toLowerCase().includes(term));
    if (matchingActions.length) out.push(...matchingActions.slice(0, term ? 3 : 5));

    if (!term && recent.length) {
      out.push(...recent.map((r) => ({ ...r, id: `r-${r.href}`, subtitle: tx("Recently opened", "اخیراً باز شده") })));
    }
    return out;
  }, [actions, groups, q, recent, tx]);

  useEffect(() => setCursor(0), [q]);

  // Keep the highlighted row in view while arrowing.
  useEffect(() => {
    const el = listRef.current?.querySelector<HTMLElement>(`[data-row="${cursor}"]`);
    el?.scrollIntoView({ block: "nearest" });
  }, [cursor]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setCursor((c) => Math.min(rows.length - 1, c + 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setCursor((c) => Math.max(0, c - 1));
      } else if (e.key === "Enter") {
        const row = rows[cursor];
        if (row) {
          e.preventDefault();
          go(row.href, row.title, row.kind);
        }
      } else if (e.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [cursor, go, onClose, rows]);

  /* Group the flat list for display, keeping the flattened index for the cursor. */
  const rendered = useMemo(() => {
    const blocks: { label: string; rows: { row: Row; index: number }[] }[] = [];
    rows.forEach((row, index) => {
      const keynote = q.trim().length >= 2 && row.kind !== "ask" && row.kind !== "action" ? row.kind : row.kind === "ask" ? "ask" : row.subtitle === tx("Recently opened", "اخیراً باز شده") ? "recent" : "actions";
      const last = blocks[blocks.length - 1];
      if (last && last.label === keynote) last.rows.push({ row, index });
      else blocks.push({ label: keynote, rows: [{ row, index }] });
    });
    return blocks;
  }, [q, rows, tx]);

  return (
    <div
      className="fixed inset-0 z-[80] flex items-start justify-center bg-black/45 px-4 pt-[10vh] backdrop-blur-[2px] anim-fade"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={t("shell.search")}
    >
      <div
        className="w-full max-w-xl overflow-hidden rounded-2xl border shadow-2xl anim-pop"
        style={{ background: "var(--hms-surface)", borderColor: "var(--hms-border)" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2 border-b px-3.5 py-3" style={{ borderColor: "var(--hms-border)" }}>
          {loading ? <Loader2 size={15} className="animate-spin" style={{ color: "var(--hms-brand)" }} /> : <Search size={15} style={{ color: "var(--hms-faint)" }} />}
          <input
            ref={inputRef}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={tx("Search patients, RX, invoices, medicines, staff…", "بیمار، نسخه، بل، دوا، کارمند…")}
            className="w-full bg-transparent text-[0.88rem] outline-none"
            aria-label={tx("Search the hospital", "جستجو در شفاخانه")}
          />
          {q ? (
            <button onClick={() => setQ("")} aria-label={tx("Clear", "پاک کردن")} className="rounded p-1" style={{ color: "var(--hms-faint)" }}>
              <X size={13} />
            </button>
          ) : (
            <kbd className="hms-kbd">Esc</kbd>
          )}
        </div>

        <div ref={listRef} className="max-h-[58vh] overflow-y-auto p-1.5">
          {rendered.length === 0 && (
            <p className="px-3 py-8 text-center text-[0.74rem]" style={{ color: "var(--hms-muted)" }}>
              {q.trim().length >= 2
                ? tx(`Nothing matched “${q.trim()}”. Try a name, MRN or invoice number.`, `چیزی برای «${q.trim()}» پیدا نشد. نام، MRN یا شمارهٔ بل را امتحان کنید.`)
                : tx("Type a name, number or action — or pick one below.", "یک نام، شماره یا کار را بنویسید — یا از پایین انتخاب کنید.")}
            </p>
          )}

          {rendered.map((block) => (
            <div key={`${block.label}-${block.rows[0]?.index}`} className="mb-1">
              <p className="px-2.5 py-1 text-[0.56rem] font-bold uppercase tracking-[0.12em]" style={{ color: "var(--hms-faint)" }}>
                {GROUP_LABEL[block.label] ? tx(GROUP_LABEL[block.label][0], GROUP_LABEL[block.label][1]) : block.label}
              </p>
              {block.rows.map(({ row, index }) => {
                const Icon = ICONS[row.kind] ?? ArrowRight;
                const active = index === cursor;
                return (
                  <button
                    key={`${row.kind}-${row.id}-${index}`}
                    data-row={index}
                    onMouseEnter={() => setCursor(index)}
                    onClick={() => go(row.href, row.title, row.kind)}
                    className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-left transition"
                    style={{
                      background: active ? "var(--hms-brand-soft)" : "transparent",
                      color: active ? "var(--hms-brand-ink)" : "var(--hms-text)",
                    }}
                  >
                    <Icon size={14} style={{ color: active ? "var(--hms-brand)" : "var(--hms-faint)", flexShrink: 0 }} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[0.78rem] font-medium">{row.title}</span>
                      {row.subtitle && (
                        <span className="block truncate text-[0.62rem]" style={{ color: "var(--hms-faint)" }}>
                          {row.subtitle}
                        </span>
                      )}
                    </span>
                    {row.meta && <span className="hidden shrink-0 text-[0.6rem] sm:block" style={{ color: "var(--hms-faint)" }}>{row.meta}</span>}
                    {active && <ArrowRight size={12} className="rtl-flip shrink-0" style={{ color: "var(--hms-brand)" }} />}
                  </button>
                );
              })}
            </div>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-2 border-t px-3 py-2 text-[0.6rem]" style={{ borderColor: "var(--hms-border)", color: "var(--hms-faint)" }}>
          <span className="flex items-center gap-1"><kbd className="hms-kbd">↑</kbd><kbd className="hms-kbd">↓</kbd> {tx("move", "حرکت")}</span>
          <span className="flex items-center gap-1"><kbd className="hms-kbd">↵</kbd> {tx("open", "باز کن")}</span>
          <span className="flex items-center gap-1"><kbd className="hms-kbd">Esc</kbd> {tx("close", "بستن")}</span>
          <span className="ms-auto flex items-center gap-1"><Command size={11} /> K</span>
        </div>
      </div>
    </div>
  );
}
