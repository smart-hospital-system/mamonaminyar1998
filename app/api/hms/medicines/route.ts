import { json, qp, route } from "@/lib/api";
import { requireHmsApi } from "@/lib/hms/auth";
import { hmsReady } from "@/lib/hms/db";
import { listMedicines } from "@/lib/hms/queries";

export const GET = route(async (req) => {
  await requireHmsApi();
  hmsReady();
  const p = qp(req);
  return json({ items: listMedicines({ q: p.get("q") ?? undefined, low: p.get("low") === "1" }) });
});

export const dynamic = "force-dynamic";
