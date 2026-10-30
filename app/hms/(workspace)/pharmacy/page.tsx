import { Beaker } from "lucide-react";
import { Panel, SectionTitle, Stat } from "@/components/hms/ui";
import { requireHmsPage } from "@/lib/hms/auth";
import { tx } from "@/lib/hms/i18n";
import { getLang } from "@/lib/hms/lang-server";

import { hmsReady } from "@/lib/hms/db";
import { listMedicines, listPrescriptions } from "@/lib/hms/queries";
import { digitsOf, money } from "@/lib/hms/format";
import { PharmacyBoard } from "./board";

export const dynamic = "force-dynamic";

export default async function PharmacyPage({ searchParams }: { searchParams: Promise<{ tab?: string; q?: string }> }) {
  const user = await requireHmsPage(["admin", "pharmacist", "nurse"]);
  await hmsReady();
  const lang = await getLang();
  const tr = (en: string, fa: string, vars?: Record<string, string | number>) => tx(lang, en, fa, vars);
  const sp = await searchParams;
  const meds = listMedicines({});
  const rx = listPrescriptions({ limit: 100 });
  const low = meds.filter((m) => m.stock <= m.reorder_level);
  const expiring = meds.filter((m) => m.expiry && new Date(m.expiry).getTime() < Date.now() + 60 * 864e5);
  const stockValue = meds.reduce((a, m) => a + m.stock * m.unit_price, 0);

  return (
    <div className="space-y-3.5">
      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
        <Stat label={tr("Dispensing queue", "صف تحویل دوا")} value={digitsOf(lang, rx.filter((r) => ["signed", "pending"].includes(r.status)).length)} hint={tr("Signed prescriptions", "نسخه‌های امضاشده")} tone="warn" icon={<Beaker size={14} />} />
        <Stat label={tr("Below reorder level", "کمتر از حد سفارش")} value={digitsOf(lang, low.length)} hint={low.slice(0, 2).map((l) => l.name).join(", ") || tr("All healthy", "همه کافی است")} tone={low.length ? "bad" : "good"} />
        <Stat label={tr("Expiring ≤ 60 days", "انقضا در ۶۰ روز")} value={digitsOf(lang, expiring.length)} hint={tr("Rotate stock now", "موجودی را همین حالا بچرخانید")} tone={expiring.length ? "warn" : "good"} />
        <Stat label={tr("Stock value", "ارزش موجودی")} value={money(stockValue, lang)} hint={tr("{n} lines", "{n} قلم", { n: digitsOf(lang, meds.length) })} tone="brand" />
      </div>
      <Panel>
        <SectionTitle
          title={tr("Pharmacy counter", "کانتر دواخانه")}
          subtitle={tr("Dispense against a prescription (stock is decremented automatically) or manage inventory and expiry.", "دوا را مطابق نسخه تحویل دهید (موجودی خودکار کم می‌شود) یا موجودی و انقضا را مدیریت کنید.")}
          icon={<Beaker size={14} />}
        />
        <PharmacyBoard
          prescriptions={rx.map((r) => ({ id: r.id, rx_no: r.rx_no, patient_name: r.patient_name, patient_mrn: r.patient_mrn, diagnosis: r.diagnosis, status: r.status, items: r.items, created_at: r.created_at, doctor_name: r.doctor_name }))}
          medicines={meds}
          initialTab={sp.tab === "stock" ? "stock" : sp.tab === "expiry" ? "expiry" : "queue"}
          initialQuery={sp.q ?? ""}
        />
      </Panel>
    </div>
  );
}
