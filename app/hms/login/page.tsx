import { Cross, ShieldCheck, Stethoscope, HeartPulse, Scissors, Pill } from "lucide-react";
import { redirect } from "next/navigation";
import { getHmsUser } from "@/lib/hms/auth";
import { getSection, hmsReady } from "@/lib/hms/db";
import { licenseState } from "@/lib/hms/license";
import { LoginForm } from "./login-form";

export const dynamic = "force-dynamic";

export default async function HmsLoginPage() {
  const existing = await getHmsUser();
  if (existing) redirect("/hms");
  hmsReady();
  const identity = getSection<Record<string, unknown>>("identity");
  const lic = licenseState();

  const name = String(identity.name ?? "Aybek Ten-Bed Specialy Surgical Hospital");
  const local = String(identity.name_local ?? "شفاخانه ده بستر جراحی ایبک");
  const tagline = String(identity.tagline ?? "Ten beds. One standard: surgical precision with human warmth.");

  return (
    <div className="hms-root grid min-h-screen lg:grid-cols-[1.15fr_1fr]">
      {/* brand side */}
      <div
        className="relative hidden flex-col justify-between overflow-hidden p-10 lg:flex"
        style={{ background: "linear-gradient(160deg,#062b31 0%,#0b4a4f 45%,#0e9488 100%)", color: "#eafaf7" }}
      >
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.16]"
          style={{
            backgroundImage:
              "radial-gradient(circle at 18% 22%, #7ff5e3 0, transparent 42%), radial-gradient(circle at 82% 76%, #8be9fd 0, transparent 38%)",
          }}
        />
        <div className="relative">
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/12 ring-1 ring-white/25 backdrop-blur">
              <Cross size={20} />
            </span>
            <div>
              <p className="text-[0.95rem] font-semibold leading-tight">{name}</p>
              <p className="text-[0.7rem] opacity-70" dir="rtl">{local}</p>
            </div>
          </div>

          <h1 className="mt-14 max-w-md text-[2.1rem] font-semibold leading-[1.12] tracking-[-0.03em]">
            Every bed, every result, every signature — in one calm workspace.
          </h1>
          <p className="mt-3 max-w-md text-[0.85rem] leading-relaxed opacity-80">{tagline}</p>

          <div className="mt-9 grid max-w-md grid-cols-2 gap-2.5">
            {[
              { icon: Stethoscope, t: "OPD & consults", d: "Triage, vitals, e-prescribing" },
              { icon: Pill, t: "Pharmacy", d: "Stock, expiry, dispensing" },
              { icon: HeartPulse, t: "Inpatients", d: "Live ten-bed board" },
              { icon: Scissors, t: "Theatre", d: "Lists, notes, recovery" },
            ].map((f) => (
              <div key={f.t} className="rounded-xl bg-white/8 p-3 ring-1 ring-white/15 backdrop-blur-sm">
                <f.icon size={15} className="opacity-90" />
                <p className="mt-1.5 text-[0.76rem] font-semibold">{f.t}</p>
                <p className="text-[0.66rem] opacity-70">{f.d}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="relative flex items-center gap-2 text-[0.68rem] opacity-70">
          <ShieldCheck size={13} />
          Works fully offline · licence {lic.status} · data stays on this machine
        </div>
      </div>

      {/* form side */}
      <div className="flex items-center justify-center px-5 py-10" style={{ background: "var(--surface-2)" }}>
        <LoginForm hospital={name} local={local} plan={lic.plan} status={lic.status} daysLeft={lic.daysLeft} />
      </div>
    </div>
  );
}
