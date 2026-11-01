import { BookOpen, Filter, Search, ShieldAlert, Stethoscope } from "lucide-react";
import Link from "next/link";
import { Btn, Panel, Pill, SectionTitle, Stat } from "@/components/hms/ui";
import { requireHmsPage } from "@/lib/hms/auth";
import { digitsOf } from "@/lib/hms/format";
import { tx } from "@/lib/hms/i18n";
import { getLang } from "@/lib/hms/lang-server";
import {
  CATEGORY_LABEL,
  catalogueStats,
  categoryCounts,
  diseaseById,
  searchDiseases,
  type Disease,
} from "@/lib/hms/diseases";

export const dynamic = "force-dynamic";

type Search = { q?: string; cat?: string; id?: string };

export default async function DiseasesPage({ searchParams }: { searchParams: Promise<Search> }) {
  await requireHmsPage();
  const lang = await getLang();
  const tr = (en: string, fa: string) => tx(lang, en, fa);
  const sp = await searchParams;
  const q = (sp.q ?? "").trim();
  const cat = sp.cat ?? "";
  const stats = catalogueStats();
  const counts = categoryCounts();
  const results = searchDiseases(q, cat || undefined, 60);
  const selected: Disease | undefined = sp.id ? diseaseById(sp.id) : results[0];

  const href = (patch: Partial<Search>) => {
    const p = new URLSearchParams();
    const next = { q, cat, id: selected?.id, ...patch };
    if (next.q) p.set("q", next.q);
    if (next.cat) p.set("cat", next.cat);
    if (next.id) p.set("id", next.id);
    const s = p.toString();
    return `/hms/diseases${s ? `?${s}` : ""}`;
  };

  return (
    <div className="space-y-3.5">
      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
        <Stat label={tr("Conditions in the catalogue", "بیماری‌ها در کاتالوگ")} value={digitsOf(lang, stats.total)} hint={tr("Diagnosis, signs, treatment", "تشخیص، اعراض، تداوی")} tone="brand" icon={<BookOpen size={14} />} />
        <Stat label={tr("Clinical chapters", "فصل‌های بالینی")} value={digitsOf(lang, stats.categories)} hint={tr("Grouped by body system", "بر اساس سیستم بدن")} tone="info" icon={<Filter size={14} />} />
        <Stat label={tr("Seasonal illnesses", "امراض فصلی")} value={digitsOf(lang, stats.seasonal)} hint={tr("Heat, cold, dust, water", "گرما، سرما، گرد، آب")} tone="warn" icon={<Stethoscope size={14} />} />
        <Stat label={tr("With drug treatment", "با تداوی دوايي")} value={digitsOf(lang, stats.withDrugs)} hint={tr("Named medicines in each entry", "نام دوا در هر مدخل")} tone="good" icon={<ShieldAlert size={14} />} />
      </div>

      <Panel>
        <form action="/hms/diseases" method="get" className="flex flex-wrap items-end gap-2">
          <label className="flex min-w-[16rem] flex-1 flex-col gap-1">
            <span className="text-[11px] font-medium" style={{ color: "var(--hms-muted)" }}>
              {tr("Search by disease, symptom or ICD-10 code", "جست‌وجو با نام مرض، اعراض یا کد ICD-10")}
            </span>
            <div className="flex items-center gap-2 rounded-lg border px-2.5 py-1.5" style={{ borderColor: "var(--hms-border)", background: "var(--hms-surface-2)" }}>
              <Search size={14} style={{ color: "var(--hms-muted)" }} />
              <input
                name="q"
                defaultValue={q}
                placeholder={tr("e.g. fever, cough, diarrhoea, J18", "مثلاً تب، سرفه، اسهال، J18")}
                className="w-full bg-transparent text-sm outline-none"
                style={{ color: "var(--hms-ink)" }}
              />
            </div>
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-[11px] font-medium" style={{ color: "var(--hms-muted)" }}>{tr("Chapter", "فصل")}</span>
            <select name="cat" defaultValue={cat} className="rounded-lg border px-2.5 py-2 text-sm" style={{ borderColor: "var(--hms-border)", background: "var(--hms-surface-2)", color: "var(--hms-ink)" }}>
              <option value="">{tr("All chapters", "همهٔ فصل‌ها")}</option>
              {counts.map((c) => (
                <option key={c.category} value={c.category}>
                  {lang === "fa" ? CATEGORY_LABEL[c.category].fa : CATEGORY_LABEL[c.category].en} ({c.count})
                </option>
              ))}
            </select>
          </label>
          <Btn type="submit">{tr("Search", "جست‌وجو")}</Btn>
          {(q || cat) && (
            <Link href="/hms/diseases" className="text-xs underline" style={{ color: "var(--hms-muted)" }}>
              {tr("Clear", "پاک‌کردن")}
            </Link>
          )}
        </form>
      </Panel>

      <div className="grid gap-3.5 lg:grid-cols-[22rem_1fr]">
        <Panel>
          <SectionTitle
            title={tr("Results", "نتایج")}
            subtitle={tr(`${results.length} shown · ${stats.total} in total`, `${digitsOf(lang, results.length)} نمایش · ${digitsOf(lang, stats.total)} مجموع`)}
          />
          <ul className="mt-2 max-h-[32rem] space-y-1 overflow-auto pe-1">
            {results.map((d) => {
              const active = d.id === selected?.id;
              return (
                <li key={d.id}>
                  <Link
                    href={href({ id: d.id })}
                    className="block rounded-lg border px-2.5 py-2 text-sm transition"
                    style={{
                      borderColor: active ? "var(--hms-brand)" : "var(--hms-border)",
                      background: active ? "var(--hms-brand-soft)" : "var(--hms-surface-2)",
                    }}
                  >
                    <span className="block font-medium" style={{ color: "var(--hms-ink)" }}>
                      {lang === "fa" && d.nameFa ? d.nameFa : d.nameEn}
                    </span>
                    <span className="mt-0.5 flex flex-wrap items-center gap-1.5 text-[11px]" style={{ color: "var(--hms-muted)" }}>
                      <span className="font-mono">{d.icd10}</span>
                      <span>·</span>
                      <span>{lang === "fa" ? CATEGORY_LABEL[d.category].fa : CATEGORY_LABEL[d.category].en}</span>
                    </span>
                  </Link>
                </li>
              );
            })}
            {results.length === 0 && (
              <li className="rounded-lg border border-dashed px-3 py-6 text-center text-sm" style={{ borderColor: "var(--hms-border)", color: "var(--hms-muted)" }}>
                {tr("Nothing matched. Try a shorter word, or an English term.", "چیزی پیدا نشد. کلمهٔ کوتاه‌تر یا اصطلاح انگلیسی را امتحان کنید.")}
              </li>
            )}
          </ul>
        </Panel>

        {selected ? (
          <div className="space-y-3.5">
            <Panel>
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <h2 className="text-lg font-semibold" style={{ color: "var(--hms-ink)" }}>
                    {lang === "fa" && selected.nameFa ? selected.nameFa : selected.nameEn}
                  </h2>
                  <p className="mt-0.5 text-sm" style={{ color: "var(--hms-muted)" }} dir="ltr">
                    {selected.nameEn} · <span className="font-mono">{selected.icd10}</span>
                  </p>
                </div>
                <Pill tone="brand">{lang === "fa" ? CATEGORY_LABEL[selected.category].fa : CATEGORY_LABEL[selected.category].en}</Pill>
              </div>
              <p className="mt-2 rounded-lg border px-3 py-2 text-sm" style={{ borderColor: "var(--hms-border)", background: "var(--hms-surface-2)", color: "var(--hms-ink)" }} dir={lang === "fa" ? "rtl" : "ltr"}>
                {selected.fa}
              </p>
            </Panel>

            <div className="grid gap-3.5 md:grid-cols-3">
              <Panel>
                <SectionTitle title={tr("Signs & symptoms", "اعراض و علایم")} />
                <ul className="mt-2 space-y-1.5 text-sm" style={{ color: "var(--hms-ink)" }}>
                  {selected.symptoms.map((s, i) => (
                    <li key={i} className="flex gap-2">
                      <span style={{ color: "var(--hms-brand)" }}>•</span>
                      <span>{s}</span>
                    </li>
                  ))}
                </ul>
              </Panel>
              <Panel>
                <SectionTitle title={tr("Diagnosis", "تشخیص")} />
                <ul className="mt-2 space-y-1.5 text-sm" style={{ color: "var(--hms-ink)" }}>
                  {selected.diagnosis.map((s, i) => (
                    <li key={i} className="flex gap-2">
                      <span style={{ color: "var(--hms-brand)" }}>•</span>
                      <span>{s}</span>
                    </li>
                  ))}
                </ul>
              </Panel>
              <Panel>
                <SectionTitle title={tr("Treatment", "تداوی")} />
                <ul className="mt-2 space-y-1.5 text-sm" style={{ color: "var(--hms-ink)" }}>
                  {selected.treatment.map((s, i) => (
                    <li key={i} className="flex gap-2">
                      <span style={{ color: "var(--hms-brand)" }}>•</span>
                      <span>{s}</span>
                    </li>
                  ))}
                </ul>
              </Panel>
            </div>

            <Panel>
              <p className="text-xs leading-relaxed" style={{ color: "var(--hms-muted)" }}>
                {tr(
                  "Reference aid for clinicians. Doses are not printed here — the prescription screen, the paediatric dose calculator and the renal adjustment table own dosing. Confirm against national guidance before treating.",
                  "این تنها یک مرجع کمکی برای کلینسیسین‌ها است. دوز دوا اینجا نوشته نشده — دوزدهی در صفحهٔ نسخه، محاسبه‌گر دوز اطفال و جدول تنظیم کلیوی است. پیش از تداوی با رهنمود ملی مطابقت کنید."
                )}
              </p>
            </Panel>
          </div>
        ) : (
          <Panel>
            <p className="text-sm" style={{ color: "var(--hms-muted)" }}>
              {tr("Pick a condition on the left to see its signs, diagnosis and treatment.", "یک مرض را از سمت چپ انتخاب کنید تا اعراض، تشخیص و تداوی آن را ببینید.")}
            </p>
          </Panel>
        )}
      </div>
    </div>
  );
}
