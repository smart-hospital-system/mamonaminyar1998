/** Transport/data validation only. Does not assess clinical appropriateness or dosing. */
export function validatePrescriptionInput(input: unknown): string | null {
  if (!input || typeof input !== "object" || Array.isArray(input)) return "Prescription object required.";
  const p = input as Record<string, unknown>;
  if (typeof p.patient_id !== "string" || !p.patient_id || p.patient_id.length > 200) return "Choose a valid patient.";
  for (const key of ["encounter_id", "diagnosis", "icd10", "notes", "follow_up"]) {
    if (p[key] !== undefined && (typeof p[key] !== "string" || (p[key] as string).length > 10000)) return "Invalid prescription text.";
  }
  if (p.sign !== undefined && typeof p.sign !== "boolean") return "Signing must be an explicit boolean choice.";
  if (p.template !== undefined && (!Number.isInteger(p.template) || Number(p.template) < 1 || Number(p.template) > 10)) return "Invalid print template.";
  if (!Array.isArray(p.items) || p.items.length < 1 || p.items.length > 100) return "Supply between one and 100 medicine lines.";
  for (const value of p.items) {
    if (!value || typeof value !== "object" || Array.isArray(value)) return "Invalid medicine line.";
    const item = value as Record<string, unknown>;
    if (typeof item.drug !== "string" || !item.drug.trim() || item.drug.length > 500) return "Medicine name required.";
    if (typeof item.qty !== "number" || !Number.isFinite(item.qty) || item.qty <= 0 || item.qty > 1000000) return "Specify a finite positive quantity for every medicine.";
    if (item.unit_price !== undefined && (typeof item.unit_price !== "number" || !Number.isFinite(item.unit_price) || item.unit_price < 0 || item.unit_price > 1e9)) return "Unit price must be a finite nonnegative amount.";
    for (const key of ["strength", "form", "dosage", "frequency", "duration", "instructions"]) {
      if (item[key] !== undefined && (typeof item[key] !== "string" || (item[key] as string).length > 2000)) return "Invalid medicine text.";
    }
  }
  return null;
}
