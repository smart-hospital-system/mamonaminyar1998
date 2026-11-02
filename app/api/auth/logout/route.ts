import { destroySession, getCurrentUser, logActivity } from "@/lib/auth";
import { json, route } from "@/lib/api";

export const POST = route(async () => {
  const user = await getCurrentUser();
  await destroySession();
  if (user) logActivity(user, "signed out", "user", user.id, "Signed out");
  return json({ ok: true });
});
