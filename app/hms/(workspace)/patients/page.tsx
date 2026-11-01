import { Users } from "lucide-react";
import { Panel, SectionTitle } from "@/components/hms/ui";
import { requireHmsPage } from "@/lib/hms/auth";
import { digitsOf } from "@/lib/hms/format";
import { tx } from "@/lib/hms/i18n";
import { getLang } from "@/lib/hms/lang-server";
import { hmsReady } from "@/lib/hms/db";
import { listPatients } from "@/lib/hms/queries";
import { PatientsTable } from "./table";

export const dynamic = "force-dynamic";

export default async function PatientsPage({ searchParams }: { searchParams: Promise<{ q?: string; sort?: string; open?: string }> }) {
  await requireHmsPage();
  await hmsReady();
  const lang = await getLang();
  const sp = await searchParams;
  const { items, total } = listPatients({ q: sp.q, sort: sp.sort, limit: 400 });

  return (
    <Panel>
      <SectionTitle
        title={tx(lang, "Patient register", "ثبت مریضان")}
        subtitle={tx(lang, "{n} record(s) on this installation · every visit, result and prescription is linked to the MRN", "{n} رکورد در این نسخه · هر مراجعه، نتیجه و نسخه به شمارهٔ پرونده وصل است", { n: digitsOf(lang, total) })}
        icon={<Users size={14} />}
      />
      <PatientsTable rows={items} autoOpen={sp.open === "new"} />
    </Panel>
  );
}
