import { body, json, qp, route } from "@/lib/api";
import { requireHmsApi } from "@/lib/hms/auth";
import { hAudit, hNow, hRun, hUid, hmsReady, hGet } from "@/lib/hms/db";
import { listPatients } from "@/lib/hms/queries";

export const GET = route(async (req) => {
  await requireHmsApi();
  hmsReady();
  const p = qp(req);
  return json(listPatients({ q: p.get("q") ?? undefined, sort: p.get("sort") ?? undefined, limit: p.get("limit") ? Number(p.get("limit")) : undefined }));
});

export const POST = route(async (req) => {
  const user = await requireHmsApi(["admin", "doctor", "nurse", "reception"]);
  const p = await body<Record<string, string>>(req);
  if (!p.name?.trim()) return json({ error: "A patient name is required." }, 422);
  const next = hGet<{ c: number }>("SELECT COUNT(*) AS c FROM hms_patients");
  const seq = 1001 + Number(next?.c ?? 0);
  let mrn = `MRN-${seq}`;
  while (hGet("SELECT id FROM hms_patients WHERE mrn = ?", [mrn])) mrn = `MRN-${seq + Math.floor(Math.random() * 900) + 1}`;
  const id = hUid("pat");
  hRun(
    `INSERT INTO hms_patients (id, mrn, name, gender, dob, phone, email, address, blood_group, allergies, chronic,
      emergency_contact, insurance, notes, created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
    [
      id, mrn, p.name.trim(), p.gender ?? "Unknown", p.dob ?? null, p.phone ?? null, p.email ?? null,
      p.address ?? null, p.blood_group ?? null, p.allergies ?? "None", p.chronic ?? null,
      p.emergency_contact ?? null, p.insurance ?? "Self-pay", p.notes ?? null, hNow(),
    ]
  );
  hAudit(user, "created", "patient", id, `Registered patient ${p.name} (${mrn})`);
  return json({ ok: true, id, mrn }, 201);
});

export const dynamic = "force-dynamic";
