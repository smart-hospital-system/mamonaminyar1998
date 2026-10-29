import { CalendarClient } from "@/components/dashboard/calendar-client";
import { listBookings } from "@/lib/queries";
import { all } from "@/lib/db";
import { todayKey, toIso, addDaysKey } from "@/lib/utils";
import { getCurrentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function CalendarPage() {
  const user = await getCurrentUser();
  const today = todayKey();
  const initial = listBookings({
    from: toIso(today, "00:00"),
    to: toIso(addDaysKey(today, 1), "00:00"),
    sort: "upcoming",
    limit: 200,
  });

  const staff = all<{ id: string; name: string; avatar_color: string | null; title: string | null }>(
    "SELECT id, name, avatar_color, title FROM staff WHERE active = 1 ORDER BY name"
  );
  const schedules = all<{ staff_id: string; weekday: number; start_time: string; end_time: string; is_working: number }>(
    "SELECT staff_id, weekday, start_time, end_time, is_working FROM staff_schedules"
  );

  return <CalendarClient
      initialBookings={initial.items}
      staff={staff}
      schedules={schedules}
      initialDate={today}
      lockedStaffId={user?.role === "staff" ? user.staff_id ?? undefined : undefined}
    />;
}
