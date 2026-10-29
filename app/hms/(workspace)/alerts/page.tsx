import { AlarmClock, ShieldCheck, Siren, Wrench } from "lucide-react";
import { AlertList, ScanButton } from "@/components/hms/alert-list";
import { Panel, SectionTitle, Ring, Status } from "@/components/hms/ui";
import { relTime } from "@/lib/hms/format";
import { requireHmsPage } from "@/lib/hms/auth";
import { hmsReady } from "@/lib/hms/db";
import { allAlerts, healthSummary, openAlerts, scan } from "@/lib/hms/alerts";
import { HealAll } from "./heal-all";

export const dynamic = "force-dynamic";

export default async function AlertsPage() {
  await requireHmsPage();
  await hmsReady();
  const open = openAlerts();
  const history = allAlerts(60);
  const health = healthSummary();
  const findings = scan();
  const closed = history.filter((h) => h.status === "resolved");
  const fixable = open.filter((a) => a.auto_fixable).length;

  return (
    <div className="space-y-3.5">
      <div className="grid gap-3.5 lg:grid-cols-[1fr_1.6fr]">
        <Panel className="flex items-center gap-4">
          <Ring value={health.score} size={78} label="health" />
          <div className="min-w-0">
            <p className="text-[0.95rem] font-semibold capitalize">System is {health.status}</p>
            <p className="text-[0.68rem]" style={{ color: "var(--hms-muted)" }}>
              {health.open} open · {health.critical} critical · {health.warning} warning{findingLine(findings.length)}
            </p>
            <p className="mt-1 text-[0.62rem]" style={{ color: "var(--hms-faint)" }}>
              Last scan {health.lastScan ? relTime(health.lastScan) : "never"} · alarms repeat every 30 minutes
            </p>
            <div className="mt-2 flex gap-1.5">
              <ScanButton />
              <HealAll count={fixable} />
            </div>
          </div>
        </Panel>

        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
          {[
            { icon: Siren, k: "Critical", v: health.critical, note: "Immediate action" },
            { icon: Wrench, k: "Auto-fixable", v: fixable, note: "One tap repair" },
            { icon: AlarmClock, k: "Open", v: open.length, note: "On the board" },
            { icon: ShieldCheck, k: "Resolved", v: closed.length, note: "With audit note" },
          ].map((s) => (
            <div key={s.k} className="hms-card flex flex-col justify-between p-3">
              <s.icon size={15} style={{ color: "var(--hms-brand)" }} />
              <div>
                <p className="mt-2 text-[1.2rem] font-semibold leading-none">{s.v}</p>
                <p className="text-[0.62rem] font-medium">{s.k}</p>
                <p className="text-[0.58rem]" style={{ color: "var(--hms-faint)" }}>{s.note}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="grid gap-3.5 xl:grid-cols-[1.25fr_1fr]">
        <Panel>
          <SectionTitle
            title="Open alarms"
            subtitle="Every alarm names the department, explains why it fired and, where possible, repairs itself."
            icon={<Siren size={14} />}
          />
          <div className="mt-2.5"><AlertList alerts={open} /></div>
        </Panel>

        <div className="space-y-3.5">
          <Panel>
            <SectionTitle title="How escalation works" subtitle="Automatic, documented, and reversible by you" icon={<AlarmClock size={14} />} />
            <ol className="mt-2 space-y-1.5">
              {[
                ["0 min", "The scan compares every table against the hospital's rules (orphans, duplicates, bed conflicts, expiry, unsigned prescriptions, overdue results)."],
                ["0 min", "The responsible department and the central console are notified. Critical alarms play an audible chime in the workspace."],
                ["48 h", "If nobody acknowledges or resolves the alarm, the monitor applies the best repair it knows: reassign the record, quarantine expired stock, void the duplicate, or escalate to the medical director."],
                ["After repair", "The action is written to the audit trail with the exact change, so any decision can be reviewed later."],
              ].map(([when, what]) => (
                <li key={when} className="flex gap-2">
                  <span className="mt-0.5 h-fit shrink-0 rounded px-1.5 py-0.5 text-[0.58rem] font-bold" style={{ background: "var(--hms-brand-soft)", color: "var(--hms-brand-ink)" }}>{when}</span>
                  <span className="text-[0.68rem] leading-relaxed" style={{ color: "var(--hms-muted)" }}>{what}</span>
                </li>
              ))}
            </ol>
          </Panel>

          <Panel>
            <SectionTitle title="Repair & resolution log" subtitle="Newest first — the permanent record of what changed" />
            <div className="mt-2 max-h-[22rem] space-y-1.5 overflow-y-auto pr-0.5">
              {history.map((h) => (
                <div key={h.id} className="rounded-md border px-2 py-1.5" style={{ borderColor: "var(--hms-border)" }}>
                  <div className="flex items-center gap-1.5">
                    <Status value={h.status} />
                    <p className="min-w-0 flex-1 truncate text-[0.7rem] font-medium">{h.title}</p>
                    <span className="shrink-0 text-[0.58rem]" style={{ color: "var(--hms-faint)" }}>{relTime(h.last_seen)}</span>
                  </div>
                  {h.resolution && <p className="mt-0.5 text-[0.63rem]" style={{ color: "var(--hms-muted)" }}>{h.resolution}</p>}
                </div>
              ))}
            </div>
          </Panel>
        </div>
      </div>
    </div>
  );
}

function findingLine(n: number) {
  return n ? ` · ${n} finding(s) in the latest scan` : "";
}
