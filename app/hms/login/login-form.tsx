"use client";

import { Cross, Eye, EyeOff, Loader2, Lock, Mail } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { digits, t, type Lang } from "@/lib/hms/i18n";
import { LoginLangSwitch } from "@/components/hms/lang-switch";

/** The nine demonstration accounts, matching `lib/hms/seed.ts` exactly. */
const DEMO: { email: string; label: string; roleEn: string; roleFa: string }[] = [
  { email: "doctor@aybek.hospital", label: "Dr. Mamon Aminyar", roleEn: "Owner · administrator", roleFa: "مالک · مدیر" },
  { email: "arash@aybek.hospital", label: "Dr. Arash Shirazi", roleEn: "OPD physician", roleFa: "داکتر معاینات" },
  { email: "evelyn@aybek.hospital", label: "Dr. Evelyn Reed", roleEn: "OPD physician", roleFa: "داکتر معاینات" },
  { email: "yusuf@aybek.hospital", label: "Dr. Yusuf Karimi", roleEn: "Surgeon", roleFa: "جراح" },
  { email: "pharmacy@aybek.hospital", label: "Zahra Ahmadi", roleEn: "Pharmacist", roleFa: "دواخانه" },
  { email: "lab@aybek.hospital", label: "Samir Hadi", roleEn: "Laboratory", roleFa: "لابراتوار" },
  { email: "laila@aybek.hospital", label: "Dr. Laila Noor", roleEn: "Radiology", roleFa: "اکسری" },
  { email: "nurse@aybek.hospital", label: "Nadia Sultani", roleEn: "Nursing", roleFa: "نرسنگ" },
  { email: "reception@aybek.hospital", label: "Reza Amiri", roleEn: "Reception", roleFa: "استقبال" },
];

export function LoginForm({
  hospital,
  local,
  plan,
  status,
  daysLeft,
  lang,
}: {
  hospital: string;
  local: string;
  plan: string;
  status: string;
  daysLeft: number;
  lang: Lang;
}) {
  const router = useRouter();
  const tr = (key: string, vars?: Record<string, string | number>) => t(lang, key, vars);
  const [email, setEmail] = useState("doctor@aybek.hospital");
  const [password, setPassword] = useState("mamonaminyar");
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showDemo, setShowDemo] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/hms/auth/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? tr("login.bad"));
        setBusy(false);
        return;
      }
      router.push("/hms");
      router.refresh();
    } catch {
      setError(tr("login.offline"));
      setBusy(false);
    }
  }

  const statusLine =
    status === "active"
      ? tr("login.licensed")
      : status === "trial"
        ? tr("login.trialLeft", { days: digits(lang, daysLeft) })
        : tr("login.trialOver");

  return (
    <div className="w-full max-w-sm">
      <div className="mb-6 flex items-start justify-between gap-2 lg:hidden">
        <div className="flex items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg text-white" style={{ background: "var(--brand)" }}>
            <Cross size={16} />
          </span>
          <div>
            <p className="text-[0.8rem] font-semibold leading-tight">{hospital}</p>
            <p className="text-[0.62rem]" style={{ color: "var(--text-faint)" }} dir="rtl">{local}</p>
          </div>
        </div>
        <LoginLangSwitch />
      </div>

      <div className="mb-3 hidden justify-end lg:flex">
        <LoginLangSwitch />
      </div>

      <h2 className="text-[1.35rem] font-semibold tracking-[-0.02em]">{tr("login.title")}</h2>
      <p className="mt-1 text-[0.76rem]" style={{ color: "var(--text-muted)" }}>{tr("login.subtitle")}</p>

      <form onSubmit={submit} className="mt-5 space-y-3">
        <label className="block">
          <span className="hms-label">{tr("login.email")}</span>
          <span className="relative block">
            <Mail size={14} className="pointer-events-none absolute start-2.5 top-1/2 -translate-y-1/2" style={{ color: "var(--text-faint)" }} />
            <input
              className="hms-input ps-8"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@aybek.hospital"
              autoComplete="username"
              dir="ltr"
              required
            />
          </span>
        </label>

        <label className="block">
          <span className="hms-label">{tr("login.password")}</span>
          <span className="relative block">
            <Lock size={14} className="pointer-events-none absolute start-2.5 top-1/2 -translate-y-1/2" style={{ color: "var(--text-faint)" }} />
            <input
              className="hms-input ps-8 pe-9"
              type={show ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              dir="ltr"
              required
            />
            <button
              type="button"
              onClick={() => setShow((s) => !s)}
              className="absolute end-2 top-1/2 -translate-y-1/2"
              style={{ color: "var(--text-faint)" }}
              aria-label={show ? tr("login.hide") : tr("login.show")}
            >
              {show ? <EyeOff size={14} /> : <Eye size={14} />}
            </button>
          </span>
        </label>

        {error && (
          <p className="rounded-lg px-2.5 py-2 text-[0.72rem]" style={{ background: "#fee2e2", color: "#991b1b" }}>
            {error}
          </p>
        )}

        <button type="submit" disabled={busy} className="hms-btn hms-btn-primary mt-1 w-full" style={{ height: "2.5rem" }}>
          {busy ? <Loader2 size={14} className="animate-spin" /> : null}
          {busy ? tr("login.busy") : tr("login.submit")}
        </button>
      </form>

      <div className="mt-4 rounded-lg px-3 py-2.5 text-[0.68rem]" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
        <div className="flex items-center justify-between">
          <span className="font-semibold">{tr("login.demo")}</span>
          <button type="button" onClick={() => setShowDemo((s) => !s)} className="text-[0.66rem] font-semibold" style={{ color: "var(--brand)" }}>
            {showDemo ? tr("login.hide") : tr("login.show")}
          </button>
        </div>
        {showDemo && (
          <div className="mt-2 space-y-1">
            {DEMO.map((d) => (
              <button
                key={d.email}
                type="button"
                onClick={() => {
                  setEmail(d.email);
                  setPassword("mamonaminyar");
                }}
                className="flex w-full items-center justify-between gap-2 rounded px-1.5 py-1 text-start hover:bg-[var(--surface-3)]"
              >
                <span className="min-w-0">
                  <span className="block truncate font-medium">{d.label}</span>
                  <span className="block truncate font-mono text-[0.6rem]" style={{ color: "var(--text-faint)" }} dir="ltr">{d.email}</span>
                </span>
                <span className="shrink-0 text-[0.6rem]" style={{ color: "var(--text-faint)" }}>{lang === "fa" ? d.roleFa : d.roleEn}</span>
              </button>
            ))}
            <p className="pt-1 text-[0.62rem]" style={{ color: "var(--text-faint)" }}>
              {tr("login.demoHint")}: <span className="font-mono font-semibold">mamonaminyar</span>
            </p>
          </div>
        )}
      </div>

      <p className="mt-4 text-center text-[0.64rem]">
        <a href="/login" className="font-semibold" style={{ color: "var(--brand)" }}>{tr("login.switchSalon")} ↗</a>
      </p>
      <p className="mt-2 text-center text-[0.64rem]" style={{ color: "var(--text-faint)" }}>{statusLine}</p>
    </div>
  );
}
