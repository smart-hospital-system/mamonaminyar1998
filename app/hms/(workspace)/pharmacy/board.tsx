"use client";

import { AlertTriangle, CheckCircle2, Loader2, PackagePlus, Pill as PillIcon, Search, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Empty, Field, Person, Status } from "@/components/hms/ui";
import { dateShort, money, relTime } from "@/lib/hms/format";
import type { MedicineRow } from "@/lib/hms/queries";

type Rx = { id: string; rx_no: string; patient_name: string; patient_mrn: string; diagnosis: string | null; status: string; items: number; created_at: string; doctor_name: string };
type Tab = "queue" | "stock" | "expiry";

export function PharmacyBoard({ prescriptions, medicines, initialTab, initialQuery }: { prescriptions: Rx[]; medicines: MedicineRow[]; initialTab: Tab; initialQuery: string }) {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>(initialTab);
  const [q, setQ] = useState(initialQuery);
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ tone: "ok" | "bad"; text: string } | null>(null);
  const [restock, setRestock] = useState<MedicineRow | null>(null);
  const [amount, setAmount] = useState(20);
  const [batch, setBatch] = useState("");
  const [expiry, setExpiry] = useState("");

  const needle = q.trim().toLowerCase();
  const queue = prescriptions.filter((r) => ["signed", "pending"].includes(r.status));
  const stock = medicines.filter((m) => !needle || m.name.toLowerCase().includes(needle) || (m.category ?? "").toLowerCase().includes(needle) || (m.batch ?? "").toLowerCase().includes(needle));
  const expiring = medicines
    .filter((m) => m.expiry)
    .filter((m) => !needle || m.name.toLowerCase().includes(needle))
    .sort((a, b) => String(a.expiry).localeCompare(String(b.expiry)));

  async function dispense(id: string) {
    setBusy(id);
    const res = await fetch(`/api/hms/prescriptions/${id}`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ action: "dispense" }) });
    const data = await res.json();
    setBusy(null);
    setMsg(res.ok ? { tone: "ok", text: `Dispensed. Charge added to the patient account: ${money(data.total ?? 0)}.` } : { tone: "bad", text: data.error ?? "Could not dispense." });
    router.refresh();
  }

  async function saveRestock() {
    if (!restock) return;
    setBusy(restock.id);
    await fetch(`/api/hms/medicines/${restock.id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ add: amount, batch: batch || undefined, expiry: expiry || undefined }),
    });
    setBusy(null);
    setRestock(null);
    setBatch("");
    setExpiry("");
    setMsg({ tone: "ok", text: "Stock updated and the batch/expiry logged." });
    router.refresh();
  }

  return (
    <div className="mt-3">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-[13rem] flex-1">
          <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2" style={{ color: "var(--hms-faint)" }} />
          <input className="hms-input pl-7" placeholder="Prescription, patient or medicine…" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <div className="flex gap-1">
          {(["queue", "stock", "expiry"] as Tab[]).map((t) => (
            <button key={t} className="hms-btn hms-btn-sm capitalize" onClick={() => setTab(t)} style={tab === t ? { background: "var(--hms-brand-soft)", borderColor: "transparent", color: "var(--hms-brand-ink)" } : undefined}>
              {t === "queue" ? `Dispensing (${queue.length})` : t === "stock" ? `Stock (${medicines.length})` : `Expiry (${expiring.length})`}
            </button>
          ))}
        </div>
      </div>

      {msg && <p className="mt-2 flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[0.7rem]" style={{ background: msg.tone === "ok" ? "color-mix(in srgb,#10b981 12%, transparent)" : "color-mix(in srgb,#ef4444 12%, transparent)", color: msg.tone === "ok" ? "#0b6b4d" : "#991b1b" }}>{msg.tone === "ok" ? <CheckCircle2 size={12} /> : <AlertTriangle size={12} />} {msg.text}<button className="ml-auto" onClick={() => setMsg(null)}><X size={11} /></button></p>}

      {tab === "queue" && (
        <div className="mt-2 grid gap-2 md:grid-cols-2 xl:grid-cols-3">
          {queue.map((r) => (
            <div key={r.id} className="rounded-lg border p-2.5" style={{ borderColor: "var(--hms-border)" }}>
              <div className="flex items-start justify-between">
                <div className="min-w-0">
                  <p className="truncate font-mono text-[0.68rem]">{r.rx_no}</p>
                  <p className="truncate text-[0.76rem] font-semibold">{r.patient_name}</p>
                  <p className="truncate text-[0.6rem]" style={{ color: "var(--hms-faint)" }}>{r.diagnosis ?? "No diagnosis"} · {r.doctor_name}</p>
                </div>
                <Status value={r.status} />
              </div>
              <div className="mt-1.5 flex items-center justify-between">
                <span className="text-[0.64rem]" style={{ color: "var(--hms-faint)" }}>{r.items} item(s) · {relTime(r.created_at)}</span>
                <button className="hms-btn hms-btn-sm hms-btn-primary" onClick={() => dispense(r.id)} disabled={!!busy}>
                  {busy === r.id ? <Loader2 size={10} className="animate-spin" /> : <PillIcon size={10} />} Dispense
                </button>
              </div>
            </div>
          ))}
          {!queue.length && <div className="md:col-span-2 xl:col-span-3"><Empty title="Nothing to dispense" hint="Signed prescriptions appear here instantly." icon={<PillIcon size={16} />} /></div>}
        </div>
      )}

      {tab === "stock" && (
        <div className="mt-2 overflow-x-auto rounded-lg border" style={{ borderColor: "var(--hms-border)" }}>
          <table className="w-full min-w-[48rem]">
            <thead style={{ background: "var(--hms-surface-2)" }}>
              <tr>
                <th className="hms-th">Medicine</th>
                <th className="hms-th">Category</th>
                <th className="hms-th">Batch</th>
                <th className="hms-th">Expiry</th>
                <th className="hms-th">On hand</th>
                <th className="hms-th">Reorder</th>
                <th className="hms-th">Price</th>
                <th className="hms-th text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {stock.map((m) => {
                const low = m.stock <= m.reorder_level;
                const expired = m.expiry ? new Date(m.expiry).getTime() < Date.now() : false;
                return (
                  <tr key={m.id} className="hms-row">
                    <td className="hms-td">
                      <p className="font-medium">{m.name}</p>
                      <p className="text-[0.6rem]" style={{ color: "var(--hms-faint)" }}>{m.strength} · {m.form}</p>
                    </td>
                    <td className="hms-td text-[0.7rem]">{m.category}</td>
                    <td className="hms-td font-mono text-[0.66rem]">{m.batch ?? "—"}</td>
                    <td className="hms-td text-[0.68rem]" style={{ color: expired ? "#b91c1c" : undefined }}>{expired ? "EXPIRED " : ""}{dateShort(m.expiry)}</td>
                    <td className="hms-td">
                      <span className="font-semibold" style={{ color: low ? "#b91c1c" : undefined }}>{m.stock}</span>
                    </td>
                    <td className="hms-td text-[0.7rem]">{m.reorder_level}</td>
                    <td className="hms-td text-[0.7rem]">{money(m.unit_price)}</td>
                    <td className="hms-td text-right">
                      <button className="hms-btn hms-btn-sm" onClick={() => { setRestock(m); setAmount(Math.max(10, m.reorder_level * 2 - m.stock)); setBatch(m.batch ?? ""); setExpiry(m.expiry ?? ""); }}>
                        <PackagePlus size={10} /> Receive
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {tab === "expiry" && (
        <div className="mt-2 space-y-1">
          {expiring.map((m) => {
            const days = Math.round((new Date(String(m.expiry)).getTime() - Date.now()) / 864e5);
            return (
              <div key={m.id} className="flex items-center gap-2 rounded-lg border px-2 py-1.5" style={{ borderColor: days < 0 ? "color-mix(in srgb,#ef4444 35%, var(--hms-border))" : "var(--hms-border)" }}>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[0.72rem] font-medium">{m.name} <span style={{ color: "var(--hms-faint)" }}>· batch {m.batch}</span></p>
                  <p className="text-[0.6rem]" style={{ color: "var(--hms-faint)" }}>{m.stock} units · {money(m.stock * m.unit_price)} at risk</p>
                </div>
                <span className="hms-pill" style={{ background: days < 0 ? "#fee2e2" : days < 30 ? "#fef3c7" : "var(--hms-surface-3)", color: days < 0 ? "#991b1b" : days < 30 ? "#92400e" : "var(--hms-muted)" }}>
                  {days < 0 ? `${Math.abs(days)}d overdue` : `${days}d left`}
                </span>
                <span className="text-[0.66rem]" style={{ color: "var(--hms-faint)" }}>{dateShort(m.expiry)}</span>
              </div>
            );
          })}
          {!expiring.length && <Empty title="No expiry data" hint="Add batch and expiry dates when receiving stock." />}
        </div>
      )}

      {restock && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/45 p-4" onClick={() => setRestock(null)}>
          <div className="w-full max-w-md rounded-xl border bg-[var(--hms-surface)] p-4 shadow-2xl" style={{ borderColor: "var(--hms-border)" }} onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between">
              <div>
                <p className="text-[0.84rem] font-semibold">Receive stock</p>
                <p className="text-[0.64rem]" style={{ color: "var(--hms-faint)" }}>{restock.name} · currently {restock.stock} units</p>
              </div>
              <button className="hms-btn hms-btn-sm hms-btn-ghost" onClick={() => setRestock(null)}><X size={13} /></button>
            </div>
            <div className="mt-2 grid gap-2 sm:grid-cols-2">
              <Field label="Quantity to add"><input className="hms-input" type="number" min={1} value={amount} onChange={(e) => setAmount(Number(e.target.value))} /></Field>
              <Field label="Batch number"><input className="hms-input" value={batch} onChange={(e) => setBatch(e.target.value)} placeholder="B-2026-45" /></Field>
              <Field label="Expiry date" className="sm:col-span-2"><input className="hms-input" type="date" value={expiry} onChange={(e) => setExpiry(e.target.value)} /></Field>
            </div>
            <div className="mt-3 flex justify-end gap-1.5">
              <button className="hms-btn" onClick={() => setRestock(null)}>Cancel</button>
              <button className="hms-btn hms-btn-primary" onClick={saveRestock} disabled={busy === restock.id}>
                {busy === restock.id ? <Loader2 size={11} className="animate-spin" /> : <PackagePlus size={11} />} Add {amount} units
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
