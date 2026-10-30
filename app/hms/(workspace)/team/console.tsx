"use client";

import { Check, KeyRound, Loader2, Lock, ShieldCheck, UserPlus, UserX, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Field, Person, Pill } from "@/components/hms/ui";
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
      setAdding(false);
      setForm({ name: "", email: "", role: "nurse", department: "", title: "", phone: "", password: "" });
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
          <p className="mt-0.5 text-[0.62rem]" style={{ color: "var(--hms-faint)" }}>{tx("At least 8 characters. Everyone else keeps their own password.", "حداقل ۸ حرف. رمز دیگران دست‌نخورده می‌ماند.")}</p>
          <div className="mt-1.5 flex gap-1.5">
            <input className="hms-input" type="password" value={mine} onChange={(e) => setMine(e.target.value)} placeholder={tx("New password", "رمز جدید")} minLength={8} required />
            <button className="hms-btn hms-btn-primary" type="submit" disabled={mine.length < 8 || busy === "mine"}>
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
              <Field label={tx("Initial password", "رمز اولیه")} className="sm:col-span-2" hint={tx("Share it privately; they can change it on this page after signing in.", "این رمز را خصوصی بدهید؛ او می‌تواند بعد از ورود آن را در همین صفحه عوض کند.")}>
                <input className="hms-input" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} minLength={8} required />
              </Field>
            </div>
            <div className="mt-3 flex justify-end gap-1.5">
              <button type="button" className="hms-btn" onClick={() => setAdding(false)}>{tx("Cancel", "لغو")}</button>
              <button type="submit" className="hms-btn hms-btn-primary" disabled={busy === "add"}>
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
              <Field label={tx("New password", "رمز جدید")} hint={tx("At least 8 characters. Tell them to change it after the first sign-in.", "حداقل ۸ حرف. بگویید بعد از اولین ورود آن را عوض کند.")}>
                <input className="hms-input" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
              </Field>
            </div>
            <div className="mt-3 flex justify-end gap-1.5">
              <button className="hms-btn" onClick={() => setResetFor(null)}>{tx("Cancel", "لغو")}</button>
              <button
                className="hms-btn hms-btn-primary"
                onClick={async () => {
                  const ok = await call(`/api/hms/users/${resetFor.id}`, "PATCH", { password: newPassword }, "reset");
                  if (ok) setResetFor(null);
                }}
                disabled={newPassword.length < 8 || busy === "reset"}
              >
                {busy === "reset" ? <Loader2 size={11} className="animate-spin" /> : <KeyRound size={11} />} {tx("Set password", "تعیین رمز")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
