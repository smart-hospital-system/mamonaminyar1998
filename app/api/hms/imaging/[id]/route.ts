import { body, json, route } from "@/lib/api";
import { requireHmsApi } from "@/lib/hms/auth";
import { hAudit, hGet, hNow, hRun } from "@/lib/hms/db";

export const PATCH = route<{ id: string }>(async (req, { params }) => {
  const user = await requireHmsApi(["admin", "radiology", "doctor"]);
  const { id } = await params;
  const p = await body<{ action?: string; findings?: string; impression?: string }>(req);
  const action = p.action ?? "report";
  const request = hGet<{ id: string }>("SELECT id FROM hms_imaging_orders WHERE id = ?", [id]);
  if (!request) return json({ error: "Imaging request not found." }, 404);

  if (action === "accept") {
    hRun("UPDATE hms_imaging_orders SET status = 'in_progress' WHERE id = ?", [id]);
    hAudit(user, "accepted", "imaging", id, "Accepted imaging request");
    return json({ ok: true });
  }

  if (action === "report") {
    hRun(
      "UPDATE hms_imaging_orders SET findings = ?, impression = ?, status = 'reported', radiologist = ?, reported_at = ? WHERE id = ?",
      [p.findings ?? null, p.impression ?? null, user.name, hNow(), id]
    );
    hAudit(user, "reported", "imaging", id, "Released imaging report");
    return json({ ok: true });
  }

  return json({ error: "Unknown action" }, 422);
});

export const dynamic = "force-dynamic";
