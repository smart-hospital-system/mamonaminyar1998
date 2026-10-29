import { body, json, route } from "@/lib/api";
import { requireHmsApi } from "@/lib/hms/auth";
import { hAudit, hNow, hRun } from "@/lib/hms/db";
import { parseLabResult } from "@/lib/hms/ai";
import { hUid } from "@/lib/hms/db";

export const PATCH = route<{ id: string }>(async (req, { params }) => {
  const user = await requireHmsApi(["admin", "lab", "doctor"]);
  const { id } = await params;
  const p = await body<{ action?: string; result?: string; priority?: string }>(req);
  const action = p.action ?? "result";

  if (action === "collect") {
    hRun("UPDATE hms_lab_orders SET status = 'collected' WHERE id = ?", [id]);
    hAudit(user, "collected", "lab", id, "Marked sample collected");
    return json({ ok: true });
  }

  if (action === "result") {
    const flags = parseLabResult(p.result ?? "");
    hRun("UPDATE hms_lab_orders SET result = ?, status = 'in_progress', technician = ? WHERE id = ?", [p.result ?? null, user.name, id]);
    if (flags.some((f) => f.flag === "critical")) {
      hRun(
        `INSERT INTO hms_alerts (id, code, severity, category, title, detail, link, auto_fixable, status, first_seen, last_seen, due_at, occurrences)
         VALUES (?,?,?,?,?,?,?,0,'open',?,?,?,1)`,
        [
          hUid("alt"), `critical-lab-${id}`, "critical", "Laboratory",
          "Critical laboratory value detected",
          `${user.name} entered a critical result. The ordering physician must be informed within 30 minutes.`,
          "/hms/lab", hNow(), hNow(), new Date(Date.now() + 2 * 3600_000).toISOString(),
        ]
      );
    }
    hAudit(user, "resulted", "lab", id, `Entered result (${flags.filter((f) => f.flag !== "normal").length} flagged value(s))`);
    return json({ ok: true, flags });
  }

  if (action === "verify") {
    hRun("UPDATE hms_lab_orders SET status = 'verified', verified_by = ?, completed_at = ? WHERE id = ?", [user.id, hNow(), id]);
    hAudit(user, "verified", "lab", id, "Verified and released laboratory result");
    return json({ ok: true });
  }

  if (action === "priority") {
    hRun("UPDATE hms_lab_orders SET priority = ? WHERE id = ?", [p.priority ?? "urgent", id]);
    return json({ ok: true });
  }

  return json({ error: "Unknown action" }, 422);
});

export const dynamic = "force-dynamic";
