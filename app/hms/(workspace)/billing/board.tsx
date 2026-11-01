"use client";

import { CheckCircle2, Loader2, Plus, Printer, Search, Trash2, Wallet, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Empty, Field, Person, Status } from "@/components/hms/ui";
import { dateShort, money } from "@/lib/hms/format";
import { useLang, useTx } from "@/components/hms/lang-provider";

type Inv = { id: string; invoice_no: string; patient_name: string; mrn: string; total: number; paid: number; status: string; created_at: string; items: string | null };
type Line = { label: string; qty: number; price: number };

const CATALOGUE: Line[] = [
  { label: "Consultation", qty: 1, price: 25 },
  { label: "Follow-up consultation", qty: 1, price: 10 },
  { label: "CBC", qty: 1, price: 12 },
  { label: "Chest X-ray", qty: 1, price: 30 },
  { label: "Ultrasound abdomen", qty: 1, price: 45 },
  { label: "Bed charge (1 night)", qty: 1, price: 45 },
  { label: "Surgical dressing", qty: 1, price: 12 },
];

export function BillingBoard({ invoices, patients }: { invoices: Inv[]; patients: { id: string; name: string; mrn: string }[] }) {
  const router = useRouter();
  const tx = useTx();
  const { lang } = useLang();
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [pay, setPay] = useState<Inv | null>(null);
  const [amount, setAmount] = useState(0);
  const [open, setOpen] = useState(false);
  const [patientId, setPatientId] = useState(patients[0]?.id ?? "");
  const [lines, setLines] = useState<Line[]>([CATALOGUE[0]]);
  const [msg, setMsg] = useState<string | null>(null);

  const filtered = invoices.filter((i) => !q || i.patient_name.toLowerCase().includes(q.toLowerCase()) || i.invoice_no.toLowerCase().includes(q.toLowerCase()) || i.mrn.includes(q));
  const total = lines.reduce((a, l) => a + l.price * l.qty, 0);

  async function takePayment() {
    if (!pay) return;
    setBusy(pay.id);
    const res = await fetch("/api/hms/invoices", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ action: "pay", id: pay.id, amount }) });
    const data = await res.json();
    setBusy(null);
    if (!res.ok) return setMsg(data.error ?? tx("Payment failed.", "پرداخت انجام نشد."));
    setPay(null);
    setMsg(tx("Payment recorded. Balance now {amount}.", "پرداخت ثبت شد. باقی‌مانده اکنون {amount}.", { amount: money(data.paid, lang) }));
    router.refresh();
  }

  async function create() {
    setBusy("new");
    const res = await fetch("/api/hms/invoices", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ action: "create", patient_id: patientId, items: lines }) });
    const data = await res.json();
    setBusy(null);
    if (!res.ok) return setMsg(data.error ?? tx("Could not create the invoice.", "ایجاد بل انجام نشد."));
    setOpen(false);
    setLines([CATALOGUE[0]]);
    setMsg(tx("Invoice {no} created for {amount}.", "بل {no} به مبلغ {amount} ایجاد شد.", { no: data.invoice_no, amount: money(total, lang) }));
    router.refresh();
  }

  function print(inv: Inv) {
    // The receipt is a real A4 statement on the hospital letterhead, not a pop-up.
    router.push(`/hms/receipt/${inv.id}`);
  }

  return (
    <div className="mt-3">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-[14rem] flex-1">
          <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2" style={{ color: "var(--hms-faint)" }} />
          <input className="hms-input pl-7" placeholder={tx("Invoice number, patient or MRN…", "شمارهٔ بل، مریض یا شمارهٔ پرونده…")} value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <button className="hms-btn hms-btn-primary" onClick={() => setOpen(true)}><Plus size={12} /> {tx("New invoice", "بل جدید")}</button>
      </div>

      {msg && <p className="mt-2 flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[0.7rem]" style={{ background: "color-mix(in srgb,#10b981 12%, transparent)", color: "#0b6b4d" }}><CheckCircle2 size={12} /> {msg}<button className="ml-auto" onClick={() => setMsg(null)}><X size={11} /></button></p>}

      <div className="mt-2 overflow-x-auto rounded-lg border" style={{ borderColor: "var(--hms-border)" }}>
        <table className="w-full min-w-[46rem]">
          <thead style={{ background: "var(--hms-surface-2)" }}>
            <tr>
              <th className="hms-th">{tx("Invoice", "بل")}</th>
              <th className="hms-th">{tx("Patient", "مریض")}</th>
              <th className="hms-th">{tx("Issued", "صادرشده")}</th>
              <th className="hms-th">{tx("Total", "مجموع")}</th>
              <th className="hms-th">{tx("Paid", "پرداخت‌شده")}</th>
              <th className="hms-th">{tx("Balance", "باقی‌مانده")}</th>
              <th className="hms-th">{tx("Status", "وضعیت")}</th>
              <th className="hms-th text-right">{tx("Actions", "اقدام‌ها")}</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((i) => {
              const balance = i.total - i.paid;
              return (
                <tr key={i.id} className="hms-row">
                  <td className="hms-td font-mono text-[0.68rem]">{i.invoice_no}</td>
                  <td className="hms-td"><Person name={i.patient_name} sub={i.mrn} size={24} /></td>
                  <td className="hms-td whitespace-nowrap text-[0.68rem]">{dateShort(i.created_at, lang)}</td>
                  <td className="hms-td font-semibold">{money(i.total, lang)}</td>
                  <td className="hms-td">{money(i.paid, lang)}</td>
                  <td className="hms-td" style={{ color: balance > 0 ? "#b45309" : "var(--hms-faint)" }}>{money(balance, lang)}</td>
                  <td className="hms-td"><Status value={i.status} /></td>
                  <td className="hms-td">
                    <div className="flex justify-end gap-1">
                      {balance > 0 && (
                        <button className="hms-btn hms-btn-sm hms-btn-primary" onClick={() => { setPay(i); setAmount(balance); }}>
                          <Wallet size={10} /> {tx("Take payment", "دریافت پرداخت")}
                        </button>
                      )}
                      <button className="hms-btn hms-btn-sm hms-btn-ghost" onClick={() => print(i)}><Printer size={11} /></button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {!filtered.length && <Empty title={tx("No invoices match", "بلی مطابقت ندارد")} hint={tx("Create a new invoice or clear the search.", "بل جدید بسازید یا جستجو را پاک کنید.")} />}
      </div>

      {pay && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/45 p-4" onClick={() => setPay(null)}>
          <div className="w-full max-w-sm rounded-xl border bg-[var(--hms-surface)] p-4 shadow-2xl" style={{ borderColor: "var(--hms-border)" }} onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between">
              <div>
                <p className="text-[0.84rem] font-semibold">{tx("Take payment", "دریافت پرداخت")}</p>
                <p className="text-[0.64rem]" style={{ color: "var(--hms-faint)" }}>{pay.invoice_no} · {tx("balance", "باقی‌مانده")} {money(pay.total - pay.paid, lang)}</p>
              </div>
              <button className="hms-btn hms-btn-sm hms-btn-ghost" onClick={() => setPay(null)}><X size={13} /></button>
            </div>
            <div className="mt-3">
              <Field label={tx("Amount received (USD)", "مبلغ دریافتی (دالر)")}><input className="hms-input" type="number" min={0} step="0.01" value={amount} onChange={(e) => setAmount(Number(e.target.value))} /></Field>
            </div>
            <div className="mt-3 flex justify-end gap-1.5">
              <button className="hms-btn" onClick={() => setPay(null)}>{tx("Cancel", "لغو")}</button>
              <button className="hms-btn hms-btn-primary" onClick={takePayment} disabled={busy === pay.id}>
                {busy === pay.id ? <Loader2 size={11} className="animate-spin" /> : <Wallet size={11} />} {tx("Confirm", "تأیید")} {money(amount, lang)}
              </button>
            </div>
          </div>
        </div>
      )}

      {open && (
        <div className="fixed inset-0 z-[70] flex items-start justify-center overflow-y-auto bg-black/45 p-4" onClick={() => setOpen(false)}>
          <div className="my-8 w-full max-w-lg rounded-xl border bg-[var(--hms-surface)] p-4 shadow-2xl" style={{ borderColor: "var(--hms-border)" }} onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between">
              <div>
                <p className="text-[0.84rem] font-semibold">{tx("New invoice", "بل جدید")}</p>
                <p className="text-[0.64rem]" style={{ color: "var(--hms-faint)" }}>{tx("Add the services used during this visit.", "خدمات استفاده‌شده در این مراجعه را اضافه کنید.")}</p>
              </div>
              <button className="hms-btn hms-btn-sm hms-btn-ghost" onClick={() => setOpen(false)}><X size={13} /></button>
            </div>
            <div className="mt-2">
              <Field label={tx("Patient", "مریض")}>
                <select className="hms-input" value={patientId} onChange={(e) => setPatientId(e.target.value)}>
                  {patients.map((p) => <option key={p.id} value={p.id}>{p.name} · {p.mrn}</option>)}
                </select>
              </Field>
            </div>
            <div className="mt-2 space-y-1">
              {lines.map((l, i) => (
                <div key={i} className="grid grid-cols-[1.7fr_0.5fr_0.7fr_auto] items-center gap-1">
                  <input className="hms-input !h-8 !text-[0.72rem]" value={l.label} onChange={(e) => setLines((ls) => ls.map((x, j) => (j === i ? { ...x, label: e.target.value } : x)))} />
                  <input className="hms-input !h-8 !text-[0.72rem]" type="number" min={1} value={l.qty} onChange={(e) => setLines((ls) => ls.map((x, j) => (j === i ? { ...x, qty: Number(e.target.value) } : x)))} />
                  <input className="hms-input !h-8 !text-[0.72rem]" type="number" min={0} value={l.price} onChange={(e) => setLines((ls) => ls.map((x, j) => (j === i ? { ...x, price: Number(e.target.value) } : x)))} />
                  <button className="hms-btn hms-btn-sm hms-btn-ghost" onClick={() => setLines((ls) => ls.filter((_, j) => j !== i))}><Trash2 size={11} /></button>
                </div>
              ))}
            </div>
            <div className="mt-1.5 flex flex-wrap gap-1">
              {CATALOGUE.slice(1).map((c) => (
                <button key={c.label} className="hms-btn hms-btn-sm" onClick={() => setLines((ls) => [...ls, { ...c }])}><Plus size={9} /> {c.label}</button>
              ))}
            </div>
            <div className="mt-3 flex items-center justify-between">
              <span className="text-[0.8rem] font-semibold">{tx("Total", "مجموع")} {money(total, lang)}</span>
              <div className="flex gap-1.5">
                <button className="hms-btn" onClick={() => setOpen(false)}>{tx("Cancel", "لغو")}</button>
                <button className="hms-btn hms-btn-primary" onClick={create} disabled={!lines.length || busy === "new"}>
                  {busy === "new" ? <Loader2 size={11} className="animate-spin" /> : <Plus size={11} />} {tx("Issue invoice", "صدور بل")}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
