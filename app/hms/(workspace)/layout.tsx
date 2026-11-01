import { HmsShell } from "@/components/hms/shell";
import { requireHmsPage } from "@/lib/hms/auth";
import { getSection, hmsReady } from "@/lib/hms/db";
import { healthSummary, openAlerts, scan, syncAlerts } from "@/lib/hms/alerts";
import { licenseState } from "@/lib/hms/license";

export const dynamic = "force-dynamic";

export default async function WorkspaceLayout({ children }: { children: React.ReactNode }) {
  const user = await requireHmsPage();
  hmsReady();

  // Reconcile the alarm board with reality on every shell load (cheap, idempotent).
  try {
    syncAlerts(scan());
  } catch {
    /* a scan failure must never block the workspace */
  }

  const identity = getSection<Record<string, unknown>>("identity");
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
      licence={{ status: lic.status, daysLeft: lic.daysLeft, plan: lic.plan }}
    >
      {children}
    </HmsShell>
  );
}
