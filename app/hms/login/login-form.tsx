"use client";

import { Cross, Eye, EyeOff, Loader2, Lock, Mail } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

const DEMO = [
  { email: "doctor@aybek.hospital", label: "Dr. Mamon Aminyar", role: "Owner · administrator" },
  { email: "arash@aybek.hospital", label: "Dr. Arash Safi", role: "OPD physician" },
  { email: "yusuf@aybek.hospital", label: "Dr. Yusuf Karimi", role: "Surgeon" },
  { email: "zahra@aybek.hospital", label: "Zahra Noori", role: "Pharmacist" },
  { email: "samir@aybek.hospital", label: "Samir Popal", role: "Laboratory" },
  { email: "laila@aybek.hospital", label: "Dr. Laila Aziz", role: "Radiology" },
  { email: "nadia@aybek.hospital", label: "Nadia Rahimi", role: "Nursing" },
  { email: "reza@aybek.hospital", label: "Reza Amin", role: "Reception" },
];

export function LoginForm({
  hospital,
  local,
  plan,
  status,
  daysLeft,
}: {
  hospital: string;
  local: string;
  plan: string;
  status: string;
  daysLeft: number;
}) {
  const router = useRouter();
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
        setError(data.error ?? "Could not sign in.");
        setBusy(false);
        return;
      }
      router.push("/hms");
      router.refresh();
    } catch {
      setError("The local server did not respond. Is the application still running?");
      setBusy(false);
    }
  }

  return (
    <div className="w-full max-w-sm">
      <div className="mb-6 flex items-center gap-2.5 lg:hidden">
        <span className="flex h-9 w-9 items-center justify-center rounded-lg text-white" style={{ background: "var(--brand)" }}>
          <Cross size={16} />
        </span>
        <div>
          <p className="text-[0.8rem] font-semibold leading-tight">{hospital}</p>
          <p className="text-[0.62rem]" style={{ color: "var(--text-faint)" }} dir="rtl">{local}</p>
        </div>
      </div>

      <h2 className="text-[1.35rem] font-semibold tracking-[-0.02em]">Sign in</h2>
      <p className="mt-1 text-[0.76rem]" style={{ color: "var(--text-muted)" }}>
        Use your hospital email. Sessions last 14 days on this device.
      </p>

      <form onSubmit={submit} className="mt-5 space-y-3">
        <label className="block">
          <span className="hms-label">Hospital email</span>
          <span className="relative block">
            <Mail size={14} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2" style={{ color: "var(--text-faint)" }} />
            <input
              className="hms-input pl-8"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@aybek.hospital"
              autoComplete="username"
              required
            />
          </span>
        </label>

        <label className="block">
          <span className="hms-label">Password</span>
          <span className="relative block">
            <Lock size={14} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2" style={{ color: "var(--text-faint)" }} />
            <input
              className="hms-input pl-8 pr-9"
              type={show ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              required
            />
            <button
              type="button"
              onClick={() => setShow((s) => !s)}
              className="absolute right-2 top-1/2 -translate-y-1/2"
              style={{ color: "var(--text-faint)" }}
              aria-label={show ? "Hide password" : "Show password"}
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
          {busy ? "Opening workspace…" : "Enter hospital"}
        </button>
      </form>

      <div className="mt-4 rounded-lg px-3 py-2.5 text-[0.68rem]" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
        <div className="flex items-center justify-between">
          <span className="font-semibold">Demonstration staff accounts</span>
          <button type="button" onClick={() => setShowDemo((s) => !s)} className="text-[0.66rem] font-semibold" style={{ color: "var(--brand)" }}>
            {showDemo ? "Hide" : "Show"}
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
                className="flex w-full items-center justify-between rounded px-1.5 py-1 text-left hover:bg-[var(--surface-3)]"
              >
                <span className="min-w-0">
                  <span className="block truncate font-medium">{d.label}</span>
                  <span className="block truncate" style={{ color: "var(--text-faint)" }}>{d.email}</span>
                </span>
                <span className="shrink-0 text-[0.6rem]" style={{ color: "var(--text-faint)" }}>{d.role}</span>
              </button>
            ))}
            <p className="pt-1 text-[0.62rem]" style={{ color: "var(--text-faint)" }}>
              Every demonstration account uses the password <span className="font-mono font-semibold">mamonaminyar</span>.
            </p>
          </div>
        )}
      </div>

      <p className="mt-4 text-center text-[0.64rem]">
        <a href="/login" className="font-semibold" style={{ color: "var(--brand)" }}>Salon booking workspace →</a>
      </p>
      <p className="mt-2 text-center text-[0.64rem]" style={{ color: "var(--text-faint)" }}>
        {plan} · {status === "active" ? "Licensed installation" : status === "trial" ? `Trial — ${daysLeft} day(s) remaining` : "Trial expired — activation required"}
      </p>
    </div>
  );
}
