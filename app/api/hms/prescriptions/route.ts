import { body, json, qp, route } from "@/lib/api";
import { requireHmsApi } from "@/lib/hms/auth";
import { hAudit, hNow, hRun, hUid, hGet } from "@/lib/hms/db";
import { listPrescriptions, getPrescription } from "@/lib/hms/queries";
import { screenPrescription, type RxLine } from "@/lib/hms/ai";

type ItemInput = {
  drug: string; strength?: string; form?: string; dosage?: string; frequency?: string;
  duration?: string; instructions?: string; qty?: number; unit_price?: number;
};

export const GET = route(async (req) => {
  await requireHmsApi();
  const p = qp(req);
  return json({
    items: listPrescriptions({
      q: p.get("q") ?? undefined,
      status: p.get("status") ?? undefined,
      patient_id: p.get("patient_id") ?? undefined,
      limit: p.get("limit") ? Number(p.get("limit")) : undefined,
    }),
  });
});

export const POST = route(async (req) => {
  const user = await requireHmsApi(["admin", "doctor"]);
  const p = await body<{
    patient_id?: string; encounter_id?: string; diagnosis?: string; icd10?: string;
    notes?: string; follow_up?: string; template?: number; items?: ItemInput[]; sign?: boolean;
  }>(req);
  if (!p.patient_id) return json({ error: "Choose a patient first." }, 422);
  const items = (p.items ?? []).filter((i) => i.drug?.trim());
  if (!items.length) return json({ error: "Add at least one medicine." }, 422);

  const patient = hGet<{ name: string; allergies: string | null }>("SELECT name, allergies FROM hms_patients WHERE id = ?", [p.patient_id]);
  if (!patient) return json({ error: "Patient not found." }, 404);

  const safety = screenPrescription(items as RxLine[], patient.allergies);
  if (safety.verdict === "stop" && !p.sign) {
    // clinical override is allowed only when explicitly signing with consent
    return json({ error: "Safety screen blocked this prescription.", safety }, 422);
  }

  const id = hUid("rx");
  const seq = Number(hGet<{ c: number }>("SELECT COUNT(*) AS c FROM hms_prescriptions")?.c ?? 0);
  const year = new Date().getFullYear();
  const rxNo = `RX-${year}-${1200 + seq + 1}`;
  const now = hNow();

  hRun(
    `INSERT INTO hms_prescriptions (id, rx_no, encounter_id, patient_id, doctor_id, diagnosis, icd10, notes, follow_up,
      template, status, signed_by, signed_at, created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
    [
      id, rxNo, p.encounter_id ?? null, p.patient_id, user.id, p.diagnosis ?? null, p.icd10 ?? null,
      p.notes ?? null, p.follow_up ?? null, Number(p.template ?? 1),
      p.sign ? "signed" : "pending", p.sign ? user.id : null, p.sign ? now : null, now,
    ]
  );

  items.forEach((it, idx) => {
    hRun(
      `INSERT INTO hms_rx_items (id, prescription_id, drug, strength, form, dosage, frequency, duration, instructions, qty, unit_price, sort)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`,
      [
        hUid("rxi"), id, it.drug, it.strength ?? null, it.form ?? null, it.dosage ?? null,
        it.frequency ?? null, it.duration ?? null, it.instructions ?? null,
        Number(it.qty ?? 10), Number(it.unit_price ?? 0), idx,
      ]
    );
  });

  // keep the encounter in sync when the prescription came from a consult
  if (p.encounter_id && p.diagnosis) {
    hRun("UPDATE hms_encounters SET diagnosis = COALESCE(?, diagnosis), icd10 = COALESCE(?, icd10) WHERE id = ?", [
      p.diagnosis, p.icd10 ?? null, p.encounter_id,
    ]);
  }

  hAudit(user, p.sign ? "signed" : "created", "prescription", id, `${p.sign ? "Signed" : "Drafted"} ${rxNo} for ${patient.name}`);
  return json({ ok: true, id, rx_no: rxNo, safety, prescription: getPrescription(id) }, 201);
});

export const dynamic = "force-dynamic";
