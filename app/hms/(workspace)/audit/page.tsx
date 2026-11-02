import { History, ShieldCheck, UserCog } from "lucide-react";
import { Panel, SectionTitle, Stat } from "@/components/hms/ui";
import { requireHmsPage } from "@/lib/hms/auth";
import { hAll, hGet, hmsReady } from "@/lib/hms/db";
import { digitsOf, relTime } from "@/lib/hms/format";
import { tx } from "@/lib/hms/i18n";
import { getLang } from "@/lib/hms/lang-server";
import { AuditTable, type AuditItem } from "./table";

export const dynamic = "force-dynamic";

export default async function AuditPage() {
  await requireHmsPage(["admin", "doctor"]);
  await hmsReady();
  const lang = await getLang();
  const tr = (en: string, fa: string, vars?: Record<string, string | number>) => tx(lang, en, fa, vars);

  const rows = hAll<AuditItem & { created_at: string }>(
    "SELECT id, user_name, action, entity, entity_id, detail, created_at FROM hms_audit ORDER BY created_at DESC LIMIT 400"
  );
  const today = new Date().toISOString().slice(0, 10);
  const actionsToday = hGet<{ c: number }>("SELECT COUNT(*) AS c FROM hms_audit WHERE substr(created_at,1,10) = ?", [today])?.c ?? 0;
  const people = hGet<{ c: number }>("SELECT COUNT(DISTINCT user_name) AS c FROM hms_audit")?.c ?? 0;
  const last = rows[0];

  return (
    <div className="space-y-3.5">
      <div className="hms-hero p-4 anim-rise">
        <p className="hms-eyebrow">{tr("Governance", "حاکمیت")}</p>
        <h2 className="hms-hero-title mt-1">{tr("Every change, and who made it.", "هر تغییر، و اینکه چه کسی داده است.")}</h2>
        <p className="mt-1 max-w-2xl text-[0.72rem] leading-relaxed" style={{ color: "var(--hms-muted)" }}>
          {tr(
            "The hospital writes an immutable line for every registration, signature, dispense, result, admission, payment and setting change. Nothing here can be edited from the interface — that is the point.",
            "شفاخانه برای هر ثبت، امضا، تحویل دوا، نتیجه، بستری، پرداخت و تغییر تنظیمات یک سطر تغییرناپذیر می‌نویسد. هیچ‌چیز از داخل برنامه قابل ویرایش نیست — هدف همین است."
          )}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
        <Stat label={tr("Actions today", "اقدامات امروز")} value={digitsOf(lang, actionsToday)} icon={<History size={13} />} tone="brand" />
        <Stat label={tr("People involved", "افراد")} value={digitsOf(lang, people)} icon={<UserCog size={13} />} />
        <Stat label={tr("Entries kept", "ثبت‌شده")} value={digitsOf(lang, rows.length)} icon={<ShieldCheck size={13} />} />
        <Stat label={tr("Last change", "آخرین تغییر")} value={last ? relTime(last.created_at, lang) : "—"} hint={last?.user_name} />
      </div>

      <Panel>
        <SectionTitle
          title={tr("Audit trail", "ثبت وقایع")}
          subtitle={tr("Newest first — filter by person, action or record type.", "جدیدترین اول — بر اساس شخص، اقدام یا نوع سابقه فلتر کنید.")}
          icon={<History size={14} />}
        />
        <div className="mt-2.5">
          <AuditTable items={rows} />
        </div>
      </Panel>
    </div>
  );
}
