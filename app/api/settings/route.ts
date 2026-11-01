import { requireUser, logActivity } from "@/lib/auth";
import { body, json, route } from "@/lib/api";
import { getSettings } from "@/lib/queries";
import { run } from "@/lib/db";

export const GET = route(async () => {
  await requireUser();
  return json({ settings: getSettings() });
});

export const PUT = route(async (req) => {
  const user = await requireUser(["owner", "manager"]);
  const { section, values } = await body<{ section?: string; values?: Record<string, unknown> }>(req);
  if (!section || !values) return json({ error: "section and values are required" }, 422);
  const current = getSettings();
  const merged = { ...(current[section] ?? {}), ...values };
  run(
    "INSERT INTO settings (key, value) VALUES (?,?) ON CONFLICT(key) DO UPDATE SET value = excluded.value",
    [section, JSON.stringify(merged)]
  );
  logActivity(user, "updated", "settings", section, `Updated ${section} settings`);
  return json({ ok: true, settings: getSettings() });
});
