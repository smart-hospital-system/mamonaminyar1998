"use client";

import { Check, CheckCircle2, Copy, Loader2, RefreshCw, Sparkles } from "lucide-react";
import { useState } from "react";
import { useLang } from "./lang-provider";
import { scoreCode } from "@/lib/hms/passwords";

/**
 * A password box that refuses to lie.
 *
 * It measures the code as it is typed, explains in one line why it is weak, and
 * offers a hospital-generated code in four readable blocks (`KETU-9MRA-3XWP`)
 * that a pharmacist can read aloud without spelling every letter.
 */
export function CodeField({
  value,
  onChange,
  label,
  hint,
  placeholder,
  onQuality,
}: {
  value: string;
  onChange: (v: string) => void;
  label?: string;
  hint?: string;
  placeholder?: string;
  onQuality?: (ok: boolean) => void;
}) {
  const { tx } = useLang();
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const strength = scoreCode(value);

  async function mint() {
    setBusy(true);
    try {
      const res = await fetch("/api/hms/security", { method: "POST", headers: { "content-type": "application/json" }, body: "{}" });
      const data = await res.json();
      if (data.code) {
        onChange(data.code);
        onQuality?.(scoreCode(data.code).acceptable);
      }
    } catch {
      /* leave the box as it was */
    } finally {
      setBusy(false);
    }
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard blocked */
    }
  }

  return (
    <div>
      {label && <span className="hms-label">{label}</span>}
      <div className="flex gap-1.5">
        <input
          className="hms-input font-mono !text-[0.76rem]"
          value={value}
          onChange={(e) => {
            onChange(e.target.value);
            onQuality?.(scoreCode(e.target.value).acceptable);
          }}
          placeholder={placeholder ?? tx("At least 12 characters", "حداقل ۱۲ حرف")}
          autoComplete="new-password"
          spellCheck={false}
          dir="ltr"
        />
        <button type="button" className="hms-btn hms-btn-sm shrink-0" onClick={mint} disabled={busy} title={tx("Generate a strong code", "تولید رمز قوی")}>
          {busy ? <Loader2 size={11} className="animate-spin" /> : <RefreshCw size={11} />} {tx("Generate", "تولید")}
        </button>
        {value && (
          <button type="button" className="hms-btn hms-btn-sm shrink-0" onClick={copy} title={tx("Copy", "کاپی")}>
            {copied ? <Check size={11} style={{ color: "#0f9d6e" }} /> : <Copy size={11} />}
          </button>
        )}
      </div>

      {value && (
        <>
          <div className="mt-1 flex items-center gap-1.5">
            <div className="h-1 flex-1 overflow-hidden rounded-full" style={{ background: "var(--hms-surface-3)" }}>
              <div className="h-full rounded-full transition-all" style={{ width: `${strength.score}%`, background: strength.color }} />
            </div>
            <span className="shrink-0 text-[0.58rem] font-semibold" style={{ color: strength.color }}>
              {tx(strength.label[0], strength.label[1])}
            </span>
          </div>
          <p className="mt-0.5 flex items-start gap-1 text-[0.58rem]" style={{ color: strength.acceptable ? "#0b7a58" : "var(--hms-faint)" }}>
            {strength.acceptable ? (
              <>
                <CheckCircle2 size={9} className="mt-0.5 shrink-0" /> {tx("Strong enough to protect this account.", "برای محافظت از این حساب به‌اندازهٔ کافی قوی است.")}
              </>
            ) : (
              <>
                <Sparkles size={9} className="mt-0.5 shrink-0" />
                {strength.hints.length ? tx(strength.hints[0][0], strength.hints[0][1]) : tx("Add a few more characters.", "چند حرف دیگر اضافه کنید.")}
              </>
            )}
          </p>
        </>
      )}
      {hint && <span className="mt-0.5 block text-[0.58rem]" style={{ color: "var(--hms-faint)" }}>{hint}</span>}
    </div>
  );
}
