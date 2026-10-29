"use client";

import { Download, Plus, Search, UserPlus, X } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { Btn, Empty, Field, Person, Pill, Status } from "@/components/hms/ui";
import { age, dateShort } from "@/lib/hms/format";

type Row = {
  id: string; mrn: string; name: string; gender: string; dob: string | null; phone: string | null;
  blood_group: string | null; allergies: string | null; insurance: string | null;
  visits: number; last_visit: string | null; open_rx: number;
};

export function PatientsTable({ rows, autoOpen }: { rows: Row[]; autoOpen?: boolean }) {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [sort, setSort] = useState("recent");
  const [open, setOpen] = useState(Boolean(autoOpen));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({ name: "", gender: "Female", dob: "", phone: "", blood_group: "", allergies: "", address: "", insurance: "Self-pay", chronic: "", emergency_contact: "" });

  const filtered = useMemo(() => {
    const n = q.trim().toLowerCase();
    let list = rows.filter((r) => !n || r.name.toLowerCase().includes(n) || r.mrn.toLowerCase().includes(n) || (r.phone ?? "").includes(n));
    if (sort === "name") list = [...list].sort((a, b) => a.name.localeCompare(b.name));
    if (sort === "visits") list = [...list].sort((a, b) => b.visits - a.visits);
    return list;
  }, [rows, q, sort]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) return setError("A name is required.");
    setBusy(true);
    setError(null);
    const res = await fetch("/api/hms/patients", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(form) });
    const data = await res.json();
    setBusy(false);
    if (!res.ok) return setError(data.error ?? "Could not register the patient.");
    setOpen(false);
    router.push(`/hms/patients/${data.id}`);
  }

  function exportCsv() {
    const head = ["MRN", "Name", "Sex", "DOB", "Phone", "Blood group", "Allergies", "Insurance", "Visits", "Last visit"];
    const body = filtered.map((r) => [r.mrn, r.name, r.gender, r.dob ?? "", r.phone ?? "", r.blood_group ?? "", r.allergies ?? "", r.insurance ?? "", r.visits, r.last_visit ?? ""]);
    const csv = [head, ...body].map((l) => l.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `aybek-patients-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="mt-3">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-[14rem] flex-1">
          <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2" style={{ color: "var(--hms-faint)" }} />
          <input className="hms-input pl-7" placeholder="Search name, MRN or phone…" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <select className="hms-input !w-auto" value={sort} onChange={(e) => setSort(e.target.value)}>
          <option value="recent">Newest first</option>
          <option value="name">Name A–Z</option>
          <option value="visits">Most visits</option>
        </select>
        <Btn size="md" onClick={exportCsv} icon={<Download size={12} />}>CSV</Btn>
        <Btn variant="primary" onClick={() => setOpen(true)} icon={<UserPlus size={12} />}>Register patient</Btn>
      </div>

      <div className="mt-2 overflow-x-auto rounded-lg border" style={{ borderColor: "var(--hms-border)" }}>
        <table className="w-full min-w-[46rem]">
          <thead style={{ background: "var(--hms-surface-2)" }}>
            <tr>
              <th className="hms-th">Patient</th>
              <th className="hms-th">Sex / age</th>
              <th className="hms-th">Phone</th>
              <th className="hms-th">Blood</th>
              <th className="hms-th">Allergies</th>
              <th className="hms-th">Visits</th>
              <th className="hms-th">Last seen</th>
              <th className="hms-th">Open Rx</th>
              <th className="hms-th"></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((r) => (
              <tr key={r.id} className="hms-row">
                <td className="hms-td"><Person name={r.name} sub={r.mrn} size={26} /></td>
                <td className="hms-td capitalize">{r.gender} · {age(r.dob)}</td>
                <td className="hms-td whitespace-nowrap">{r.phone ?? "—"}</td>
                <td className="hms-td">{r.blood_group ?? "—"}</td>
                <td className="hms-td max-w-[10rem] truncate">{r.allergies && r.allergies !== "None" ? <span style={{ color: "#b91c1c" }}>{r.allergies}</span> : <span style={{ color: "var(--hms-faint)" }}>None recorded</span>}</td>
                <td className="hms-td">{r.visits}</td>
                <td className="hms-td whitespace-nowrap">{r.last_visit ? dateShort(r.last_visit) : "—"}</td>
                <td className="hms-td">{r.open_rx > 0 ? <Pill tone="warn">{r.open_rx}</Pill> : <span style={{ color: "var(--hms-faint)" }}>—</span>}</td>
                <td className="hms-td text-right"><Link href={`/hms/patients/${r.id}`} className="text-[0.68rem] font-semibold" style={{ color: "var(--hms-brand)" }}>Open chart →</Link></td>
              </tr>
            ))}
          </tbody>
        </table>
        {!filtered.length && <Empty title="No patients found" hint="Adjust the search, or register a new patient." icon={<Search size={16} />} />}
      </div>

      {open && (
        <div className="fixed inset-0 z-[70] flex items-start justify-center overflow-y-auto bg-black/45 p-4" onClick={() => setOpen(false)}>
          <form onSubmit={submit} className="my-8 w-full max-w-2xl rounded-xl border bg-[var(--hms-surface)] p-4 shadow-2xl" style={{ borderColor: "var(--hms-border)" }} onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[0.86rem] font-semibold">Register a new patient</p>
                <p className="text-[0.66rem]" style={{ color: "var(--hms-faint)" }}>An MRN is issued automatically and can never be reused.</p>
              </div>
              <button type="button" className="hms-btn hms-btn-sm hms-btn-ghost" onClick={() => setOpen(false)}><X size={14} /></button>
            </div>
            <div className="mt-3 grid gap-2.5 sm:grid-cols-2">
              <Field label="Full name" className="sm:col-span-2"><input className="hms-input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Fatima Noor" required /></Field>
              <Field label="Sex">
                <select className="hms-input" value={form.gender} onChange={(e) => setForm({ ...form, gender: e.target.value })}>
                  {["Female", "Male", "Other", "Unknown"].map((g) => <option key={g}>{g}</option>)}
                </select>
              </Field>
              <Field label="Date of birth"><input className="hms-input" type="date" value={form.dob} onChange={(e) => setForm({ ...form, dob: e.target.value })} /></Field>
              <Field label="Phone"><input className="hms-input" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="+93 70 000 0000" /></Field>
              <Field label="Blood group">
                <select className="hms-input" value={form.blood_group} onChange={(e) => setForm({ ...form, blood_group: e.target.value })}>
                  <option value="">Unknown</option>
                  {["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"].map((g) => <option key={g}>{g}</option>)}
                </select>
              </Field>
              <Field label="Allergies" hint="Type “None” if the patient has no known allergies."><input className="hms-input" value={form.allergies} onChange={(e) => setForm({ ...form, allergies: e.target.value })} placeholder="Penicillin, latex…" /></Field>
              <Field label="Insurance / payer"><input className="hms-input" value={form.insurance} onChange={(e) => setForm({ ...form, insurance: e.target.value })} /></Field>
              <Field label="Chronic conditions"><input className="hms-input" value={form.chronic} onChange={(e) => setForm({ ...form, chronic: e.target.value })} placeholder="Diabetes, hypertension…" /></Field>
              <Field label="Emergency contact"><input className="hms-input" value={form.emergency_contact} onChange={(e) => setForm({ ...form, emergency_contact: e.target.value })} /></Field>
              <Field label="Address" className="sm:col-span-2"><input className="hms-input" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} /></Field>
            </div>
            {error && <p className="mt-2 rounded-md px-2 py-1.5 text-[0.7rem]" style={{ background: "#fee2e2", color: "#991b1b" }}>{error}</p>}
            <div className="mt-3 flex justify-end gap-1.5">
              <Btn type="button" onClick={() => setOpen(false)}>Cancel</Btn>
              <Btn type="submit" variant="primary" loading={busy} icon={<Plus size={12} />}>Create record</Btn>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
