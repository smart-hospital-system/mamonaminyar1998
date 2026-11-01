"use client";

import { cn } from "@/lib/utils";
import { AlertTriangle, X } from "lucide-react";
import React, { useEffect } from "react";
import { createPortal } from "react-dom";
import { Button } from "./primitives";

export function Modal({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  size = "md",
  className,
}: {
  open: boolean;
  onClose: () => void;
  title?: React.ReactNode;
  description?: React.ReactNode;
  children?: React.ReactNode;
  footer?: React.ReactNode;
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
}) {
  const [mounted, setMounted] = React.useState(false);
  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  if (!mounted || !open) return null;

  const widths = { sm: "max-w-sm", md: "max-w-lg", lg: "max-w-2xl", xl: "max-w-4xl" };

  return createPortal(
    <div className="fixed inset-0 z-[90] flex items-end justify-center sm:items-center">
      <div className="anim-fade absolute inset-0 bg-[#0a0912]/45 backdrop-blur-[2px]" onClick={onClose} />
      <div
        role="dialog"
        aria-modal="true"
        className={cn(
          "anim-up relative z-10 max-h-[92vh] w-full overflow-hidden rounded-t-2xl border border-line bg-surface shadow-2xl sm:rounded-2xl",
          widths[size],
          className
        )}
      >
        {(title || description) && (
          <div className="flex items-start justify-between gap-4 border-b border-line px-5 py-4">
            <div className="min-w-0">
              {title && <h2 className="text-[0.9375rem] font-semibold tracking-[-0.01em]">{title}</h2>}
              {description && <p className="mt-0.5 text-xs text-muted">{description}</p>}
            </div>
            <button onClick={onClose} className="rounded-lg p-1 text-faint transition hover:bg-surface-3 hover:text-ink" aria-label="Close">
              <X size={16} />
            </button>
          </div>
        )}
        <div className="max-h-[calc(92vh-9rem)] overflow-y-auto px-5 py-4">{children}</div>
        {footer && <div className="flex items-center justify-end gap-2 border-t border-line bg-surface-2 px-5 py-3">{footer}</div>}
      </div>
    </div>,
    document.body
  );
}

export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel = "Confirm",
  danger,
  loading,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description?: string;
  confirmLabel?: string;
  danger?: boolean;
  loading?: boolean;
}) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      size="sm"
      title={title}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button variant={danger ? "danger" : "primary"} onClick={onConfirm} loading={loading}>
            {confirmLabel}
          </Button>
        </>
      }
    >
      <div className="flex gap-3">
        <div className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-full", danger ? "bg-rose-50 text-rose-600 dark:bg-rose-500/10" : "bg-brand-soft text-brand")}>
          <AlertTriangle size={16} />
        </div>
        <p className="pt-1 text-[0.8125rem] leading-relaxed text-muted">{description}</p>
      </div>
    </Modal>
  );
}
