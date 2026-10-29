import { CreditCard } from "lucide-react";
import { Panel, SectionTitle, Stat } from "@/components/hms/ui";
import { money } from "@/lib/hms/format";
import { requireHmsPage } from "@/lib/hms/auth";
import { hmsReady } from "@/lib/hms/db";
import { listInvoices, listPatients } from "@/lib/hms/queries";
import { BillingBoard } from "./board";

export const dynamic = "force-dynamic";

export default async function BillingPage() {
  await requireHmsPage(["admin", "reception", "nurse"]);
  await hmsReady();
  const invoices = listInvoices();
  const patients = listPatients({ limit: 400 }).items;
  const unpaid = invoices.filter((i) => i.status !== "paid");
  const collected = invoices.reduce((a, i) => a + i.paid, 0);
  const outstanding = unpaid.reduce((a, i) => a + (i.total - i.paid), 0);

  return (
    <div className="space-y-3.5">
      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
        <Stat label="Collected" value={money(collected)} hint={`${invoices.length} invoices`} tone="good" icon={<CreditCard size={14} />} />
        <Stat label="Outstanding" value={money(outstanding)} hint={`${unpaid.length} open account(s)`} tone={outstanding > 0 ? "warn" : "good"} />
        <Stat label="Partially paid" value={invoices.filter((i) => i.status === "partial").length} hint="Follow up by SMS" tone="info" />
        <Stat label="Average invoice" value={money(invoices.length ? invoices.reduce((a, i) => a + i.total, 0) / invoices.length : 0)} hint="All time" tone="brand" />
      </div>
      <Panel>
        <SectionTitle title="Invoices & cash desk" subtitle="Issue an invoice, take full or partial payments and print a receipt." icon={<CreditCard size={14} />} />
        <BillingBoard
          invoices={invoices.map((i) => ({ id: i.id, invoice_no: i.invoice_no, patient_name: i.patient_name, mrn: i.mrn, total: i.total, paid: i.paid, status: i.status, created_at: i.created_at, items: i.items }))}
          patients={patients.map((p) => ({ id: p.id, name: p.name, mrn: p.mrn }))}
        />
      </Panel>
    </div>
  );
}
