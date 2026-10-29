import { Activity, BarChart3, FlaskConical, TrendingUp } from "lucide-react";
import { AreaLine, Bars, Donut, LoadBar } from "@/components/hms/charts";
import { Panel, SectionTitle, Stat } from "@/components/hms/ui";
import { money } from "@/lib/hms/format";
import { requireHmsPage } from "@/lib/hms/auth";
import { hmsReady } from "@/lib/hms/db";
import { departmentLoad, forecastOpd, noShowRisk, parseLabResult, insights } from "@/lib/hms/ai";
import { healthSummary } from "@/lib/hms/alerts";
import { departmentMix, hmsKpis, listLabOrders, prescriptionMix, revenueSeries, topDiagnoses, listEncounters } from "@/lib/hms/queries";

export const dynamic = "force-dynamic";

export default async function AnalyticsPage() {
  await requireHmsPage(["admin", "doctor"]);
  await hmsReady();
  const kpis = hmsKpis();
  const revenue = revenueSeries(30);
  const mix = departmentMix();
  const diagnoses = topDiagnoses(8);
  const rxMix = prescriptionMix();
  const load = departmentLoad();
  const forecast = forecastOpd(14);
  const health = healthSummary();
  const labs = listLabOrders();
  const encounters = listEncounters(200);
  const risky = noShowRisk(8);
  const ideas = insights();

  const verified = labs.filter((l) => l.status === "verified" && l.completed_at && l.created_at);
  const tat = verified.length
    ? verified.reduce((a, l) => a + (new Date(l.completed_at as string).getTime() - new Date(l.created_at).getTime()) / 36e5, 0) / verified.length
    : 0;
  const flagged = labs.flatMap((l) => (l.result ? parseLabResult(l.result) : [])).filter((f) => f.flag !== "normal").length;
  const completed = encounters.filter((e) => e.status === "closed").length;
  const avgVisits = kpis.patients ? (encounters.length / kpis.patients).toFixed(1) : "0";

  return (
    <div className="space-y-3.5">
      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
        <Stat label="Month to date" value={money(kpis.revenueMonth)} hint={`${money(kpis.revenueToday)} today`} tone="good" icon={<TrendingUp size={14} />} />
        <Stat label="Lab turnaround" value={`${tat.toFixed(1)}h`} hint={`${flagged} flagged value(s)`} tone={tat > 24 ? "warn" : "good"} icon={<FlaskConical size={14} />} />
        <Stat label="Consults per patient" value={avgVisits} hint={`${completed} documented`} tone="brand" icon={<BarChart3 size={14} />} />
        <Stat label="System health" value={`${health.score}%`} hint={`${health.open} open alarm(s)`} tone={health.score > 80 ? "good" : "warn"} icon={<Activity size={14} />} />
      </div>

      <Panel>
        <SectionTitle title="Revenue, last 30 days" subtitle="Paid amount per day; the shape shows collection rhythm, not billing volume" icon={<TrendingUp size={14} />} />
        <div className="mt-3"><AreaLine data={revenue.map((r) => ({ label: r.label.split(" ")[0], value: r.revenue }))} height={170} format="money" /></div>
      </Panel>

      <div className="grid gap-3.5 xl:grid-cols-3">
        <Panel>
          <SectionTitle title="Patient mix by department" subtitle="Appointments booked, all time" />
          <div className="mt-3"><Donut data={mix.map((m) => ({ label: m.department, value: m.n }))} center={{ top: String(mix.reduce((a, b) => a + b.n, 0)), bottom: "visits" }} /></div>
        </Panel>
        <Panel>
          <SectionTitle title="Top diagnoses" subtitle="From documented consults" />
          <div className="mt-2 space-y-1.5">
            {diagnoses.map((d) => (
              <div key={d.diagnosis}>
                <div className="flex justify-between text-[0.68rem]"><span className="truncate">{d.diagnosis}</span><span style={{ color: "var(--hms-faint)" }}>{d.n}</span></div>
                <LoadBar label="" value={d.n} max={diagnoses[0]?.n ?? 1} />
              </div>
            ))}
          </div>
        </Panel>
        <Panel>
          <SectionTitle title="Most prescribed drugs" subtitle="Items across all prescriptions" />
          <div className="mt-2 space-y-1.5">
            {rxMix.map((m) => (
              <div key={m.drug}>
                <div className="flex justify-between text-[0.68rem]"><span className="truncate">{m.drug}</span><span style={{ color: "var(--hms-faint)" }}>{m.n}</span></div>
                <LoadBar label="" value={m.n} max={rxMix[0]?.n ?? 1} />
              </div>
            ))}
          </div>
        </Panel>
      </div>

      <div className="grid gap-3.5 xl:grid-cols-[1.3fr_1fr]">
        <Panel>
          <SectionTitle title="Demand forecast" subtitle="Seasonal-naive model on eight weeks of clinic data" icon={<BarChart3 size={14} />} />
          <div className="mt-3">
            <Bars data={forecast.points.map((p) => ({ label: p.weekday.slice(0, 3), value: p.visits, hint: `${p.demandPct}% of capacity` }))} height={150} />
          </div>
          <p className="mt-2 text-[0.7rem]" style={{ color: "var(--hms-muted)" }}>
            Average <b>{forecast.avg}</b> visits per clinic day, busiest on <b>{forecast.busiest}</b>.
            {forecast.trend !== 0 ? ` Demand trending ${forecast.trend > 0 ? "up" : "down"}.` : " Demand is stable."}
          </p>
        </Panel>
        <Panel>
          <SectionTitle title="Department load" subtitle="Backlog and label used by the monitor" />
          <div className="mt-3 space-y-2">
            {load.map((d) => (
              <LoadBar key={d.department} label={d.department} value={d.backlog} max={Math.max(12, ...load.map((x) => x.backlog))} hint={`${d.label} · ${d.week} this week`} />
            ))}
          </div>
        </Panel>
      </div>

      <div className="grid gap-3.5 xl:grid-cols-2">
        <Panel>
          <SectionTitle title="Attendance risk" subtitle="Upcoming appointments most likely to be missed" />
          <div className="mt-2 overflow-x-auto">
            <table className="w-full">
              <thead><tr><th className="hms-th">Patient</th><th className="hms-th">When</th><th className="hms-th">Department</th><th className="hms-th">Risk</th></tr></thead>
              <tbody>
                {risky.map((r) => (
                  <tr key={r.id} className="hms-row">
                    <td className="hms-td">{r.name}</td>
                    <td className="hms-td whitespace-nowrap text-[0.68rem]">{new Date(r.start_at).toLocaleString("en-GB", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}</td>
                    <td className="hms-td">{r.department}</td>
                    <td className="hms-td font-semibold" style={{ color: r.risk > 60 ? "#b91c1c" : r.risk > 35 ? "#b45309" : "#0b7a58" }}>{r.risk}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>
        <Panel>
          <SectionTitle title="Quality signals" subtitle="What the assistant would change this week" />
          <div className="mt-2 space-y-1.5">
            {ideas.map((i) => (
              <div key={i.id} className="rounded-lg border p-2" style={{ borderColor: "var(--hms-border)" }}>
                <p className="text-[0.72rem] font-semibold">{i.title}</p>
                <p className="mt-0.5 text-[0.66rem] leading-snug" style={{ color: "var(--hms-muted)" }}>{i.detail}</p>
                <p className="mt-1 text-[0.6rem] font-semibold uppercase tracking-wide" style={{ color: "var(--hms-brand)" }}>{i.impact}</p>
              </div>
            ))}
          </div>
        </Panel>
      </div>
    </div>
  );
}
