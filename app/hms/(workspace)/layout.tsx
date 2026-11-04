import { HmsShell } from "@/components/hms/shell";
import { requireHmsPage } from "@/lib/hms/auth";
import { getSection, hmsReady } from "@/lib/hms/db";
import { healthSummary, openAlerts, scan, syncAlerts } from "@/lib/hms/alerts";
import { licenseState } from "@/lib/hms/license";

export const dynamic = "force-dynamic";

export default async function WorkspaceLayout({ children }: { children: React.ReactNode }) {
  const user = await requireHmsPage();
  hmsReady();

  let scanFailed = false;
  // Reconcile the alarm board with reality on every shell load (cheap, idempotent).
  try {
    syncAlerts(scan());
  } catch {
    scanFailed = true; // Keep the workspace available but never present this as an all-clear.
  }

  const identity = getSection<Record<string, unknown>>("identity");
  const monitor = getSection<Record<string, unknown>>("alerts");
  const interval = Number(monitor.interval_minutes ?? 30);
  const theme = getSection<Record<string, unknown>>("theme");
  const health = healthSummary();
  const lic = licenseState();
  void openAlerts();

  return (
    <HmsShell
      user={{
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        department: user.department,
        title: user.title,
        avatar_color: user.avatar_color,
      }}
      hospital={{
        name: String(identity.name ?? "Aybek Ten-Bed Specialy Surgical Hospital"),
        name_short: String(identity.name_short ?? "Aybek Hospital"),
        accent: String(theme.accent ?? identity.accent ?? "#0e9488"),
        local: String(identity.name_local ?? "شفاخانه ده بستر جراحی ایبک"),
      }}
      health={{ score: health.score, critical: health.critical, warning: health.warning, open: health.open }}
      monitor={{ enabled: monitor.enabled !== false, intervalMinutes: Number.isFinite(interval) ? Math.max(5, Math.min(240, interval)) : 30 }}
      licence={{ status: lic.status, daysLeft: lic.daysLeft, plan: lic.plan }}
    >
      {scanFailed && <p role="alert" className="mb-3 rounded border border-red-400 p-3 print:hidden">Health scan failed — do not interpret the displayed status as an all-clear. / بررسی سلامت ناکام شد؛ وضعیت سالم تأیید نشده است.</p>}
      <aside role="note" className="mb-4 rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-950 print:hidden">
        Development system — clinical references and dosing tools are unvalidated; clinician review is required.
        <span dir="rtl" lang="fa" className="mt-1 block">نسخهٔ آزمایشی؛ منابع و ابزارهای طبی اعتبارسنجی بالینی نشده‌اند. تصمیم و تأیید نهایی با داکتر است.</span>
      </aside>
      {children}
    </HmsShell>
  );
}
