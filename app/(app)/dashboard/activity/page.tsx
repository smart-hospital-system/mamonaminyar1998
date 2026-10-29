import { ActivityClient } from "@/components/dashboard/activity-client";
import { listActivity } from "@/lib/queries";
import { guardRole } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function ActivityPage() {
  await guardRole(["owner", "manager"]);
  return <ActivityClient initial={listActivity({ limit: 150 })} />;
}
