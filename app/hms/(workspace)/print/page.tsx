import { ExternalLink, FileText, Printer, Sparkles } from "lucide-react";
import Link from "next/link";
import { DocumentSheet } from "@/components/hms/doc-sheet";
import { RxSheet } from "@/components/hms/rx-sheet";
import { Panel, SectionTitle } from "@/components/hms/ui";
import { requireHmsPage } from "@/lib/hms/auth";
import { tx } from "@/lib/hms/i18n";
import { getLang } from "@/lib/hms/lang-server";
import { getSection, hmsReady } from "@/lib/hms/db";
import { listPrescriptions } from "@/lib/hms/queries";
import { DOC_TEMPLATES, RX_TEMPLATES } from "@/lib/hms/templates";

export const dynamic = "force-dynamic";

const SAMPLE_ITEMS = [
  { drug: "Amoxicillin-clavulanate", strength: "625 mg", form: "Tablet", dosage: "1 tablet", frequency: "Three times daily", duration: "7 days", instructions: "After food", qty: 21 },
  { drug: "Paracetamol", strength: "1 g", form: "Tablet", dosage: "1 tablet", frequency: "Up to 4× daily", duration: "5 days", instructions: "For pain or fever", qty: 20 },
  { drug: "Omeprazole", strength: "20 mg", form: "Capsule", dosage: "1 capsule", frequency: "Once daily", duration: "14 days", instructions: "30 min before breakfast", qty: 14 },
];

export default async function PrintStudio({ searchParams }: { searchParams: Promise<{ template?: string }> }) {
  await requireHmsPage();
  await hmsReady();
  const lang = await getLang();
  const tr = (en: string, fa: string) => tx(lang, en, fa);
  const sp = await searchParams;
  const identity = getSection<Record<string, unknown>>("identity");
  const theme = getSection<Record<string, unknown>>("theme");
  const rx = listPrescriptions({ limit: 1 })[0];
  const activeTemplate = Number(sp.template ?? theme.rx_template ?? 1);

  const ident = {
    name: String(identity.name),
    name_short: String(identity.name_short ?? identity.name),
    local: String(identity.name_local ?? ""),
    tagline: String(identity.tagline ?? ""),
    licence: String(identity.license_no ?? ""),
    phone: String(identity.phone ?? ""),
    emergency: String(identity.emergency ?? ""),
    email: String(identity.email ?? ""),
    website: String(identity.website ?? ""),
    address: String(identity.address ?? ""),
    city: String(identity.city ?? ""),
    country: String(identity.country ?? ""),
    footer: String(identity.footer_note ?? ""),
  };

  const doc = {
    rx_no: "RX-2026-1210",
    created_at: new Date().toISOString(),
    diagnosis: "Acute appendicitis",
    icd10: "K35.8",
    notes: "Complete the full antibiotic course. Keep the wound dry for 48 hours. Return immediately for fever, spreading redness or increasing pain.",
    follow_up: "Surgical clinic in 10 days for clip removal",
    doctor_name: "Dr. Mamon Aminyar",
    doctor_title: "Medical Director · General Surgeon",
    status: "signed",
    signed_at: new Date().toISOString(),
  };

  const patient = { patient_name: "Fatima Noor", patient_mrn: "MRN-1004", gender: "Female", dob: "1991-04-18", allergies: "Penicillin", phone: "+93 70 118 4402" };

  return (
    <div className="space-y-3.5">
      <Panel>
        <SectionTitle
          title={tr("Print studio", "استودیو چاپ")}
          subtitle={tr("Ten prescription papers and four patient-document layouts. Everything below is the real renderer used when you press print.", "ده کاغذ نسخه و چهار طرح سند مریض. هر چه در پایین می‌بینید همان رندر واقعی هنگام چاپ است.")}
          icon={<Printer size={14} />}
          action={rx ? <Link href={`/hms/rx/${rx.id}?template=${activeTemplate}`} target="_blank" className="hms-btn hms-btn-sm hms-btn-primary"><ExternalLink size={11} /> {tr("Open a real prescription", "باز کردن یک نسخهٔ واقعی")}</Link> : undefined}
        />
        <p className="mt-2 flex items-center gap-1.5 text-[0.66rem]" style={{ color: "var(--hms-muted)" }}>
          <Sparkles size={11} style={{ color: "var(--hms-brand)" }} />
          {tr("A prescription can be printed on any paper, independent of the interface theme — choose the design per document in the consult room, or set the default in Settings → Look & print.", "نسخه روی هر کاغذی چاپ می‌شود، مستقل از تم سیستم — طرح را در اتاق معاینه برای هر سند انتخاب کنید یا پیش‌فرض را در تنظیمات → ظاهر و چاپ تعیین کنید.")}
        </p>
      </Panel>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {RX_TEMPLATES.map((t) => (
          <Panel key={t.id} className="!p-2.5">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="truncate text-[0.78rem] font-semibold">{t.id}. {t.name}</p>
                <p className="truncate text-[0.6rem]" style={{ color: "var(--hms-faint)" }}>{t.mood}</p>
              </div>
              <div className="flex shrink-0 gap-0.5">
                {[t.paper, t.accent, t.ink].map((c) => (
                  <span key={c} className="h-3.5 w-3.5 rounded-full border" style={{ background: c, borderColor: "var(--hms-border)" }} />
                ))}
              </div>
            </div>

            <div className="mt-2 overflow-hidden rounded-md border" style={{ borderColor: "var(--hms-border)", height: 300 }}>
              <div style={{ width: 793, height: 1122, transform: "scale(0.34)", transformOrigin: "top left" }}>
                <RxSheet template={t} identity={ident} doc={doc} patient={patient} items={SAMPLE_ITEMS} />
              </div>
            </div>

            <div className="mt-1.5 flex items-center justify-between">
              <p className="line-clamp-1 text-[0.6rem]" style={{ color: "var(--hms-muted)" }}>{t.description}</p>
              {rx && (
                <Link href={`/hms/rx/${rx.id}?template=${t.id}`} target="_blank" className="hms-btn hms-btn-sm hms-btn-ghost shrink-0">
                  <ExternalLink size={10} /> {tr("Full", "کامل")}
                </Link>
              )}
            </div>
          </Panel>
        ))}
      </div>

      <Panel>
        <SectionTitle
          title={tr("Patient documents", "اسناد مریض")}
          subtitle={tr("Referral letters, charts, discharge summaries and statements — designed to be unmistakably different from a prescription.", "مکتوب معرفی، چارت، خلاصهٔ مرخصی و صورت‌حساب — طوری طراحی شده که با نسخه اشتباه نشود.")}
          icon={<FileText size={14} />}
        />
        <div className="mt-2.5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {DOC_TEMPLATES.map((d) => (
            <div key={d.id} className="rounded-lg border p-2" style={{ borderColor: "var(--hms-border)" }}>
              <p className="truncate text-[0.74rem] font-semibold">{d.name}</p>
              <p className="line-clamp-2 text-[0.58rem]" style={{ color: "var(--hms-faint)" }}>{d.purpose}</p>
              <div className="mt-1.5 overflow-hidden rounded border" style={{ borderColor: "var(--hms-border)", height: 232 }}>
                <div style={{ width: 793, height: 1122, transform: "scale(0.27)", transformOrigin: "top left" }}>
                  <DocumentSheet template={d} identity={{ ...ident, license_no: ident.licence }} />
                </div>
              </div>
            </div>
          ))}
        </div>
      </Panel>
    </div>
  );
}
