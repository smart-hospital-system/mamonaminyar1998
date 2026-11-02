"use client";

import { BadgeCheck, Copy, KeyRound, Loader2, RefreshCw, Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Pill } from "@/components/hms/ui";
import { statusText } from "@/lib/hms/i18n";
import { useLang, useTx } from "@/components/hms/lang-provider";

type State = { status: string; plan: string; serial: string; daysLeft: number; seats: number; activatedAt: string; owner: string; machine: string };

export function ActivateConsole({ state }: { state: State }) {
  const router = useRouter();
  const tx = useTx();
  const { lang } = useLang();
  const [serial, setSerial] = useState(state.serial ?? "");
  const [plan, setPlan] = useState("hospital");
  const [count, setCount] = useState(3);
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ tone: "ok" | "bad"; text: string } | null>(null);
  const [generated, setGenerated] = useState<string[]>([]);

  const tone = state.status === "active" ? "good" : state.status === "trial" ? "warn" : "bad";

  async function call(action: string, extra: Record<string, unknown> = {}) {
    setBusy(action);
    const res = await fetch("/api/hms/license", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ action, ...extra }) });
    const data = await res.json();
    setBusy(null);
    if (!res.ok) {
      setMsg({ tone: "bad", text: data.error ?? tx("That serial could not be activated.", "این سریال فعال نشد.") });
      return;
    }
    if (action === "activate") {
      setMsg({ tone: "ok", text: tx("Licence activated on this machine. The trial banner is gone.", "لایسنس روی این دستگاه فعال شد. نوار آزمایشی برداشته شد.") });
      router.refresh();
    }
    if (action === "generate") {
      setGenerated(data.serials ?? []);
      setMsg({ tone: "ok", text: tx("{n} serial(s) generated and recorded in your licence register.", "{n} سریال ساخته و در ثبت لایسنس شما ثبت شد.", { n: data.serials?.length ?? 0 }) });
      router.refresh();
    }
  }

  return (
    <div className="mt-3 grid gap-3 lg:grid-cols-[1.1fr_1fr]">
      <div className="rounded-lg border p-3" style={{ borderColor: "var(--hms-border)" }}>
        <div className="flex flex-wrap items-center gap-1.5">
          <Pill tone={tone as "good"} dot>{statusText(lang, state.status)}</Pill>
          <Pill tone="neutral">{statusText(lang, state.plan)}</Pill>
          <Pill tone="neutral">{tx("{n} seat(s)", "{n} صندلی", { n: state.seats })}</Pill>
          {state.status === "trial" && <Pill tone="warn">{tx("{n} day(s) left", "{n} روز مانده", { n: state.daysLeft })}</Pill>}
          {state.status === "active" && <Pill tone="good"><BadgeCheck size={10} /> {state.machine}</Pill>}
        </div>
        <p className="mt-1.5 text-[0.66rem]" style={{ color: "var(--hms-faint)" }}>
          {tx("Licence owner", "مالک لایسنس")} {state.owner}{state.activatedAt ? ` · ${tx("activated", "فعال‌شده")} ${new Date(state.activatedAt).toLocaleDateString("en-GB")}` : ""}
        </p>

        <label className="mt-3 block">
          <span className="hms-label">{tx("Serial number", "شمارهٔ سریال")}</span>
          <input className="hms-input font-mono uppercase" placeholder="AYBK-XXXX-XXXX-XXXX-XXXX" value={serial} onChange={(e) => setSerial(e.target.value.toUpperCase())} />
        </label>
        <button className="hms-btn hms-btn-primary mt-2 w-full" onClick={() => call("activate", { serial })} disabled={busy !== null || serial.length < 8}>
          {busy === "activate" ? <Loader2 size={12} className="animate-spin" /> : <KeyRound size={12} />} {tx("Activate this installation", "فعال‌سازی این نصب")}
        </button>

        {msg && (
          <p className="mt-2 rounded-md px-2 py-1.5 text-[0.68rem]" style={{ background: msg.tone === "ok" ? "color-mix(in srgb,#10b981 12%, transparent)" : "color-mix(in srgb,#ef4444 12%, transparent)", color: msg.tone === "ok" ? "#0b6b4d" : "#991b1b" }}>
            {msg.text}
          </p>
        )}
      </div>

      <div className="rounded-lg border p-3" style={{ borderColor: "var(--hms-border)" }}>
        <p className="flex items-center gap-1.5 text-[0.76rem] font-semibold"><Sparkles size={13} style={{ color: "var(--hms-brand)" }} /> {tx("Owner tools", "ابزارهای مالک")}</p>
        <p className="mt-0.5 text-[0.64rem]" style={{ color: "var(--hms-muted)" }}>{tx("Generate serials for other computers or departments. Keep them private — anyone holding a valid serial can activate a copy.", "برای رایانه‌ها یا دیپارتمنت‌های دیگر سریال بسازید. آن‌ها را خصوصی نگه دارید — هر کس سریال معتبر داشته باشد می‌تواند یک نسخه را فعال کند.")}</p>
        <div className="mt-2 grid grid-cols-3 gap-1.5">
          <label className="block">
            <span className="hms-label">{tx("Plan", "پلان")}</span>
            <select className="hms-input !h-8 !text-[0.7rem]" value={plan} onChange={(e) => setPlan(e.target.value)}>
              {["trial", "clinic", "hospital", "enterprise"].map((p) => <option key={p}>{p}</option>)}
            </select>
          </label>
          <label className="block">
            <span className="hms-label">{tx("How many", "چند عدد")}</span>
            <input className="hms-input !h-8 !text-[0.7rem]" type="number" min={1} max={50} value={count} onChange={(e) => setCount(Number(e.target.value))} />
          </label>
          <div className="flex items-end">
            <button className="hms-btn hms-btn-sm w-full" onClick={() => call("generate", { plan, count })} disabled={busy !== null}>
              {busy === "generate" ? <Loader2 size={11} className="animate-spin" /> : <RefreshCw size={11} />} {tx("Generate", "ساخت")}
            </button>
          </div>
        </div>

        {generated.length > 0 && (
          <div className="mt-2 space-y-1">
            {generated.map((s) => (
              <div key={s} className="flex items-center gap-1.5 rounded-md px-2 py-1 font-mono text-[0.7rem]" style={{ background: "var(--hms-surface-2)" }}>
                {s}
                <button className="ml-auto opacity-60 hover:opacity-100" onClick={() => navigator.clipboard?.writeText(s)} title={tx("Copy", "کاپی")}><Copy size={11} /></button>
              </div>
            ))}
            <p className="text-[0.6rem]" style={{ color: "var(--hms-faint)" }}>{tx("Copy them now — they are also kept in the register below.", "همین حالا کاپی کنید — در ثبت پایین هم نگه داشته می‌شوند.")}</p>
          </div>
        )}

        <label className="mt-3 block">
          <span className="hms-label">{tx("Test a serial without activating", "آزمایش سریال بدون فعال‌سازی")}</span>
          <button className="hms-btn hms-btn-sm w-full" onClick={() => call("validate", { serial })} disabled={!serial}>
            {tx("Check validity of", "بررسی اعتبار")} «{serial.slice(0, 14) || "…"}»
          </button>
        </label>
      </div>
    </div>
  );
}
