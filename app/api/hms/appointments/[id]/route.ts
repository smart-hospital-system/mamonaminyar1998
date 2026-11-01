import { body, json, route } from "@/lib/api";
import { requireHmsApi } from "@/lib/hms/auth";
import { hAudit, hRun } from "@/lib/hms/db";

export const PATCH = route<{ id: string }>(async (req, { params }) => {
  const user = await requireHmsApi(["admin", "doctor", "nurse", "reception"]);
  const { id } = await params;
  const p = await body<{ status?: string; notes?: string }>(req);
  if (p.status) {
    hRun("UPDATE hms_appointments SET status = ? WHERE id = ?", [p.status, id]);
    hAudit(user, "updated", "appointment", id, `Set appointment status to ${p.status}`);
  }
  if (p.notes !== undefined) hRun("UPDATE hms_appointments SET notes = ? WHERE id = ?", [p.notes, id]);
  return json({ ok: true });
});

export const dynamic = "force-dynamic";
