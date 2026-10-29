"use client";

import {
  Avatar, Badge, Button, Card, EmptyState, Skeleton, StatusBadge, Pager } from "@/components/ui/primitives";
import { Modal } from "@/components/ui/modal";
import { useToast } from "@/components/ui/toast";
import { api, fetcher } from "@/lib/fetcher";
import type { Payment } from "@/lib/types";
import { cn, fmtDate, fmtDateTime, money } from "@/lib/utils";
import {
  ArrowDownRight, ArrowUpRight, Banknote, CreditCard, Download, Plus, Receipt, RefreshCw,
  RotateCcw, Search, Smartphone, Wallet, X,
} from "lucide-react";
import { useState } from "react";
import useSWR from "swr";

type Row = Payment & { customer_name: string; customer_email: string | null; service_name: string | null; booking_code: string | null };
type Resp = { items: Row[]; total: number; totals: { gross: number; refunded: number; tips: number; net: number; count: number } };
type CustomerOpt = { id: string; name: string; email: string | null };

const TABS = ["all", "paid", "pending", "refunded"];
const METHOD_ICON: Record<string, React.ReactNode> = {
  card: <CreditCard size={12} />,
  paynow: <Smartphone size={12} />,
  cash: <Banknote size={12} />,
  apple_pay: <Wallet size={12} />,
};

export function PaymentsClient({ initial, customers, canManage }: { initial: Resp; customers: CustomerOpt[]; canManage: boolean }) {
  const toast = useToast();
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("all");
  const [method, setMethod] = useState("all");
  const [refund, setRefund] = useState<Row | null>(null);
  const [recordOpen, setRecordOpen] = useState(false);
  const [refundAmount, setRefundAmount] = useState(0);
  const [busy, setBusy] = useState(false);
  const [invoice, setInvoice] = useState<Row | null>(null);

  const key = `/api/payments?q=${encodeURIComponent(q)}&status=${status}&method=${method}&limit=200`;
  const { data, isLoading, mutate } = useSWR<Resp>(key, fetcher, {
    fallbackData: !q && status === "all" && method === "all" ? initial : undefined,
    keepPreviousData: true,
  });

  const rows = data?.items ?? [];
  const [page, setPage] = useState(1);
  const pageSize = 15;
  const paged = rows.slice((page - 1) * pageSize, page * pageSize);
  const filterKey = `${q}|${status}|${method}`;
  const [seenFilter, setSeenFilter] = useState(filterKey);
  if (filterKey !== seenFilter) {
    setSeenFilter(filterKey);
    setPage(1);
  }
  const totals = data?.totals ?? initial.totals;

  async function submitRefund() {
    if (!refund) return;
    setBusy(true);
    try {
      await api(`/api/payments/${refund.id}`, "PATCH", { action: "refund", amount: refundAmount });
      toast.success("Refund processed", `${money(refundAmount)} returned to ${refund.customer_name}.`);
      setRefund(null);
      mutate();
    } catch (e) {
      toast.error("Refund failed", e instanceof Error ? e.message : undefined);
    } finally {
      setBusy(false);
    }
  }

  function exportCsv() {
    const header = ["Invoice", "Date", "Customer", "Service", "Method", "Amount", "Tip", "Total", "Status"];
    const lines = rows.map((r) =>
      [r.invoice_no, fmtDate(r.paid_at ?? r.created_at), r.customer_name, r.service_name ?? "", r.method, r.amount, r.tip, r.total, r.status]
        .map((v) => `"${String(v).replace(/"/g, '""')}"`)
        .join(",")
    );
    const blob = new Blob([[header.join(","), ...lines].join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `slotly-payments-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Export ready", `${rows.length} transactions downloaded.`);
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[
          { label: "Gross revenue", value: money(totals.gross), hint: `${totals.count} transactions`, icon: <ArrowUpRight size={13} />, tone: "text-emerald-500" },
          { label: "Net after refunds", value: money(totals.net), hint: `${money(totals.refunded)} refunded`, icon: <Receipt size={13} />, tone: "text-brand" },
          { label: "Tips collected", value: money(totals.tips), hint: "passed to team", icon: <Wallet size={13} />, tone: "text-amber-500" },
          { label: "Average transaction", value: money(totals.count ? totals.net / totals.count : 0), hint: "per invoice", icon: <ArrowDownRight size={13} />, tone: "text-sky-500" },
        ].map((s) => (
          <Card key={s.label} className="flex items-center gap-3 p-3.5">
            <span className={cn("flex h-8 w-8 items-center justify-center rounded-lg bg-surface-2", s.tone)}>{s.icon}</span>
            <div>
              <p className="text-[0.64rem] uppercase tracking-wide text-faint">{s.label}</p>
              <p className="text-[1.05rem] font-semibold leading-tight">{s.value}</p>
              <p className="text-[0.62rem] text-faint">{s.hint}</p>
            </div>
          </Card>
        ))}
      </div>

      <Card className="p-3">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative min-w-[12rem] flex-1">
            <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-faint" />
            <input className="input h-9 pl-9" placeholder="Search invoice or customer…" value={q} onChange={(e) => setQ(e.target.value)} />
            {q && (
              <button onClick={() => setQ("")} className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-faint hover:text-ink">
                <X size={12} />
              </button>
            )}
          </div>
          <div className="flex items-center gap-1">
            {TABS.map((t) => (
              <button
                key={t}
                onClick={() => setStatus(t)}
                className={cn(
                  "rounded-lg px-2.5 py-1.5 text-[0.72rem] font-medium capitalize transition",
                  status === t ? "bg-brand-soft text-brand-ink" : "text-muted hover:bg-surface-3 hover:text-ink"
                )}
              >
                {t}
              </button>
            ))}
          </div>
          <select className="input h-9 w-auto" value={method} onChange={(e) => setMethod(e.target.value)}>
            <option value="all">All methods</option>
            <option value="card">Card</option>
            <option value="paynow">PayNow</option>
            <option value="cash">Cash</option>
            <option value="apple_pay">Apple Pay</option>
          </select>
          <Button variant="ghost" size="sm" onClick={() => mutate()} icon={<RefreshCw size={13} className={isLoading ? "animate-spin" : ""} />}>
            Refresh
          </Button>
          <Button variant="outline" size="sm" onClick={exportCsv} icon={<Download size={13} />}>
            Export
          </Button>
          {canManage && (
            <Button variant="primary" size="sm" onClick={() => setRecordOpen(true)} icon={<Plus size={13} />}>
              Record payment
            </Button>
          )}
        </div>
      </Card>

      {isLoading && !data ? (
        <Card className="divide-y divide-line">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 p-3">
              <Skeleton className="h-7 w-7 rounded-lg" />
              <Skeleton className="h-3 w-32" />
              <Skeleton className="ml-auto h-3 w-20" />
              <Skeleton className="h-5 w-16 rounded-full" />
            </div>
          ))}
        </Card>
      ) : rows.length === 0 ? (
        <Card>
          <EmptyState
            icon={<Receipt size={20} />}
            title={q ? "No transactions found" : "No payments yet"}
            description={q ? "Try a different invoice number or customer name." : "Payments appear here as soon as you check out a booking."}
          />
        </Card>
      ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-line bg-surface-2 text-[0.62rem] uppercase tracking-[0.06em] text-faint">
                  <th className="px-4 py-2 font-semibold">Invoice</th>
                  <th className="px-3 py-2 font-semibold">Customer</th>
                  <th className="hidden px-3 py-2 font-semibold lg:table-cell">Service</th>
                  <th className="hidden px-3 py-2 font-semibold sm:table-cell">Method</th>
                  <th className="px-3 py-2 text-right font-semibold">Amount</th>
                  <th className="hidden px-3 py-2 text-right font-semibold sm:table-cell">Tip</th>
                  <th className="px-3 py-2 font-semibold">Status</th>
                  <th className="hidden px-3 py-2 font-semibold lg:table-cell">Date</th>
                  <th className="px-3 py-2" />
                </tr>
              </thead>
              <tbody>
                {paged.map((p) => (
                  <tr key={p.id} className="table-row-hover border-b border-line/70">
                    <td className="px-4 py-2.5">
                      <button
                        onClick={() => setInvoice(p)}
                        className="text-[0.74rem] font-medium text-ink underline-offset-2 hover:text-brand hover:underline"
                      >
                        {p.invoice_no}
                      </button>
                      <p className="text-[0.62rem] text-faint">{p.booking_code ?? "Manual entry"}</p>
                    </td>
                    <td className="px-3 py-2.5">
                      <div className="flex items-center gap-2">
                        <Avatar name={p.customer_name} size={24} />
                        <span className="truncate text-[0.75rem]">{p.customer_name}</span>
                      </div>
                    </td>
                    <td className="hidden px-3 py-2.5 text-[0.72rem] text-muted lg:table-cell">{p.service_name ?? "—"}</td>
                    <td className="hidden px-3 py-2.5 sm:table-cell">
                      <span className="inline-flex items-center gap-1 text-[0.7rem] capitalize text-muted">
                        {METHOD_ICON[p.method] ?? <CreditCard size={12} />}
                        {p.method.replace("_", " ")}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-right text-[0.76rem] font-semibold tabular-nums">
                      {money(p.total)}
                      {p.refunded_amount > 0 && <span className="block text-[0.6rem] font-normal text-rose-500">-{money(p.refunded_amount)} refunded</span>}
                    </td>
                    <td className="hidden px-3 py-2.5 text-right text-[0.72rem] tabular-nums text-muted sm:table-cell">{p.tip ? money(p.tip) : "—"}</td>
                    <td className="px-3 py-2.5"><StatusBadge status={p.status} /></td>
                    <td className="hidden px-3 py-2.5 text-[0.7rem] text-muted lg:table-cell">{fmtDate(p.paid_at ?? p.created_at)}</td>
                    <td className="px-3 py-2.5 text-right">
                      {canManage && p.status !== "refunded" && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            setRefund(p);
                            setRefundAmount(Number(p.total) - Number(p.refunded_amount));
                          }}
                          icon={<RotateCcw size={11} />}
                        >
                          Refund
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pager page={page} pageSize={pageSize} total={rows.length} onChange={setPage} />
        </Card>
      )}

      <Modal
        open={Boolean(invoice)}
        onClose={() => setInvoice(null)}
        size="md"
        title="Invoice"
        description={invoice ? `${invoice.invoice_no} · issued ${fmtDate(invoice.paid_at ?? invoice.created_at)}` : ""}
        footer={
          <div className="flex items-center justify-between gap-2">
            <span className="text-[0.66rem] text-faint">GST inclusive · Singapore</span>
            <div className="flex gap-2">
              <Button variant="ghost" onClick={() => setInvoice(null)}>Close</Button>
              <Button variant="primary" onClick={() => window.print()} icon={<Download size={13} />}>
                Print / save PDF
              </Button>
            </div>
          </div>
        }
      >
        {invoice && (
          <div className="print-area space-y-4 p-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[0.95rem] font-semibold tracking-tight">Lumière Studio</p>
                <p className="text-[0.68rem] text-muted">21 Orchard Road, #02-14</p>
                <p className="text-[0.68rem] text-muted">Singapore 238839 · +65 6733 8899</p>
                <p className="text-[0.68rem] text-faint">GST Reg. 201834567K</p>
              </div>
              <StatusBadge status={invoice.status} />
            </div>

            <div className="grid grid-cols-2 gap-3 rounded-xl border border-line bg-surface-2 p-3 text-[0.72rem]">
              <div>
                <p className="text-[0.6rem] uppercase tracking-wide text-faint">Billed to</p>
                <p className="mt-0.5 font-medium">{invoice.customer_name}</p>
                <p className="text-muted">{invoice.customer_email ?? "—"}</p>
              </div>
              <div className="text-right">
                <p className="text-[0.6rem] uppercase tracking-wide text-faint">Invoice</p>
                <p className="mt-0.5 font-medium">{invoice.invoice_no}</p>
                <p className="text-muted">{fmtDate(invoice.paid_at ?? invoice.created_at)}</p>
              </div>
            </div>

            <table className="w-full text-[0.74rem]">
              <thead>
                <tr className="border-b border-line text-[0.6rem] uppercase tracking-wide text-faint">
                  <th className="pb-1.5 text-left font-semibold">Description</th>
                  <th className="pb-1.5 text-right font-semibold">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line/60">
                <tr>
                  <td className="py-1.5">{invoice.service_name ?? "Service"}</td>
                  <td className="py-1.5 text-right tabular-nums">{money(invoice.amount)}</td>
                </tr>
                {invoice.tip > 0 && (
                  <tr>
                    <td className="py-1.5 text-muted">Tip</td>
                    <td className="py-1.5 text-right tabular-nums text-muted">{money(invoice.tip)}</td>
                  </tr>
                )}
                <tr>
                  <td className="py-1.5 text-muted">GST (9%, included)</td>
                  <td className="py-1.5 text-right tabular-nums text-muted">{money(invoice.tax)}</td>
                </tr>
                {invoice.refunded_amount > 0 && (
                  <tr>
                    <td className="py-1.5 text-rose-500">Refunded</td>
                    <td className="py-1.5 text-right tabular-nums text-rose-500">-{money(invoice.refunded_amount)}</td>
                  </tr>
                )}
              </tbody>
              <tfoot>
                <tr>
                  <td className="pt-2 text-[0.78rem] font-semibold">Total paid</td>
                  <td className="pt-2 text-right text-[0.95rem] font-semibold tabular-nums">
                    {money(Number(invoice.total) - Number(invoice.refunded_amount))}
                  </td>
                </tr>
              </tfoot>
            </table>

            <p className="text-[0.64rem] text-faint">
              Paid by {invoice.method.replace("_", " ")} · thank you for visiting Lumière Studio.
            </p>
          </div>
        )}
      </Modal>

      <Modal
        open={Boolean(refund)}
        onClose={() => setRefund(null)}
        size="sm"
        title="Issue a refund"
        description={refund ? `${refund.invoice_no} · ${refund.customer_name}` : ""}
        footer={
          <>
            <Button variant="ghost" onClick={() => setRefund(null)}>Cancel</Button>
            <Button variant="danger" onClick={submitRefund} loading={busy}>Refund {money(refundAmount)}</Button>
          </>
        }
      >
        <div className="space-y-3">
          <div className="rounded-lg bg-surface-2 p-3 text-[0.75rem]">
            <div className="flex justify-between py-0.5"><span className="text-muted">Original total</span><span className="font-medium">{money(refund?.total ?? 0)}</span></div>
            <div className="flex justify-between py-0.5"><span className="text-muted">Already refunded</span><span className="font-medium">{money(refund?.refunded_amount ?? 0)}</span></div>
          </div>
          <div>
            <label className="label">Refund amount</label>
            <input
              type="number"
              className="input"
              value={refundAmount}
              max={Number(refund?.total ?? 0) - Number(refund?.refunded_amount ?? 0)}
              onChange={(e) => setRefundAmount(Number(e.target.value))}
            />
            <p className="mt-1 text-[0.65rem] text-muted">Full refunds mark the invoice as refunded and release the booking&apos;s payment status.</p>
          </div>
        </div>
      </Modal>

      <RecordPaymentModal open={recordOpen} onClose={() => setRecordOpen(false)} customers={customers} onSaved={() => mutate()} />
    </div>
  );
}

function RecordPaymentModal({
  open,
  onClose,
  customers,
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  customers: CustomerOpt[];
  onSaved: () => void;
}) {
  const toast = useToast();
  const [customerId, setCustomerId] = useState("");
  const [amount, setAmount] = useState(0);
  const [tip, setTip] = useState(0);
  const [method, setMethod] = useState("card");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  async function save() {
    if (!customerId || !amount) {
      toast.error("Select a customer and enter an amount");
      return;
    }
    setSaving(true);
    try {
      await api("/api/payments", "POST", { customer_id: customerId, amount, tip, method, notes });
      toast.success("Payment recorded", `${money(amount + tip)} via ${method.replace("_", " ")}.`);
      onSaved();
      onClose();
      setAmount(0);
      setTip(0);
      setNotes("");
    } catch (e) {
      toast.error("Couldn't record payment", e instanceof Error ? e.message : undefined);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="sm"
      title="Record a payment"
      description="For walk-ins, cash or offline transactions"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button variant="primary" onClick={save} loading={saving}>Record {money(amount + tip)}</Button>
        </>
      }
    >
      <div className="space-y-3">
        <div>
          <label className="label">Customer</label>
          <select className="input" value={customerId} onChange={(e) => setCustomerId(e.target.value)}>
            <option value="">Select a customer…</option>
            {customers.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="label">Amount (SGD)</label>
            <input type="number" className="input" value={amount} onChange={(e) => setAmount(Number(e.target.value))} />
          </div>
          <div>
            <label className="label">Tip</label>
            <input type="number" className="input" value={tip} onChange={(e) => setTip(Number(e.target.value))} />
          </div>
        </div>
        <div>
          <label className="label">Method</label>
          <select className="input" value={method} onChange={(e) => setMethod(e.target.value)}>
            <option value="card">Card</option>
            <option value="paynow">PayNow</option>
            <option value="cash">Cash</option>
            <option value="apple_pay">Apple Pay</option>
          </select>
        </div>
        <div>
          <label className="label">Notes</label>
          <input className="input" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Reference, receipt number…" />
        </div>
        <p className="text-[0.65rem] text-faint">{fmtDateTime(new Date().toISOString())} · invoice is generated automatically.</p>
      </div>
    </Modal>
  );
}
