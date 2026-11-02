import { body, json, route } from "@/lib/api";
import { requireHmsApi } from "@/lib/hms/auth";
import { hAudit, hNow, hRun, hGet } from "@/lib/hms/db";

export const PATCH = route<{ id: string }>(async (req, { params }) => {
  const user = await requireHmsApi(["admin", "pharmacist"]);
  const { id } = await params;
  const p = await body<{ add?: number; stock?: number; batch?: string; expiry?: string; price?: number; reorder_level?: number }>(req);
  const med = hGet<{ name: string; stock: number }>("SELECT name, stock FROM hms_medicines WHERE id = ?", [id]);
  if (!med) return json({ error: "Medicine not found" }, 404);

  if (p.add !== undefined) {
    hRun("UPDATE hms_medicines SET stock = MAX(0, stock + ?), updated_at = ? WHERE id = ?", [Number(p.add), hNow(), id]);
    hAudit(user, "restocked", "medicine", id, `${p.add > 0 ? "Received" : "Adjusted"} ${Math.abs(Number(p.add))} × ${med.name}`);
  }
  const sets: string[] = [];
  const values: unknown[] = [];
  if (p.stock !== undefined) { sets.push("stock = ?"); values.push(Number(p.stock)); }
  if (p.batch) { sets.push("batch = ?"); values.push(p.batch); }
  if (p.expiry) { sets.push("expiry = ?"); values.push(p.expiry); }
  if (p.price !== undefined) { sets.push("unit_price = ?"); values.push(Number(p.price)); }
  if (p.reorder_level !== undefined) { sets.push("reorder_level = ?"); values.push(Number(p.reorder_level)); }
  if (sets.length) {
    sets.push("updated_at = ?");
    values.push(hNow());
    hRun(`UPDATE hms_medicines SET ${sets.join(", ")} WHERE id = ?`, [...values, id]);
  }
  return json({ ok: true });
});

export const dynamic = "force-dynamic";
