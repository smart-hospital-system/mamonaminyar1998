import { Pill as PillIcon } from "lucide-react";
import { Panel, SectionTitle } from "@/components/hms/ui";
import { requireHmsPage } from "@/lib/hms/auth";
import { getSection, hmsReady } from "@/lib/hms/db";
import { listPrescriptions } from "@/lib/hms/queries";
import { RX_TEMPLATES } from "@/lib/hms/templates";
import { PrescriptionRegister } from "./register";

export const dynamic = "force-dynamic";

export default async function PrescriptionsPage({ searchParams }: { searchParams: Promise<{ q?: string; status?: string; patient?: string }> }) {
  const user = await requireHmsPage();
  await hmsReady();
  const sp = await searchParams;
  const items = listPrescriptions({ q: sp.q, status: sp.status, patient_id: sp.patient, limit: 120 });
  const theme = getSection<Record<string, unknown>>("theme");
  const canSign = ["admin", "doctor"].includes(user.role);

  return (
    <Panel>
      <SectionTitle
        title="Prescription register"
        subtitle="Every prescription is safety-screened before signature, then printed on the design you choose."
        icon={<PillIcon size={14} />}
      />
      <PrescriptionRegister
        rows={items}
        templates={RX_TEMPLATES.map((t) => ({ id: t.id, name: t.name, slug: t.slug, preview: t.accent, paper: t.paper }))}
        activeTemplate={Number(theme.rx_template ?? 1)}
        canSign={canSign}
        role={user.role}
      />
    </Panel>
  );
}
