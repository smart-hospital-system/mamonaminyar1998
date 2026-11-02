import { BookingsClient } from "@/components/dashboard/bookings-client";
import { getCurrentUser } from "@/lib/auth";
import { listBookings, bookingStatusCounts } from "@/lib/queries";
import { all } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function BookingsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; q?: string; new?: string }>;
}) {
  const sp = await searchParams;
  const user = await getCurrentUser();
  const status = sp.status ?? "all";
  const q = sp.q ?? "";
  const lockedStaffId = user?.role === "staff" ? user.staff_id ?? undefined : undefined;

  const initial = listBookings({
    status: status === "all" ? undefined : status,
    q: q || undefined,
    staff_id: lockedStaffId,
    sort: "upcoming",
    limit: 25,
  });

  const staff = all<{ id: string; name: string; avatar_color: string | null }>(
    "SELECT id, name, avatar_color FROM staff WHERE active = 1 ORDER BY name"
  );

  return (
    <BookingsClient
      initial={{ ...initial, counts: bookingStatusCounts() }}
      staff={staff}
      initialStatus={status}
      lockedStaffId={lockedStaffId ?? undefined}
      initialQuery={q}
      openNew={sp.new === "1"}
    />
  );
}
