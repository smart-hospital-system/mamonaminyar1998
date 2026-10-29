import { Beaker } from "lucide-react";
import { Panel, SectionTitle, Stat } from "@/components/hms/ui";
import { requireHmsPage } from "@/lib/hms/auth";
import { hmsReady } from "@/lib/hms/db";
import { listMedicines, listPrescriptions } from "@/lib/hms/queries";
import { money } from "@/lib/hms/format";
import { PharmacyBoard } from "./board";

export const dynamic = "force-dynamic";

export default async function PharmacyPage({ searchParams }: { searchParams: Promise<{ tab?: string; q?: string }> }) {
  const user = await requireHmsPage(["admin", "pharmacist", "nurse"]);
  await hmsReady();
  const sp = await searchParams;
  const meds = listMedicines({});
  const rx = listPrescriptions({ limit: 100 });
  const low = meds.filter((m) => m.stock <= m.reorder_level);
  const expiring = meds.filter((m) => m.expiry && new Date(m.expiry).getTime() < Date.now() + 60 * 864e5);
  const stockValue = meds.reduce((a, m) => a + m.stock * m.unit_price, 0);

  return (
    <div className="space-y-3.5">
      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
        <Stat label="Dispensing queue" value={rx.filter((r) => ["signed", "pending"].includes(r.status)).length} hint="Signed prescriptions" tone="warn" icon={<Beaker size={14} />} />
        <Stat label="Below reorder level" value={low.length} hint={low.slice(0, 2).map((l) => l.name).join(", ") || "All healthy"} tone={low.length ? "bad" : "good"} />
        <Stat label="Expiring ≤ 60 days" value={expiring.length} hint="Rotate stock now" tone={expiring.length ? "warn" : "good"} />
        <Stat label="Stock value" value={money(stockValue)} hint={`${meds.length} lines`} tone="brand" />
      </div>
      <Panel>
        <SectionTitle
          title="Pharmacy counter"
          subtitle="Dispense against a prescription (stock is decremented automatically) or manage inventory and expiry."
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
