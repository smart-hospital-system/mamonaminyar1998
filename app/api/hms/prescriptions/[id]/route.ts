import { body, json, route } from "@/lib/api";
import { requireHmsApi } from "@/lib/hms/auth";
import { getSection, hAudit, hNow, hRun, hGet, hAll, hUid } from "@/lib/hms/db";
import { getPrescription } from "@/lib/hms/queries";

export const GET = route<{ id: string }>(async (_req, { params }) => {
  await requireHmsApi();
  const { id } = await params;
  const rx = getPrescription(id);
  if (!rx) return json({ error: "Prescription not found" }, 404);
  return json({ prescription: rx });
});

export const PATCH = route<{ id: string }>(async (req, { params }) => {
  const { id } = await params;
  const p = await body<{ action?: string; note?: string; template?: number; notes?: string; follow_up?: string }>(req);
  const rx = getPrescription(id);
  if (!rx) return json({ error: "Prescription not found" }, 404);
  const action = p.action ?? "update";

  if (action === "sign") {
    const user = await requireHmsApi(["admin", "doctor"]);
    hRun("UPDATE hms_prescriptions SET status = 'signed', signed_by = ?, signed_at = ? WHERE id = ?", [user.id, hNow(), id]);
    hAudit(user, "signed", "prescription", id, `Signed ${rx.rx_no} for ${rx.patient_name}`);
    return json({ ok: true, prescription: getPrescription(id) });
  }

  if (action === "dispense") {
    const user = await requireHmsApi(["admin", "pharmacist"]);
    // A prescription is a legal instruction from a physician: nothing leaves the
    // pharmacy counter until it carries a signature (Settings -> Clinical rules).
    const clinical = getSection<Record<string, unknown>>("clinical");
    const flag = clinical.require_signature;
    if (rx.status === "dispensed") {
      return json({ error: "This prescription has already been dispensed — handing it over twice would double the charge and the stock movement." }, 409);
    }
    if (rx.status === "void") {
      return json({ error: "This prescription was voided and cannot be dispensed." }, 409);
    }
    const mustSign = flag === undefined ? true : ![false, 0, "0", "false", "no"].includes(flag as never);
    if (mustSign && rx.status !== "signed") {
      return json(
        { error: "This prescription is still unsigned — ask the prescribing physician to sign it before dispensing." },
        409
      );
    }
    const items = rx.items as { drug: string; qty: number; unit_price: number }[];
    let total = 0;
    for (const it of items) {
      total += Number(it.qty) * Number(it.unit_price || 0.2);
      const med = hGet<{ id: string; stock: number }>("SELECT id, stock FROM hms_medicines WHERE name = ? AND active = 1", [it.drug]);
      if (med) {
        hRun("UPDATE hms_medicines SET stock = MAX(0, stock - ?), updated_at = ? WHERE id = ?", [it.qty, hNow(), med.id]);
      }
    }
    hRun("UPDATE hms_prescriptions SET status = 'dispensed', dispensed_at = ?, pharmacist_id = ? WHERE id = ?", [hNow(), user.id, id]);
    hRun(
      "INSERT INTO hms_dispenses (id, prescription_id, patient_id, pharmacist_id, items, total, note, created_at) VALUES (?,?,?,?,?,?,?,?)",
      [hUid("dsp"), id, rx.patient_id, user.id, JSON.stringify(items.map((i) => ({ drug: i.drug, qty: i.qty }))), Math.round(total * 100) / 100, p.note ?? null, hNow()]
    );
    hAudit(user, "dispensed", "prescription", id, `Dispensed ${rx.rx_no} — ${items.length} item(s)`);
    return json({ ok: true, prescription: getPrescription(id), total: Math.round(total * 100) / 100 });
  }

  if (action === "void") {
    const user = await requireHmsApi(["admin", "doctor"]);
    hRun("UPDATE hms_prescriptions SET status = 'void' WHERE id = ?", [id]);
    hAudit(user, "voided", "prescription", id, `Voided ${rx.rx_no}`);
    return json({ ok: true });
  }

  const user = await requireHmsApi(["admin", "doctor"]);
  if (p.template) hRun("UPDATE hms_prescriptions SET template = ? WHERE id = ?", [p.template, id]);
  if (p.notes !== undefined) hRun("UPDATE hms_prescriptions SET notes = ? WHERE id = ?", [p.notes, id]);
  if (p.follow_up !== undefined) hRun("UPDATE hms_prescriptions SET follow_up = ? WHERE id = ?", [p.follow_up, id]);
  hAudit(user, "updated", "prescription", id, `Updated ${rx.rx_no}`);
  return json({ ok: true, prescription: getPrescription(id) });
});

export const dynamic = "force-dynamic";
