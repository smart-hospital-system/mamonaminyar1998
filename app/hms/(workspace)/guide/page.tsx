import { BookOpen, Clock, HelpCircle, Sparkles } from "lucide-react";
import { Panel, SectionTitle } from "@/components/hms/ui";
import { requireHmsPage } from "@/lib/hms/auth";
import { hmsReady } from "@/lib/hms/db";
import { GUIDE, QUICK_ANSWERS } from "@/lib/hms/guide";
import { tx } from "@/lib/hms/i18n";
import { getLang } from "@/lib/hms/lang-server";
import { GuideBrowser } from "./browser";

export const dynamic = "force-dynamic";

export default async function GuidePage({ searchParams }: { searchParams: Promise<{ chapter?: string }> }) {
  await requireHmsPage();
  await hmsReady();
  const lang = await getLang();
  const tr = (en: string, fa: string, vars?: Record<string, string | number>) => tx(lang, en, fa, vars);
  const sp = await searchParams;
  const totalMinutes = GUIDE.reduce((a, g) => a + g.minutes, 0);

  return (
    <div className="space-y-3.5">
      <Panel>
        <SectionTitle
          title={tr("The Aybek playbook", "راهنمای جامع ایبک")}
          subtitle={tr("{n} chapters · {m} minutes end to end · written for the person at the keyboard, not for a developer", "{n} فصل · {m} دقیقه از اول تا آخر · برای کسی که پشت کیبورد می‌نشیند نوشته شده، نه برای یک برنامه‌نویس", { n: GUIDE.length, m: totalMinutes })}
          icon={<BookOpen size={14} />}
          action={<span className="hms-pill" style={{ background: "var(--hms-brand-soft)", color: "var(--hms-brand-ink)" }}><Clock size={10} /> {totalMinutes} min</span>}
        />
      </Panel>

      <div
        className="flex flex-wrap items-start gap-2 rounded-lg border px-3 py-2 text-[0.7rem]"
        style={{ borderColor: "var(--hms-border)", background: "var(--hms-surface-2)", color: "var(--hms-muted)" }}
      >
        <span className="font-semibold" style={{ color: "var(--hms-ink)" }}>
          {tr("Chapter text is in English", "متن فصل‌ها انگلیسی است")}
        </span>
        <span className="min-w-0 flex-1">
          {tr(
            "The chapters below are the technical steps used by whoever installs and maintains the machine. The full Persian handbook — written for you as the owner — is the file RAHNAMA-FA.html in the DOCS folder of the delivery disc, and it prints on A4.",
            "فصل‌های زیر همان گام‌های تخنیکی است که نصب‌کننده و مسئول سیستم از آن استفاده می‌کند. راهنمای کامل فارسی — نوشته‌شده برای شما به‌عنوان مالک — فایل RAHNAMA-FA.html در پوشهٔ DOCS دیسک تحویل است و روی A4 چاپ می‌شود."
          )}
        </span>
      </div>

      <div className="grid gap-3.5 xl:grid-cols-[1.6fr_1fr]">
        <Panel>
          <GuideBrowser chapters={GUIDE.map((g) => ({ id: g.id, title: g.title, audience: g.audience, summary: g.summary, minutes: g.minutes, steps: g.steps, faq: g.faq ?? [] }))} initial={sp.chapter ?? GUIDE[0].id} />
        </Panel>
        <div className="space-y-3.5">
          <Panel>
            <SectionTitle title={tr("Instant answers", "پاسخ‌های فوری")} subtitle={tr("The eight questions asked most often at the counter", "هشت سوالی که بیشتر از همه در کانتر پرسیده می‌شود")} icon={<HelpCircle size={14} />} />
            <div className="mt-2 space-y-1.5">
              {QUICK_ANSWERS.map((q) => (
                <details key={q.q} className="rounded-lg border px-2 py-1.5" style={{ borderColor: "var(--hms-border)" }}>
                  <summary className="cursor-pointer text-[0.72rem] font-medium">{q.q}</summary>
                  <p className="mt-1 text-[0.66rem] leading-relaxed" style={{ color: "var(--hms-muted)" }}>{q.a}</p>
                </details>
              ))}
            </div>
          </Panel>
          <Panel>
            <SectionTitle title={tr("Where guidance lives", "راهنما کجاست")} subtitle={tr("Help is never more than one click away", "کمک هیچ‌وقت بیشتر از یک کلیک دور نیست")} icon={<Sparkles size={14} />} />
            <ul className="mt-2 space-y-1.5 text-[0.68rem]" style={{ color: "var(--hms-muted)" }}>
              <li>• <b>{tr("Settings", "تنظیمات")}</b> — {tr("every section carries its own short guide with the exact steps.", "هر بخش راهنمای کوتاه خود را با گام‌های دقیق دارد.")}</li>
              <li>• <b>{tr("Every page header", "سرصفحهٔ هر صفحه")}</b> — {tr("the subtitle tells you what the screen is for.", "زیرعنوان می‌گوید این صفحه برای چه کاری است.")}</li>
              <li>• <b>{tr("Forms", "فورم‌ها")}</b> — {tr("hints under each field explain the safe choice.", "راهنمای زیر هر خانه انتخاب مطمئن را توضیح می‌دهد.")}</li>
              <li>• <b>{tr("Alarms", "هشدارها")}</b> — {tr("each alarm states the cause, the department and the repair.", "هر هشدار علت، دیپارتمنت و راه تعمیر را می‌گوید.")}</li>
              <li>• <b>{tr("Offline folder", "پوشهٔ آفلاین")}</b> — {tr("the same chapters ship as a printable PDF and text file.", "همین فصل‌ها به‌صورت PDF و فایل متنی قابل چاپ همراه دیسک است.")}</li>
            </ul>
          </Panel>
        </div>
      </div>
    </div>
  );
}
