import { KeyRound, ShieldCheck } from "lucide-react";
import { Panel, SectionTitle } from "@/components/hms/ui";
import { requireHmsPage } from "@/lib/hms/auth";
import { hmsReady } from "@/lib/hms/db";
import { licenseState, listSerials } from "@/lib/hms/license";
import { ActivateConsole } from "./console";
import { RevokeSerial } from "./revoke";

export const dynamic = "force-dynamic";

export default async function ActivatePage() {
  await requireHmsPage(["admin"]);
  await hmsReady();
  const state = licenseState();
  const serials = listSerials();

  return (
    <div className="space-y-3.5">
      <Panel>
        <SectionTitle
          title="Licence & activation"
          subtitle="This copy of Aybek HMS runs for 14 days as a trial. A serial number unlocks it permanently on this machine — no internet required."
          icon={<KeyRound size={14} />}
        />
        <ActivateConsole state={state} />
      </Panel>

      <div className="grid gap-3.5 xl:grid-cols-2">
        <Panel>
          <SectionTitle title="Issued serials" subtitle="Every serial generated for the hospital, newest first" icon={<ShieldCheck size={14} />} />
          <div className="mt-2 overflow-x-auto rounded-lg border" style={{ borderColor: "var(--hms-border)" }}>
            <table className="w-full">
              <thead style={{ background: "var(--hms-surface-2)" }}>
                <tr><th className="hms-th">Serial</th><th className="hms-th">Plan</th><th className="hms-th">Seats</th><th className="hms-th">Status</th><th className="hms-th">Issued</th><th className="hms-th text-right">Owner action</th></tr>
              </thead>
              <tbody>
                {serials.map((s) => (
                  <tr key={s.serial} className="hms-row">
                    <td className="hms-td font-mono text-[0.68rem]">{s.serial}</td>
                    <td className="hms-td text-[0.7rem] capitalize">{s.plan}</td>
                    <td className="hms-td text-[0.7rem]">{s.seats}</td>
                    <td className="hms-td text-[0.7rem] capitalize">{s.status}</td>
                    <td className="hms-td text-[0.68rem]">{new Date(s.issued_at).toLocaleDateString("en-GB")}</td>
                    <td className="hms-td text-right"><RevokeSerial serial={s.serial} status={s.status} /></td>
                  </tr>
                ))}
                {!serials.length && <tr><td className="hms-td text-[0.7rem]" colSpan={6}>No serials generated yet. Use “Generate serials” below — they belong to you, the licence owner.</td></tr>}
              </tbody>
            </table>
          </div>
        </Panel>
        <Panel>
          <SectionTitle title="How licensing protects the hospital" />
          <ul className="mt-2 space-y-1.5 text-[0.7rem] leading-relaxed" style={{ color: "var(--hms-muted)" }}>
            <li>• Each serial is self-verifying: the last group is a SHA-256 checksum, so a mistyped or invented serial is rejected instantly, offline.</li>
            <li>• A serial is bound to the machine on first activation; copying the database to another computer does not carry the licence.</li>
            <li>• You can issue as many department seats as your plan allows and revoke a serial from this page at any time.</li>
            <li>• If the trial expires, patient data is never deleted — the hospital simply becomes read-only until activation.</li>
          </ul>
        </Panel>
      </div>
    </div>
  );
}
