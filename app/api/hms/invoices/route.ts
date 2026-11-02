import { body, json, route } from "@/lib/api";
import { requireHmsApi } from "@/lib/hms/auth";
import { hAudit, hGet, hNow, hRun, hUid } from "@/lib/hms/db";
import { listInvoices } from "@/lib/hms/queries";

export const GET = route(async () => {
  await requireHmsApi();
  return json({ items: listInvoices() });
});

export const POST = route(async (req) => {
  const user = await requireHmsApi(["admin", "reception", "nurse"]);
  const p = await body<{ action?: "create" | "pay"; patient_id?: string; items?: { label: string; qty: number; price: number }[]; id?: string; amount?: number }>(req);

  if ((p.action ?? "create") === "create") {
    if (!p.patient_id || !p.items?.length) return json({ error: "Patient and at least one line are required." }, 422);
    const subtotal = p.items.reduce((a, b) => a + Number(b.price) * Number(b.qty), 0);
    const seq = Number(hGet<{ c: number }>("SELECT COUNT(*) AS c FROM hms_invoices")?.c ?? 0);
    const id = hUid("inv");
    const invoiceNo = `AYB-${new Date().getFullYear()}-${3100 + seq + 1}`;
    hRun(
      `INSERT INTO hms_invoices (id, invoice_no, patient_id, items, subtotal, discount, tax, total, paid, status, created_at)
       VALUES (?,?,?,?,?,0,0,?,0,'unpaid',?)`,
      [id, invoiceNo, p.patient_id, JSON.stringify(p.items), subtotal, subtotal, hNow()]
    );
    hAudit(user, "created", "invoice", id, `Issued invoice ${invoiceNo}`);
    return json({ ok: true, id, invoice_no: invoiceNo }, 201);
  }

  if (!p.id) return json({ error: "Invoice id is required." }, 422);
  const inv = hGet<{ total: number; paid: number }>("SELECT total, paid FROM hms_invoices WHERE id = ?", [p.id]);
  if (!inv) return json({ error: "Invoice not found" }, 404);
  const paid = Math.min(Number(inv.total), Number(inv.paid) + Number(p.amount ?? inv.total - inv.paid));
  hRun("UPDATE hms_invoices SET paid = ?, status = ? WHERE id = ?", [paid, paid >= Number(inv.total) ? "paid" : "partial", p.id]);
  hAudit(user, "payment", "invoice", p.id, `Recorded a payment of $${Number(p.amount ?? 0).toFixed(2)}`);
  return json({ ok: true, paid });
});

export const dynamic = "force-dynamic";
