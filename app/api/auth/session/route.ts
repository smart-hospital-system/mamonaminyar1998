import { getCurrentUser } from "@/lib/auth";
import { json, route } from "@/lib/api";

export const GET = route(async () => {
  const user = await getCurrentUser();
  return json({ user });
});

export const dynamic = "force-dynamic";
