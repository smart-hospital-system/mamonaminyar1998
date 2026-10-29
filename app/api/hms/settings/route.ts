import { body, json, route } from "@/lib/api";
import { requireHmsApi } from "@/lib/hms/auth";
import { getSettings, hAudit, saveSettings, DEFAULT_SETTINGS } from "@/lib/hms/db";

export const GET = route(async () => {
  await requireHmsApi();
  return json({ settings: getSettings(), defaults: DEFAULT_SETTINGS });
});

export const PATCH = route(async (req) => {
  const user = await requireHmsApi(["admin"]);
  const p = await body<{ section?: string; values?: Record<string, unknown> }>(req);
  if (!p.section || !p.values) return json({ error: "Section and values are required." }, 422);
  if (!DEFAULT_SETTINGS[p.section]) return json({ error: `Unknown settings section “${p.section}”.` }, 422);
  saveSettings(p.section, p.values);
  hAudit(user, "settings", p.section, p.section, `Updated ${Object.keys(p.values).length} value(s) in ${p.section}`);
  return json({ ok: true, settings: getSettings() });
});

export const dynamic = "force-dynamic";
