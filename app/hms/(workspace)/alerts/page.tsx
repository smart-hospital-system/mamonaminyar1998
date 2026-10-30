import { AlarmClock, ShieldCheck, Siren, Wrench } from "lucide-react";
import { AlertList, ScanButton } from "@/components/hms/alert-list";
import { Panel, SectionTitle, Ring, Status } from "@/components/hms/ui";
import { digitsOf, relTime } from "@/lib/hms/format";
import { statusText, t, tx } from "@/lib/hms/i18n";
import { getLang } from "@/lib/hms/lang-server";
import { requireHmsPage } from "@/lib/hms/auth";
import { hmsReady } from "@/lib/hms/db";
import { allAlerts, healthSummary, openAlerts, scan } from "@/lib/hms/alerts";
import { HealAll } from "./heal-all";

export const dynamic = "force-dynamic";

export default async function AlertsPage() {
  await requireHmsPage();
  await hmsReady();
  const lang = await getLang();
  const tr = (en: string, fa: string, vars?: Record<string, string | number>) => tx(lang, en, fa, vars);
  const tk = (key: string, vars?: Record<string, string | number>) => t(lang, key, vars);
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
          <Ring value={health.score} size={78} label={tr("health", "سلامت")} />
          <div className="min-w-0">
            <p className="text-[0.95rem] font-semibold">{tr("System is", "وضعیت سیستم:")} {statusText(lang, health.status)}</p>
            <p className="text-[0.68rem]" style={{ color: "var(--hms-muted)" }}>
              {tr("{o} open · {c} critical · {w} warning", "{o} باز · {c} بحرانی · {w} هشدار", { o: digitsOf(lang, health.open), c: digitsOf(lang, health.critical), w: digitsOf(lang, health.warning) })}{findingLine(findings.length, lang)}
            </p>
            <p className="mt-1 text-[0.62rem]" style={{ color: "var(--hms-faint)" }}>
              {tr("Last scan {when} · alarms repeat every 30 minutes", "آخرین اسکن {when} · هشدارها هر ۳۰ دقیقه تکرار می‌شوند", { when: health.lastScan ? relTime(health.lastScan, lang) : tr("never", "هرگز") })}
            </p>
            <div className="mt-2 flex gap-1.5">
              <ScanButton />
              <HealAll count={fixable} />
            </div>
          </div>
        </Panel>

        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
          {[
            { icon: Siren, k: tr("Critical", "بحرانی"), v: health.critical, note: tr("Immediate action", "اقدام فوری") },
            { icon: Wrench, k: tr("Auto-fixable", "قابل تعمیر خودکار"), v: fixable, note: tr("One tap repair", "تعمیر با یک کلیک") },
            { icon: AlarmClock, k: tr("Open", "باز"), v: open.length, note: tr("On the board", "در فهرست") },
            { icon: ShieldCheck, k: tr("Resolved", "حل‌شده"), v: closed.length, note: tr("With audit note", "با یادداشت حسابرسی") },
          ].map((s) => (
            <div key={s.k} className="hms-card flex flex-col justify-between p-3">
              <s.icon size={15} style={{ color: "var(--hms-brand)" }} />
              <div>
                <p className="mt-2 text-[1.2rem] font-semibold leading-none">{digitsOf(lang, s.v)}</p>
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
            title={tr("Open alarms", "هشدارهای باز")}
            subtitle={tr("Every alarm names the department, explains why it fired and, where possible, repairs itself.", "هر هشدار دیپارتمنت را نام می‌برد، دلیل برخاستن آن را توضیح می‌دهد و در صورت امکان خود را تعمیر می‌کند.")}
            icon={<Siren size={14} />}
          />
          <div className="mt-2.5"><AlertList alerts={open} /></div>
        </Panel>

        <div className="space-y-3.5">
          <Panel>
            <SectionTitle title={tr("How escalation works", "نحوهٔ ارتقای هشدار")} subtitle={tr("Automatic, documented, and reversible by you", "خودکار، مستند و قابل برگشت توسط شما")} icon={<AlarmClock size={14} />} />
            <ol className="mt-2 space-y-1.5">
              {[
                [tr("0 min", "۰ دقیقه"), tr("The scan compares every table against the hospital's rules (orphans, duplicates, bed conflicts, expiry, unsigned prescriptions, overdue results).", "اسکن هر جدول را با قواعد شفاخانه مقایسه می‌کند (رکوردهای بی‌صاحب، تکراری‌ها، تضاد بستر، تاریخ‌گذشته، نسخه‌های امضانشده، نتایج معوق).")],
                [tr("0 min", "۰ دقیقه"), tr("The responsible department and the central console are notified. Critical alarms play an audible chime in the workspace.", "دیپارتمنت مسئول و کنسول مرکزی اطلاع می‌یابند. هشدارهای بحرانی در محیط کار صدای اخطار می‌دهند.")],
                [tr("48 h", "۴۸ ساعت"), tr("If nobody acknowledges or resolves the alarm, the monitor applies the best repair it knows: reassign the record, quarantine expired stock, void the duplicate, or escalate to the medical director.", "اگر کسی هشدار را تأیید یا حل نکند، مانیتور بهترین تعمیر ممکن را انجام می‌دهد: بازتخصیص رکورد، قرنطینهٔ دواهای تاریخ‌گذشته، باطل کردن تکراری یا ارجاع به رئیس طبی.")],
                [tr("After repair", "پس از تعمیر"), tr("The action is written to the audit trail with the exact change, so any decision can be reviewed later.", "اقدام با تغییر دقیق در سابقهٔ حسابرسی نوشته می‌شود تا هر تصمیم بعداً قابل بازبینی باشد.")],
              ].map(([when, what]) => (
                <li key={when} className="flex gap-2">
                  <span className="mt-0.5 h-fit shrink-0 rounded px-1.5 py-0.5 text-[0.58rem] font-bold" style={{ background: "var(--hms-brand-soft)", color: "var(--hms-brand-ink)" }}>{when}</span>
                  <span className="text-[0.68rem] leading-relaxed" style={{ color: "var(--hms-muted)" }}>{what}</span>
                </li>
              ))}
            </ol>
          </Panel>

          <Panel>
            <SectionTitle title={tr("Repair & resolution log", "سابقهٔ تعمیر و حل")} subtitle={tr("Newest first — the permanent record of what changed", "جدیدترین اول — سابقهٔ دائمی تغییرات")} />
            <div className="mt-2 max-h-[22rem] space-y-1.5 overflow-y-auto pr-0.5">
              {history.map((h) => (
                <div key={h.id} className="rounded-md border px-2 py-1.5" style={{ borderColor: "var(--hms-border)" }}>
                  <div className="flex items-center gap-1.5">
                    <Status value={h.status} />
                    <p className="min-w-0 flex-1 truncate text-[0.7rem] font-medium">{h.title}</p>
                    <span className="shrink-0 text-[0.58rem]" style={{ color: "var(--hms-faint)" }}>{relTime(h.last_seen, lang)}</span>
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

function findingLine(n: number, lang: "en" | "fa") {
  if (!n) return "";
  return lang === "fa" ? ` · ${digitsOf(lang, n)} مورد در آخرین اسکن` : ` · ${n} finding(s) in the latest scan`;
}
