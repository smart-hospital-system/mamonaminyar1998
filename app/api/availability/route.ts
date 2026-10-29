import { requireUser } from "@/lib/auth";
import { json, qp, route } from "@/lib/api";
import { availability } from "@/lib/bookings";
import { addDaysKey, todayKey } from "@/lib/utils";

export const GET = route(async (req) => {
  await requireUser();
  const p = qp(req);
  const serviceId = p.get("service_id");
  const date = p.get("date") ?? todayKey();
  if (!serviceId) return json({ slots: [], error: "service_id is required" }, 400);
  const ignore = p.get("ignore");
  const slots = availability({
    dateKey: date,
    serviceId,
    staffId: p.get("staff_id") || null,
    interval: 15,
    ignoreBookingId: ignore ?? null,
  });
  return json({
    date,
    slots,
    days: Array.from({ length: 14 }, (_, i) => {
      const key = addDaysKey(todayKey(), i);
      const daySlots = availability({ dateKey: key, serviceId, staffId: p.get("staff_id") || null, ignoreBookingId: ignore ?? null });
      return { date: key, count: daySlots.length };
    }),
  });
});

export const dynamic = "force-dynamic";
