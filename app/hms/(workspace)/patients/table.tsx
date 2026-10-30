"use client";

import { Download, Plus, Search, UserPlus, X } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { Btn, Empty, Field, Person, Pill, Status } from "@/components/hms/ui";
import { age, dateShort, digitsOf } from "@/lib/hms/format";
import { statusText } from "@/lib/hms/i18n";
import { useLang, useTx } from "@/components/hms/lang-provider";

type Row = {
  id: string; mrn: string; name: string; gender: string; dob: string | null; phone: string | null;
  blood_group: string | null; allergies: string | null; insurance: string | null;
  visits: number; last_visit: string | null; open_rx: number;
};

export function PatientsTable({ rows, autoOpen }: { rows: Row[]; autoOpen?: boolean }) {
  const router = useRouter();
  const tx = useTx();
  const { lang } = useLang();
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
    if (!form.name.trim()) return setError(tx("A name is required.", "نام الزامی است."));
    setBusy(true);
    setError(null);
    const res = await fetch("/api/hms/patients", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(form) });
    const data = await res.json();
    setBusy(false);
    if (!res.ok) return setError(data.error ?? tx("Could not register the patient.", "ثبت مریض انجام نشد."));
    setOpen(false);
    router.push(`/hms/patients/${data.id}`);
  }

  function exportCsv() {
    const head = [tx("MRN", "شمارهٔ پرونده"), tx("Name", "نام"), tx("Sex", "جنسیت"), tx("DOB", "تاریخ تولد"), tx("Phone", "تلفن"), tx("Blood group", "گروه خون"), tx("Allergies", "حساسیت"), tx("Insurance", "بیمه"), tx("Visits", "مراجعات"), tx("Last visit", "آخرین مراجعه")];
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
          <input className="hms-input pl-7" placeholder={tx("Search name, MRN or phone…", "جستجوی نام، شمارهٔ پرونده یا تلفن…")} value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <select className="hms-input !w-auto" value={sort} onChange={(e) => setSort(e.target.value)}>
          <option value="recent">{tx("Newest first", "جدیدترین اول")}</option>
          <option value="name">{tx("Name A–Z", "نام الف–ی")}</option>
          <option value="visits">{tx("Most visits", "بیشترین مراجعه")}</option>
        </select>
        <Btn size="md" onClick={exportCsv} icon={<Download size={12} />}>CSV</Btn>
        <Btn variant="primary" onClick={() => setOpen(true)} icon={<UserPlus size={12} />}>{tx("Register patient", "ثبت مریض")}</Btn>
      </div>

      <div className="mt-2 overflow-x-auto rounded-lg border" style={{ borderColor: "var(--hms-border)" }}>
        <table className="w-full min-w-[46rem]">
          <thead style={{ background: "var(--hms-surface-2)" }}>
            <tr>
              <th className="hms-th">{tx("Patient", "مریض")}</th>
              <th className="hms-th">{tx("Sex / age", "جنسیت / سن")}</th>
              <th className="hms-th">{tx("Phone", "تلفن")}</th>
              <th className="hms-th">{tx("Blood", "خون")}</th>
              <th className="hms-th">{tx("Allergies", "حساسیت")}</th>
              <th className="hms-th">{tx("Visits", "مراجعات")}</th>
              <th className="hms-th">{tx("Last seen", "آخرین مراجعه")}</th>
              <th className="hms-th">{tx("Open Rx", "نسخهٔ باز")}</th>
              <th className="hms-th"></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((r) => (
              <tr key={r.id} className="hms-row">
                <td className="hms-td"><Person name={r.name} sub={r.mrn} size={26} /></td>
                <td className="hms-td capitalize">{statusText(lang, r.gender)} · {age(r.dob, lang)}</td>
                <td className="hms-td whitespace-nowrap">{r.phone ?? "—"}</td>
                <td className="hms-td">{r.blood_group ?? "—"}</td>
                <td className="hms-td max-w-[10rem] truncate">{r.allergies && r.allergies !== "None" ? <span style={{ color: "#b91c1c" }}>{r.allergies}</span> : <span style={{ color: "var(--hms-faint)" }}>{tx("None recorded", "ثبت نشده")}</span>}</td>
                <td className="hms-td">{digitsOf(lang, r.visits)}</td>
                <td className="hms-td whitespace-nowrap">{r.last_visit ? dateShort(r.last_visit, lang) : "—"}</td>
                <td className="hms-td">{r.open_rx > 0 ? <Pill tone="warn">{digitsOf(lang, r.open_rx)}</Pill> : <span style={{ color: "var(--hms-faint)" }}>—</span>}</td>
                <td className="hms-td text-right"><Link href={`/hms/patients/${r.id}`} className="text-[0.68rem] font-semibold" style={{ color: "var(--hms-brand)" }}>{tx("Open chart →", "باز کردن پرونده →")}</Link></td>
              </tr>
            ))}
          </tbody>
        </table>
        {!filtered.length && <Empty title={tx("No patients found", "مریضی پیدا نشد")} hint={tx("Adjust the search, or register a new patient.", "جستجو را تغییر دهید یا مریض جدید ثبت کنید.")} icon={<Search size={16} />} />}
      </div>

      {open && (
        <div className="fixed inset-0 z-[70] flex items-start justify-center overflow-y-auto bg-black/45 p-4" onClick={() => setOpen(false)}>
          <form onSubmit={submit} className="my-8 w-full max-w-2xl rounded-xl border bg-[var(--hms-surface)] p-4 shadow-2xl" style={{ borderColor: "var(--hms-border)" }} onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[0.86rem] font-semibold">{tx("Register a new patient", "ثبت مریض جدید")}</p>
                <p className="text-[0.66rem]" style={{ color: "var(--hms-faint)" }}>{tx("An MRN is issued automatically and can never be reused.", "شمارهٔ پرونده خودکار صادر می‌شود و هرگز تکرار نمی‌شود.")}</p>
              </div>
              <button type="button" className="hms-btn hms-btn-sm hms-btn-ghost" onClick={() => setOpen(false)}><X size={14} /></button>
            </div>
            <div className="mt-3 grid gap-2.5 sm:grid-cols-2">
              <Field label={tx("Full name", "نام کامل")} className="sm:col-span-2"><input className="hms-input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder={tx("e.g. Fatima Noor", "مثلاً فاطمه نور")} required /></Field>
              <Field label={tx("Sex", "جنسیت")}>
                <select className="hms-input" value={form.gender} onChange={(e) => setForm({ ...form, gender: e.target.value })}>
                  {[["Female", "زن"], ["Male", "مرد"], ["Other", "دیگر"], ["Unknown", "نامعلوم"]].map(([g, fa]) => <option key={g} value={g}>{tx(g, fa)}</option>)}
                </select>
              </Field>
              <Field label={tx("Date of birth", "تاریخ تولد")}><input className="hms-input" type="date" value={form.dob} onChange={(e) => setForm({ ...form, dob: e.target.value })} /></Field>
              <Field label={tx("Phone", "تلفن")}><input className="hms-input" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="+93 70 000 0000" /></Field>
              <Field label={tx("Blood group", "گروه خون")}>
                <select className="hms-input" value={form.blood_group} onChange={(e) => setForm({ ...form, blood_group: e.target.value })}>
                  <option value="">{tx("Unknown", "نامعلوم")}</option>
                  {["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"].map((g) => <option key={g}>{g}</option>)}
                </select>
              </Field>
              <Field label={tx("Allergies", "حساسیت")} hint={tx("Type “None” if the patient has no known allergies.", "اگر مریض حساسیت شناخته‌شده ندارد «None» بنویسید.")}><input className="hms-input" value={form.allergies} onChange={(e) => setForm({ ...form, allergies: e.target.value })} placeholder="Penicillin, latex…" /></Field>
              <Field label={tx("Insurance / payer", "بیمه / پرداخت‌کننده")}><input className="hms-input" value={form.insurance} onChange={(e) => setForm({ ...form, insurance: e.target.value })} /></Field>
              <Field label={tx("Chronic conditions", "بیماری‌های مزمن")}><input className="hms-input" value={form.chronic} onChange={(e) => setForm({ ...form, chronic: e.target.value })} placeholder="Diabetes, hypertension…" /></Field>
              <Field label={tx("Emergency contact", "تماس اضطراری")}><input className="hms-input" value={form.emergency_contact} onChange={(e) => setForm({ ...form, emergency_contact: e.target.value })} /></Field>
              <Field label={tx("Address", "آدرس")} className="sm:col-span-2"><input className="hms-input" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} /></Field>
            </div>
            {error && <p className="mt-2 rounded-md px-2 py-1.5 text-[0.7rem]" style={{ background: "#fee2e2", color: "#991b1b" }}>{error}</p>}
            <div className="mt-3 flex justify-end gap-1.5">
              <Btn type="button" onClick={() => setOpen(false)}>{tx("Cancel", "لغو")}</Btn>
              <Btn type="submit" variant="primary" loading={busy} icon={<Plus size={12} />}>{tx("Create record", "ایجاد پرونده")}</Btn>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
