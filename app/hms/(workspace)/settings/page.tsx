import { Settings } from "lucide-react";
import { Panel, SectionTitle } from "@/components/hms/ui";
import { requireHmsPage } from "@/lib/hms/auth";
import { getSettings, hmsReady } from "@/lib/hms/db";
import { APP_THEMES, RX_TEMPLATES } from "@/lib/hms/templates";
import { GUIDE } from "@/lib/hms/guide";
import { SettingsWorkspace } from "./workspace";

export const dynamic = "force-dynamic";

export default async function SettingsPage({ searchParams }: { searchParams: Promise<{ section?: string }> }) {
  await requireHmsPage(["admin"]);
  await hmsReady();
  const sp = await searchParams;
  const settings = getSettings();

  return (
    <Panel className="!p-0">
      <div className="p-3.5">
        <SectionTitle
          title="Smart settings"
          subtitle="Every number, word and colour in the hospital can be changed here — and each section ships with its own step-by-step guidance."
          icon={<Settings size={14} />}
        />
      </div>
      <SettingsWorkspace
        settings={settings}
        initial={sp.section ?? "identity"}
        themes={APP_THEMES.map((t) => ({ id: t.id, name: t.name, note: t.note, bg: t.bg, surface: t.surface, brand: t.brand, preview: t.preview }))}
        templates={RX_TEMPLATES.map((t) => ({ id: t.id, name: t.name, mood: t.mood, accent: t.accent, paper: t.paper, ink: t.ink }))}
        guidance={GUIDE.map((g) => ({ id: g.id, title: g.title, summary: g.summary, steps: g.steps.map((s) => ({ where: s.where, action: s.action, tip: s.tip })) }))}
      />
    </Panel>
  );
}
