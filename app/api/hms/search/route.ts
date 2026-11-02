import { json, qp, route } from "@/lib/api";
import { requireHmsApi } from "@/lib/hms/auth";
import { hAll, hmsReady } from "@/lib/hms/db";

/**
 * GET /api/hms/search?q=…
 *
 * One query, every corner of the hospital. The command palette (⌘K) uses this
 * so a clerk can type "Ahmad", "RX-1042", "AYB-2026-0148" or "metformin" and
 * land on the right record in one keystroke, without knowing which screen it
 * lives on.
 *
 * The search is deliberately tolerant: it matches partial words, is case
 * insensitive, and treats MRN / invoice / prescription numbers as first-class
 * citizens. Results are grouped and capped so the palette stays instant even
 * with years of data.
 */

type Hit = { id: string; title: string; subtitle?: string; kind: string; href: string; meta?: string };

const LIMIT = 5;

export const GET = route(async (req) => {
  const user = await requireHmsApi();
  hmsReady();
  const q = (qp(req).get("q") ?? "").trim();
  if (q.length < 2) return json({ q, groups: [], total: 0 });

  const like = `%${q.replace(/[%_]/g, "")}%`;
  const groups: { key: string; items: Hit[] }[] = [];
  const push = (key: string, items: Hit[]) => {
    if (items.length) groups.push({ key, items });
  };

  /* ------------------------------------------------------------- patients */
  const patients = hAll<{ id: string; mrn: string; name: string; gender: string; dob: string; phone: string }>(
    `SELECT id, mrn, name, gender, dob, phone FROM hms_patients
     WHERE name LIKE ? OR mrn LIKE ? OR phone LIKE ? OR id LIKE ?
     ORDER BY (mrn LIKE ?) DESC, name LIMIT ${LIMIT}`,
    [like, like, like, like, like]
  );
  push(
    "patients",
    patients.map((p) => ({
      id: p.id,
      title: p.name,
      subtitle: `${p.mrn} · ${p.gender}${p.dob ? ` · ${p.dob}` : ""}`,
      meta: p.phone ?? undefined,
      kind: "patient",
      href: `/hms/patients/${p.id}`,
    }))
  );

  /* -------------------------------------------------------- prescriptions */
  const rxs = hAll<never>(
    `SELECT r.id, r.rx_no, r.status, p.name AS patient, r.diagnosis
       FROM hms_prescriptions r LEFT JOIN hms_patients p ON p.id = r.patient_id
      WHERE r.rx_no LIKE ? OR p.name LIKE ? OR r.diagnosis LIKE ?
      ORDER BY r.created_at DESC LIMIT ${LIMIT}`,
    [like, like, like]
  ) as { id: string; rx_no: string; status: string; patient: string | null; diagnosis: string | null }[];
  push(
    "prescriptions",
    rxs.map((r) => ({
      id: r.id,
      title: r.rx_no,
      subtitle: [r.patient, r.diagnosis].filter(Boolean).join(" · "),
      meta: r.status,
      kind: "prescription",
      href: `/hms/rx/${r.id}`,
    }))
  );

  /* -------------------------------------------------------------- invoices */
  const invoices = hAll<never>(
    `SELECT i.id, i.invoice_no, i.status, i.total, p.name AS patient
       FROM hms_invoices i LEFT JOIN hms_patients p ON p.id = i.patient_id
      WHERE i.invoice_no LIKE ? OR p.name LIKE ?
      ORDER BY i.created_at DESC LIMIT ${LIMIT}`,
    [like, like]
  ) as { id: string; invoice_no: string; status: string; total: number; patient: string | null }[];
  push(
    "invoices",
    invoices.map((i) => ({
      id: i.id,
      title: i.invoice_no,
      subtitle: i.patient ?? "",
      meta: `${i.status} · ${i.total}`,
      kind: "invoice",
      href: `/hms/receipt/${i.id}`,
    }))
  );

  /* ------------------------------------------------------------- medicines */
  const meds = hAll<never>(
    `SELECT id, name, strength, form, stock, category FROM hms_medicines
      WHERE name LIKE ? OR category LIKE ? OR id LIKE ?
      ORDER BY name LIMIT ${LIMIT}`,
    [like, like, like]
  ) as { id: string; name: string; strength: string | null; form: string | null; stock: number; category: string | null }[];
  push(
    "medicines",
    meds.map((m) => ({
      id: m.id,
      title: [m.name, m.strength].filter(Boolean).join(" "),
      subtitle: [m.form, m.category].filter(Boolean).join(" · "),
      meta: `${m.stock} in stock`,
      kind: "medicine",
      href: `/hms/pharmacy?q=${encodeURIComponent(m.name)}`,
    }))
  );

  /* ----------------------------------------------------------- lab & imaging */
  const labs = hAll<{ id: string; test_name: string; status: string; panel: string }>(
    `SELECT id, test_name, status, panel FROM hms_lab_orders
      WHERE id LIKE ? OR test_name LIKE ? ORDER BY created_at DESC LIMIT 3`,
    [like, like]
  );
  const imaging = hAll<{ id: string; modality: string; body_part: string; status: string }>(
    `SELECT id, modality, body_part, status FROM hms_imaging_orders
      WHERE id LIKE ? OR body_part LIKE ? ORDER BY created_at DESC LIMIT 3`,
    [like, like]
  );
  push(
    "orders",
    [
      ...labs.map((l) => ({ id: l.id, title: l.test_name, subtitle: `Laboratory${l.panel ? ` · ${l.panel}` : ""}`, meta: l.status, kind: "lab", href: "/hms/lab" })),
      ...imaging.map((i) => ({ id: i.id, title: `${i.modality} · ${i.body_part}`, subtitle: "Radiology", meta: i.status, kind: "imaging", href: "/hms/radiology" })),
    ]
  );

  /* ----------------------------------------------------------------- staff */
  if (["admin", "doctor"].includes(user.role)) {
    const staff = hAll<never>(
      `SELECT id, name, email, role, title FROM hms_users WHERE name LIKE ? OR email LIKE ? OR title LIKE ? LIMIT 3`,
      [like, like, like]
    ) as { id: string; name: string; email: string; role: string; title: string | null }[];
    push(
      "staff",
      staff.map((s) => ({ id: s.id, title: s.name, subtitle: s.title ?? s.role, meta: s.email, kind: "staff", href: "/hms/team" }))
    );
  }

  return json({ q, total: groups.reduce((a, g) => a + g.items.length, 0), groups });
});

export const dynamic = "force-dynamic";
