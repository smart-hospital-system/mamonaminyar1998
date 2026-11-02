import { KeyRound, ShieldCheck } from "lucide-react";
import { Panel, SectionTitle } from "@/components/hms/ui";
import { requireHmsPage } from "@/lib/hms/auth";
import { hmsReady } from "@/lib/hms/db";
import { licenseState, listSerials } from "@/lib/hms/license";
import { dateShort } from "@/lib/hms/format";
import { statusText, tx } from "@/lib/hms/i18n";
import { getLang } from "@/lib/hms/lang-server";
import { ActivateConsole } from "./console";
import { RevokeSerial } from "./revoke";

export const dynamic = "force-dynamic";

export default async function ActivatePage() {
  await requireHmsPage(["admin"]);
  await hmsReady();
  const lang = await getLang();
  const tr = (en: string, fa: string, vars?: Record<string, string | number>) => tx(lang, en, fa, vars);
  const state = licenseState();
  const serials = listSerials();

  return (
    <div className="space-y-3.5">
      <Panel>
        <SectionTitle
          title={tr("Licence & activation", "لایسنس و فعال‌سازی")}
          subtitle={tr("This copy of Aybek HMS runs for 14 days as a trial. A serial number unlocks it permanently on this machine — no internet required.", "این نسخهٔ سیستم ایبک ۱۴ روز به‌صورت آزمایشی کار می‌کند. یک شمارهٔ سریال آن را برای همیشه روی این دستگاه فعال می‌سازد — بدون نیاز به انترنت.")}
          icon={<KeyRound size={14} />}
        />
        <ActivateConsole state={state} />
      </Panel>

      <div className="grid gap-3.5 xl:grid-cols-2">
        <Panel>
          <SectionTitle title={tr("Issued serials", "سریال‌های صادرشده")} subtitle={tr("Every serial generated for the hospital, newest first", "همهٔ سریال‌های صادرشده برای شفاخانه، جدیدترین اول")} icon={<ShieldCheck size={14} />} />
          <div className="mt-2 overflow-x-auto rounded-lg border" style={{ borderColor: "var(--hms-border)" }}>
            <table className="w-full">
              <thead style={{ background: "var(--hms-surface-2)" }}>
                <tr><th className="hms-th">{tr("Serial", "سریال")}</th><th className="hms-th">{tr("Plan", "پلان")}</th><th className="hms-th">{tr("Seats", "صندلی")}</th><th className="hms-th">{tr("Status", "وضعیت")}</th><th className="hms-th">{tr("Issued", "صادرشده")}</th><th className="hms-th text-right">{tr("Owner action", "اقدام مالک")}</th></tr>
              </thead>
              <tbody>
                {serials.map((s) => (
                  <tr key={s.serial} className="hms-row">
                    <td className="hms-td font-mono text-[0.68rem]">{s.serial}</td>
                    <td className="hms-td text-[0.7rem] capitalize">{statusText(lang, s.plan)}</td>
                    <td className="hms-td text-[0.7rem]">{s.seats}</td>
                    <td className="hms-td text-[0.7rem] capitalize">{statusText(lang, s.status)}</td>
                    <td className="hms-td text-[0.68rem]">{dateShort(s.issued_at, lang)}</td>
                    <td className="hms-td text-right"><RevokeSerial serial={s.serial} status={s.status} /></td>
                  </tr>
                ))}
                {!serials.length && <tr><td className="hms-td text-[0.7rem]" colSpan={6}>{tr("No serials generated yet. Use “Generate serials” below — they belong to you, the licence owner.", "هنوز سریالی ساخته نشده. از «ساخت سریال» در پایین استفاده کنید — این سریال‌ها متعلق به شما، مالک لایسنس، هستند.")}</td></tr>}
              </tbody>
            </table>
          </div>
        </Panel>
        <Panel>
          <SectionTitle title={tr("How licensing protects the hospital", "لایسنس چگونه از شفاخانه محافظت می‌کند")} />
          <ul className="mt-2 space-y-1.5 text-[0.7rem] leading-relaxed" style={{ color: "var(--hms-muted)" }}>
            <li>• {tr("Each serial is self-verifying: the last group is a SHA-256 checksum, so a mistyped or invented serial is rejected instantly, offline.", "هر سریال خودتأیید است: گروه آخر یک چک‌سام SHA-256 است، پس سریال اشتباه یا ساختگی فوراً و بدون انترنت رد می‌شود.")}</li>
            <li>• {tr("A serial is bound to the machine on first activation; copying the database to another computer does not carry the licence.", "سریال در اولین فعال‌سازی به دستگاه گره می‌خورد؛ کاپی دیتابیس به رایانهٔ دیگر لایسنس را منتقل نمی‌کند.")}</li>
            <li>• {tr("You can issue as many department seats as your plan allows and revoke a serial from this page at any time.", "هر تعداد صندلی که پلان شما اجازه دهد می‌توانید صادر کنید و هر وقت بخواهید سریالی را از همین صفحه لغو کنید.")}</li>
            <li>• {tr("If the trial expires, patient data is never deleted — the hospital simply becomes read-only until activation.", "اگر دورهٔ آزمایشی تمام شود، دادهٔ مریضان هرگز حذف نمی‌شود — شفاخانه تا فعال‌سازی فقط حالت خواندنی می‌گیرد.")}</li>
          </ul>
        </Panel>
      </div>
    </div>
  );
}
