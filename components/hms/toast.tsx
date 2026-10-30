"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { AlertTriangle, CheckCircle2, Info, X, XCircle } from "lucide-react";
import { useLang } from "./lang-provider";

/**
 * A single, quiet place for "it worked" / "it did not".
 *
 * Every screen used to invent its own inline message; some swallowed failures
 * entirely. The workspace now shares one toaster, so a pharmacy dispense, a
 * settings save and a licence activation all report the same way — and a
 * failure can never be mistaken for success.
 */

export type ToastTone = "good" | "bad" | "warn" | "info";
export type Toast = { id: number; tone: ToastTone; title: string; body?: string; ttl?: number };

type Ctx = {
  push: (t: Omit<Toast, "id">) => void;
  success: (title: string, body?: string) => void;
  error: (title: string, body?: string) => void;
  info: (title: string, body?: string) => void;
};

const ToastCtx = createContext<Ctx | null>(null);

export function useToast() {
  const ctx = useContext(ToastCtx);
  if (!ctx) throw new Error("useToast must be used inside <ToastProvider>");
  return ctx;
}

const ICONS: Record<ToastTone, typeof Info> = {
  good: CheckCircle2,
  bad: XCircle,
  warn: AlertTriangle,
  info: Info,
};

const COLORS: Record<ToastTone, string> = {
  good: "#0f9d6e",
  bad: "#dc2626",
  warn: "#d97706",
  info: "var(--hms-brand)",
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const { tx } = useLang();
  const [items, setItems] = useState<Toast[]>([]);
  const seq = useRef(0);

  const remove = useCallback((id: number) => setItems((list) => list.filter((t) => t.id !== id)), []);

  const push = useCallback(
    (t: Omit<Toast, "id">) => {
      const id = ++seq.current;
      setItems((list) => [...list.slice(-3), { ...t, id }]);
      const ttl = t.ttl ?? (t.tone === "bad" ? 7000 : 4200);
      setTimeout(() => remove(id), ttl);
    },
    [remove]
  );

  const api = useMemo<Ctx>(
    () => ({
      push,
      success: (title, body) => push({ tone: "good", title, body }),
      error: (title, body) => push({ tone: "bad", title, body }),
      info: (title, body) => push({ tone: "info", title, body }),
    }),
    [push]
  );

  // Announce to screen readers without stealing focus.
  useEffect(() => {
    const last = items[items.length - 1];
    if (!last) return;
    const el = document.getElementById("hms-live");
    if (el) el.textContent = `${last.title} ${last.body ?? ""}`;
  }, [items]);

  return (
    <ToastCtx.Provider value={api}>
      {children}
      <div className="hms-toaster" role="region" aria-live="polite" aria-label={tx("Notifications", "اطلاعیه‌ها")}>
        <span id="hms-live" className="sr-only" />
        {items.map((t) => {
          const Icon = ICONS[t.tone];
          return (
            <div key={t.id} className="hms-toast" data-tone={t.tone}>
              <Icon size={15} style={{ color: COLORS[t.tone], marginTop: 1, flexShrink: 0 }} />
              <div className="min-w-0 flex-1">
                <p className="text-[0.76rem] font-semibold leading-snug">{t.title}</p>
                {t.body && <p className="mt-0.5 text-[0.68rem] leading-relaxed" style={{ color: "var(--hms-muted)" }}>{t.body}</p>}
              </div>
              <button onClick={() => remove(t.id)} aria-label={tx("Dismiss", "بستن")} className="shrink-0 rounded p-0.5" style={{ color: "var(--hms-faint)" }}>
                <X size={12} />
              </button>
            </div>
          );
        })}
      </div>
    </ToastCtx.Provider>
  );
}
