import { body, json, route } from "@/lib/api";
import { requireHmsApi } from "@/lib/hms/auth";
import { hmsReady } from "@/lib/hms/db";
import {
  departmentLoad, draftNote, forecastOpd, generateFollowUps, insights, noShowRisk,
  parseLabResult, screenPrescription, suggestDoses, suggestTemplate, triage,
  type RxLine, type Vitals,
} from "@/lib/hms/ai";
import { getSettings } from "@/lib/hms/db";

export const POST = route(async (req) => {
  await requireHmsApi();
  hmsReady();
  const p = await body<{
    action?: string;
    lines?: RxLine[];
    allergies?: string | null;
    vitals?: Vitals;
    weight?: number;
    age?: number;
    diagnosis?: string;
    text?: string;
    days?: number;
    patientIds?: string[];
  }>(req);

  switch (p.action) {
    case "screen":
      return json({ result: screenPrescription(p.lines ?? [], p.allergies) });
    case "triage":
      return json({ result: triage(p.vitals ?? {}) });
    case "doses":
      await requireHmsApi(["admin", "doctor", "pharmacist"]);
      if (typeof p.weight !== "number" || !Number.isFinite(p.weight) || p.weight <= 0 || p.weight > 500 ||
          typeof p.age !== "number" || !Number.isFinite(p.age) || p.age < 0 || p.age > 120) {
        return json({ error: "Provide measured weight (kg) and age; no default patient measurements are assumed." }, 422);
      }
      return json({ result: suggestDoses(p.weight, p.age), unvalidated: true, requires_clinician_review: true });
    case "note":
      return json({ result: draftNote(p.diagnosis ?? "", p.vitals) });
    case "template": {
      const suggested = suggestTemplate(p.diagnosis ?? "");
      const active = Number(getSettings().theme?.rx_template ?? 1);
      return json({ suggested, active, reason: `“${p.diagnosis ?? "General"}” prints best on template ${suggested}.` });
    }
    case "lab":
      return json({ result: parseLabResult(p.text ?? "") });
    case "insights":
      return json({ result: insights() });
    case "forecast":
      return json({ result: forecastOpd(Number(p.days ?? 14)) });
    case "followups":
      return json({ result: generateFollowUps(p.patientIds) });
    case "noshow":
      return json({ result: noShowRisk(8) });
    case "load":
      return json({ result: departmentLoad() });
    default:
      return json({ error: "Unknown AI action" }, 422);
  }
});

export const dynamic = "force-dynamic";
