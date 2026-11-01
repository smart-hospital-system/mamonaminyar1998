import { Sparkles } from "lucide-react";
import { requireHmsPage } from "@/lib/hms/auth";
import { answer, suggestions } from "@/lib/hms/ask";
import { hmsReady } from "@/lib/hms/db";
import { getLang } from "@/lib/hms/lang-server";
import { tx } from "@/lib/hms/i18n";
import { AskPanel } from "./panel";

export const dynamic = "force-dynamic";

export default async function AskPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  await requireHmsPage();
  await hmsReady();
  const lang = await getLang();
  const tr = (en: string, fa: string) => tx(lang, en, fa);
  const sp = await searchParams;
  const q = (sp.q ?? "").trim();
  const initial = q ? { q, a: answer(q, lang) } : null;

  return (
    <div className="mx-auto max-w-4xl space-y-3">
      <p className="sr-only">
        <Sparkles /> {tr("Ask Aybek — questions answered from the hospital's own records.", "از ایبک بپرسید — جواب‌ها از سوابق خود شفاخانه.")}
      </p>
      <AskPanel initial={initial} suggestions={suggestions(lang)} />
    </div>
  );
}
