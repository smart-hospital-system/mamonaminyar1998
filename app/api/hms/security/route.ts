import { json, route } from "@/lib/api";
import { requireHmsApi } from "@/lib/hms/auth";
import { scoreCode, strongCode, strongPin } from "@/lib/hms/security";

/**
 * GET  /api/hms/security?code=…   score a proposed code
 * POST /api/hms/security          mint a new strong code (admin only)
 *
 * Generation happens on the server so the randomness never depends on the
 * browser, and so the owner console and any future kiosk share one rule set.
 */
export const GET = route(async (req) => {
  await requireHmsApi();
  const code = new URL(req.url).searchParams.get("code") ?? "";
  return json({ strength: scoreCode(code) });
});

export const POST = route(async (req) => {
  const user = await requireHmsApi(["admin"]);
  const payload = (await req.json().catch(() => ({}))) as { kind?: string };
  if (payload.kind === "pin") return json({ code: strongPin(), kind: "pin", by: user.id });
  return json({ code: strongCode(), kind: "code", by: user.id });
});

export const dynamic = "force-dynamic";
