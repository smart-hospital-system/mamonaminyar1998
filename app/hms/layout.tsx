import type { Metadata } from "next";
import { LangProvider } from "@/components/hms/lang-provider";
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
  } as Record<string, string>;

  // The hospital carries its own palette: every colour is injected here, so the
  // workspace never inherits the salon theme (which would override a dark theme).
  const isDark = ["midnight", "highcontrast"].includes(t.id);

  return (
    <div
      style={vars as React.CSSProperties}
      data-hms-theme={t.id}
      data-dark={isDark}
      data-lang={lang}
      dir={dirOf(lang)}
      lang={lang === "fa" ? "fa-AF" : "en"}
    >
      <LangProvider lang={lang}>{children}</LangProvider>
    </div>
  );
}
