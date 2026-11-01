import { requireHmsPage } from "@/lib/hms/auth";
import { hmsReady } from "@/lib/hms/db";
import { knowledgeSummary } from "@/lib/hms/clinical";
import { ClinicalTools } from "./tools";

export const dynamic = "force-dynamic";

export default async function IntelligencePage() {
  await requireHmsPage(["admin", "doctor", "nurse", "pharmacist", "lab", "radiology"]);
  await hmsReady();
  // Warm the summary so the page proves the library shipped with it.
  const k = knowledgeSummary();
  return (
    <div className="mx-auto max-w-5xl space-y-3" data-knowledge={`${k.interactions}/${k.drugs}/${k.renal}/${k.tests}`}>
      <ClinicalTools />
    </div>
  );
}
