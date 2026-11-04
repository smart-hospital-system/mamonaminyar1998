import { body, json, route } from "@/lib/api";
import { requireHmsApi } from "@/lib/hms/auth";
import { updateStaff, type StaffPatch } from "@/lib/hms/staff-actions";

export const PATCH = route<{ id: string }>(async (req, { params }) => {
  const actor = await requireHmsApi();
  const { id } = await params;
  return json(updateStaff(id, await body<StaffPatch>(req), actor));
});
export const dynamic = "force-dynamic";
