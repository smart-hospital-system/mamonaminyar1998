"use client";

import { Ban, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function RevokeSerial({ serial, status }: { serial: string; status: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [confirming, setConfirming] = useState(false);

  if (status === "revoked") {
    return <span className="text-[0.64rem]" style={{ color: "var(--hms-faint)" }}>revoked</span>;
  }

  if (!confirming) {
    return (
      <button
        className="hms-btn hms-btn-sm hms-btn-ghost"
        title="Revoke this serial"
        onClick={() => setConfirming(true)}
      >
        <Ban size={10} /> Revoke
      </button>
    );
  }

  return (
    <span className="flex items-center gap-1">
      <button
        className="hms-btn hms-btn-sm"
        style={{ color: "#b91c1c", borderColor: "#fca5a5" }}
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          await fetch("/api/hms/license", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ action: "revoke", serial }),
          });
          setBusy(false);
          setConfirming(false);
          router.refresh();
        }}
      >
        {busy ? <Loader2 size={10} className="animate-spin" /> : <Ban size={10} />} Confirm
      </button>
      <button className="hms-btn hms-btn-sm hms-btn-ghost" onClick={() => setConfirming(false)}>No</button>
    </span>
  );
}
