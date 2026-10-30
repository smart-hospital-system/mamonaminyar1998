import { Pill as PillIcon } from "lucide-react";
import { Panel, SectionTitle } from "@/components/hms/ui";
import { requireHmsPage } from "@/lib/hms/auth";
import { tx } from "@/lib/hms/i18n";
import { getLang } from "@/lib/hms/lang-server";

import { getSection, hmsReady } from "@/lib/hms/db";
import { listPrescriptions } from "@/lib/hms/queries";
import { RX_TEMPLATES } from "@/lib/hms/templates";
import { PrescriptionRegister } from "./register";

export const dynamic = "force-dynamic";

export default async function PrescriptionsPage({ searchParams }: { searchParams: Promise<{ q?: string; status?: string; patient?: string }> }) {
  const user = await requireHmsPage();
  await hmsReady();
  const lang = await getLang();
  const tr = (en: string, fa: string, vars?: Record<string, string | number>) => tx(lang, en, fa, vars);
  const sp = await searchParams;
  const items = listPrescriptions({ q: sp.q, status: sp.status, patient_id: sp.patient, limit: 120 });
  const theme = getSection<Record<string, unknown>>("theme");
  const canSign = ["admin", "doctor"].includes(user.role);

  return (
    <Panel>
      <SectionTitle
        title={tr("Prescription register", "ثبت نسخه‌ها")}
        subtitle={tr("Every prescription is safety-screened before signature, then printed on the design you choose.", "هر نسخه پیش از امضا از نظر ایمنی بررسی می‌شود، سپس روی طرحی که انتخاب می‌کنید چاپ می‌گردد.")}
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
