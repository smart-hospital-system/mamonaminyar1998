import { notFound } from "next/navigation";
import { DocumentSheet } from "@/components/hms/doc-sheet";
import { PrintBar } from "@/components/hms/print-bar";
import { requireHmsPage } from "@/lib/hms/auth";
import { getSection, hGet, hmsReady } from "@/lib/hms/db";
import { DOC_TEMPLATES, docTemplateById } from "@/lib/hms/templates";

export const dynamic = "force-dynamic";

type Row = {
  id: string; invoice_no: string; items: string | null; total: number; paid: number; status: string;
  created_at: string; patient_name: string; mrn: string;
};

export default async function ReceiptPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ template?: string }>;
}) {
  await requireHmsPage();
  await hmsReady();
  const { id } = await params;
  const sp = await searchParams;

  const inv = hGet<Row>(
    `SELECT i.id, i.invoice_no, i.items, i.total, i.paid, i.status, i.created_at, p.name AS patient_name, p.mrn
     FROM hms_invoices i JOIN hms_patients p ON p.id = i.patient_id WHERE i.id = ? OR i.invoice_no = ?`,
    [id, id]
  );
  if (!inv) notFound();

  const identity = getSection<Record<string, unknown>>("identity");
  const theme = getSection<Record<string, unknown>>("theme");
  const tpl = docTemplateById(Number(sp.template ?? theme.doc_statement ?? 4)) ?? DOC_TEMPLATES[3];

  let lines: { label: string; qty: number; price: number }[] = [];
  try {
    lines = JSON.parse(inv.items ?? "[]");
  } catch {
    lines = [];
  }

  return (
    <div style={{ background: "#e9edf2", minHeight: "100vh", padding: "18px 0 40px" }}>
      <PrintBar no={inv.invoice_no} subtitle={`${inv.patient_name} · ${inv.mrn}`} />
      <div style={{ display: "flex", justifyContent: "center" }}>
        <DocumentSheet
          template={tpl}
          identity={{
            name: String(identity.name),
            address: String(identity.address ?? ""),
            city: String(identity.city ?? ""),
            country: String(identity.country ?? ""),
            phone: String(identity.phone ?? ""),
            email: String(identity.email ?? ""),
            license_no: String(identity.license_no ?? ""),
          }}
          patient={inv.patient_name}
          mrn={inv.mrn}
          docNo={inv.invoice_no}
          status={inv.status}
          amount={{ total: inv.total, paid: inv.paid }}
          lines={lines}
          signature={String(identity.director ?? "Dr. Mamon Aminyar")}
        />
      </div>
    </div>
  );
}
