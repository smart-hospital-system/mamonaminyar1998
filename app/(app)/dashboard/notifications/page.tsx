import { NotificationsClient } from "@/components/dashboard/notifications-client";
import { listNotifications } from "@/lib/queries";

export const dynamic = "force-dynamic";

export default async function NotificationsPage() {
  return <NotificationsClient initial={listNotifications(40)} />;
}
