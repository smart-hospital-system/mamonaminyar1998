import { Activity, BarChart3, FlaskConical, TrendingUp } from "lucide-react";
import { AreaLine, Bars, Donut, LoadBar } from "@/components/hms/charts";
import { Panel, SectionTitle, Stat } from "@/components/hms/ui";
import { digitsOf, money, timeShort } from "@/lib/hms/format";
import { tx } from "@/lib/hms/i18n";
import { getLang } from "@/lib/hms/lang-server";
import { requireHmsPage } from "@/lib/hms/auth";
import { hmsReady } from "@/lib/hms/db";
import { departmentLoad, forecastOpd, noShowRisk, parseLabResult, insights } from "@/lib/hms/ai";
import { healthSummary } from "@/lib/hms/alerts";
import { departmentMix, hmsKpis, listLabOrders, prescriptionMix, revenueSeries, topDiagnoses, listEncounters } from "@/lib/hms/queries";

export const dynamic = "force-dynamic";

export default async function AnalyticsPage() {
  await requireHmsPage(["admin", "doctor"]);
  await hmsReady();
  const lang = await getLang();
  const tr = (en: string, fa: string, vars?: Record<string, string | number>) => tx(lang, en, fa, vars);
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
        <Stat label={tr("Month to date", "از آغاز ماه")} value={money(kpis.revenueMonth, lang)} hint={tr("{amount} today", "{amount} امروز", { amount: money(kpis.revenueToday, lang) })} tone="good" icon={<TrendingUp size={14} />} />
        <Stat label={tr("Lab turnaround", "زمان پاسخ لابراتوار")} value={tr("{h}h", "{h} ساعت", { h: digitsOf(lang, tat.toFixed(1)) })} hint={tr("{n} flagged value(s)", "{n} مقدار علامت‌خورده", { n: digitsOf(lang, flagged) })} tone={tat > 24 ? "warn" : "good"} icon={<FlaskConical size={14} />} />
        <Stat label={tr("Consults per patient", "معاینه به ازای هر مریض")} value={digitsOf(lang, avgVisits)} hint={tr("{n} documented", "{n} ثبت‌شده", { n: digitsOf(lang, completed) })} tone="brand" icon={<BarChart3 size={14} />} />
        <Stat label={tr("System health", "سلامت سیستم")} value={tr("{pct}%", "{pct}%", { pct: digitsOf(lang, health.score) })} hint={tr("{n} open alarm(s)", "{n} هشدار باز", { n: digitsOf(lang, health.open) })} tone={health.score > 80 ? "good" : "warn"} icon={<Activity size={14} />} />
      </div>

      <Panel>
        <SectionTitle title={tr("Revenue, last 30 days", "درآمد ۳۰ روز گذشته")} subtitle={tr("Paid amount per day; the shape shows collection rhythm, not billing volume", "مبلغ پرداخت‌شده در هر روز؛ این نمودار آهنگ وصول را نشان می‌دهد نه حجم بل")} icon={<TrendingUp size={14} />} />
        <div className="mt-3"><AreaLine data={revenue.map((r) => ({ label: r.label.split(" ")[0], value: r.revenue }))} height={170} format="money" /></div>
      </Panel>

      <div className="grid gap-3.5 xl:grid-cols-3">
        <Panel>
          <SectionTitle title={tr("Patient mix by department", "ترکیب مریضان بر اساس دیپارتمنت")} subtitle={tr("Appointments booked, all time", "وقت‌های ثبت‌شده، از آغاز")} />
          <div className="mt-3"><Donut data={mix.map((m) => ({ label: m.department, value: m.n }))} center={{ top: digitsOf(lang, mix.reduce((a, b) => a + b.n, 0)), bottom: tr("visits", "مراجعه") }} /></div>
        </Panel>
        <Panel>
          <SectionTitle title={tr("Top diagnoses", "تشخیص‌های شایع")} subtitle={tr("From documented consults", "از معاینات ثبت‌شده")} />
          <div className="mt-2 space-y-1.5">
            {diagnoses.map((d) => (
              <div key={d.diagnosis}>
                <div className="flex justify-between text-[0.68rem]"><span className="truncate">{d.diagnosis}</span><span style={{ color: "var(--hms-faint)" }}>{digitsOf(lang, d.n)}</span></div>
                <LoadBar label="" value={d.n} max={diagnoses[0]?.n ?? 1} />
              </div>
            ))}
          </div>
        </Panel>
        <Panel>
          <SectionTitle title={tr("Most prescribed drugs", "دواهای پرنسخه")} subtitle={tr("Items across all prescriptions", "اقلام در همهٔ نسخه‌ها")} />
          <div className="mt-2 space-y-1.5">
            {rxMix.map((m) => (
              <div key={m.drug}>
                <div className="flex justify-between text-[0.68rem]"><span className="truncate">{m.drug}</span><span style={{ color: "var(--hms-faint)" }}>{digitsOf(lang, m.n)}</span></div>
                <LoadBar label="" value={m.n} max={rxMix[0]?.n ?? 1} />
              </div>
            ))}
          </div>
        </Panel>
      </div>

      <div className="grid gap-3.5 xl:grid-cols-[1.3fr_1fr]">
        <Panel>
          <SectionTitle title={tr("Demand forecast", "پیش‌بینی تقاضا")} subtitle={tr("Seasonal-naive model on eight weeks of clinic data", "مدل فصلی ساده بر پایهٔ هشت هفته دادهٔ کلینیک")} icon={<BarChart3 size={14} />} />
          <div className="mt-3">
            <Bars data={forecast.points.map((p) => ({ label: p.weekday.slice(0, 3), value: p.visits, hint: tr("{pct}% of capacity", "{pct}% ظرفیت", { pct: digitsOf(lang, p.demandPct) }) }))} height={150} />
          </div>
          <p className="mt-2 text-[0.7rem]" style={{ color: "var(--hms-muted)" }}>
            {tr("Average {avg} visits per clinic day, busiest on {day}.", "میانگین {avg} مراجعه در هر روز — شلوغ‌ترین روز {day}.", { avg: digitsOf(lang, forecast.avg), day: forecast.busiest })}
            {forecast.trend !== 0 ? (forecast.trend > 0 ? tr(" Demand trending up.", " روند تقاضا رو به افزایش است.") : tr(" Demand trending down.", " روند تقاضا رو به کاهش است.")) : tr(" Demand is stable.", " تقاضا ثابت است.")}
          </p>
        </Panel>
        <Panel>
          <SectionTitle title={tr("Department load", "بار دیپارتمنت‌ها")} subtitle={tr("Backlog and label used by the monitor", "عقب‌ماندگی و برچسبی که مانیتور می‌بیند")} />
          <div className="mt-3 space-y-2">
            {load.map((d) => (
              <LoadBar key={d.department} label={d.department} value={d.backlog} max={Math.max(12, ...load.map((x) => x.backlog))} hint={tr("{label} · {n} this week", "{label} · {n} در این هفته", { label: d.label, n: digitsOf(lang, d.week) })} />
            ))}
          </div>
        </Panel>
      </div>

      <div className="grid gap-3.5 xl:grid-cols-2">
        <Panel>
          <SectionTitle title={tr("Attendance risk", "خطر نیامدن")} subtitle={tr("Upcoming appointments most likely to be missed", "وقت‌های آیندهٔ که احتمال نیامدن‌شان بیشتر است")} />
          <div className="mt-2 overflow-x-auto">
            <table className="w-full">
              <thead><tr><th className="hms-th">{tr("Patient", "مریض")}</th><th className="hms-th">{tr("When", "وقت")}</th><th className="hms-th">{tr("Department", "دیپارتمنت")}</th><th className="hms-th">{tr("Risk", "خطر")}</th></tr></thead>
              <tbody>
                {risky.map((r) => (
                  <tr key={r.id} className="hms-row">
                    <td className="hms-td">{r.name}</td>
                    <td className="hms-td whitespace-nowrap text-[0.68rem]">{timeShort(r.start_at, lang)}</td>
                    <td className="hms-td">{r.department}</td>
                    <td className="hms-td font-semibold" style={{ color: r.risk > 60 ? "#b91c1c" : r.risk > 35 ? "#b45309" : "#0b7a58" }}>{digitsOf(lang, r.risk)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>
        <Panel>
          <SectionTitle title={tr("Quality signals", "نشانه‌های کیفیت")} subtitle={tr("What the assistant would change this week", "چیزهایی که دستیار این هفته تغییر می‌داد")} />
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
