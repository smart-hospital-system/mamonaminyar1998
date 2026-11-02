"use client";

import { Languages } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { LANGS, LANG_COOKIE, type Lang } from "@/lib/hms/i18n";
import { useLang } from "./lang-provider";

/**
 * Switches the whole workspace between English and Dari.
 *
 * The choice is stored in a cookie, so two people signed in on the same
 * computer can each keep their own language, and the server renders the first
 * paint in the right language (no flash of the wrong one).
 */
export function LangSwitch({ compact = false }: { compact?: boolean }) {
  const { lang } = useLang();
  const router = useRouter();
  const [busy, setBusy] = useState<Lang | null>(null);

  function choose(next: Lang) {
    if (next === lang) return;
    setBusy(next);
    document.cookie = `${LANG_COOKIE}=${next}; path=/; max-age=31536000; samesite=lax`;
    router.refresh();
    setTimeout(() => setBusy(null), 800);
  }

  return (
    <div
      className="flex items-center gap-0.5 rounded-lg border p-0.5"
      style={{ borderColor: "var(--hms-border)", background: "var(--hms-surface-2)" }}
      title="EN / دری"
    >
      {!compact && (
        <span className="px-1" style={{ color: "var(--hms-faint)" }}>
          <Languages size={12} />
        </span>
      )}
      {LANGS.map((l) => (
        <button
          key={l.id}
          type="button"
          onClick={() => choose(l.id)}
          aria-pressed={lang === l.id}
          className="rounded-md px-1.5 py-0.5 text-[0.62rem] font-semibold transition"
          style={
            lang === l.id
              ? { background: "var(--hms-brand)", color: "#fff" }
              : { color: "var(--hms-muted)", opacity: busy === l.id ? 0.5 : 1 }
          }
        >
          {l.short}
        </button>
      ))}
    </div>
  );
}

/**
 * A small language chooser for the sign-in page. It writes the cookie straight
 * away and reloads, so the very first screen is already bilingual.
 */
export function LoginLangSwitch() {
  const [lang, setLang] = useState<Lang>("en");

  useEffect(() => {
    const match = document.cookie.match(new RegExp(`(^| )${LANG_COOKIE}=([^;]+)`));
    if (match && (match[2] === "fa" || match[2] === "en")) setLang(match[2]);
  }, []);

  function choose(next: Lang) {
    document.cookie = `${LANG_COOKIE}=${next}; path=/; max-age=31536000; samesite=lax`;
    setLang(next);
    window.location.reload();
  }

  return (
    <div className="flex items-center gap-1 rounded-lg border p-0.5" style={{ borderColor: "var(--hms-border)" }}>
      {LANGS.map((l) => (
        <button
          key={l.id}
          type="button"
          onClick={() => choose(l.id)}
          className="rounded-md px-2 py-0.5 text-[0.68rem] font-semibold"
          style={lang === l.id ? { background: "var(--hms-brand)", color: "#fff" } : { color: "var(--hms-muted)" }}
        >
          {l.short}
        </button>
      ))}
    </div>
  );
}
