"use client";

import { AlertTriangle, RefreshCw, Home } from "lucide-react";

/**
 * The last line of defence: if a hospital screen throws, the person must be told
 * what to do in both languages, on the hospital's own colours — never shown a
 * developer stack or a booking-site button.
 */
export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center px-6 text-center">
      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl" style={{ background: "#fee2e2", color: "#b91c1c" }}>
        <AlertTriangle size={22} />
      </div>
      <h1 className="text-[1.2rem] font-semibold tracking-[-0.01em]">Something went wrong on this screen</h1>
      <p className="mt-1 text-[0.95rem] font-medium" lang="fa" dir="rtl">
        در این صفحه خطایی رخ داد
      </p>
      <p className="mt-2 max-w-sm text-[0.8rem] leading-relaxed" style={{ color: "var(--hms-muted)" }}>
        No patient data was deleted. Try the screen again — if it keeps failing, tell the system
        administrator the reference below.
      </p>
      <p className="mt-1 max-w-sm text-[0.76rem] leading-relaxed" style={{ color: "var(--hms-muted)" }} lang="fa" dir="rtl">
        هیچ دادهٔ مریض حذف نشده است. دوباره تلاش کنید — اگر تکرار شد، همین کد را به مسئول سیستم بگویید.
      </p>
      <p className="mt-2 rounded-md px-2 py-1 font-mono text-[0.66rem]" style={{ background: "var(--hms-surface-2)", color: "var(--hms-muted)" }}>
        {error.digest ? `ref ${error.digest}` : error.message || "unknown error"}
      </p>
      <div className="mt-4 flex gap-2">
        <button className="hms-btn hms-btn-primary" onClick={reset}>
          <RefreshCw size={12} /> Try again / دوباره
        </button>
        <a className="hms-btn" href="/hms">
          <Home size={12} /> Command centre / مرکز فرمان
        </a>
      </div>
    </div>
  );
}
