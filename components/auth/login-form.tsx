"use client";

import { Button } from "@/components/ui/primitives";
import { useToast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";
import { ArrowRight, Check, Eye, EyeOff, Lock, Mail, ShieldCheck, X } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";

const DEMO_EMAIL = "mamon.aminyar650432@gmail.com";
const DEMO_PASSWORD = "mamonaminyar";

export function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const toast = useToast();
  const [email, setEmail] = useState(DEMO_EMAIL);
  const [password, setPassword] = useState(DEMO_PASSWORD);
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState<"credentials" | "google" | string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const next = params.get("next") || "/dashboard";

  async function signIn(kind: "credentials" | "google", payload?: Record<string, string>) {
    setLoading(kind);
    setError(null);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload ?? { email, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Unable to sign in");
      toast.success("Welcome back", `Signed in as ${data.user?.name ?? "your account"}`);
      router.push(next);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to sign in");
      setLoading(null);
    }
  }

  async function demoLogin(role: string) {
    setLoading(role);
    setError(null);
    try {
      const res = await fetch("/api/auth/demo", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ role }),
      });
      if (!res.ok) throw new Error("Demo account unavailable");
      toast.success(`Signed in as ${role}`, "Role-based permissions are applied to this session.");
      router.push(next);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to sign in");
      setLoading(null);
    }
  }

  return (
    <div className="anim-up">
      <div className="mb-7">
        <h2 className="text-[1.6rem] font-semibold leading-tight tracking-[-0.02em]">Sign in to Slotly</h2>
        <p className="mt-1.5 text-[0.8125rem] text-muted">
          Manage your calendar, team and payments in one place.
        </p>
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          signIn("credentials");
        }}
        className="space-y-4"
      >
        <div>
          <label className="label" htmlFor="email">
            Email address
          </label>
          <div className="relative">
            <Mail size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-faint" />
            <input
              id="email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="input h-10 pl-9"
              placeholder="you@business.com"
              required
            />
          </div>
        </div>

        <div>
          <div className="flex items-baseline justify-between">
            <label className="label" htmlFor="password">
              Password
            </label>
            <button
              type="button"
              onClick={() => toast.info("Password reset", "In this demo, use the credentials shown below.")}
              className="mb-1 text-[0.7rem] font-medium text-brand hover:underline"
            >
              Forgot password?
            </button>
          </div>
          <div className="relative">
            <Lock size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-faint" />
            <input
              id="password"
              type={show ? "text" : "password"}
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="input h-10 pl-9 pr-9"
              required
            />
            <button
              type="button"
              onClick={() => setShow((s) => !s)}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded p-1 text-faint transition hover:text-ink"
              aria-label={show ? "Hide password" : "Show password"}
            >
              {show ? <EyeOff size={14} /> : <Eye size={14} />}
            </button>
          </div>
        </div>

        {error && (
          <div className="anim-fade flex items-start gap-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-[0.75rem] text-rose-700 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-300">
            <X size={13} className="mt-0.5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <Button type="submit" variant="primary" size="lg" className="w-full" loading={loading === "credentials"}>
          Sign in
          {loading !== "credentials" && <ArrowRight size={15} />}
        </Button>
      </form>

      <div className="my-5 flex items-center gap-3">
        <div className="h-px flex-1 bg-line" />
        <span className="text-[0.68rem] uppercase tracking-wider text-faint">or continue with</span>
        <div className="h-px flex-1 bg-line" />
      </div>

      <button
        onClick={() => signIn("google")}
        disabled={!!loading}
        className="flex h-10 w-full items-center justify-center gap-2.5 rounded-xl border border-line bg-surface text-[0.8125rem] font-medium transition hover:bg-surface-3 disabled:opacity-60"
      >
        {loading === "google" ? (
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-line border-t-brand" />
        ) : (
          <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden>
            <path fill="#4285F4" d="M23.5 12.27c0-.85-.08-1.67-.22-2.45H12v4.64h6.45a5.52 5.52 0 0 1-2.4 3.62v3h3.87c2.26-2.09 3.58-5.17 3.58-8.81z" />
            <path fill="#34A853" d="M12 24c3.24 0 5.96-1.08 7.94-2.92l-3.88-3c-1.08.72-2.45 1.15-4.06 1.15-3.13 0-5.78-2.11-6.73-4.95H1.28v3.1A12 12 0 0 0 12 24z" />
            <path fill="#FBBC05" d="M5.27 14.28a7.2 7.2 0 0 1 0-4.56v-3.1H1.28a12 12 0 0 0 0 10.76l3.99-3.1z" />
            <path fill="#EA4335" d="M12 4.75c1.76 0 3.34.61 4.59 1.8l3.44-3.44A12 12 0 0 0 1.28 6.62l3.99 3.1C6.22 6.88 8.87 4.75 12 4.75z" />
          </svg>
        )}
        Continue with Google
      </button>

      <div className="mt-6 rounded-xl border border-line bg-surface-2 p-3">
        <div className="mb-2 flex items-center justify-between">
          <p className="text-[0.7rem] font-semibold uppercase tracking-wider text-faint">Demo access</p>
          <span className="text-[0.62rem] text-faint">no signup needed</span>
        </div>
        <div className="grid grid-cols-3 gap-1.5">
          {[
            { role: "owner", label: "Owner" },
            { role: "manager", label: "Manager" },
            { role: "staff", label: "Staff" },
          ].map((r) => (
            <button
              key={r.role}
              onClick={() => demoLogin(r.role)}
              disabled={!!loading}
              className="flex items-center justify-center gap-1 rounded-lg border border-line bg-surface px-2 py-1.5 text-[0.7rem] font-medium transition hover:border-brand/40 hover:bg-brand-soft hover:text-brand-ink disabled:opacity-50"
            >
              {loading === r.role ? (
                <span className="h-3 w-3 animate-spin rounded-full border-2 border-brand/30 border-t-brand" />
              ) : (
                <Check size={11} />
              )}
              {r.label}
            </button>
          ))}
        </div>
        <p className="mt-2 text-[0.65rem] leading-relaxed text-faint">
          Owner sees everything · Manager runs the floor · Staff see their own diary only.
        </p>
      </div>

      <div className="mt-5 space-y-2 text-[0.68rem] text-faint">
        <p className="flex items-center gap-1.5">
          <ShieldCheck size={12} className="text-emerald-500" />
          Protected by role-based access control and secure httpOnly sessions.
        </p>
        <p className={cn("rounded-lg bg-surface-2 px-2.5 py-2 font-mono text-[0.66rem] text-muted")}>
          {DEMO_EMAIL} · {DEMO_PASSWORD}
        </p>
      </div>
    </div>
  );
}
