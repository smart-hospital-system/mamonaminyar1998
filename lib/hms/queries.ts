import { hAll, hGet } from "./db";

/* ------------------------------------------------------------------ patients */

export type Patient = {
  id: string; mrn: string; name: string; gender: string; dob: string | null;
  phone: string | null; email: string | null; address: string | null; blood_group: string | null;
  allergies: string | null; chronic: string | null; emergency_contact: string | null;
  insurance: string | null; notes: string | null; created_at: string;
};

export function listPatients(f: { q?: string; limit?: number; sort?: string } = {}) {
  const where: string[] = ["1=1"];
  const params: unknown[] = [];
  if (f.q) {
    where.push("(p.name LIKE ? OR p.mrn LIKE ? OR p.phone LIKE ? OR p.email LIKE ?)");
    const like = `%${f.q}%`;
    params.push(like, like, like, like);
  }
  const order =
    f.sort === "name" ? "p.name ASC" : f.sort === "visits" ? "visits DESC" : "p.created_at DESC";
  const rows = hAll<Patient & { visits: number; last_visit: string | null; open_rx: number }>(
    `SELECT p.*, (SELECT COUNT(*) FROM hms_encounters e WHERE e.patient_id = p.id) AS visits,
            (SELECT MAX(e.created_at) FROM hms_encounters e WHERE e.patient_id = p.id) AS last_visit,
            (SELECT COUNT(*) FROM hms_prescriptions r WHERE r.patient_id = p.id AND r.status = 'pending') AS open_rx
     FROM hms_patients p WHERE ${where.join(" AND ")} ORDER BY ${order} LIMIT ?`,
    [...params, Math.min(f.limit ?? 100, 400)]
  );
  const total = hGet<{ c: number }>(`SELECT COUNT(*) AS c FROM hms_patients p WHERE ${where.join(" AND ")}`, params);
  return { items: rows, total: Number(total?.c ?? 0) };
}

export function getPatient(id: string) {
  return hGet<Patient>("SELECT * FROM hms_patients WHERE id = ?", [id]);
}

export function patientChart(id: string) {
  return {
    patient: getPatient(id),
    encounters: hAll(
      `SELECT e.*, u.name AS doctor_name FROM hms_encounters e
       LEFT JOIN hms_users u ON u.id = e.doctor_id
       WHERE e.patient_id = ? ORDER BY e.created_at DESC LIMIT 20`,
      [id]
    ),
    prescriptions: hAll(
      `SELECT r.*, u.name AS doctor_name FROM hms_prescriptions r
       LEFT JOIN hms_users u ON u.id = r.doctor_id
       WHERE r.patient_id = ? ORDER BY r.created_at DESC LIMIT 20`,
      [id]
    ),
    labs: hAll("SELECT * FROM hms_lab_orders WHERE patient_id = ? ORDER BY created_at DESC LIMIT 20", [id]),
    imaging: hAll("SELECT * FROM hms_imaging_orders WHERE patient_id = ? ORDER BY created_at DESC LIMIT 20", [id]),
    admissions: hAll(
      `SELECT a.*, b.label AS bed_label, b.ward FROM hms_admissions a
       LEFT JOIN hms_beds b ON b.id = a.bed_id WHERE a.patient_id = ? ORDER BY a.admitted_at DESC`,
      [id]
    ),
    invoices: hAll("SELECT * FROM hms_invoices WHERE patient_id = ? ORDER BY created_at DESC", [id]),
    surgeries: hAll("SELECT * FROM hms_surgeries WHERE patient_id = ? ORDER BY scheduled_at DESC", [id]),
  };
}

/* --------------------------------------------------------------------- rx */

export type RxRow = {
  id: string; rx_no: string; patient_id: string; doctor_id: string; diagnosis: string | null;
  icd10: string | null; notes: string | null; follow_up: string | null; template: number;
  status: string; signed_by: string | null; signed_at: string | null; dispensed_at: string | null;
  created_at: string; patient_name: string; patient_mrn: string; doctor_name: string;
  allergies: string | null; items: number;
};

export function listPrescriptions(f: { q?: string; status?: string; limit?: number; patient_id?: string } = {}) {
  const where: string[] = ["1=1"];
  const params: unknown[] = [];
  if (f.q) {
    where.push("(p.name LIKE ? OR r.rx_no LIKE ? OR r.diagnosis LIKE ?)");
    const like = `%${f.q}%`;
    params.push(like, like, like);
  }
  if (f.status && f.status !== "all") {
    where.push("r.status = ?");
    params.push(f.status);
  }
  if (f.patient_id) {
    where.push("r.patient_id = ?");
    params.push(f.patient_id);
  }
  return hAll<RxRow>(
    `SELECT r.*, p.name AS patient_name, p.mrn AS patient_mrn, p.allergies, u.name AS doctor_name,
            (SELECT COUNT(*) FROM hms_rx_items i WHERE i.prescription_id = r.id) AS items
     FROM hms_prescriptions r
     JOIN hms_patients p ON p.id = r.patient_id
     LEFT JOIN hms_users u ON u.id = r.doctor_id
     WHERE ${where.join(" AND ")} ORDER BY r.created_at DESC LIMIT ?`,
    [...params, Math.min(f.limit ?? 60, 300)]
  );
}

export function getPrescription(id: string) {
  const rx = hGet<RxRow>(
    `SELECT r.*, p.name AS patient_name, p.mrn AS patient_mrn, p.allergies, p.gender, p.dob, p.phone, p.address,
            u.name AS doctor_name, u.title AS doctor_title
     FROM hms_prescriptions r
     JOIN hms_patients p ON p.id = r.patient_id
     LEFT JOIN hms_users u ON u.id = r.doctor_id
     WHERE r.id = ?`,
    [id]
  );
  if (!rx) return null;
  const items = hAll<{
    id: string; drug: string; strength: string | null; form: string | null; dosage: string | null;
    frequency: string | null; duration: string | null; instructions: string | null;
    qty: number; unit_price: number; sort: number;
  }>("SELECT * FROM hms_rx_items WHERE prescription_id = ? ORDER BY sort", [id]);
  return { ...rx, items };
}

/* ------------------------------------------------------------------ orders */

export type LabRow = {
  id: string; patient_id: string; encounter_id: string | null; ordered_by: string | null; panel: string;
  test_name: string; priority: string; status: string; sample_type: string | null; result: string | null;
  technician: string | null; verified_by: string | null; price: number; created_at: string;
  completed_at: string | null; patient_name: string; mrn: string; doctor_name: string | null;
};

export function listLabOrders(f: { status?: string; q?: string } = {}): LabRow[] {
  const where: string[] = ["1=1"];
  const params: unknown[] = [];
  if (f.status && f.status !== "all") {
    where.push("l.status = ?");
    params.push(f.status);
  }
  if (f.q) {
    where.push("(p.name LIKE ? OR l.test_name LIKE ? OR p.mrn LIKE ?)");
    const like = `%${f.q}%`;
    params.push(like, like, like);
  }
  return hAll<LabRow>(
    `SELECT l.*, p.name AS patient_name, p.mrn, u.name AS doctor_name
     FROM hms_lab_orders l JOIN hms_patients p ON p.id = l.patient_id
     LEFT JOIN hms_users u ON u.id = l.ordered_by
     WHERE ${where.join(" AND ")}
     ORDER BY CASE l.priority WHEN 'urgent' THEN 0 ELSE 1 END, l.created_at DESC LIMIT 120`,
    params
  );
}

export type ImagingRow = {
  id: string; patient_id: string; encounter_id: string | null; ordered_by: string | null; modality: string;
  body_part: string; priority: string; status: string; findings: string | null; impression: string | null;
  radiologist: string | null; price: number; created_at: string; reported_at: string | null;
  patient_name: string; mrn: string; doctor_name: string | null;
};

export function listImagingOrders(f: { status?: string; modality?: string } = {}): ImagingRow[] {
  const where: string[] = ["1=1"];
  const params: unknown[] = [];
  if (f.status && f.status !== "all") {
    where.push("i.status = ?");
    params.push(f.status);
  }
  if (f.modality && f.modality !== "all") {
    where.push("i.modality = ?");
    params.push(f.modality);
  }
  return hAll<ImagingRow>(
    `SELECT i.*, p.name AS patient_name, p.mrn, u.name AS doctor_name
     FROM hms_imaging_orders i JOIN hms_patients p ON p.id = i.patient_id
     LEFT JOIN hms_users u ON u.id = i.ordered_by
     WHERE ${where.join(" AND ")} ORDER BY i.created_at DESC LIMIT 120`,
    params
  );
}

/* ------------------------------------------------------------------ beds */

export function listBeds() {
  return hAll<{
    id: string; label: string; ward: string; type: string; status: string;
    patient_id: string | null; admitted_at: string | null; daily_rate: number; notes: string | null;
    patient_name: string | null; mrn: string | null; diagnosis: string | null; admission_id: string | null;
  }>(
    `SELECT b.*, p.name AS patient_name, p.mrn, a.diagnosis, a.id AS admission_id
     FROM hms_beds b
     LEFT JOIN hms_admissions a ON a.bed_id = b.id AND a.status = 'admitted'
     LEFT JOIN hms_patients p ON p.id = a.patient_id
     ORDER BY b.label`
  );
}

export type AdmissionRow = {
  id: string; patient_id: string; bed_id: string | null; consultant: string | null; diagnosis: string | null;
  admission_type: string; admitted_at: string; discharged_at: string | null; status: string;
  notes: string | null; created_at: string; patient_name: string; mrn: string; bed_label: string | null;
};

export function listAdmissions(): AdmissionRow[] {
  return hAll<AdmissionRow>(
    `SELECT a.*, p.name AS patient_name, p.mrn, b.label AS bed_label
     FROM hms_admissions a
     JOIN hms_patients p ON p.id = a.patient_id
     LEFT JOIN hms_beds b ON b.id = a.bed_id
     ORDER BY a.admitted_at DESC LIMIT 60`
  );
}

/* -------------------------------------------------------------- inventory */

export type MedicineRow = {
  id: string; name: string; generic: string | null; form: string | null; strength: string | null;
  category: string | null; unit_price: number; stock: number; reorder_level: number; batch: string | null;
  expiry: string | null; supplier: string | null; active: number; updated_at: string | null;
};

export function listMedicines(f: { q?: string; low?: boolean } = {}): MedicineRow[] {
  const where: string[] = ["1=1"];
  const params: unknown[] = [];
  if (f.q) {
    where.push("(name LIKE ? OR category LIKE ? OR batch LIKE ?)");
    const like = `%${f.q}%`;
    params.push(like, like, like);
  }
  if (f.low) where.push("stock <= reorder_level");
  return hAll<MedicineRow>(
    `SELECT * FROM hms_medicines WHERE ${where.join(" AND ")} ORDER BY (stock * 1.0 / NULLIF(reorder_level,0)) ASC, name LIMIT 200`,
    params
  );
}

/* ------------------------------------------------------------- operations */

export type EncounterRow = {
  id: string; patient_id: string; doctor_id: string | null; department: string; visit_type: string;
  diagnosis: string | null; icd10: string | null; summary: string | null; vitals: string | null;
  status: string; created_at: string; patient_name: string; mrn: string; doctor_name: string | null;
};

export function listEncounters(limit = 40): EncounterRow[] {
  return hAll<EncounterRow>(
    `SELECT e.*, p.name AS patient_name, p.mrn, u.name AS doctor_name
     FROM hms_encounters e JOIN hms_patients p ON p.id = e.patient_id
     LEFT JOIN hms_users u ON u.id = e.doctor_id
     ORDER BY e.created_at DESC LIMIT ?`,
    [limit]
  );
}

export type AppointmentRow = {
  id: string; patient_id: string; doctor_id: string | null; department: string; start_at: string;
  status: string; reason: string | null; notes: string | null; created_at: string;
  patient_name: string; mrn: string; doctor_name: string | null;
};

export function listAppointments(day?: string): AppointmentRow[] {
  const dk = day ?? new Date().toISOString().slice(0, 10);
  return hAll<AppointmentRow>(
    `SELECT a.*, p.name AS patient_name, p.mrn, u.name AS doctor_name
     FROM hms_appointments a JOIN hms_patients p ON p.id = a.patient_id
     LEFT JOIN hms_users u ON u.id = a.doctor_id
     WHERE substr(a.start_at, 1, 10) = ? ORDER BY a.start_at`,
    [dk]
  );
}

export type SurgeryRow = {
  id: string; patient_id: string; surgeon: string | null; procedure_name: string; theatre: string;
  scheduled_at: string; duration_min: number; status: string; anesthesia: string | null; notes: string | null;
  created_at: string; patient_name: string; mrn: string;
};

export function listSurgeries(): SurgeryRow[] {
  return hAll<SurgeryRow>(
    `SELECT s.*, p.name AS patient_name, p.mrn FROM hms_surgeries s
     JOIN hms_patients p ON p.id = s.patient_id ORDER BY s.scheduled_at DESC LIMIT 60`
  );
}

export type InvoiceRow = {
  id: string; invoice_no: string; patient_id: string; encounter_id: string | null; items: string | null;
  subtotal: number; discount: number; tax: number; total: number; paid: number; status: string;
  created_at: string; patient_name: string; mrn: string;
};

export function listInvoices(): InvoiceRow[] {
  return hAll<InvoiceRow>(
    `SELECT i.*, p.name AS patient_name, p.mrn FROM hms_invoices i
     JOIN hms_patients p ON p.id = i.patient_id ORDER BY i.created_at DESC LIMIT 60`
  );
}

export type AuditRow = {
  id: string; user_id: string | null; user_name: string; action: string; entity: string;
  entity_id: string | null; detail: string; created_at: string;
};

export function listAudit(limit = 60): AuditRow[] {
  return hAll<AuditRow>("SELECT * FROM hms_audit ORDER BY created_at DESC LIMIT ?", [limit]);
}

/* -------------------------------------------------------------- analytics */

export function hmsKpis() {
  const today = new Date().toISOString().slice(0, 10);
  const monthStart = today.slice(0, 8) + "01";
  const patients = hGet<{ c: number }>("SELECT COUNT(*) AS c FROM hms_patients")?.c ?? 0;
  const newPatients = hGet<{ c: number }>("SELECT COUNT(*) AS c FROM hms_patients WHERE substr(created_at,1,7) = ?", [today.slice(0, 7)])?.c ?? 0;
  const todayAppts = hGet<{ c: number }>("SELECT COUNT(*) AS c FROM hms_appointments WHERE substr(start_at,1,10) = ?", [today])?.c ?? 0;
  const pendingRx = hGet<{ c: number }>("SELECT COUNT(*) AS c FROM hms_prescriptions WHERE status = 'pending'")?.c ?? 0;
  const labOpen = hGet<{ c: number }>("SELECT COUNT(*) AS c FROM hms_lab_orders WHERE status != 'verified'")?.c ?? 0;
  const imgOpen = hGet<{ c: number }>("SELECT COUNT(*) AS c FROM hms_imaging_orders WHERE status != 'reported'")?.c ?? 0;
  const beds = hGet<{ total: number; occupied: number }>(
    "SELECT COUNT(*) AS total, SUM(CASE WHEN status = 'occupied' THEN 1 ELSE 0 END) AS occupied FROM hms_beds"
  );
  const revenueMonth = hGet<{ s: number }>(
    "SELECT COALESCE(SUM(paid),0) AS s FROM hms_invoices WHERE substr(created_at,1,7) = ?",
    [today.slice(0, 7)]
  )?.s ?? 0;
  const revenueToday = hGet<{ s: number }>(
    "SELECT COALESCE(SUM(paid),0) AS s FROM hms_invoices WHERE substr(created_at,1,10) = ?",
    [today]
  )?.s ?? 0;
  const outstanding = hGet<{ s: number }>("SELECT COALESCE(SUM(total - paid),0) AS s FROM hms_invoices WHERE status != 'paid'")?.s ?? 0;
  const surgeriesToday = hGet<{ c: number }>("SELECT COUNT(*) AS c FROM hms_surgeries WHERE substr(scheduled_at,1,10) = ?", [today])?.c ?? 0;
  const lowStock = hGet<{ c: number }>("SELECT COUNT(*) AS c FROM hms_medicines WHERE stock <= reorder_level AND active = 1")?.c ?? 0;
  const criticalLabs = hGet<{ c: number }>(
    "SELECT COUNT(*) AS c FROM hms_lab_orders WHERE status = 'verified' AND (result LIKE '%↑%' OR result LIKE '%critical%')"
  )?.c ?? 0;
  const monthStartIso = `${monthStart}T00:00:00.000Z`;

  return {
    patients: Number(patients),
    newPatients: Number(newPatients),
    todayAppts: Number(todayAppts),
    pendingRx: Number(pendingRx),
    labOpen: Number(labOpen),
    imgOpen: Number(imgOpen),
    bedTotal: Number(beds?.total ?? 10),
    bedOccupied: Number(beds?.occupied ?? 0),
    occupancy: beds?.total ? Math.round((Number(beds.occupied) / Number(beds.total)) * 100) : 0,
    revenueMonth: Number(revenueMonth),
    revenueToday: Number(revenueToday),
    outstanding: Number(outstanding),
    surgeriesToday: Number(surgeriesToday),
    lowStock: Number(lowStock),
    criticalLabs: Number(criticalLabs),
    monthStartIso,
  };
}

export function revenueSeries(days = 14) {
  const rows = hAll<{ d: string; s: number; n: number }>(
    `SELECT substr(created_at,1,10) AS d, COALESCE(SUM(paid),0) AS s, COUNT(*) AS n
     FROM hms_invoices WHERE created_at >= ? GROUP BY d ORDER BY d`,
    [new Date(Date.now() - days * 864e5).toISOString()]
  );
  const map = new Map(rows.map((r) => [r.d, r]));
  return Array.from({ length: days }, (_, i) => {
    const d = new Date(Date.now() - (days - 1 - i) * 864e5);
    const key = d.toISOString().slice(0, 10);
    const row = map.get(key);
    return {
      date: key,
      label: d.toLocaleDateString("en-GB", { day: "2-digit", month: "short" }),
      revenue: Number(row?.s ?? 0),
      invoices: Number(row?.n ?? 0),
    };
  });
}

export function departmentMix() {
  return hAll<{ department: string; n: number }>(
    "SELECT department, COUNT(*) AS n FROM hms_appointments GROUP BY department ORDER BY n DESC"
  );
}

export function topDiagnoses(limit = 8) {
  return hAll<{ diagnosis: string; n: number }>(
    "SELECT diagnosis, COUNT(*) AS n FROM hms_encounters WHERE diagnosis IS NOT NULL GROUP BY diagnosis ORDER BY n DESC LIMIT ?",
    [limit]
  );
}

export function prescriptionMix() {
  return hAll<{ drug: string; n: number }>(
    "SELECT drug, COUNT(*) AS n FROM hms_rx_items GROUP BY drug ORDER BY n DESC LIMIT 8"
  );
}

export function recentActivity(limit = 10): AuditRow[] {
  return hAll<AuditRow>(
    "SELECT * FROM hms_audit ORDER BY created_at DESC LIMIT ?",
    [limit]
  );
}
