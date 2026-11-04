import { body, json, route } from "@/lib/api";
import { requireHmsApi } from "@/lib/hms/auth";
import { updateStock, type StockPatch } from "@/lib/hms/stock-actions";
export const PATCH = route<{ id: string }>(async (req, { params }) => {
  const actor = await requireHmsApi(["admin", "pharmacist"]);
  const { id } = await params;
  return json(updateStock(id, await body<StockPatch>(req), actor));
});
export const dynamic = "force-dynamic";
