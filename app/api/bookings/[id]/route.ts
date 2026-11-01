import { requireUser, logActivity, notify } from "@/lib/auth";
import { body, fail, json, route } from "@/lib/api";
import { getBooking } from "@/lib/queries";
import { get, run } from "@/lib/db";
import { cancelBooking, completeBooking, findConflict, createBooking } from "@/lib/bookings";
import { addMinutes } from "@/lib/utils";

export const GET = route<{ id: string }>(async (_req, { params }) => {
  await requireUser();
  const { id } = await params;
  const booking = getBooking(id);
  if (!booking) return fail("Booking not found", 404);
  return json({ booking });
});

export const PATCH = route<{ id: string }>(async (req, { params }) => {
  const user = await requireUser();
  const { id } = await params;
  const current = getBooking(id);
  if (!current) return fail("Booking not found", 404);
  const patch = await body<Record<string, unknown>>(req);

  // status transitions with side effects
  if (patch.status && patch.status !== current.status) {
    const status = String(patch.status);
    if (status === "cancelled") {
      cancelBooking(id, (patch.cancelled_reason as string) ?? null);
      logActivity(user, "cancelled", "booking", id, `Cancelled ${current.service_name} for ${current.customer_name}`);
      notify({ type: "booking", title: "Booking cancelled", body: `${current.customer_name} — ${current.service_name}`, link: "/dashboard/bookings" });
      return json({ ok: true, booking: getBooking(id) });
    }
    if (status === "completed") {
      completeBooking(id, {
        tip: Number(patch.tip ?? 0),
        method: (patch.method as string) ?? "card",
        markPaid: patch.markPaid !== false,
      });
      logActivity(user, "completed", "booking", id, `Completed ${current.service_name} for ${current.customer_name}`);
      return json({ ok: true, booking: getBooking(id) });
    }
    if (status === "confirmed") {
      run("UPDATE bookings SET status = 'confirmed', updated_at = ? WHERE id = ?", [new Date().toISOString(), id]);
      logActivity(user, "confirmed", "booking", id, `Confirmed ${current.service_name} for ${current.customer_name}`);
      notify({ type: "booking", title: "Booking confirmed", body: `${current.customer_name} is confirmed for ${current.service_name}`, link: "/dashboard/bookings" });
      return json({ ok: true, booking: getBooking(id) });
    }
    run("UPDATE bookings SET status = ?, updated_at = ? WHERE id = ?", [status, new Date().toISOString(), id]);
    logActivity(user, "updated", "booking", id, `Set booking status to ${status.replace("_", " ")}`);
    return json({ ok: true, booking: getBooking(id) });
  }

  const startAt = (patch.start_at as string) ?? current.start_at;
  const staffId = (patch.staff_id as string) ?? current.staff_id;
  const serviceId = (patch.service_id as string) ?? current.service_id;
  const service = get<{ duration_min: number; price: number }>("SELECT * FROM services WHERE id = ?", [serviceId]);
  const addons = (patch.addons as { name: string; price: number }[]) ?? [];
  const addonTotal = addons.reduce((a, b) => a + Number(b.price || 0), 0);
  const duration = Number(service?.duration_min ?? 60);
  const endAt = (patch.end_at as string) ?? addMinutes(startAt, duration);
  const price = patch.price !== undefined ? Number(patch.price) : Number(service?.price ?? current.price) + addonTotal;

  if (patch.start_at || patch.staff_id || patch.service_id) {
    const conflict = findConflict(staffId, startAt, endAt, id);
    if (conflict) return fail("That staff member already has a booking in this window.", 409);
  }

  run(
    `UPDATE bookings SET customer_id = ?, staff_id = ?, service_id = ?, addons = ?, start_at = ?, end_at = ?,
      price = ?, notes = ?, internal_notes = ?, payment_status = ?, updated_at = ? WHERE id = ?`,
    [
      (patch.customer_id as string) ?? current.customer_id,
      staffId,
      serviceId,
      JSON.stringify(addons.length ? addons : JSON.parse(current.addons || "[]")),
      startAt,
      endAt,
      price,
      patch.notes !== undefined ? (patch.notes as string) : current.notes,
      patch.internal_notes !== undefined ? (patch.internal_notes as string) : current.internal_notes,
      (patch.payment_status as string) ?? current.payment_status,
      new Date().toISOString(),
      id,
    ]
  );
  logActivity(user, "updated", "booking", id, `Updated ${current.service_name} for ${current.customer_name}`);
  return json({ ok: true, booking: getBooking(id) });
});

export const DELETE = route<{ id: string }>(async (_req, { params }) => {
  const user = await requireUser(["owner", "manager"]);
  const { id } = await params;
  const booking = getBooking(id);
  if (!booking) return fail("Booking not found", 404);
  run("DELETE FROM payments WHERE booking_id = ?", [id]);
  run("DELETE FROM bookings WHERE id = ?", [id]);
  logActivity(user, "deleted", "booking", id, `Deleted booking for ${booking.customer_name} (${booking.code})`);
  return json({ ok: true });
});

export const POST = route<{ id: string }>(async (req, { params }) => {
  // duplicate a booking (book again)
  const user = await requireUser();
  const { id } = await params;
  const current = getBooking(id);
  if (!current) return fail("Booking not found", 404);
  const { start_at } = await body<{ start_at?: string }>(req);
  const result = createBooking({
    customer_id: current.customer_id,
    staff_id: current.staff_id,
    service_id: current.service_id,
    start_at: start_at ?? current.start_at,
    addons: JSON.parse(current.addons || "[]"),
    notes: current.notes,
    source: "phone",
    status: "confirmed",
  });
  logActivity(user, "created", "booking", result.ids[0], `Rebooked ${current.customer_name} for ${current.service_name}`);
  return json({ ok: true, ...result });
});
