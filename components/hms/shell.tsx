"use client";

import { cn } from "@/lib/utils";
import {
  Activity, Bell, Beaker, BookOpen, ChevronsLeft, CreditCard, Cross, FlaskConical, HeartPulse, KeyRound,
  LayoutDashboard, LogOut, Menu, Pill, Printer, ScanLine, Scissors, Search, Settings, ShieldCheck,
  Stethoscope, UserCog, Users, X,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { statusText } from "@/lib/hms/i18n";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { LangSwitch } from "./lang-switch";
import { useLang } from "./lang-provider";
import { Ring, Spinner } from "./ui";

export type HmsNavUser = {
  id: string;
  name: string;
  email: string;
  role: string;
  department: string | null;
  title: string | null;
  avatar_color: string | null;
};

type AlertLite = { id: string; code: string; severity: string; title: string; category: string; status: string; last_seen: string };

const NAV: { title: string; items: { href: string; label: string; icon: typeof LayoutDashboard; roles?: string[]; badge?: "rx" | "alerts" | "lab" }[] }[] = [
  {
    title: "nav.command",
    items: [
      { href: "/hms", label: "nav.dashboard", icon: LayoutDashboard },
      { href: "/hms/opd", label: "nav.opd", icon: Stethoscope, roles: ["admin", "doctor", "nurse", "reception"] },
      { href: "/hms/patients", label: "nav.patients", icon: Users },
    ],
  },
  {
    title: "nav.clinical",
    items: [
      { href: "/hms/prescriptions", label: "nav.prescriptions", icon: Pill, roles: ["admin", "doctor", "pharmacist", "nurse"], badge: "rx" },
      { href: "/hms/lab", label: "nav.lab", icon: FlaskConical, roles: ["admin", "lab", "doctor"], badge: "lab" },
      { href: "/hms/radiology", label: "nav.radiology", icon: ScanLine, roles: ["admin", "radiology", "doctor"] },
      { href: "/hms/inpatients", label: "nav.inpatients", icon: HeartPulse, roles: ["admin", "nurse", "doctor"] },
      { href: "/hms/surgery", label: "nav.surgery", icon: Scissors, roles: ["admin", "doctor", "nurse"] },
    ],
  },
  {
    title: "nav.operations",
    items: [
      { href: "/hms/pharmacy", label: "nav.pharmacy", icon: Beaker, roles: ["admin", "pharmacist", "nurse"] },
      { href: "/hms/billing", label: "nav.billing", icon: CreditCard, roles: ["admin", "reception", "nurse"] },
      { href: "/hms/analytics", label: "nav.analytics", icon: Activity, roles: ["admin", "doctor"] },
    ],
  },
  {
    title: "nav.system",
    items: [
      { href: "/hms/alerts", label: "nav.alerts", icon: ShieldCheck, badge: "alerts" },
      { href: "/hms/print", label: "nav.print", icon: Printer },
      { href: "/hms/settings", label: "nav.settings", icon: Settings, roles: ["admin"] },
      { href: "/hms/team", label: "nav.team", icon: UserCog, roles: ["admin"] },
      { href: "/hms/guide", label: "nav.guide", icon: BookOpen },
      { href: "/hms/activate", label: "nav.activate", icon: KeyRound, roles: ["admin"] },
    ],
  },
];

const TITLES: Record<string, [string, string]> = {
  "/hms": ["title.dashboard", "title.dashboard.sub"],
  "/hms/opd": ["title.opd", "title.opd.sub"],
  "/hms/patients": ["title.patients", "title.patients.sub"],
  "/hms/prescriptions": ["title.prescriptions", "title.prescriptions.sub"],
  "/hms/lab": ["title.lab", "title.lab.sub"],
  "/hms/radiology": ["title.radiology", "title.radiology.sub"],
  "/hms/inpatients": ["title.inpatients", "title.inpatients.sub"],
  "/hms/surgery": ["title.surgery", "title.surgery.sub"],
  "/hms/pharmacy": ["title.pharmacy", "title.pharmacy.sub"],
  "/hms/billing": ["title.billing", "title.billing.sub"],
  "/hms/analytics": ["title.analytics", "title.analytics.sub"],
  "/hms/alerts": ["title.alerts", "title.alerts.sub"],
  "/hms/print": ["title.print", "title.print.sub"],
  "/hms/settings": ["title.settings", "title.settings.sub"],
  "/hms/team": ["title.team", "title.team.sub"],
  "/hms/guide": ["title.guide", "title.guide.sub"],
  "/hms/activate": ["title.activate", "title.activate.sub"],
};

export function HmsShell({
  user,
  hospital,
  health,
  licence,
  children,
}: {
  user: HmsNavUser;
  hospital: { name: string; name_short: string; accent: string; local: string };
  health: { score: number; critical: number; warning: number; open: number };
  licence: { status: string; daysLeft: number; plan: string };
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { lang, t } = useLang();
  const [mobile, setMobile] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [bellOpen, setBellOpen] = useState(false);
  const [palette, setPalette] = useState(false);
  const [alerts, setAlerts] = useState<AlertLite[]>([]);
  const [sound, setSound] = useState(true);
  const [busy, setBusy] = useState(false);
  const [counts, setCounts] = useState({ rx: 0, lab: 0, alerts: health.open });
  const beeped = useRef<Set<string>>(new Set());

  const [titleKey, subtitleKey] = useMemo(() => {
    if (TITLES[pathname]) return TITLES[pathname];
    const match = Object.keys(TITLES).find((k) => k !== "/hms" && pathname.startsWith(k));
    return match ? TITLES[match] : ["nav.dashboard", ""];
  }, [pathname]);
  const title = t(titleKey);
  const subtitle = subtitleKey ? t(subtitleKey) : "";

  useEffect(() => setMobile(false), [pathname]);

  const beep = useCallback(() => {
    if (!sound) return;
    try {
      const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const ctx = new Ctx();
      const notes = [880, 1174, 880];
      notes.forEach((f, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sine";
        osc.frequency.value = f;
        gain.gain.setValueAtTime(0.0001, ctx.currentTime + i * 0.18);
        gain.gain.exponentialRampToValueAtTime(0.18, ctx.currentTime + i * 0.18 + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + i * 0.18 + 0.16);
        osc.connect(gain).connect(ctx.destination);
        osc.start(ctx.currentTime + i * 0.18);
        osc.stop(ctx.currentTime + i * 0.18 + 0.2);
      });
      setTimeout(() => ctx.close(), 1200);
    } catch {
      /* audio blocked until first interaction */
    }
  }, [sound]);

  const loadAlerts = useCallback(
    async (scan = false) => {
      try {
        if (scan) setBusy(true);
        const res = await fetch(`/api/hms/alerts${scan ? "?scan=1" : ""}`, { method: scan ? "POST" : "GET" });
        const data = await res.json();
        const list: AlertLite[] = data.alerts ?? [];
        setAlerts(list);
        setCounts((c) => ({ ...c, alerts: list.length, rx: data.counts?.rx ?? c.rx, lab: data.counts?.lab ?? c.lab }));
        const fresh = list.filter((a) => a.severity === "critical" && !beeped.current.has(a.id));
        if (fresh.length) {
          fresh.forEach((a) => beeped.current.add(a.id));
          beep();
        }
      } catch {
        /* offline is fine */
      } finally {
        setBusy(false);
      }
    },
    [beep]
  );

  // Initial load + 30 minute heartbeat (matches the server-side escalation window).
  useEffect(() => {
    loadAlerts(false);
  }, [loadAlerts]);

  useEffect(() => {
    const timer = setInterval(() => loadAlerts(true), 30 * 60 * 1000);
    return () => clearInterval(timer);
  }, [loadAlerts]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setPalette((p) => !p);
      }
      if (e.key === "Escape") {
        setPalette(false);
        setBellOpen(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  async function signOut() {
    await fetch("/api/hms/auth/logout", { method: "POST" });
    router.push("/hms/login");
    router.refresh();
  }

  const sections = NAV.map((s) => ({
    ...s,
    items: s.items.filter((i) => !i.roles || i.roles.includes(user.role)),
  })).filter((s) => s.items.length);

  const badgeValue = (b?: "rx" | "alerts" | "lab") => (b ? counts[b] : 0);

  return (
    <div className="hms-root flex min-h-screen">
      {mobile && <div className="fixed inset-0 z-40 bg-black/45 backdrop-blur-[1px] lg:hidden" onClick={() => setMobile(false)} />}

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-[15.5rem] flex-col border-r transition-transform lg:sticky lg:top-0 lg:h-screen lg:translate-x-0",
          collapsed ? "lg:w-[4.4rem]" : "lg:w-[15.5rem]",
          mobile ? "translate-x-0" : "-translate-x-full"
        )}
        style={{ background: "var(--hms-surface)", borderColor: "var(--hms-border)" }}
      >
        <div className="flex h-14 items-center gap-2 border-b px-3.5" style={{ borderColor: "var(--hms-border)" }}>
          <Link href="/hms" className="flex min-w-0 items-center gap-2">
            <span
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-white shadow-sm"
              style={{ background: `linear-gradient(135deg, ${hospital.accent}, color-mix(in srgb, ${hospital.accent} 55%, #1e293b))` }}
            >
              <Cross size={15} />
            </span>
            <span className={cn("min-w-0", collapsed && "lg:hidden")}>
              <span className="block truncate text-[0.8rem] font-semibold leading-tight">{hospital.name_short}</span>
              <span className="block truncate text-[0.58rem] leading-tight" style={{ color: "var(--hms-faint)" }} dir="rtl">
                {hospital.local}
              </span>
            </span>
          </Link>
          <button className="ml-auto rounded-md p-1 lg:hidden" onClick={() => setMobile(false)} style={{ color: "var(--hms-faint)" }}>
            <X size={16} />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto px-2 py-2.5">
          {sections.map((section, si) => (
            <div key={section.title} className={cn(si > 0 && "mt-3.5")}>
              <p className={cn("mb-1 px-2 text-[0.56rem] font-bold uppercase tracking-[0.1em]", collapsed && "lg:hidden")} style={{ color: "var(--hms-faint)" }}>
                {t(section.title)}
              </p>
              <div className="space-y-0.5">
                {section.items.map((item) => {
                  const active = item.href === "/hms" ? pathname === "/hms" : pathname.startsWith(item.href);
                  const Icon = item.icon;
                  const count = badgeValue(item.badge);
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      data-active={active}
                      title={collapsed ? t(item.label) : undefined}
                      className={cn("hms-nav", collapsed && "lg:justify-center lg:px-0")}
                    >
                      <Icon size={15} className="shrink-0" />
                      <span className={cn("flex-1 truncate", collapsed && "lg:hidden")}>{t(item.label)}</span>
                      {count > 0 && (
                        <span
                          className={cn(
                            "flex h-[1.05rem] min-w-[1.05rem] items-center justify-center rounded-full px-1 text-[0.58rem] font-bold text-white",
                            collapsed && "lg:absolute lg:right-1.5 lg:top-1 lg:h-1.5 lg:min-w-1.5 lg:p-0 lg:text-transparent"
                          )}
                          style={{ background: item.badge === "alerts" ? "#ef4444" : "var(--hms-brand)" }}
                        >
                          {count > 99 ? "99+" : count}
                        </span>
                      )}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        <div className="border-t p-2.5" style={{ borderColor: "var(--hms-border)" }}>
          <div
            className={cn("flex items-center gap-2 rounded-lg px-2 py-1.5", collapsed && "lg:justify-center")}
            style={{ background: "var(--hms-surface-2)" }}
          >
            <Ring value={health.score} size={38} label={t("shell.health")} />
            <div className={cn("min-w-0", collapsed && "lg:hidden")}>
              <p className="truncate text-[0.66rem] font-semibold">{t("shell.system", { score: health.score })}</p>
              <p className="truncate text-[0.58rem]" style={{ color: "var(--hms-faint)" }}>
                {t("shell.critical", { critical: health.critical, warning: health.warning })}
              </p>
            </div>
          </div>
          <button
            onClick={() => setCollapsed((c) => !c)}
            className={cn("hms-nav mt-1.5 hidden w-full lg:flex", collapsed && "lg:justify-center lg:px-0")}
          >
            <ChevronsLeft size={14} className={cn("transition-transform", collapsed && "rotate-180")} />
            <span className={cn(collapsed && "lg:hidden")}>{t("shell.collapse")}</span>
          </button>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header
          className="sticky top-0 z-30 flex h-14 items-center gap-2 border-b px-3 backdrop-blur sm:px-4"
          style={{ background: "color-mix(in srgb, var(--hms-surface) 88%, transparent)", borderColor: "var(--hms-border)" }}
        >
          <button className="hms-btn hms-btn-ghost hms-btn-sm lg:hidden" onClick={() => setMobile(true)}>
            <Menu size={16} />
          </button>
          <div className="min-w-0">
            <h1 className="truncate text-[0.88rem] font-semibold tracking-[-0.01em]">{title}</h1>
            <p className="truncate text-[0.62rem]" style={{ color: "var(--hms-faint)" }}>{subtitle}</p>
          </div>

          <button
            onClick={() => setPalette(true)}
            className="ml-auto hidden items-center gap-2 rounded-lg border px-2.5 py-1.5 text-[0.7rem] sm:flex"
            style={{ borderColor: "var(--hms-border)", color: "var(--hms-muted)", background: "var(--hms-surface-2)" }}
          >
            <Search size={13} /> {t("shell.search")}
            <kbd className="rounded border px-1 text-[0.58rem]" style={{ borderColor: "var(--hms-border)" }}>⌘K</kbd>
          </button>

          <div className="me-1 hidden sm:block">
            <LangSwitch />
          </div>

          {licence.status !== "active" && (
            <Link
              href="/hms/activate"
              className="hidden items-center gap-1 rounded-lg px-2 py-1 text-[0.62rem] font-semibold md:flex"
              style={{ background: licence.daysLeft > 0 ? "#fef3c7" : "#fee2e2", color: licence.daysLeft > 0 ? "#92400e" : "#991b1b" }}
            >
              <KeyRound size={11} />
              {licence.daysLeft > 0 ? t("shell.trial", { days: licence.daysLeft }) : t("shell.expired")}
            </Link>
          )}

          <div className="relative">
            <button
              onClick={() => {
                setBellOpen((o) => !o);
                if (!bellOpen) loadAlerts(false);
              }}
              className="hms-btn hms-btn-ghost hms-btn-sm relative"
              aria-label={t("shell.alerts")}
            >
              <Bell size={16} />
              {counts.alerts > 0 && (
                <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[0.55rem] font-bold text-white">
                  {counts.alerts}
                </span>
              )}
            </button>

            {bellOpen && (
              <div
                className="absolute right-0 top-11 z-50 w-[21rem] overflow-hidden rounded-xl border shadow-xl"
                style={{ background: "var(--hms-surface)", borderColor: "var(--hms-border)" }}
              >
                <div className="flex items-center justify-between border-b px-3 py-2" style={{ borderColor: "var(--hms-border)" }}>
                  <div>
                    <p className="text-[0.74rem] font-semibold">{t("shell.monitor")}</p>
                    <p className="text-[0.6rem]" style={{ color: "var(--hms-faint)" }}>
                      {t("shell.scanNote")}
                    </p>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setSound((s) => !s)}
                      className="hms-btn hms-btn-sm hms-btn-ghost"
                      title={sound ? t("shell.mute") : t("shell.unmute")}
                    >
                      {sound ? "🔔" : "🔕"}
                    </button>
                    <button className="hms-btn hms-btn-sm" onClick={() => loadAlerts(true)} disabled={busy}>
                      {busy ? <Spinner size={11} /> : <Activity size={11} />} {t("shell.scan")}
                    </button>
                  </div>
                </div>
                <div className="max-h-[22rem] overflow-y-auto">
                  {alerts.length === 0 ? (
                    <p className="px-3 py-6 text-center text-[0.72rem]" style={{ color: "var(--hms-muted)" }}>
                      {t("shell.noAlarms")}
                    </p>
                  ) : (
                    alerts.map((a) => (
                      <Link
                        key={a.id}
                        href="/hms/alerts"
                        className="block border-b px-3 py-2 last:border-0 hover:bg-[var(--hms-surface-2)]"
                        style={{ borderColor: "var(--hms-border)" }}
                        onClick={() => setBellOpen(false)}
                      >
                        <div className="flex items-center gap-1.5">
                          <span
                            className="h-1.5 w-1.5 shrink-0 rounded-full"
                            style={{ background: a.severity === "critical" ? "#ef4444" : a.severity === "warning" ? "#f59e0b" : "#3b82f6" }}
                          />
                          <p className="min-w-0 flex-1 truncate text-[0.72rem] font-medium">{a.title}</p>
                        </div>
                        <p className="mt-0.5 pl-3 text-[0.6rem] capitalize" style={{ color: "var(--hms-faint)" }}>
                          {a.category} · {statusText(lang, a.severity)}
                        </p>
                      </Link>
                    ))
                  )}
                </div>
                <Link
                  href="/hms/alerts"
                  onClick={() => setBellOpen(false)}
                  className="block border-t px-3 py-2 text-center text-[0.68rem] font-semibold"
                  style={{ borderColor: "var(--hms-border)", color: "var(--hms-brand)" }}
                >
                  {t("shell.openMonitor")}
                </Link>
              </div>
            )}
          </div>

          <div className="group relative">
            <button className="hms-btn hms-btn-ghost hms-btn-sm gap-1.5">
              <span
                className="flex h-6 w-6 items-center justify-center rounded-full text-[0.6rem] font-bold"
                style={{ background: "var(--hms-brand-soft)", color: "var(--hms-brand-ink)" }}
              >
                {user.name.split(" ").slice(-1)[0]?.[0] ?? "A"}
              </span>
              <span className="hidden text-[0.7rem] font-medium sm:block">{user.name}</span>
            </button>
            <div
              className="invisible absolute right-0 top-11 z-50 w-52 rounded-xl border p-1 opacity-0 shadow-xl transition group-hover:visible group-hover:opacity-100"
              style={{ background: "var(--hms-surface)", borderColor: "var(--hms-border)" }}
            >
              <div className="px-2 py-1.5">
                <p className="truncate text-[0.74rem] font-semibold">{user.name}</p>
                <p className="truncate text-[0.62rem]" style={{ color: "var(--hms-faint)" }}>{user.title ?? user.role}</p>
                <p className="truncate text-[0.6rem]" style={{ color: "var(--hms-faint)" }}>{user.email}</p>
              </div>
              <div className="px-1 pb-1 pt-0.5"><LangSwitch compact /></div>
              <Link href="/hms/guide" className="hms-nav h-8 text-[0.7rem]">{t("shell.guide")}</Link>
              {user.role === "admin" && (
                <Link href="/hms/settings" className="hms-nav h-8 text-[0.7rem]">{t("shell.settings")}</Link>
              )}
              <Link href="/dashboard" className="hms-nav h-8 text-[0.7rem]">{t("shell.salon")}</Link>
              <button onClick={signOut} className="hms-nav h-8 w-full text-[0.7rem]" style={{ color: "#b91c1c" }}>
                <LogOut size={13} /> {t("shell.signOut")}
              </button>
            </div>
          </div>
        </header>

        <main className="flex-1 px-3 py-3.5 sm:px-4 sm:py-4">{children}</main>

        <footer className="border-t px-4 py-2 text-[0.6rem]" style={{ borderColor: "var(--hms-border)", color: "var(--hms-faint)" }}>
          {hospital.name} · {licence.plan} · {t("shell.footer")} · {t("shell.footerHealth")}{" "}
          {counts.alerts === 0 ? t("shell.clear") : t("shell.openCount", { count: counts.alerts })}
        </footer>
      </div>

      {palette && <CommandPalette onClose={() => setPalette(false)} />}
    </div>
  );
}

function CommandPalette({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const { t } = useLang();
  const [q, setQ] = useState("");
  const [results, setResults] = useState<{ patients: { id: string; name: string; mrn: string }[]; drugs: { id: string; name: string }[] }>({
    patients: [],
    drugs: [],
  });
  const inputRef = useRef<HTMLInputElement>(null);
  useEffect(() => inputRef.current?.focus(), []);

  useEffect(() => {
    if (q.length < 2) {
      setResults({ patients: [], drugs: [] });
      return;
    }
    const t = setTimeout(async () => {
      try {
        const [p, m] = await Promise.all([
          fetch(`/api/hms/patients?q=${encodeURIComponent(q)}&limit=5`).then((r) => r.json()),
          fetch(`/api/hms/medicines?q=${encodeURIComponent(q)}&limit=5`).then((r) => r.json()),
        ]);
        setResults({ patients: p.items ?? [], drugs: m.items ?? [] });
      } catch {
        /* ignore */
      }
    }, 180);
    return () => clearTimeout(t);
  }, [q]);

  const pages = NAV.flatMap((s) => s.items)
    .map((i) => ({ ...i, text: t(i.label) }))
    .filter((i) => i.text.toLowerCase().includes(q.toLowerCase()))
    .slice(0, 5);

  return (
    <div className="fixed inset-0 z-[80] flex items-start justify-center bg-black/40 px-4 pt-[12vh]" onClick={onClose}>
      <div
        className="w-full max-w-lg overflow-hidden rounded-xl border shadow-2xl"
        style={{ background: "var(--hms-surface)", borderColor: "var(--hms-border)" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2 border-b px-3 py-2.5" style={{ borderColor: "var(--hms-border)" }}>
          <Search size={15} style={{ color: "var(--hms-faint)" }} />
          <input
            ref={inputRef}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={t("shell.palettePlaceholder")}
            className="w-full bg-transparent text-[0.82rem] outline-none"
          />
          <kbd className="rounded border px-1 text-[0.6rem]" style={{ borderColor: "var(--hms-border)", color: "var(--hms-faint)" }}>esc</kbd>
        </div>
        <div className="max-h-[55vh] overflow-y-auto p-1.5">
          {pages.length > 0 && (
            <>
              <p className="px-2 py-1 text-[0.58rem] font-bold uppercase tracking-wide" style={{ color: "var(--hms-faint)" }}>{t("shell.palettePages")}</p>
              {pages.map((p) => (
                <button
                  key={p.href}
                  onClick={() => {
                    router.push(p.href);
                    onClose();
                  }}
                  className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-[0.76rem] hover:bg-[var(--hms-surface-2)]"
                >
                  <p.icon size={13} style={{ color: "var(--hms-brand)" }} /> {p.text}
                </button>
              ))}
            </>
          )}
          {results.patients.length > 0 && (
            <>
              <p className="mt-1 px-2 py-1 text-[0.58rem] font-bold uppercase tracking-wide" style={{ color: "var(--hms-faint)" }}>{t("shell.palettePatients")}</p>
              {results.patients.map((p) => (
                <button
                  key={p.id}
                  onClick={() => {
                    router.push(`/hms/patients/${p.id}`);
                    onClose();
                  }}
                  className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-[0.76rem] hover:bg-[var(--hms-surface-2)]"
                >
                  <Users size={13} style={{ color: "var(--hms-brand)" }} />
                  <span className="flex-1 truncate">{p.name}</span>
                  <span className="text-[0.6rem]" style={{ color: "var(--hms-faint)" }}>{p.mrn}</span>
                </button>
              ))}
            </>
          )}
          {results.drugs.length > 0 && (
            <>
              <p className="mt-1 px-2 py-1 text-[0.58rem] font-bold uppercase tracking-wide" style={{ color: "var(--hms-faint)" }}>{t("shell.paletteMedicines")}</p>
              {results.drugs.map((m) => (
                <button
                  key={m.id}
                  onClick={() => {
                    router.push(`/hms/pharmacy?q=${encodeURIComponent(m.name)}`);
                    onClose();
                  }}
                  className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-[0.76rem] hover:bg-[var(--hms-surface-2)]"
                >
                  <Pill size={13} style={{ color: "var(--hms-brand)" }} /> {m.name}
                </button>
              ))}
            </>
          )}
          {q.length >= 2 && !results.patients.length && !results.drugs.length && !pages.length && (
            <p className="px-2 py-6 text-center text-[0.72rem]" style={{ color: "var(--hms-muted)" }}>{t("shell.nothingMatched", { q })}</p>
          )}
          {q.length < 2 && (
            <p className="px-2 py-6 text-center text-[0.7rem]" style={{ color: "var(--hms-muted)" }}>
              {t("shell.typeTwo")}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
