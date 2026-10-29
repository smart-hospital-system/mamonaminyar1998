import { body, json, route } from "@/lib/api";
import { requireHmsApi } from "@/lib/hms/auth";
import { hAudit, hGet, hUid } from "@/lib/hms/db";
import { acknowledge, allAlerts, autoHeal, escalateExpired, healthSummary, openAlerts, resolve, scan, syncAlerts } from "@/lib/hms/alerts";

export const GET = route(async () => {
  await requireHmsApi();
  const rx = hGet<{ c: number }>("SELECT COUNT(*) AS c FROM hms_prescriptions WHERE status IN ('pending','signed')")?.c ?? 0;
  const lab = hGet<{ c: number }>("SELECT COUNT(*) AS c FROM hms_lab_orders WHERE status NOT IN ('verified')")?.c ?? 0;
  return json({
    alerts: openAlerts(),
    history: allAlerts(40),
    health: healthSummary(),
    counts: { rx, lab, alerts: openAlerts().length },
  });
});

export const POST = route(async (req) => {
  const user = await requireHmsApi();
  const url = new URL(req.url);
  const scanNow = url.searchParams.get("scan") === "1";
  const p = scanNow ? {} : await body<{ action?: string; id?: string; note?: string }>(req).catch(() => ({}));
  const action = (p as { action?: string }).action ?? (scanNow ? "scan" : "list");

  if (action === "scan") {
    const escalated = escalateExpired();
    const findings = scan();
    const alerts = syncAlerts(findings);
    return json({ ok: true, alerts, health: healthSummary(), escalated });
  }

  if (action === "acknowledge" && (p as { id?: string }).id) {
    acknowledge((p as { id: string }).id, user.name);
    hAudit(user, "acknowledged", "alert", (p as { id: string }).id, "Acknowledged a monitor alarm");
    return json({ ok: true, health: healthSummary() });
  }

  if (action === "resolve" && (p as { id?: string }).id) {
    resolve((p as { id: string }).id, (p as { note?: string }).note ?? "Resolved by staff", user.name);
    hAudit(user, "resolved", "alert", (p as { id: string }).id, "Resolved a monitor alarm manually");
    return json({ ok: true, health: healthSummary() });
  }

  if (action === "heal" && (p as { id?: string }).id) {
    const result = autoHeal((p as { id: string }).id, user.name);
    hAudit(user, "auto-healed", "alert", (p as { id: string }).id, result.message);
    return json({ ...result, health: healthSummary(), alerts: openAlerts() });
  }

  if (action === "heal-all") {
    const healed: { id: string; ok: boolean; message: string }[] = [];
    for (const a of openAlerts().filter((x) => x.auto_fixable)) healed.push({ id: a.id, ...autoHeal(a.id, user.name) });
    hAudit(user, "auto-healed", "alert", "batch", `Auto-healed ${healed.filter((h) => h.ok).length} alarm(s)`);
    return json({ ok: true, healed, health: healthSummary(), alerts: openAlerts() });
  }

  if (action === "escalate") {
    const escalated = escalateExpired();
    const findings = scan();
    syncAlerts(findings);
    return json({ ok: true, escalated, health: healthSummary() });
  }

  return json({ error: "Unknown action" }, 422);
});

export const dynamic = "force-dynamic";
