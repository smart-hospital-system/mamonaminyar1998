import { BookOpen, Clock, HelpCircle, Sparkles } from "lucide-react";
import { Panel, SectionTitle } from "@/components/hms/ui";
import { requireHmsPage } from "@/lib/hms/auth";
import { hmsReady } from "@/lib/hms/db";
import { GUIDE, QUICK_ANSWERS } from "@/lib/hms/guide";
import { GuideBrowser } from "./browser";

export const dynamic = "force-dynamic";

export default async function GuidePage({ searchParams }: { searchParams: Promise<{ chapter?: string }> }) {
  await requireHmsPage();
  await hmsReady();
  const sp = await searchParams;
  const totalMinutes = GUIDE.reduce((a, g) => a + g.minutes, 0);

  return (
    <div className="space-y-3.5">
      <Panel>
        <SectionTitle
          title="The Aybek playbook"
          subtitle={`${GUIDE.length} chapters · ${totalMinutes} minutes end to end · written for the person at the keyboard, not for a developer`}
          icon={<BookOpen size={14} />}
          action={<span className="hms-pill" style={{ background: "var(--hms-brand-soft)", color: "var(--hms-brand-ink)" }}><Clock size={10} /> {totalMinutes} min</span>}
        />
      </Panel>

      <div className="grid gap-3.5 xl:grid-cols-[1.6fr_1fr]">
        <Panel>
          <GuideBrowser chapters={GUIDE.map((g) => ({ id: g.id, title: g.title, audience: g.audience, summary: g.summary, minutes: g.minutes, steps: g.steps, faq: g.faq ?? [] }))} initial={sp.chapter ?? GUIDE[0].id} />
        </Panel>
        <div className="space-y-3.5">
          <Panel>
            <SectionTitle title="Instant answers" subtitle="The eight questions asked most often at the counter" icon={<HelpCircle size={14} />} />
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
            <SectionTitle title="Where guidance lives" subtitle="Help is never more than one click away" icon={<Sparkles size={14} />} />
            <ul className="mt-2 space-y-1.5 text-[0.68rem]" style={{ color: "var(--hms-muted)" }}>
              <li>• <b>Settings</b> — every section carries its own short guide with the exact steps.</li>
              <li>• <b>Every page header</b> — the subtitle tells you what the screen is for.</li>
              <li>• <b>Forms</b> — hints under each field explain the safe choice.</li>
              <li>• <b>Alarms</b> — each alarm states the cause, the department and the repair.</li>
              <li>• <b>Offline folder</b> — the same chapters ship as a printable PDF and text file.</li>
            </ul>
          </Panel>
        </div>
      </div>
    </div>
  );
}
