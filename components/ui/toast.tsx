"use client";

import { cn } from "@/lib/utils";
import { AlertTriangle, CheckCircle2, Info, X, XCircle } from "lucide-react";
import React, { createContext, useCallback, useContext, useMemo, useState } from "react";

type ToastKind = "success" | "error" | "info" | "warning";
type ToastItem = { id: number; kind: ToastKind; title: string; description?: string };

const ToastContext = createContext<{
  push: (t: Omit<ToastItem, "id">) => void;
  success: (title: string, description?: string) => void;
  error: (title: string, description?: string) => void;
  info: (title: string, description?: string) => void;
} | null>(null);

const ICON: Record<ToastKind, React.ReactNode> = {
  success: <CheckCircle2 size={16} className="text-emerald-500" />,
  error: <XCircle size={16} className="text-rose-500" />,
  info: <Info size={16} className="text-sky-500" />,
  warning: <AlertTriangle size={16} className="text-amber-500" />,
};

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);

  const remove = useCallback((id: number) => {
    setItems((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const push = useCallback(
    (t: Omit<ToastItem, "id">) => {
      const id = Date.now() + Math.random();
      setItems((prev) => [...prev.slice(-3), { ...t, id }]);
      setTimeout(() => remove(id), 4600);
    },
    [remove]
  );

  const value = useMemo(
    () => ({
      push,
      success: (title: string, description?: string) => push({ kind: "success", title, description }),
      error: (title: string, description?: string) => push({ kind: "error", title, description }),
      info: (title: string, description?: string) => push({ kind: "info", title, description }),
    }),
    [push]
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="pointer-events-none fixed bottom-4 right-4 z-[100] flex w-[calc(100vw-2rem)] max-w-sm flex-col gap-2">
        {items.map((t) => (
          <div
            key={t.id}
            className={cn(
              "anim-pop pointer-events-auto flex items-start gap-3 rounded-xl border border-line bg-surface p-3 shadow-[0_18px_40px_-20px_rgba(0,0,0,0.35)]"
            )}
          >
            <div className="mt-0.5">{ICON[t.kind]}</div>
            <div className="min-w-0 flex-1">
              <p className="text-[0.8125rem] font-semibold leading-snug">{t.title}</p>
              {t.description && <p className="mt-0.5 text-xs leading-relaxed text-muted">{t.description}</p>}
            </div>
            <button onClick={() => remove(t.id)} className="rounded p-0.5 text-faint transition hover:bg-surface-3 hover:text-ink">
              <X size={13} />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    // safe no-op fallback so components stay usable outside the provider
    return {
      push: () => {},
      success: () => {},
      error: () => {},
      info: () => {},
    };
  }
  return ctx;
}
