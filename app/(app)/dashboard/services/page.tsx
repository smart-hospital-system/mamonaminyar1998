import { ServicesClient } from "@/components/dashboard/services-client";
import { getCurrentUser } from "@/lib/auth";
import { all } from "@/lib/db";
import { listServices } from "@/lib/queries";
import { guardRole } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function ServicesPage() {
  await guardRole(["owner", "manager"]);
  const user = await getCurrentUser();
  const services = listServices(true);
  const staff = all<{ id: string; name: string; avatar_color: string | null; active: number }>(
    "SELECT id, name, avatar_color, active FROM staff ORDER BY name"
  );

  return (
    <ServicesClient
      initial={services}
      staff={staff}
      canManage={user?.role === "owner" || user?.role === "manager"}
    />
  );
}
