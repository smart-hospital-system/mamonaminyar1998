"use client";

import { CheckCircle2, Download, Loader2, Pill as PillIcon, Printer, Search, ShieldAlert, Signature, X } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { Empty, Person, SectionTitle, Status } from "@/components/hms/ui";
import { dateShort, money } from "@/lib/hms/format";
import type { RxRow } from "@/lib/hms/queries";

type Tpl = { id: number; name: string; slug: string; preview: string; paper: string };

export function PrescriptionRegister({
  rows,
  templates,
  activeTemplate,
  canSign,
  role,
}: {
  rows: RxRow[];
  templates: Tpl[];
  activeTemplate: number;
  canSign: boolean;
  role: string;
}) {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("all");
  const [busy, setBusy] = useState<string | null>(null);
  const [detail, setDetail] = useState<{ id: string; rx_no: string; patient: string; items: number; total: number } | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return rows.filter(
      (r) =>
        (status === "all" || r.status === status) &&
        (!needle ||
          r.patient_name.toLowerCase().includes(needle) ||
          r.rx_no.toLowerCase().includes(needle) ||
          (r.diagnosis ?? "").toLowerCase().includes(needle))
    );
  }, [rows, q, status]);

  async function act(id: string, action: "sign" | "dispense" | "void") {
    setBusy(id + action);
    setMsg(null);
    try {
      const res = await fetch(`/api/hms/prescriptions/${id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const data = await res.json();
      if (!res.ok) setMsg(data.error ?? "The action could not be completed.");
      else {
        setMsg(
          action === "dispense"
            ? `Dispensed successfully. Stock updated, payment total ${money(data.total ?? 0)}.`
            : action === "sign"
              ? "Signed — the prescription can now be printed or dispensed."
              : "Prescription voided and kept on the audit trail."
        );
        router.refresh();
      }
    } catch {
      setMsg("Network error — please retry.");
    } finally {
      setBusy(null);
    }
  }

  const counts = {
    all: rows.length,
    pending: rows.filter((r) => r.status === "pending").length,
    signed: rows.filter((r) => r.status === "signed").length,
    dispensed: rows.filter((r) => r.status === "dispensed").length,
  };

  return (
    <div className="mt-3">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-[15rem] flex-1">
          <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2" style={{ color: "var(--hms-faint)" }} />
          <input className="hms-input pl-7" placeholder="Search patient, Rx number or diagnosis…" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <div className="flex flex-wrap gap-1">
          {(["all", "pending", "signed", "dispensed"] as const).map((s) => (
            <button
              key={s}
              onClick={() => setStatus(s)}
              className="hms-btn hms-btn-sm"
              style={status === s ? { background: "var(--hms-brand-soft)", borderColor: "transparent", color: "var(--hms-brand-ink)" } : undefined}
            >
              <span className="capitalize">{s}</span>
              <span className="rounded-full px-1 text-[0.58rem]" style={{ background: "var(--hms-surface-3)" }}>{counts[s]}</span>
            </button>
          ))}
        </div>
      </div>

      {msg && (
        <p className="mt-2 flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[0.7rem]" style={{ background: "color-mix(in srgb,#10b981 12%, transparent)", color: "#0b6b4d" }}>
          <CheckCircle2 size={12} /> {msg}
          <button className="ml-auto" onClick={() => setMsg(null)}><X size={11} /></button>
        </p>
      )}

      <div className="mt-2 overflow-x-auto rounded-lg border" style={{ borderColor: "var(--hms-border)" }}>
        <table className="w-full min-w-[52rem]">
          <thead style={{ background: "var(--hms-surface-2)" }}>
            <tr>
              <th className="hms-th">Patient</th>
              <th className="hms-th">Rx</th>
              <th className="hms-th">Diagnosis</th>
              <th className="hms-th">Items</th>
              <th className="hms-th">Physician</th>
              <th className="hms-th">Issued</th>
              <th className="hms-th">Status</th>
              <th className="hms-th text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((r) => (
              <tr key={r.id} className="hms-row">
                <td className="hms-td"><Person name={r.patient_name} sub={r.patient_mrn} size={26} /></td>
                <td className="hms-td font-mono text-[0.68rem]">{r.rx_no}</td>
                <td className="hms-td max-w-[13rem] truncate">{r.diagnosis ?? "—"}</td>
                <td className="hms-td">
                  <button className="font-semibold" style={{ color: "var(--hms-brand)" }} onClick={() => setDetail({ id: r.id, rx_no: r.rx_no, patient: r.patient_name, items: r.items, total: r.items })}>
                    {r.items}
                  </button>
                </td>
                <td className="hms-td max-w-[10rem] truncate">{r.doctor_name}</td>
                <td className="hms-td whitespace-nowrap">{dateShort(r.created_at)}</td>
                <td className="hms-td"><Status value={r.status} /></td>
                <td className="hms-td">
                  <div className="flex items-center justify-end gap-1">
                    {canSign && r.status === "pending" && (
                      <button className="hms-btn hms-btn-sm hms-btn-primary" onClick={() => act(r.id, "sign")} disabled={!!busy}>
                        {busy === r.id + "sign" ? <Loader2 size={10} className="animate-spin" /> : <Signature size={10} />} Sign
                      </button>
                    )}
                    {["admin", "pharmacist"].includes(role) && ["signed", "pending"].includes(r.status) && (
                      <button className="hms-btn hms-btn-sm" onClick={() => act(r.id, "dispense")} disabled={!!busy}>
                        {busy === r.id + "dispense" ? <Loader2 size={10} className="animate-spin" /> : <PillIcon size={10} />} Dispense
                      </button>
                    )}
                    <Link href={`/hms/rx/${r.id}`} target="_blank" className="hms-btn hms-btn-sm hms-btn-ghost">
                      <Printer size={10} /> Print
                    </Link>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!filtered.length && <Empty title="No prescriptions match" hint="Clear the search or choose another status." icon={<ShieldAlert size={16} />} />}
      </div>

      <div className="mt-3 rounded-lg border p-3" style={{ borderColor: "var(--hms-border)" }}>
        <SectionTitle title="Print designs" subtitle={`Active default: template ${activeTemplate} · each prescription can print on any of the ten papers`} />
        <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
          {templates.map((t) => (
            <Link key={t.id} href={`/hms/print?template=${t.id}`} className="group rounded-lg border p-2 transition hover:-translate-y-px hover:shadow-sm" style={{ borderColor: "var(--hms-border)" }}>
              <div className="h-14 rounded" style={{ background: `linear-gradient(135deg, ${t.preview}, ${t.paper})` }} />
              <p className="mt-1.5 truncate text-[0.68rem] font-semibold">{t.id}. {t.name}</p>
              <p className="truncate text-[0.58rem]" style={{ color: "var(--hms-faint)" }}>{t.slug}</p>
            </Link>
          ))}
        </div>
      </div>

      {detail && <SheetModal id={detail.id} rxNo={detail.rx_no} patient={detail.patient} onClose={() => setDetail(null)} />}
    </div>
  );
}

function SheetModal({ id, rxNo, patient, onClose }: { id: string; rxNo: string; patient: string; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-[70] flex items-start justify-center overflow-y-auto bg-black/45 p-4" onClick={onClose}>
      <div className="my-6 w-full max-w-3xl rounded-xl border bg-[var(--hms-surface)] shadow-2xl" style={{ borderColor: "var(--hms-border)" }} onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b px-3 py-2" style={{ borderColor: "var(--hms-border)" }}>
          <div>
            <p className="text-[0.78rem] font-semibold">{rxNo}</p>
            <p className="text-[0.62rem]" style={{ color: "var(--hms-faint)" }}>{patient}</p>
          </div>
          <div className="flex gap-1">
            <Link href={`/hms/rx/${id}`} target="_blank" className="hms-btn hms-btn-sm hms-btn-primary"><Download size={11} /> Open print sheet</Link>
            <button className="hms-btn hms-btn-sm hms-btn-ghost" onClick={onClose}><X size={13} /></button>
          </div>
        </div>
        <iframe src={`/hms/rx/${id}?embed=1`} className="h-[70vh] w-full rounded-b-xl bg-white" title={rxNo} />
      </div>
    </div>
  );
}
