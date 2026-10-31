"use client";

import { Check, KeyRound, Loader2, Lock, ShieldCheck, UserPlus, UserX, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Field, Person, Pill } from "@/components/hms/ui";
import { CodeField } from "@/components/hms/code-field";
import { scoreCode } from "@/lib/hms/passwords";
import { Printer } from "lucide-react";
import { digitsOf, relTime } from "@/lib/hms/format";
import { statusText } from "@/lib/hms/i18n";
import { useLang, useTx } from "@/components/hms/lang-provider";

type U = {
  id: string; name: string; email: string; role: string; department: string | null; title: string | null;
  phone: string | null; active: number; last_login_at: string | null; created_at: string; sessions: number;
};

const ROLES = [
  { id: "admin", label: "Administrator — everything", fa: "مدیر — همه‌چیز" },
  { id: "doctor", label: "Physician — OPD, prescribing, results", fa: "داکتر — معاینات، نسخه‌نویسی، نتایج" },
  { id: "nurse", label: "Nurse — ward, beds, dispensing", fa: "نرس — وارڈ، بستر، تحویل دوا" },
  { id: "pharmacist", label: "Pharmacist — pharmacy and stock", fa: "دواساز — دواخانه و موجودی" },
  { id: "lab", label: "Laboratory", fa: "لابراتوار" },
  { id: "radiology", label: "Radiology", fa: "اکسری" },
  { id: "reception", label: "Reception — registration, billing", fa: "استقبال — ثبت، حساب" },
];

export function TeamConsole({ users, meId, isAdmin }: { users: U[]; meId: string; isAdmin: boolean }) {
  const router = useRouter();
  const tx = useTx();
  const { lang } = useLang();
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ tone: "ok" | "bad"; text: string } | null>(null);
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", role: "nurse", department: "", title: "", phone: "", password: "" });
  const [resetFor, setResetFor] = useState<U | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [mine, setMine] = useState("");
  const [card, setCard] = useState<{ name: string; email: string; role: string; code: string } | null>(null);
  const [mineOk, setMineOk] = useState(false);
  const [resetOk, setResetOk] = useState(false);
  const [addOk, setAddOk] = useState(false);

  async function call(path: string, method: string, payload: unknown, key: string) {
    setBusy(key);
    setMsg(null);
    const res = await fetch(path, { method, headers: { "content-type": "application/json" }, body: JSON.stringify(payload) });
    const data = await res.json();
    setBusy(null);
    setMsg({ tone: res.ok ? "ok" : "bad", text: res.ok ? tx("Saved.", "ذخیره شد.") : data.error ?? tx("Could not save.", "ذخیره نشد.") });
    if (res.ok) router.refresh();
    return res.ok;
  }

  async function addUser(e: React.FormEvent) {
    e.preventDefault();
    const ok = await call("/api/hms/users", "POST", form, "add");
    if (ok) {
      setCard({ name: form.name, email: form.email, role: form.role, code: form.password });
      setAdding(false);
      setForm({ name: "", email: "", role: "nurse", department: "", title: "", phone: "", password: "" });
      setAddOk(false);
    }
  }

  async function changeMine(e: React.FormEvent) {
    e.preventDefault();
    const ok = await call(`/api/hms/users/${meId}`, "PATCH", { password: mine }, "mine");
    if (ok) setMine("");
  }

  return (
    <div className="mt-3">
      {msg && (
        <p className="mb-2 flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[0.7rem]" style={{ background: msg.tone === "ok" ? "color-mix(in srgb,#10b981 12%, transparent)" : "color-mix(in srgb,#ef4444 12%, transparent)", color: msg.tone === "ok" ? "#0b6b4d" : "#991b1b" }}>
          {msg.tone === "ok" ? <Check size={12} /> : <X size={12} />} {msg.text}
          <button className="ml-auto" onClick={() => setMsg(null)}><X size={11} /></button>
        </p>
      )}

      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-[0.66rem]" style={{ color: "var(--hms-faint)" }}>
          {tx("{a} active · {s} suspended · {n} accounts", "{a} فعال · {s} تعلیق‌شده · {n} حساب", { a: digitsOf(lang, users.filter((u) => u.active).length), s: digitsOf(lang, users.filter((u) => !u.active).length), n: digitsOf(lang, users.length) })}
        </p>
        {isAdmin && (
          <button className="hms-btn hms-btn-primary hms-btn-sm" onClick={() => setAdding(true)}>
            <UserPlus size={11} /> {tx("Add a member of staff", "افزودن کارمند")}
          </button>
        )}
      </div>

      <div className="mt-2 overflow-x-auto rounded-lg border" style={{ borderColor: "var(--hms-border)" }}>
        <table className="w-full min-w-[50rem]">
          <thead style={{ background: "var(--hms-surface-2)" }}>
            <tr>
              <th className="hms-th">{tx("Person", "شخص")}</th>
              <th className="hms-th">{tx("Role", "نقش")}</th>
              <th className="hms-th">{tx("Department", "دیپارتمنت")}</th>
              <th className="hms-th">{tx("Last sign-in", "آخرین ورود")}</th>
              <th className="hms-th">{tx("Sessions", "نشست‌ها")}</th>
              <th className="hms-th">{tx("State", "وضعیت")}</th>
              <th className="hms-th text-right">{tx("Access", "دسترسی")}</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} className="hms-row" style={u.active ? undefined : { opacity: 0.55 }}>
                <td className="hms-td"><Person name={u.name} sub={u.email} size={26} /></td>
                <td className="hms-td">
                  {isAdmin && u.id !== meId ? (
                    <select
                      className="hms-input !h-7 !w-auto !text-[0.68rem]"
                      value={u.role}
                      onChange={(e) => call(`/api/hms/users/${u.id}`, "PATCH", { role: e.target.value }, u.id + "role")}
                      disabled={busy === u.id + "role"}
                    >
                      {ROLES.map((r) => <option key={r.id} value={r.id}>{statusText(lang, r.id)}</option>)}
                    </select>
                  ) : (
                    <Pill tone="brand">{statusText(lang, u.role)}</Pill>
                  )}
                </td>
                <td className="hms-td text-[0.7rem]">{u.department ?? "—"}<span className="block text-[0.6rem]" style={{ color: "var(--hms-faint)" }}>{u.title}</span></td>
                <td className="hms-td text-[0.68rem]">{u.last_login_at ? relTime(u.last_login_at, lang) : tx("never", "هرگز")}</td>
                <td className="hms-td text-[0.7rem]">{digitsOf(lang, u.sessions)}</td>
                <td className="hms-td">{u.active ? <Pill tone="good" dot>{statusText(lang, "active")}</Pill> : <Pill tone="neutral" dot>{statusText(lang, "suspended")}</Pill>}</td>
                <td className="hms-td">
                  <div className="flex justify-end gap-1">
                    {(isAdmin || u.id === meId) && (
                      <button className="hms-btn hms-btn-sm hms-btn-ghost" title={tx("Reset password", "بازنشانی رمز")} onClick={() => { setResetFor(u); setNewPassword(""); }}>
                        <KeyRound size={11} />
                      </button>
                    )}
                    {isAdmin && u.id !== meId && (
                      <button
                        className="hms-btn hms-btn-sm"
                        onClick={() => call(`/api/hms/users/${u.id}`, "PATCH", { active: !u.active }, u.id + "active")}
                        disabled={busy === u.id + "active"}
                      >
                        {busy === u.id + "active" ? <Loader2 size={10} className="animate-spin" /> : u.active ? <UserX size={10} /> : <ShieldCheck size={10} />}
                        {u.active ? tx("Suspend", "تعلیق") : tx("Restore", "بازگردانی")}
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-3 grid gap-2.5 sm:grid-cols-2">
        <form onSubmit={changeMine} className="rounded-lg border p-2.5" style={{ borderColor: "var(--hms-border)" }}>
          <p className="flex items-center gap-1.5 text-[0.74rem] font-semibold"><Lock size={12} /> {tx("Change my password", "تغییر رمز من")}</p>
          <p className="mt-0.5 text-[0.62rem]" style={{ color: "var(--hms-faint)" }}>
            {tx("Twelve characters or more. Press Generate and the hospital mints one for you.", "دوازده حرف یا بیشتر. «تولید» را بزنید تا شفاخانه یکی برایتان بسازد.")}
          </p>
          <div className="mt-1.5">
            <CodeField label={tx("New code", "رمز جدید")} value={mine} onChange={setMine} onQuality={setMineOk} />
          </div>
          <div className="mt-1.5 flex justify-end">
            <button className="hms-btn hms-btn-primary" type="submit" disabled={!mineOk || busy === "mine"}>
              {busy === "mine" ? <Loader2 size={11} className="animate-spin" /> : <Check size={11} />} {tx("Save", "ذخیره")}
            </button>
          </div>
        </form>

        <div className="rounded-lg border p-2.5" style={{ borderColor: "var(--hms-border)" }}>
          <p className="flex items-center gap-1.5 text-[0.74rem] font-semibold"><ShieldCheck size={12} /> {tx("How access is protected", "چگونه دسترسی محافظت می‌شود")}</p>
          <ul className="mt-1 space-y-0.5 text-[0.63rem] leading-relaxed" style={{ color: "var(--hms-muted)" }}>
            <li>• {tx("Suspending a person ends their open sessions immediately.", "تعلیق یک شخص نشست‌های باز او را فوراً می‌بندد.")}</li>
            <li>• {tx("The last active administrator can never be suspended or demoted.", "آخرین مدیر فعال هرگز تعلیق یا تنزل نمی‌شود.")}</li>
            <li>• {tx("Roles are re-checked on every request, not only in the menu.", "نقش‌ها در هر درخواست دوباره بررسی می‌شوند، نه فقط در منو.")}</li>
            <li>• {tx("Every change on this page is written to the audit trail.", "هر تغییر در این صفحه در سابقهٔ حسابرسی نوشته می‌شود.")}</li>
          </ul>
        </div>
      </div>

      {adding && (
        <div className="fixed inset-0 z-[70] flex items-start justify-center overflow-y-auto bg-black/45 p-4" onClick={() => setAdding(false)}>
          <form onSubmit={addUser} className="my-8 w-full max-w-lg rounded-xl border bg-[var(--hms-surface)] p-4 shadow-2xl" style={{ borderColor: "var(--hms-border)" }} onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between">
              <div>
                <p className="text-[0.84rem] font-semibold">{tx("Add a member of staff", "افزودن کارمند")}</p>
                <p className="text-[0.64rem]" style={{ color: "var(--hms-faint)" }}>{tx("They can sign in immediately with the password you set here.", "او می‌تواند فوراً با رمزی که اینجا تعیین می‌کنید وارد شود.")}</p>
              </div>
              <button type="button" className="hms-btn hms-btn-sm hms-btn-ghost" onClick={() => setAdding(false)}><X size={13} /></button>
            </div>
            <div className="mt-2 grid gap-2 sm:grid-cols-2">
              <Field label={tx("Full name", "نام کامل")} className="sm:col-span-2"><input className="hms-input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required /></Field>
              <Field label={tx("Email", "ایمیل")} className="sm:col-span-2"><input className="hms-input" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="name@aybek.hospital" required /></Field>
              <Field label={tx("Role", "نقش")}>
                <select className="hms-input" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
                  {ROLES.map((r) => <option key={r.id} value={r.id}>{tx(r.label, r.fa)}</option>)}
                </select>
              </Field>
              <Field label={tx("Department", "دیپارتمنت")}><input className="hms-input" value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value })} placeholder={tx("OPD, Pharmacy…", "معاینات، دواخانه…")} /></Field>
              <Field label={tx("Job title", "عنوان وظیفه")}><input className="hms-input" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></Field>
              <Field label={tx("Phone", "تلفن")}><input className="hms-input" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></Field>
              <div className="sm:col-span-2">
                <CodeField
                  label={tx("Initial code", "رمز اولیه")}
                  value={form.password}
                  onChange={(v) => setForm({ ...form, password: v })}
                  onQuality={setAddOk}
                  hint={tx("Press Generate — then print the access card and hand it over once.", "«تولید» را بزنید — بعد کارت دسترسی را چاپ کنید و یک بار تحویل دهید.")}
                />
              </div>
            </div>
            <div className="mt-3 flex justify-end gap-1.5">
              <button type="button" className="hms-btn" onClick={() => setAdding(false)}>{tx("Cancel", "لغو")}</button>
              <button type="submit" className="hms-btn hms-btn-primary" disabled={busy === "add" || !addOk}>
                {busy === "add" ? <Loader2 size={11} className="animate-spin" /> : <UserPlus size={11} />} {tx("Create account", "ایجاد حساب")}
              </button>
            </div>
          </form>
        </div>
      )}

      {resetFor && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/45 p-4" onClick={() => setResetFor(null)}>
          <div className="w-full max-w-sm rounded-xl border bg-[var(--hms-surface)] p-4 shadow-2xl" style={{ borderColor: "var(--hms-border)" }} onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between">
              <div>
                <p className="text-[0.84rem] font-semibold">{tx("Reset password", "بازنشانی رمز")}</p>
                <p className="text-[0.64rem]" style={{ color: "var(--hms-faint)" }}>{resetFor.name} · {resetFor.email}</p>
              </div>
              <button className="hms-btn hms-btn-sm hms-btn-ghost" onClick={() => setResetFor(null)}><X size={13} /></button>
            </div>
            <div className="mt-2">
              <CodeField
                label={tx("New code for this person", "رمز جدید برای این شخص")}
                value={newPassword}
                onChange={setNewPassword}
                onQuality={setResetOk}
                hint={tx("Hand it over on paper once; they change it on their first sign-in.", "یک بار روی کاغذ بدهید؛ او در اولین ورود عوضش می‌کند.")}
              />
            </div>
            <div className="mt-3 flex justify-end gap-1.5">
              <button className="hms-btn" onClick={() => setResetFor(null)}>{tx("Cancel", "لغو")}</button>
              <button
                className="hms-btn hms-btn-primary"
                onClick={async () => {
                  const ok = await call(`/api/hms/users/${resetFor.id}`, "PATCH", { password: newPassword }, "reset");
                  if (ok) {
                    setCard({ name: resetFor.name, email: resetFor.email, role: resetFor.role, code: newPassword });
                    setResetFor(null);
                    setNewPassword("");
                  }
                }}
                disabled={!resetOk || busy === "reset"}
              >
                {busy === "reset" ? <Loader2 size={11} className="animate-spin" /> : <KeyRound size={11} />} {tx("Set code", "تعیین رمز")}
              </button>
            </div>
          </div>
        </div>
      )}

      {card && (
        <div className="fixed inset-0 z-[75] flex items-center justify-center bg-black/50 p-4" onClick={() => setCard(null)}>
          <div className="w-full max-w-md rounded-xl border bg-[var(--hms-surface)] p-4 shadow-2xl" style={{ borderColor: "var(--hms-border)" }} onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between">
              <div>
                <p className="text-[0.84rem] font-semibold">{tx("Access card", "کارت دسترسی")}</p>
                <p className="text-[0.64rem]" style={{ color: "var(--hms-faint)" }}>
                  {tx("Print it, fold it, hand it over once. The code is not shown again.", "چاپ کنید، تا بزنید و یک بار تحویل دهید. رمز دیگر نشان داده نمی‌شود.")}
                </p>
              </div>
              <button className="hms-btn hms-btn-sm hms-btn-ghost" onClick={() => setCard(null)}><X size={13} /></button>
            </div>

            <div className="print-area mt-2 rounded-lg border-2 p-3" style={{ borderColor: "var(--hms-brand)", background: "#fff", color: "#0f172a" }}>
              <div className="flex items-center justify-between border-b pb-2" style={{ borderColor: "#dbe7ef" }}>
                <div>
                  <p className="text-[0.58rem] font-bold uppercase tracking-[0.14em]" style={{ color: "#0e9488" }}>Aybek Ten-Bed Specialy Surgical Hospital</p>
                  <p className="text-[0.56rem]" style={{ color: "#64748b" }}>شفاخانه ده بستر جراحی ایبک</p>
                </div>
                <KeyRound size={16} style={{ color: "#0e9488" }} />
              </div>
              <table className="mt-2 w-full text-[0.7rem]">
                <tbody>
                  <tr><td className="py-0.5" style={{ color: "#64748b", width: "38%" }}>Name / نام</td><td className="py-0.5 font-semibold">{card.name}</td></tr>
                  <tr><td className="py-0.5" style={{ color: "#64748b" }}>Sign-in / ورود</td><td className="py-0.5 font-mono">{card.email}</td></tr>
                  <tr><td className="py-0.5" style={{ color: "#64748b" }}>Role / نقش</td><td className="py-0.5">{statusText(lang, card.role)}</td></tr>
                </tbody>
              </table>
              <div className="mt-2 rounded-md border border-dashed p-2 text-center" style={{ borderColor: "#0e9488" }}>
                <p className="text-[0.56rem] uppercase tracking-[0.12em]" style={{ color: "#64748b" }}>One-time code / رمز یک‌بارمصرف</p>
                <p className="mt-0.5 font-mono text-[1.05rem] font-bold tracking-[0.08em]" style={{ color: "#0f172a" }}>{card.code}</p>
              </div>
              <p className="mt-2 text-[0.56rem] leading-relaxed" style={{ color: "#64748b" }}>
                Sign in at http://localhost:3000/hms/login — then open Team and set your own code.
                <br />وارد شوید، بعد در بخش کارمندان رمز خودتان را بگذارید. این کارت را در جای محرم نگه دارید.
              </p>
            </div>

            <div className="mt-3 flex justify-end gap-1.5">
              <button className="hms-btn" onClick={() => setCard(null)}>{tx("Close", "بستن")}</button>
              <button className="hms-btn hms-btn-primary" onClick={() => window.print()}>
                <Printer size={11} /> {tx("Print card", "چاپ کارت")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
