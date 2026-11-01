"use client";

import { Loader2, Wrench } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function HealAll({ count }: { count: number }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  async function run() {
    setBusy(true);
    const res = await fetch("/api/hms/alerts", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ action: "heal-all" }) });
    const data = await res.json();
    setBusy(false);
    setResult(`${(data.healed ?? []).filter((h: { ok: boolean }) => h.ok).length} repaired automatically`);
    router.refresh();
  }

  return (
    <span className="flex items-center gap-1.5">
      <button className="hms-btn hms-btn-sm hms-btn-primary" onClick={run} disabled={busy || count === 0}>
        {busy ? <Loader2 size={11} className="animate-spin" /> : <Wrench size={11} />}
        Repair all{count ? ` (${count})` : ""}
      </button>
      {result && <span className="text-[0.6rem]" style={{ color: "var(--hms-faint)" }}>{result}</span>}
    </span>
  );
}
