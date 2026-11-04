import { HttpError } from "@/lib/auth";
import type { HmsUser } from "./auth";
import { hmsReady, hGet, hRun, hNow, hAudit } from "./db";
export type StockPatch = { add?: number; stock?: number; batch?: string; expiry?: string; price?: number; reorder_level?: number };
export function updateStock(id: string, p: StockPatch, actor: HmsUser) {
  if (!["admin", "pharmacist"].includes(actor.role)) throw new HttpError(403, "Pharmacy permission required.");
  if (p.add !== undefined && p.stock !== undefined) throw new HttpError(422, "Choose an adjustment OR an absolute stock count, not both.");
  for (const field of ["add", "stock", "price", "reorder_level"] as const) {
    const value = p[field];
    if (value !== undefined && (typeof value !== "number" || !Number.isFinite(value) || Math.abs(value) > 1e9 || (field !== "add" && value < 0))) throw new HttpError(422, "Stock, price and reorder values must be finite and nonnegative; adjustment may be negative.");
  }
  for (const field of ["batch", "expiry"] as const) {
    if (p[field] !== undefined && (typeof p[field] !== "string" || p[field]!.length > 200)) throw new HttpError(422, "Invalid stock text.");
  }
  if (p.expiry !== undefined && p.expiry !== "" && (!/^\d{4}-\d{2}-\d{2}$/.test(p.expiry) || !Number.isFinite(Date.parse(p.expiry)) || new Date(p.expiry).toISOString().slice(0, 10) !== p.expiry)) throw new HttpError(422, "Expiry must be a valid YYYY-MM-DD date.");
  const db = hmsReady(); db.exec("BEGIN IMMEDIATE");
  try {
    const current = hGet<{ stock: number }>("SELECT stock FROM hms_medicines WHERE id=?", [id]);
    if (!current) throw new HttpError(404, "Medicine not found.");
    const stock = p.add !== undefined ? current.stock + p.add : p.stock ?? current.stock;
    if (!Number.isFinite(stock) || stock < 0 || stock > 1e9) throw new HttpError(409, "Adjustment would create invalid or negative stock; nothing changed.");
    hRun("UPDATE hms_medicines SET stock=?,updated_at=? WHERE id=?", [stock, hNow(), id]);
    const fields = { batch: "batch", expiry: "expiry", price: "unit_price", reorder_level: "reorder_level" } as const;
    for (const key of Object.keys(fields) as (keyof typeof fields)[]) {
      if (p[key] !== undefined) hRun(`UPDATE hms_medicines SET ${fields[key]}=? WHERE id=?`, [p[key] === "" ? null : p[key], id]);
    }
    hAudit(actor, "stock_updated", "medicine", id, "Explicit pharmacy stock metadata/count update");
    db.exec("COMMIT"); return { ok: true };
  } catch (error) {
    try { db.exec("ROLLBACK"); } catch { /* preserve original failure */ }
    throw error;
  }
}
