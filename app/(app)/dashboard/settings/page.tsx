import { SettingsClient } from "@/components/dashboard/settings-client";
import { getCurrentUser } from "@/lib/auth";
import { listUsers, getSettings } from "@/lib/queries";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return <SettingsClient initial={getSettings()} users={listUsers()} user={user} />;
}
