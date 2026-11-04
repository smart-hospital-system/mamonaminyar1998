import { body, json, route } from "@/lib/api";
import { requireHmsApi } from "@/lib/hms/auth";
import { strongCode, strongPin } from "@/lib/hms/security";

/**
 * GET  /api/hms/security           disabled: passwords must not appear in URLs
 * POST /api/hms/security          mint a new strong code (authenticated staff)
 *
 * Generation happens on the server so the randomness never depends on the
 * browser, and so the owner console and any future kiosk share one rule set.
 */
export const GET = route(async () => {
  await requireHmsApi();
  return json({ error: "Score passwords locally with the client strength meter; never send passwords in URLs." }, 405);
});

export const POST = route(async (req) => {
  const user = await requireHmsApi();
  const payload = await body<{ kind?: string }>(req);
  if (payload.kind === "pin") return json({ code: strongPin(), kind: "pin", by: user.id });
  return json({ code: strongCode(), kind: "code", by: user.id });
});

export const dynamic = "force-dynamic";
