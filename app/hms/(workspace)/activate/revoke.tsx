"use client";

import { Ban, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useTx } from "@/components/hms/lang-provider";
import { send } from "@/lib/hms/client";

export function RevokeSerial({ serial, status }: { serial: string; status: string }) {
  const router = useRouter();
  const tx = useTx();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);

  if (status === "revoked") {
    return <span className="text-[0.64rem]" style={{ color: "var(--hms-faint)" }}>{tx("revoked", "لغوشده")}</span>;
  }

  if (!confirming) {
    return (
      <button
        className="hms-btn hms-btn-sm hms-btn-ghost"
        title={tx("Revoke this serial", "لغو این سریال")}
        onClick={() => setConfirming(true)}
      >
        <Ban size={10} /> {tx("Revoke", "لغو")}
      </button>
    );
  }

  if (error) {
    return <span className="text-[0.62rem]" style={{ color: "#b91c1c" }}>{error}</span>;
  }

  return (
    <span className="flex items-center gap-1">
      <button
        className="hms-btn hms-btn-sm"
        style={{ color: "#b91c1c", borderColor: "#fca5a5" }}
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          const res = await send("/api/hms/license", "POST", { action: "revoke", serial });
          setBusy(false);
          if (!res.ok) {
            setError(res.error);
            return;
          }
          setConfirming(false);
          router.refresh();
        }}
      >
        {busy ? <Loader2 size={10} className="animate-spin" /> : <Ban size={10} />} {tx("Confirm", "تأیید")}
      </button>
      <button className="hms-btn hms-btn-sm hms-btn-ghost" onClick={() => setConfirming(false)}>{tx("No", "نه")}</button>
    </span>
  );
}
