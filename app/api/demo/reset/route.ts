import { requireUser, logActivity } from "@/lib/auth";
import { json, route } from "@/lib/api";
import { getDb, resetDatabase } from "@/lib/db";
import { seedDatabase } from "@/lib/seed";

export const POST = route(async () => {
  const user = await requireUser(["owner"]);
  resetDatabase();
  seedDatabase(getDb());
  logActivity(user, "reset", "system", null, "Restored demo data to a fresh seed");
  return json({ ok: true });
});
