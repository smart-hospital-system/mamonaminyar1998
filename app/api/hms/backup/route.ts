import { body, json, route } from "@/lib/api";
import { requireHmsApi } from "@/lib/hms/auth";
import { dumpHms, getSettings, hmsReady, resetHmsData } from "@/lib/hms/db";
import { licenseState } from "@/lib/hms/license";

const stamp = () => new Date().toISOString().slice(0, 16).replace(/[:T]/g, "-");

/**
 * GET  /api/hms/backup — download every hospital table as one JSON file.
 * POST /api/hms/backup { action: "reset-demo", confirm: "RESET" }
 *
 * The JSON file is the portable backup: it contains patients, prescriptions,
 * stock movements, invoices and the audit trail, and it can be read by any tool.
 * For a byte-exact copy the owner still copies data\slotly.db — both routes are
 * described in Settings → Data and in the Persian handbook.
 */
export const GET = route(async () => {
  await requireHmsApi(["admin"]);
  hmsReady();
  const payload = {
    product: "Aybek Ten-Bed Specialy Surgical Hospital",
    exported_at: new Date().toISOString(),
    format: 1,
    settings: getSettings(),
    licence: licenseState(),
    tables: dumpHms(),
  };
  return new Response(JSON.stringify(payload, null, 2), {
    headers: {
      "content-type": "application/json; charset=utf-8",
      "content-disposition": `attachment; filename="aybek-backup-${stamp()}.json"`,
      "cache-control": "no-store",
    },
  });
});

export const POST = route(async (req) => {
  const user = await requireHmsApi(["admin"]);
  const p = await body<{ action?: string; confirm?: string }>(req);

  if (p.action !== "reset-demo") return json({ error: "Unknown action." }, 422);
  // A reset cannot be undone, so it asks for the word, not just a click.
  if (p.confirm !== "RESET") {
    return json({ error: "Type RESET to confirm — this removes the current hospital data." }, 422);
  }
  const dropped = resetHmsData();
  return json({ ok: true, message: `Demo hospital rebuilt (${dropped} table(s) replaced).`, by: user.id });
});

export const dynamic = "force-dynamic";
