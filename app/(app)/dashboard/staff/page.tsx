import { StaffClient } from "@/components/dashboard/staff-client";
import { getCurrentUser } from "@/lib/auth";
import { all } from "@/lib/db";
import { listServices, listStaff } from "@/lib/queries";
import { guardRole } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function StaffPage() {
  await guardRole(["owner", "manager"]);
  const user = await getCurrentUser();
  const staff = listStaff(true);
  const services = listServices(true).map((s) => ({ id: s.id, name: s.name, category: s.category, color: s.color }));
  const timeOff = all<{
    id: string; staff_id: string; start_date: string; end_date: string; reason: string | null; status: string; created_at: string;
  }>("SELECT * FROM staff_time_off ORDER BY CASE status WHEN 'pending' THEN 0 ELSE 1 END, start_date");

  return (
    <StaffClient
      initial={staff}
      timeOff={timeOff}
      services={services}
      canManage={user?.role === "owner" || user?.role === "manager"}
    />
  );
}
