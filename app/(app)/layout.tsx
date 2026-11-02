import { AppShell } from "@/components/shell/app-shell";
import { getCurrentUser } from "@/lib/auth";
import { get } from "@/lib/db";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const pending = get<{ c: number }>(
    "SELECT COUNT(*) AS c FROM bookings WHERE status = 'pending' AND start_at > ?",
    [new Date().toISOString()]
  );
  const waitlist = get<{ c: number }>("SELECT COUNT(*) AS c FROM waitlist WHERE status = 'waiting'");
  const unread = get<{ c: number }>("SELECT COUNT(*) AS c FROM notifications WHERE read = 0");

  return (
    <AppShell
      user={user}
      counts={{
        pending: Number(pending?.c ?? 0),
        waitlist: Number(waitlist?.c ?? 0),
        unread: Number(unread?.c ?? 0),
      }}
    >
      {children}
    </AppShell>
  );
}
