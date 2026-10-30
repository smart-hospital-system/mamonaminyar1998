import { Users } from "lucide-react";
import { Panel, SectionTitle } from "@/components/hms/ui";
import { requireHmsPage } from "@/lib/hms/auth";
import { tx } from "@/lib/hms/i18n";
import { getLang } from "@/lib/hms/lang-server";

import { hAll, hGet, hmsReady } from "@/lib/hms/db";
import { listAudit } from "@/lib/hms/queries";
import { dateShort, timeShort } from "@/lib/hms/format";
import { TeamConsole } from "./console";

export const dynamic = "force-dynamic";

export default async function TeamPage() {
  const me = await requireHmsPage(["admin"]);
  await hmsReady();
  const lang = await getLang();
  const tr = (en: string, fa: string, vars?: Record<string, string | number>) => tx(lang, en, fa, vars);
  const users = hAll<{
    id: string; name: string; email: string; role: string; department: string | null; title: string | null;
    phone: string | null; active: number; last_login_at: string | null; created_at: string;
  }>(
    `SELECT id, name, email, role, department, title, phone, active, last_login_at, created_at
     FROM hms_users ORDER BY active DESC, name`
  ).map((u) => ({
    ...u,
    sessions: Number(hGet<{ c: number }>("SELECT COUNT(*) AS c FROM hms_sessions WHERE user_id = ?", [u.id])?.c ?? 0),
  }));
  const audit = listAudit(40).filter((a) => a.entity === "user" || a.entity === "license" || a.action === "password");

  return (
    <div className="space-y-3.5">
      <Panel>
        <SectionTitle
          title={tr("Team & access", "تیم و دسترسی")}
          subtitle={tr("Who works here, what they may do, and what they did. Suspending a person keeps every record they ever wrote.", "چه کسی اینجا کار می‌کند، چه اجازه‌ای دارد و چه کرده است. تعلیق یک شخص همهٔ سوابق او را نگه می‌دارد.")}
          icon={<Users size={14} />}
        />
        <TeamConsole users={users} meId={me.id} isAdmin={me.role === "admin"} />
      </Panel>

      <Panel>
        <SectionTitle title={tr("Access history", "سابقهٔ دسترسی")} subtitle={tr("Role changes, password resets and licence events", "تغییر نقش، بازنشانی رمز و رویدادهای لایسنس")} />
        <div className="mt-2 space-y-1">
          {audit.map((a) => (
            <div key={a.id} className="flex items-start gap-2 border-b py-1.5 last:border-0" style={{ borderColor: "var(--hms-border)" }}>
              <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: "var(--hms-brand)" }} />
              <p className="min-w-0 flex-1 text-[0.7rem]">{a.detail}</p>
              <span className="shrink-0 text-[0.6rem]" style={{ color: "var(--hms-faint)" }}>
                {a.user_name} · {dateShort(a.created_at, lang)} · {timeShort(a.created_at, lang)}
              </span>
            </div>
          ))}
          {!audit.length && <p className="py-3 text-center text-[0.7rem]" style={{ color: "var(--hms-faint)" }}>{tr("No access events yet.", "هنوز رویداد دسترسی ثبت نشده.")}</p>}
        </div>
      </Panel>
    </div>
  );
}
