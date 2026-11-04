import { HttpError } from "@/lib/auth";
import type { HmsUser } from "./auth";
import { hAudit, hNow, hRun, hUid, hmsReady, getSection } from "./db";
import { getPrescription } from "./queries";

type Action = { action?: string; note?: string; template?: number; notes?: string; follow_up?: string };

/** Synchronous, single SQLite transaction: no partial stock, charge or status update. */
export function prescriptionAction(id: string, p: Action, user: HmsUser) {
  const db = hmsReady();
  db.exec("BEGIN IMMEDIATE");
  try {
    const rx = getPrescription(id);
    if (!rx) throw new HttpError(404, "Prescription not found.");
    const action = p.action ?? "update";
    if (!["update", "sign", "void", "dispense"].includes(action)) throw new HttpError(422, "Unknown prescription action.");
    if (action === "dispense") {
      if (!["admin", "pharmacist"].includes(user.role)) throw new HttpError(403, "Only pharmacy staff may dispense.");
      // Signature is a safety invariant, not a switch that can silently allow unsigned orders.
      if (rx.status !== "signed") throw new HttpError(409, "Only a signed, not-yet-dispensed prescription can be dispensed.");
      if (!rx.items.length) throw new HttpError(409, "Prescription has no items.");
      let total = 0;
      const required = new Map<string, number>();
      for (const item of rx.items) {
        if (!Number.isFinite(item.qty) || item.qty <= 0 || !Number.isFinite(item.unit_price) || item.unit_price < 0) {
          throw new HttpError(409, "Invalid quantity or price; ask the prescriber to review the order.");
        }
        const matches = db.prepare("SELECT id, expiry FROM hms_medicines WHERE name = ? AND active = 1").all(item.drug) as { id: string; expiry: string | null }[];
        if (matches.length !== 1) throw new HttpError(409, "Medicine is missing or ambiguous in the stock catalogue. Review before dispensing.");
        const expiry = matches[0].expiry;
        let today: string;
        try {
          const zone = String(getSection<Record<string, unknown>>("identity").timezone || "Asia/Kabul");
          today = new Intl.DateTimeFormat("en-CA", { timeZone: zone, year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
        } catch { throw new HttpError(409, "Invalid hospital timezone; ask the administrator to review it."); }
        if (!expiry || !/^\d{4}-\d{2}-\d{2}$/.test(expiry) || !Number.isFinite(Date.parse(expiry)) || new Date(expiry).toISOString().slice(0, 10) !== expiry || expiry < today) {
          throw new HttpError(409, "Expired or unverified expiry: pharmacist review required. Stock was not modified.");
        }
        required.set(matches[0].id, (required.get(matches[0].id) ?? 0) + item.qty);
        total += item.qty * item.unit_price; // a valid zero price stays zero; never invent a charge
      }
      if (!Number.isFinite(total)) throw new HttpError(409, "Invalid prescription total.");
      for (const [medicineId, qty] of required) {
        const result = hRun("UPDATE hms_medicines SET stock = stock - ?, updated_at = ? WHERE id = ? AND stock >= ?", [qty, hNow(), medicineId, qty]);
        if (Number(result.changes) !== 1) throw new HttpError(409, "Insufficient stock; nothing was dispensed or charged.");
      }
      const amount = Math.round(total * 100) / 100;
      hRun("UPDATE hms_prescriptions SET status = 'dispensed', dispensed_at = ?, pharmacist_id = ? WHERE id = ?", [hNow(), user.id, id]);
      hRun("INSERT INTO hms_dispenses (id, prescription_id, patient_id, pharmacist_id, items, total, note, created_at) VALUES (?,?,?,?,?,?,?,?)",
        [hUid("dsp"), id, rx.patient_id, user.id, JSON.stringify(rx.items.map((i) => ({ drug: i.drug, qty: i.qty }))), amount, p.note ?? null, hNow()]);
      hAudit(user, "dispensed", "prescription", id, "Dispensed signed prescription");
      const response = { ok: true, prescription: getPrescription(id), total: amount };
      db.exec("COMMIT");
      return response;
    }
    if (!["admin", "doctor"].includes(user.role)) throw new HttpError(403, "Clinical permission required.");
    if (user.role !== "admin" && rx.doctor_id !== user.id) throw new HttpError(403, "Only the author or medical director may act on this prescription.");
    if (action === "void") {
      if (!["pending", "signed"].includes(rx.status)) throw new HttpError(409, "This prescription cannot be voided through this action.");
      hRun("UPDATE hms_prescriptions SET status = 'void' WHERE id = ?", [id]);
    } else {
      if (rx.status !== "pending") throw new HttpError(409, "Signed, dispensed and void prescriptions cannot be rewritten or re-signed.");
      if (action === "sign") {
        hRun("UPDATE hms_prescriptions SET status = 'signed', signed_by = ?, signed_at = ? WHERE id = ?", [user.id, hNow(), id]);
      } else {
        if (p.template !== undefined) {
          if (!Number.isInteger(p.template) || p.template < 1 || p.template > 10) throw new HttpError(422, "Choose a valid print template.");
          hRun("UPDATE hms_prescriptions SET template = ? WHERE id = ?", [p.template, id]);
        }
        if (p.notes !== undefined) hRun("UPDATE hms_prescriptions SET notes = ? WHERE id = ?", [p.notes, id]);
        if (p.follow_up !== undefined) hRun("UPDATE hms_prescriptions SET follow_up = ? WHERE id = ?", [p.follow_up, id]);
      }
    }
    hAudit(user, action === "sign" ? "signed" : action === "void" ? "voided" : "updated", "prescription", id, "Explicit authorized prescription action");
    const response = { ok: true, prescription: getPrescription(id) };
    db.exec("COMMIT");
    return response;
  } catch (error) {
    try { db.exec("ROLLBACK"); } catch { /* preserve the original failure */ }
    throw error;
  }
}
