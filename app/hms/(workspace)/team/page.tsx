import { Users } from "lucide-react";
import { Panel, SectionTitle } from "@/components/hms/ui";
import { requireHmsPage } from "@/lib/hms/auth";
import { hAll, hGet, hmsReady } from "@/lib/hms/db";
import { listAudit } from "@/lib/hms/queries";
import { TeamConsole } from "./console";

export const dynamic = "force-dynamic";

export default async function TeamPage() {
  const me = await requireHmsPage();
  await hmsReady();
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
          title="Team & access"
          subtitle="Who works here, what they may do, and what they did. Suspending a person keeps every record they ever wrote."
          icon={<Users size={14} />}
        />
        <TeamConsole users={users} meId={me.id} isAdmin={me.role === "admin"} />
      </Panel>

      <Panel>
        <SectionTitle title="Access history" subtitle="Role changes, password resets and licence events" />
        <div className="mt-2 space-y-1">
          {audit.map((a) => (
            <div key={a.id} className="flex items-start gap-2 border-b py-1.5 last:border-0" style={{ borderColor: "var(--hms-border)" }}>
              <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: "var(--hms-brand)" }} />
              <p className="min-w-0 flex-1 text-[0.7rem]">{a.detail}</p>
              <span className="shrink-0 text-[0.6rem]" style={{ color: "var(--hms-faint)" }}>
                {a.user_name} · {new Date(a.created_at).toLocaleString("en-GB", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
              </span>
            </div>
          ))}
          {!audit.length && <p className="py-3 text-center text-[0.7rem]" style={{ color: "var(--hms-faint)" }}>No access events yet.</p>}
        </div>
      </Panel>
    </div>
  );
}
