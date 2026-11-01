import type { Metadata } from "next";
import { LangProvider } from "@/components/hms/lang-provider";
import { ToastProvider } from "@/components/hms/toast";
import { hmsReady, getSection } from "@/lib/hms/db";
import { dirOf } from "@/lib/hms/i18n";
import { getLang } from "@/lib/hms/lang-server";
import { themeById } from "@/lib/hms/templates";

export const metadata: Metadata = {
  title: "Aybek Ten-Bed Specialy Surgical Hospital",
  description: "Hospital information system — OPD, pharmacy, laboratory, radiology, inpatients and theatre in one workspace.",
};

export const dynamic = "force-dynamic";

export default async function HmsRootLayout({ children }: { children: React.ReactNode }) {
  hmsReady();
  const lang = await getLang();
  const theme = getSection<Record<string, unknown>>("theme");
  const identity = getSection<Record<string, unknown>>("identity");
  const t = themeById(String(theme.active ?? "clinical"));
  const accent = String(theme.accent ?? identity.accent ?? t.brand);
  // Dark themes need stronger shadows; computed before the vars so the
  // --hms-elev-* aliases can use it.
  const isDark = ["midnight", "highcontrast", "obsidian"].includes(t.id);

  const vars: Record<string, string> = {
    "--bg": t.bg,
    "--surface": t.surface,
    "--surface-2": t.surface2,
    "--surface-3": t.surface3,
    "--border": t.border,
    "--text": t.text,
    "--text-muted": t.muted,
    "--text-faint": t.faint,
    "--brand": accent,
    "--brand-hover": `color-mix(in srgb, ${accent} 84%, #000)`,
    "--brand-soft": `color-mix(in srgb, ${accent} 14%, ${t.surface})`,
    "--brand-ink": `color-mix(in srgb, ${accent} 72%, #0b1220)`,

    // Aliases used by the workspace screens (`bg-[var(--hms-surface)]`,
    // `text-[var(--hms-muted)]`, …). They are defined as references, not copied
    // values, so a theme change flows through both naming schemes at once.
    // Without these the utility classes resolve to nothing and the screens
    // render transparent — the v7 design layer silently degraded to plain text.
    "--hms-bg": "var(--bg)",
    "--hms-surface": "var(--surface)",
    "--hms-surface-2": "var(--surface-2)",
    "--hms-surface-3": "var(--surface-3)",
    "--hms-border": "var(--border)",
    "--hms-hairline": `color-mix(in srgb, ${t.border} 60%, transparent)`,
    "--hms-ink": "var(--text)",
    "--hms-muted": "var(--text-muted)",
    "--hms-faint": "var(--text-faint)",
    "--hms-brand": "var(--brand)",
    "--hms-brand-soft": "var(--brand-soft)",
    "--hms-brand-ink": "var(--brand-ink)",
    "--hms-elev-1": isDark
      ? "0 1px 2px rgba(0,0,0,.45), 0 8px 24px rgba(0,0,0,.35)"
      : "0 1px 2px rgba(16,24,40,.06), 0 8px 24px rgba(16,24,40,.06)",
    "--hms-elev-2": isDark
      ? "0 2px 6px rgba(0,0,0,.5), 0 18px 48px rgba(0,0,0,.45)"
      : "0 2px 6px rgba(16,24,40,.08), 0 18px 48px rgba(16,24,40,.10)",
    "--hms-radius": "14px",
  } as Record<string, string>;

  // The hospital carries its own palette: every colour is injected here, so the
  // workspace never inherits the salon theme (which would override a dark theme).
  return (
    <div
      style={vars as React.CSSProperties}
      data-hms-theme={t.id}
      data-dark={isDark}
      data-lang={lang}
      dir={dirOf(lang)}
      lang={lang === "fa" ? "fa-AF" : "en"}
    >
      <LangProvider lang={lang}>
        <ToastProvider>{children}</ToastProvider>
      </LangProvider>
    </div>
  );
}
