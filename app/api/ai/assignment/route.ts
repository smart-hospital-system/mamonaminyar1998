import { requireUser, logActivity } from "@/lib/auth";
import { body, json, route } from "@/lib/api";
import { scoreStaffForSlot } from "@/lib/bookings";
import { get } from "@/lib/db";

export const POST = route(async (req) => {
  const user = await requireUser();
  const { service_id, start_at } = await body<{ service_id?: string; start_at?: string }>(req);
  if (!service_id || !start_at) return json({ error: "service_id and start_at are required" }, 422);

  const candidates = scoreStaffForSlot(service_id, start_at);
  const best = candidates.find((c) => c.available) ?? candidates[0];
  const service = get<{ name: string; duration_min: number; price: number }>(
    "SELECT name, duration_min, price FROM services WHERE id = ?",
    [service_id]
  );

  logActivity(
    user,
    "asked ai",
    "ai",
    null,
    `Smart assignment for ${service?.name ?? "a service"} → ${best?.name ?? "no match"}`
  );

  return json({
    candidates,
    best,
    service,
    rationale: best
      ? `${best.name} is the strongest match: ${best.reasons.join(", ").toLowerCase() || "available for the slot"}. They already have ${best.bookingsToday} booking${best.bookingsToday === 1 ? "" : "s"} that day, which keeps the day balanced.`
      : "No staff member is mapped to this service yet.",
  });
});
