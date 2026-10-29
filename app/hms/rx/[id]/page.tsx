import { notFound } from "next/navigation";
import { RxSheet } from "@/components/hms/rx-sheet";
import { requireHmsPage } from "@/lib/hms/auth";
import { getSection, hmsReady } from "@/lib/hms/db";
import { getPrescription } from "@/lib/hms/queries";
import { RX_TEMPLATES, templateById } from "@/lib/hms/templates";
import { PrintBar } from "./print-bar";

export const dynamic = "force-dynamic";

export default async function RxPrintPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ template?: string; embed?: string }>;
}) {
  await requireHmsPage();
  await hmsReady();
  const { id } = await params;
  const sp = await searchParams;
  const rx = getPrescription(id);
  if (!rx) notFound();

  const identity = getSection<Record<string, unknown>>("identity");
  const theme = getSection<Record<string, unknown>>("theme");
  const tpl = sp.template ? templateById(Number(sp.template)) : templateById(Number(rx.template ?? theme.rx_template ?? 1));
  const embed = sp.embed === "1";

  return (
    <div style={{ background: embed ? "#eef2f6" : "#e9edf2", minHeight: "100vh", padding: embed ? 0 : "18px 0 40px" }}>
      {!embed && <PrintBar rxNo={rx.rx_no} patient={rx.patient_name} template={tpl.id} templates={RX_TEMPLATES.map((t) => ({ id: t.id, name: t.name }))} />}
      <div style={{ display: "flex", justifyContent: "center", padding: embed ? 0 : 0 }}>
        <RxSheet
          template={tpl}
          identity={{
            name: String(identity.name),
            name_short: String(identity.name_short ?? identity.name),
            local: String(identity.name_local ?? ""),
            tagline: String(identity.tagline ?? ""),
            licence: String(identity.license_no ?? ""),
            phone: String(identity.phone ?? ""),
            emergency: String(identity.emergency ?? ""),
            email: String(identity.email ?? ""),
            website: String(identity.website ?? ""),
            address: String(identity.address ?? ""),
            city: String(identity.city ?? ""),
            country: String(identity.country ?? ""),
            footer: String(identity.footer_note ?? ""),
          }}
          doc={{
            rx_no: rx.rx_no,
            created_at: rx.created_at,
            diagnosis: rx.diagnosis,
            icd10: rx.icd10,
            notes: rx.notes,
            follow_up: rx.follow_up,
            doctor_name: rx.doctor_name,
            doctor_title: (rx as unknown as { doctor_title?: string }).doctor_title ?? "Attending physician",
            status: rx.status,
            signed_at: rx.signed_at,
          }}
          patient={{
            patient_name: rx.patient_name,
            patient_mrn: rx.patient_mrn,
            gender: (rx as unknown as { gender?: string }).gender,
            dob: (rx as unknown as { dob?: string }).dob,
            phone: (rx as unknown as { phone?: string }).phone,
            allergies: rx.allergies,
          }}
          items={rx.items}
        />
      </div>
    </div>
  );
}
