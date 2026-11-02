import { json, route } from "@/lib/api";
import { hmsLogout } from "@/lib/hms/auth";

export const POST = route(async () => {
  await hmsLogout();
  return json({ ok: true });
});

export const dynamic = "force-dynamic";
