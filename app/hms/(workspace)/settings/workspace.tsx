"use client";

import {
  Building2, CheckCircle2, ChevronRight, CreditCard, KeyRound, Layers, Loader2, Palette, Save, ShieldCheck,
  Sparkles, Stethoscope, X,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useTx } from "@/components/hms/lang-provider";
import { useMemo, useState } from "react";
import { Pill } from "@/components/hms/ui";

type Values = Record<string, unknown>;
type Theme = { id: string; name: string; note: string; bg: string; surface: string; brand: string; preview: string };
type Tpl = { id: number; name: string; mood: string; accent: string; paper: string; ink: string };
type Guidance = { id: string; title: string; summary: string; steps: { where: string; action: string; tip?: string }[] };

type Field = {
  key: string;
  label: string;
  type: "text" | "number" | "bool" | "textarea" | "select" | "color";
  hint?: string;
  options?: string[];
  wide?: boolean;
};


/* Persian labels kept next to the English ones, keyed by the stable field key so a
   missing translation falls back to English instead of breaking the screen. */
const SECTION_FA: Record<string, [string, string]> = {
  identity: ["Hospital identity", "هویت شفاخانه"],
  clinical: ["Clinical rules", "قواعد کلینیکی"],
  billing: ["Fees & billing", "فیس و حساب"],
  alerts: ["Monitor & alarms", "مانیتور و هشدارها"],
  modules: ["Departments", "دیپارتمنت‌ها"],
  theme: ["Look & print", "ظاهر و چاپ"],
};

const BLURB_FA: Record<string, string> = {
  identity: "نام شفاخانه، نشان و شهر را عوض کنید — همهٔ صفحه‌ها، چاپ‌ها و رسیدها فوراً تغییر می‌کنند.",
  clinical: "این قواعد تصمیم می‌گیرند سیستم هنگام معاینه، نسخه و نتیجه چه چیزی را الزامی بداند.",
  billing: "مبلغ معاینه، شب‌بستری، مالیات و روش‌های پرداخت را همین‌جا تعیین کنید.",
  alerts: "مانیتور سلامت هر ۳۰ دقیقه اسکن می‌کند؛ اینجا تعیین کنید چه وقت هشدار بدهد و چه وقت خودش تعمیر کند.",
  modules: "یک بخش را خاموش کنید تا برای همه از منو پنهان شود — برای کلینیک کوچکی که اتاق عملیات ندارد مفید است.",
  theme: "تم سیستم و کاغذ پیش‌فرض نسخه را انتخاب کنید. همهٔ ده طرح برای اسناد تکی در دسترس می‌مانند.",
};

const FIELD_FA: Record<string, string> = {
  name: "نام رسمی شفاخانه",
  name_short: "نام کوتاه",
  name_local: "نام به زبان محلی",
  tagline: "شعار",
  license_no: "شمارهٔ جواز وزارت",
  tax_id: "شمارهٔ مالیاتی",
  phone: "تلفن اصلی",
  emergency: "خط عاجل",
  email: "ایمیل",
  website: "وبسایت",
  address: "آدرس",
  city: "شهر",
  country: "کشور",
  timezone: "منطقهٔ زمانی",
  currency: "واحد پول",
  logo_mark: "نشان لوگو",
  footer_note: "پانوشت اسناد",
  language: "زبان پیش‌فرض نشست‌های جدید",
  default_template: "طرح پیش‌فرض نسخه (۱–۱۰)",
  rx_prefix: "پیشوند شمارهٔ نسخه",
  max_rx_items: "حداکثر اقلام در هر نسخه",
  follow_up_days: "فاصلهٔ پیش‌فرض پیگیری (روز)",
  lab_turnaround_hours: "هدف زمان پاسخ لابراتوار (ساعت)",
  imaging_turnaround_hours: "هدف زمان پاسخ تصویربرداری (ساعت)",
  require_signature: "امضای داکتر پیش از تحویل دوا الزامی است",
  show_icd10: "نمایش کد ICD-10 روی نسخه",
  vitals_required: "ثبت علایم حیاتی برای هر معاینه الزامی است",
  drug_interaction_check: "بررسی تداخل دوا اجرا شود",
  consultation_fee: "فیس معاینهٔ جدید",
  followup_fee: "فیس معاینهٔ پیگیری",
  bed_daily_rate: "فیس هر شب بستر",
  tax_rate: "نرخ مالیات (٪)",
  lab_markup: "افزودهٔ لابراتوار (٪)",
  imaging_markup: "افزودهٔ تصویربرداری (٪)",
  invoice_prefix: "پیشوند بل",
  accept_cash: "پذیرش پول نقد",
  accept_card: "پذیرش کارت",
  accept_insurance: "پذیرش بیمه",
  enabled: "مانیتورینگ فعال",
  interval_minutes: "فاصلهٔ اسکن (دقیقه)",
  escalation_hours: "تعمیر خودکار پس از (ساعت)",
  sound: "صدای هشدار در محیط کار",
  auto_heal: "اجازهٔ تعمیر خودکار",
  quiet_from: "شروع ساعت آرام",
  quiet_to: "پایان ساعت آرام",
  opd: "معاینات و مشوره",
  pharmacy: "دواخانه و موجودی",
  laboratory: "لابراتوار",
  radiology: "اکسری و تصویربرداری",
  inpatient: "بستر و بستری",
  surgery: "اتاق عملیات و جراحی",
  billing: "حساب و بل",
  ai: "دستیار و تحلیل",
};

const HINT_FA: Record<string, string> = {
  name: "روی هر نسخه، سرنامه و بل دیده می‌شود.",
  name_local: "زیر لوگو، راست‌به‌چپ نمایش داده می‌شود.",
  timezone: "نام IANA، مثلاً Asia/Kabul.",
  footer_note: "در پایین هر نسخه چاپ می‌شود.",
  language: "انگلیسی یا دری. هر شخص می‌تواند از سرصفحه زبان را عوض کند.",
  lab_turnaround_hours: "مانیتور با این مقدار هشدار نتیجهٔ معوق می‌دهد.",
  interval_minutes: "۳۰ دقیقه پیش‌فرض بالینی توصیه‌شده است.",
  escalation_hours: "۴۸ ساعت به هر دیپارتمنت دو روز کاری کامل فرصت می‌دهد.",
};

const SECTIONS: { id: string; label: string; icon: typeof Building2; blurb: string; guide: string; fields: Field[] }[] = [
  {
    id: "identity",
    label: "Hospital identity",
    icon: Building2,
    blurb: "Rename the hospital, swap the logo mark or move it to another city — every screen, printout and receipt follows instantly.",
    guide: "settings",
    fields: [
      { key: "name", label: "Legal hospital name", type: "text", wide: true, hint: "Appears on every prescription, letterhead and invoice." },
      { key: "name_short", label: "Short name", type: "text" },
      { key: "name_local", label: "Local-language name", type: "text", hint: "Shown under the logo, right-to-left." },
      { key: "tagline", label: "Tagline", type: "text", wide: true },
      { key: "license_no", label: "Ministry licence number", type: "text" },
      { key: "tax_id", label: "Tax / TIN", type: "text" },
      { key: "phone", label: "Main phone", type: "text" },
      { key: "emergency", label: "Emergency line", type: "text" },
      { key: "email", label: "Email", type: "text" },
      { key: "website", label: "Website", type: "text" },
      { key: "address", label: "Street address", type: "text", wide: true },
      { key: "city", label: "City", type: "text" },
      { key: "country", label: "Country", type: "text" },
      { key: "timezone", label: "Time zone", type: "text", hint: "IANA name, e.g. Asia/Kabul." },
      { key: "currency", label: "Currency code", type: "text" },
      { key: "logo_mark", label: "Logo mark", type: "select", options: ["cross", "monogram", "shield", "pulse"] },
      { key: "footer_note", label: "Document footer", type: "textarea", wide: true, hint: "Printed at the bottom of every prescription." },
      { key: "language", label: "Default language for new sessions", type: "select", options: ["en", "fa"], hint: "English or Dari. Every person can still switch language from the header." },
    ],
  },
  {
    id: "clinical",
    label: "Clinical rules",
    icon: Stethoscope,
    blurb: "Defaults for prescribing, triage and turnaround targets. Safety screening can never be fully disabled — it only changes how loudly it warns.",
    guide: "first-shift",
    fields: [
      { key: "default_template", label: "Default prescription design (1–10)", type: "number" },
      { key: "rx_prefix", label: "Prescription number prefix", type: "text" },
      { key: "max_rx_items", label: "Maximum items per prescription", type: "number" },
      { key: "follow_up_days", label: "Default follow-up interval (days)", type: "number" },
      { key: "lab_turnaround_hours", label: "Lab target turnaround (hours)", type: "number", hint: "Used by the monitor to raise overdue-result alarms." },
      { key: "imaging_turnaround_hours", label: "Imaging target turnaround (hours)", type: "number" },
      { key: "require_signature", label: "Require a physician signature before dispensing", type: "bool" },
      { key: "show_icd10", label: "Show ICD-10 codes on prescriptions", type: "bool" },
      { key: "vitals_required", label: "Vitals required for every consult", type: "bool" },
      { key: "drug_interaction_check", label: "Run the drug interaction screen", type: "bool" },
    ],
  },
  {
    id: "billing",
    label: "Fees & billing",
    icon: CreditCard,
    blurb: "Prices used by the invoice builder and the bed-day calculator. Changing a tariff never rewrites invoices already issued.",
    guide: "pharmacy",
    fields: [
      { key: "consultation_fee", label: "New consultation fee", type: "number" },
      { key: "followup_fee", label: "Follow-up fee", type: "number" },
      { key: "bed_daily_rate", label: "Bed charge per night", type: "number" },
      { key: "tax_rate", label: "Tax rate (%)", type: "number" },
      { key: "lab_markup", label: "Laboratory markup (%)", type: "number" },
      { key: "imaging_markup", label: "Imaging markup (%)", type: "number" },
      { key: "invoice_prefix", label: "Invoice prefix", type: "text" },
      { key: "accept_cash", label: "Accept cash", type: "bool" },
      { key: "accept_card", label: "Accept card", type: "bool" },
      { key: "accept_insurance", label: "Accept insurance", type: "bool" },
    ],
  },
  {
    id: "alerts",
    label: "Monitor & alarms",
    icon: ShieldCheck,
    blurb: "How often the monitor scans, when it is allowed to make a sound and how long it waits before repairing a problem on its own.",
    guide: "alerts",
    fields: [
      { key: "enabled", label: "Monitoring enabled", type: "bool" },
      { key: "interval_minutes", label: "Scan interval (minutes)", type: "number", hint: "30 minutes is the recommended clinical default." },
      { key: "escalation_hours", label: "Auto-repair after (hours)", type: "number", hint: "48 hours gives every department a full two working days to respond." },
      { key: "sound", label: "Audible alarm in the workspace", type: "bool" },
      { key: "auto_heal", label: "Allow automatic repair", type: "bool" },
      { key: "quiet_from", label: "Quiet hours start", type: "text" },
      { key: "quiet_to", label: "Quiet hours end", type: "text" },
    ],
  },
  {
    id: "modules",
    label: "Departments",
    icon: Layers,
    blurb: "Turn a module off to hide it from the navigation for everyone — useful in a small clinic that does not run a theatre.",
    guide: "settings",
    fields: [
      { key: "opd", label: "OPD & consultations", type: "bool" },
      { key: "pharmacy", label: "Pharmacy & stock", type: "bool" },
      { key: "laboratory", label: "Laboratory", type: "bool" },
      { key: "radiology", label: "Radiology & imaging", type: "bool" },
      { key: "inpatient", label: "Inpatients & beds", type: "bool" },
      { key: "surgery", label: "Theatre & surgery", type: "bool" },
      { key: "billing", label: "Billing", type: "bool" },
      { key: "ai", label: "Assistant & insights", type: "bool" },
    ],
  },
];

export function SettingsWorkspace({
  settings,
  initial,
  themes,
  templates,
  guidance,
}: {
  settings: Record<string, Values>;
  initial: string;
  themes: Theme[];
  templates: Tpl[];
  guidance: Guidance[];
}) {
  const router = useRouter();
  const tx = useTx();
  const [section, setSection] = useState(initial);
  const [draft, setDraft] = useState<Record<string, Values>>(settings);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ tone: "ok" | "bad"; text: string } | null>(null);
  const [guideOpen, setGuideOpen] = useState(true);

  const current = SECTIONS.find((s) => s.id === section);
  const values = draft[section] ?? {};
  const dirty = useMemo(() => {
    for (const f of current?.fields ?? []) {
      if (String(draft[section]?.[f.key] ?? "") !== String(settings[section]?.[f.key] ?? "")) return true;
    }
    if (section === "theme") return String(draft.theme?.active) !== String(settings.theme?.active) || String(draft.theme?.rx_template) !== String(settings.theme?.rx_template) || String(draft.theme?.accent) !== String(settings.theme?.accent);
    return false;
  }, [draft, settings, section, current]);

  const chapter = guidance.find((g) => g.id === current?.guide) ?? guidance[0];

  async function save(payload?: Values) {
    setBusy(true);
    setMsg(null);
    const body = { section, values: payload ?? buildPayload(section, values, current?.fields ?? []) };
    const res = await fetch("/api/hms/settings", { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
    const data = await res.json();
    setBusy(false);
    if (!res.ok) setMsg({ tone: "bad", text: data.error ?? tx("Could not save.", "ذخیره نشد.") });
    else {
      setMsg({ tone: "ok", text: tx("Saved. Every screen in the hospital has been updated.", "ذخیره شد. همهٔ صفحه‌های شفاخانه به‌روز شدند.") });
      router.refresh();
    }
  }

  function set(key: string, value: unknown) {
    setDraft((d) => ({ ...d, [section]: { ...(d[section] ?? {}), [key]: value } }));
  }

  return (
    <div className="grid lg:grid-cols-[15rem_1fr]">
      <nav className="border-b p-2 lg:border-b-0 lg:border-r" style={{ borderColor: "var(--hms-border)" }}>
        {[...SECTIONS, { id: "theme", label: "Look & print", icon: Palette, blurb: "", guide: "settings", fields: [] }].map((s) => (
          <button key={s.id} onClick={() => setSection(s.id)} data-active={section === s.id} className="hms-nav w-full">
            <s.icon size={14} /> <span className="flex-1 text-left">{tx(s.label, SECTION_FA[s.id]?.[1] ?? s.label)}</span>
            <ChevronRight size={12} style={{ opacity: section === s.id ? 1 : 0.3 }} />
          </button>
        ))}
        <div className="mt-3 space-y-1 px-1">
          <a href="/hms/activate" className="hms-nav w-full text-[0.72rem]"><KeyRound size={13} /> {tx("Licence & serials", "لایسنس و سریال‌ها")}</a>
          <a href="/hms/guide" className="hms-nav w-full text-[0.72rem]"><Sparkles size={13} /> {tx("Full playbook", "راهنمای کامل")}</a>
        </div>
      </nav>

      <div className="p-3.5">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <h3 className="text-[0.92rem] font-semibold tracking-[-0.01em]">{current ? tx(current.label, SECTION_FA[current.id]?.[1] ?? current.label) : tx("Look & print", "ظاهر و چاپ")}</h3>
            <p className="mt-0.5 max-w-xl text-[0.7rem] leading-relaxed" style={{ color: "var(--hms-muted)" }}>
              {current ? tx(current.blurb, BLURB_FA[current.id] ?? current.blurb) : tx("Choose the interface theme and the default prescription paper. All ten papers stay available for individual documents.", BLURB_FA.theme)}
            </p>
          </div>
          <Pill tone="brand">{section === "theme" ? tx("Live preview", "پیش‌نمایش زنده") : tx("{n} settings", "{n} تنظیم", { n: String((current?.fields ?? []).length) })}</Pill>
        </div>

        {msg && (
          <p className="mt-2 flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[0.7rem]" style={{ background: msg.tone === "ok" ? "color-mix(in srgb,#10b981 12%, transparent)" : "color-mix(in srgb,#ef4444 12%, transparent)", color: msg.tone === "ok" ? "#0b6b4d" : "#991b1b" }}>
            {msg.tone === "ok" ? <CheckCircle2 size={12} /> : <X size={12} />} {msg.text}
            <button className="ml-auto" onClick={() => setMsg(null)}><X size={11} /></button>
          </p>
        )}

        {section === "theme" ? (
          <div className="mt-3 space-y-4">
            <div>
              <p className="hms-label">{tx("Interface theme", "تم سیستم")}</p>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-5">
                {themes.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => setDraft((d) => ({ ...d, theme: { ...(d.theme ?? {}), active: t.id } }))}
                    className="rounded-lg border p-2 text-left transition hover:-translate-y-px"
                    style={{
                      borderColor: String(draft.theme?.active) === t.id ? "var(--hms-brand)" : "var(--hms-border)",
                      boxShadow: String(draft.theme?.active) === t.id ? "0 0 0 3px color-mix(in srgb, var(--hms-brand) 14%, transparent)" : undefined,
                    }}
                  >
                    <div className="flex h-9 items-center gap-1 rounded px-1.5" style={{ background: t.bg }}>
                      <span className="h-4 w-4 rounded-sm" style={{ background: t.brand }} />
                      <span className="h-3 flex-1 rounded-sm" style={{ background: t.surface }} />
                    </div>
                    <p className="mt-1.5 truncate text-[0.7rem] font-semibold">{t.name}</p>
                    <p className="line-clamp-2 text-[0.58rem] leading-tight" style={{ color: "var(--hms-faint)" }}>{t.note}</p>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <p className="hms-label">{tx("Accent colour", "رنگ اصلی")}</p>
              <div className="flex flex-wrap items-center gap-1.5">
                {["#0ea5a4", "#0e9488", "#2563eb", "#b91c1c", "#7c3aed", "#0f9d6e", "#f59e0b", "#111827"].map((c) => (
                  <button
                    key={c}
                    onClick={() => setDraft((d) => ({ ...d, theme: { ...(d.theme ?? {}), accent: c } }))}
                    className="h-7 w-7 rounded-full border-2"
                    style={{ background: c, borderColor: String(draft.theme?.accent) === c ? "var(--hms-ink)" : "transparent" }}
                    title={c}
                  />
                ))}
                <input
                  type="color"
                  value={String(draft.theme?.accent ?? "#0ea5a4")}
                  onChange={(e) => setDraft((d) => ({ ...d, theme: { ...(d.theme ?? {}), accent: e.target.value } }))}
                  className="h-7 w-10 cursor-pointer rounded border-0 bg-transparent"
                />
              </div>
            </div>

            <div>
              <p className="hms-label">{tx("Default prescription paper", "کاغذ پیش‌فرض نسخه")}</p>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-5">
                {templates.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => setDraft((d) => ({ ...d, theme: { ...(d.theme ?? {}), rx_template: t.id } }))}
                    className="rounded-lg border p-2 text-left transition hover:-translate-y-px"
                    style={{ borderColor: Number(draft.theme?.rx_template) === t.id ? "var(--hms-brand)" : "var(--hms-border)" }}
                  >
                    <div className="h-10 rounded" style={{ background: t.paper, borderLeft: `4px solid ${t.accent}` }}>
                      <div className="p-1">
                        <div className="h-1 w-8 rounded" style={{ background: t.ink, opacity: 0.7 }} />
                        <div className="mt-1 h-0.5 w-full rounded" style={{ background: t.accent, opacity: 0.5 }} />
                        <div className="mt-0.5 h-0.5 w-2/3 rounded" style={{ background: t.ink, opacity: 0.25 }} />
                      </div>
                    </div>
                    <p className="mt-1.5 truncate text-[0.68rem] font-semibold">{t.id}. {t.name}</p>
                    <p className="truncate text-[0.56rem]" style={{ color: "var(--hms-faint)" }}>{t.mood}</p>
                  </button>
                ))}
              </div>
            </div>

            <div className="flex justify-end">
              <button className="hms-btn hms-btn-primary" onClick={() => save({ active: draft.theme?.active, rx_template: draft.theme?.rx_template, accent: draft.theme?.accent })} disabled={busy || !dirty}>
                {busy ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />} {tx("Apply theme", "اعمال تم")}
              </button>
            </div>
          </div>
        ) : (
          <>
            <div className="mt-3 grid gap-2.5 sm:grid-cols-2">
              {(current?.fields ?? []).map((f) => (
                <label key={f.key} className={f.wide ? "sm:col-span-2" : ""}>
                  <span className="hms-label">{tx(f.label, FIELD_FA[f.key] ?? f.label)}</span>
                  {f.type === "bool" ? (
                    <button
                      type="button"
                      onClick={() => set(f.key, !values[f.key])}
                      className="flex h-[2.15rem] w-full items-center justify-between rounded-md border px-2.5 text-[0.74rem]"
                      style={{ borderColor: "var(--hms-border)", background: "var(--hms-surface)" }}
                    >
                      <span style={{ color: values[f.key] ? "var(--hms-brand-ink)" : "var(--hms-muted)" }}>{values[f.key] ? tx("Enabled", "فعال") : tx("Disabled", "غیرفعال")}</span>
                      <span className="relative h-4 w-8 rounded-full transition" style={{ background: values[f.key] ? "var(--hms-brand)" : "var(--hms-surface-3)" }}>
                        <span className="absolute top-0.5 h-3 w-3 rounded-full bg-white transition-all" style={{ left: values[f.key] ? "1.05rem" : "0.15rem" }} />
                      </span>
                    </button>
                  ) : f.type === "select" ? (
                    <select className="hms-input" value={String(values[f.key] ?? "")} onChange={(e) => set(f.key, e.target.value)}>
                      {(f.options ?? []).map((o) => <option key={o} value={o}>{o}</option>)}
                    </select>
                  ) : f.type === "textarea" ? (
                    <textarea className="hms-input" rows={2} value={String(values[f.key] ?? "")} onChange={(e) => set(f.key, e.target.value)} />
                  ) : (
                    <input
                      className="hms-input"
                      type={f.type === "number" ? "number" : "text"}
                      value={String(values[f.key] ?? "")}
                      onChange={(e) => set(f.key, f.type === "number" ? Number(e.target.value) : e.target.value)}
                    />
                  )}
                  {f.hint && <span className="mt-0.5 block text-[0.6rem]" style={{ color: "var(--hms-faint)" }}>{tx(f.hint, HINT_FA[f.key] ?? f.hint)}</span>}
                </label>
              ))}
            </div>

            <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
              <p className="text-[0.64rem]" style={{ color: "var(--hms-faint)" }}>
                {dirty ? tx("Unsaved changes — press save when you are happy.", "تغییرات ذخیره‌نشده — وقتی مطمئن شدید ذخیره کنید.") : tx("Everything on this page is already saved.", "همه چیز در این صفحه ذخیره شده است.")}
              </p>
              <div className="flex gap-1.5">
                <button className="hms-btn" onClick={() => setDraft((d) => ({ ...d, [section]: settings[section] ?? {} }))} disabled={!dirty}>{tx("Revert", "برگشت")}</button>
                <button className="hms-btn hms-btn-primary" onClick={() => save()} disabled={busy || !dirty}>
                  {busy ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />} {tx("Save", "ذخیره")} {current ? tx(current.label.toLowerCase(), (SECTION_FA[current.id]?.[1] ?? current.label)) : ""}
                </button>
              </div>
            </div>
          </>
        )}

        {/* inline guidance */}
        <div className="mt-4 rounded-lg border" style={{ borderColor: "var(--hms-border)" }}>
          <button className="flex w-full items-center gap-1.5 px-2.5 py-2 text-left" onClick={() => setGuideOpen((o) => !o)}>
            <Sparkles size={13} style={{ color: "var(--hms-brand)" }} />
            <span className="text-[0.74rem] font-semibold">{tx("Guidance for this section", "راهنمای این بخش")}</span>
            <span className="ml-auto text-[0.62rem]" style={{ color: "var(--hms-faint)" }}>{guideOpen ? tx("Hide", "پنهان") : tx("Show", "نمایش")}</span>
          </button>
          {guideOpen && (
            <div className="border-t px-2.5 py-2" style={{ borderColor: "var(--hms-border)" }}>
              <p className="text-[0.68rem] font-medium">{chapter.title}</p>
              <p className="mt-0.5 text-[0.64rem]" style={{ color: "var(--hms-muted)" }}>{chapter.summary}</p>
              <ol className="mt-1.5 space-y-1">
                {chapter.steps.slice(0, 4).map((s, i) => (
                  <li key={i} className="flex gap-1.5 text-[0.64rem] leading-relaxed">
                    <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-[0.56rem] font-bold" style={{ background: "var(--hms-brand-soft)", color: "var(--hms-brand-ink)" }}>{i + 1}</span>
                    <span>
                      <b>{s.where}</b> — {s.action}
                      {s.tip && <span className="block" style={{ color: "var(--hms-faint)" }}>{tx("Tip:", "نکته:")} {s.tip}</span>}
                    </span>
                  </li>
                ))}
              </ol>
              <a href="/hms/guide" className="mt-1.5 inline-flex items-center gap-0.5 text-[0.64rem] font-semibold" style={{ color: "var(--hms-brand)" }}>
                {tx("Open the full chapter", "باز کردن فصل کامل")} <ChevronRight size={10} />
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function buildPayload(section: string, values: Values, fields: Field[]): Values {
  const out: Values = {};
  for (const f of fields) {
    const v = values[f.key];
    if (v === undefined) continue;
    out[f.key] = f.type === "number" ? Number(v) : v;
  }
  return out;
}
