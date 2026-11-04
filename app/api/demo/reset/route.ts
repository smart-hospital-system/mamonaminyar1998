import { demoActionsEnabled } from "@/lib/request-security";
import { requireUser, logActivity } from "@/lib/auth";
import { json, route } from "@/lib/api";
import { getDb, resetDatabase } from "@/lib/db";
import { seedDatabase } from "@/lib/seed";

export const POST = route(async () => {
  if (!demoActionsEnabled()) return json({ error: "Destructive demo reset is disabled." }, 403);
  const user = await requireUser(["owner"]);
  resetDatabase();
  seedDatabase(getDb());
  logActivity(user, "reset", "system", null, "Restored demo data to a fresh seed");
  return json({ ok: true });
});
