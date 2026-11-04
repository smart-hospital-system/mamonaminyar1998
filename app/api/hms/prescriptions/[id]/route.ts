import { body, json, route } from "@/lib/api";
import { requireHmsApi } from "@/lib/hms/auth";
import { getPrescription } from "@/lib/hms/queries";
import { prescriptionAction } from "@/lib/hms/prescription-actions";

export const GET = route<{ id: string }>(async (_req, { params }) => {
  await requireHmsApi();
  const { id } = await params;
  const rx = getPrescription(id);
  if (!rx) return json({ error: "Prescription not found" }, 404);
  return json({ prescription: rx });
});

export const PATCH = route<{ id: string }>(async (req, { params }) => {
  const user = await requireHmsApi(["admin", "doctor", "pharmacist"]);
  const { id } = await params;
  const p = await body<{ action?: string; note?: string; template?: number; notes?: string; follow_up?: string }>(req);
  for (const field of ["action", "note", "notes", "follow_up"] as const) {
    if (p[field] !== undefined && (typeof p[field] !== "string" || p[field]!.length > 10000)) return json({ error: "Invalid prescription text." }, 422);
  }
  return json(prescriptionAction(id, p, user));
});

export const dynamic = "force-dynamic";
