"use client";

import { Check, KeyRound, Loader2, Lock, ShieldCheck, UserPlus, UserX, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Field, Person, Pill } from "@/components/hms/ui";
import { relTime } from "@/lib/hms/format";

type U = {
  id: string; name: string; email: string; role: string; department: string | null; title: string | null;
  phone: string | null; active: number; last_login_at: string | null; created_at: string; sessions: number;
};

const ROLES = [
  { id: "admin", label: "Administrator — everything" },
  { id: "doctor", label: "Physician — OPD, prescribing, results" },
  { id: "nurse", label: "Nurse — ward, beds, dispensing" },
  { id: "pharmacist", label: "Pharmacist — pharmacy and stock" },
  { id: "lab", label: "Laboratory" },
  { id: "radiology", label: "Radiology" },
  { id: "reception", label: "Reception — registration, billing" },
];

export function TeamConsole({ users, meId, isAdmin }: { users: U[]; meId: string; isAdmin: boolean }) {
  const router = useRouter();
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
    setMsg({ tone: res.ok ? "ok" : "bad", text: res.ok ? "Saved." : data.error ?? "Could not save." });
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
          {users.filter((u) => u.active).length} active · {users.filter((u) => !u.active).length} suspended · {users.length} accounts
        </p>
        {isAdmin && (
          <button className="hms-btn hms-btn-primary hms-btn-sm" onClick={() => setAdding(true)}>
            <UserPlus size={11} /> Add a member of staff
          </button>
        )}
      </div>

      <div className="mt-2 overflow-x-auto rounded-lg border" style={{ borderColor: "var(--hms-border)" }}>
        <table className="w-full min-w-[50rem]">
          <thead style={{ background: "var(--hms-surface-2)" }}>
            <tr>
              <th className="hms-th">Person</th>
              <th className="hms-th">Role</th>
              <th className="hms-th">Department</th>
              <th className="hms-th">Last sign-in</th>
              <th className="hms-th">Sessions</th>
              <th className="hms-th">State</th>
              <th className="hms-th text-right">Access</th>
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
                      {ROLES.map((r) => <option key={r.id} value={r.id}>{r.id}</option>)}
                    </select>
                  ) : (
                    <Pill tone="brand">{u.role}</Pill>
                  )}
                </td>
                <td className="hms-td text-[0.7rem]">{u.department ?? "—"}<span className="block text-[0.6rem]" style={{ color: "var(--hms-faint)" }}>{u.title}</span></td>
                <td className="hms-td text-[0.68rem]">{u.last_login_at ? relTime(u.last_login_at) : "never"}</td>
                <td className="hms-td text-[0.7rem]">{u.sessions}</td>
                <td className="hms-td">{u.active ? <Pill tone="good" dot>active</Pill> : <Pill tone="neutral" dot>suspended</Pill>}</td>
                <td className="hms-td">
                  <div className="flex justify-end gap-1">
                    {(isAdmin || u.id === meId) && (
                      <button className="hms-btn hms-btn-sm hms-btn-ghost" title="Reset password" onClick={() => { setResetFor(u); setNewPassword(""); }}>
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
                        {u.active ? "Suspend" : "Restore"}
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
          <p className="flex items-center gap-1.5 text-[0.74rem] font-semibold"><Lock size={12} /> Change my password</p>
          <p className="mt-0.5 text-[0.62rem]" style={{ color: "var(--hms-faint)" }}>At least 8 characters. Everyone else keeps their own password.</p>
          <div className="mt-1.5 flex gap-1.5">
            <input className="hms-input" type="password" value={mine} onChange={(e) => setMine(e.target.value)} placeholder="New password" minLength={8} required />
            <button className="hms-btn hms-btn-primary" type="submit" disabled={mine.length < 8 || busy === "mine"}>
              {busy === "mine" ? <Loader2 size={11} className="animate-spin" /> : <Check size={11} />} Save
            </button>
          </div>
        </form>

        <div className="rounded-lg border p-2.5" style={{ borderColor: "var(--hms-border)" }}>
          <p className="flex items-center gap-1.5 text-[0.74rem] font-semibold"><ShieldCheck size={12} /> How access is protected</p>
          <ul className="mt-1 space-y-0.5 text-[0.63rem] leading-relaxed" style={{ color: "var(--hms-muted)" }}>
            <li>• Suspending a person ends their open sessions immediately.</li>
            <li>• The last active administrator can never be suspended or demoted.</li>
            <li>• Roles are re-checked on every request, not only in the menu.</li>
            <li>• Every change on this page is written to the audit trail.</li>
          </ul>
        </div>
      </div>

      {adding && (
        <div className="fixed inset-0 z-[70] flex items-start justify-center overflow-y-auto bg-black/45 p-4" onClick={() => setAdding(false)}>
          <form onSubmit={addUser} className="my-8 w-full max-w-lg rounded-xl border bg-[var(--hms-surface)] p-4 shadow-2xl" style={{ borderColor: "var(--hms-border)" }} onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between">
              <div>
                <p className="text-[0.84rem] font-semibold">Add a member of staff</p>
                <p className="text-[0.64rem]" style={{ color: "var(--hms-faint)" }}>They can sign in immediately with the password you set here.</p>
              </div>
              <button type="button" className="hms-btn hms-btn-sm hms-btn-ghost" onClick={() => setAdding(false)}><X size={13} /></button>
            </div>
            <div className="mt-2 grid gap-2 sm:grid-cols-2">
              <Field label="Full name" className="sm:col-span-2"><input className="hms-input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required /></Field>
              <Field label="Email" className="sm:col-span-2"><input className="hms-input" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="name@aybek.hospital" required /></Field>
              <Field label="Role">
                <select className="hms-input" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
                  {ROLES.map((r) => <option key={r.id} value={r.id}>{r.label}</option>)}
                </select>
              </Field>
              <Field label="Department"><input className="hms-input" value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value })} placeholder="OPD, Pharmacy…" /></Field>
              <Field label="Job title"><input className="hms-input" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></Field>
              <Field label="Phone"><input className="hms-input" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></Field>
              <Field label="Initial password" className="sm:col-span-2" hint="Share it privately; they can change it on this page after signing in.">
                <input className="hms-input" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} minLength={8} required />
              </Field>
            </div>
            <div className="mt-3 flex justify-end gap-1.5">
              <button type="button" className="hms-btn" onClick={() => setAdding(false)}>Cancel</button>
              <button type="submit" className="hms-btn hms-btn-primary" disabled={busy === "add"}>
                {busy === "add" ? <Loader2 size={11} className="animate-spin" /> : <UserPlus size={11} />} Create account
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
                <p className="text-[0.84rem] font-semibold">Reset password</p>
                <p className="text-[0.64rem]" style={{ color: "var(--hms-faint)" }}>{resetFor.name} · {resetFor.email}</p>
              </div>
              <button className="hms-btn hms-btn-sm hms-btn-ghost" onClick={() => setResetFor(null)}><X size={13} /></button>
            </div>
            <div className="mt-2">
              <Field label="New password" hint="At least 8 characters. Tell them to change it after the first sign-in.">
                <input className="hms-input" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
              </Field>
            </div>
            <div className="mt-3 flex justify-end gap-1.5">
              <button className="hms-btn" onClick={() => setResetFor(null)}>Cancel</button>
              <button
                className="hms-btn hms-btn-primary"
                onClick={async () => {
                  const ok = await call(`/api/hms/users/${resetFor.id}`, "PATCH", { password: newPassword }, "reset");
                  if (ok) setResetFor(null);
                }}
                disabled={newPassword.length < 8 || busy === "reset"}
              >
                {busy === "reset" ? <Loader2 size={11} className="animate-spin" /> : <KeyRound size={11} />} Set password
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
