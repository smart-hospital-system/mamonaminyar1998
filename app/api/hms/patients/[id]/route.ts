import { body, json, route } from "@/lib/api";
import { requireHmsApi } from "@/lib/hms/auth";
import { hAudit, hRun } from "@/lib/hms/db";
import { patientChart } from "@/lib/hms/queries";

export const GET = route<{ id: string }>(async (_req, { params }) => {
  await requireHmsApi();
  const { id } = await params;
  const chart = patientChart(id);
  if (!chart.patient) return json({ error: "Patient not found" }, 404);
  return json(chart);
});

export const PATCH = route<{ id: string }>(async (req, { params }) => {
  const user = await requireHmsApi(["admin", "doctor", "nurse", "reception"]);
  const { id } = await params;
  const p = await body<Record<string, string>>(req);
  const fields = ["name", "gender", "dob", "phone", "email", "address", "blood_group", "allergies", "chronic", "emergency_contact", "insurance", "notes"];
  const sets: string[] = [];
  const values: unknown[] = [];
  for (const f of fields) {
    if (p[f] !== undefined) {
      sets.push(`${f} = ?`);
      values.push(p[f]);
    }
  }
  if (!sets.length) return json({ error: "Nothing to update" }, 422);
  hRun(`UPDATE hms_patients SET ${sets.join(", ")} WHERE id = ?`, [...values, id]);
  hAudit(user, "updated", "patient", id, `Updated demographics for ${p.name ?? id}`);
  return json({ ok: true });
});

export const dynamic = "force-dynamic";
