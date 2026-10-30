import { CreditCard } from "lucide-react";
import { Panel, SectionTitle, Stat } from "@/components/hms/ui";
import { digitsOf, money } from "@/lib/hms/format";
import { requireHmsPage } from "@/lib/hms/auth";
import { tx } from "@/lib/hms/i18n";
import { getLang } from "@/lib/hms/lang-server";

import { hmsReady } from "@/lib/hms/db";
import { listInvoices, listPatients } from "@/lib/hms/queries";
import { BillingBoard } from "./board";

export const dynamic = "force-dynamic";

export default async function BillingPage() {
  await requireHmsPage(["admin", "reception", "nurse"]);
  await hmsReady();
  const lang = await getLang();
  const tr = (en: string, fa: string, vars?: Record<string, string | number>) => tx(lang, en, fa, vars);
  const invoices = listInvoices();
  const patients = listPatients({ limit: 400 }).items;
  const unpaid = invoices.filter((i) => i.status !== "paid");
  const collected = invoices.reduce((a, i) => a + i.paid, 0);
  const outstanding = unpaid.reduce((a, i) => a + (i.total - i.paid), 0);

  return (
    <div className="space-y-3.5">
      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
        <Stat label={tr("Collected", "دریافتی")} value={money(collected, lang)} hint={tr("{n} invoices", "{n} بل", { n: digitsOf(lang, invoices.length) })} tone="good" icon={<CreditCard size={14} />} />
        <Stat label={tr("Outstanding", "باقی‌مانده")} value={money(outstanding, lang)} hint={tr("{n} open account(s)", "{n} حساب باز", { n: digitsOf(lang, unpaid.length) })} tone={outstanding > 0 ? "warn" : "good"} />
        <Stat label={tr("Partially paid", "نیمه‌پرداخت")} value={digitsOf(lang, invoices.filter((i) => i.status === "partial").length)} hint={tr("Follow up by SMS", "پیگیری با پیامک")} tone="info" />
        <Stat label={tr("Average invoice", "میانگین بل")} value={money(invoices.length ? invoices.reduce((a, i) => a + i.total, 0) / invoices.length : 0, lang)} hint={tr("All time", "از آغاز")} tone="brand" />
      </div>
      <Panel>
        <SectionTitle title={tr("Invoices & cash desk", "بل‌ها و صندوق")} subtitle={tr("Issue an invoice, take full or partial payments and print a receipt.", "بل صادر کنید، پرداخت کامل یا جزئی بگیرید و رسید چاپ کنید.")} icon={<CreditCard size={14} />} />
        <BillingBoard
          invoices={invoices.map((i) => ({ id: i.id, invoice_no: i.invoice_no, patient_name: i.patient_name, mrn: i.mrn, total: i.total, paid: i.paid, status: i.status, created_at: i.created_at, items: i.items }))}
          patients={patients.map((p) => ({ id: p.id, name: p.name, mrn: p.mrn }))}
        />
      </Panel>
    </div>
  );
}
