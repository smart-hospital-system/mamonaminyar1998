import { body, json, route } from "@/lib/api";
import { requireHmsApi } from "@/lib/hms/auth";
import { getSection, hAudit, hGet, hRun, saveSettings } from "@/lib/hms/db";
import { activate, generateSerial, licenseState, listSerials, validateSerial, type SerialPlan } from "@/lib/hms/license";

export const GET = route(async () => {
  await requireHmsApi();
  return json({ state: licenseState(), serials: listSerials() });
});

export const POST = route(async (req) => {
  const user = await requireHmsApi(["admin"]);
  const p = await body<{ action?: string; serial?: string; plan?: string; count?: number; machine?: string }>(req);
  const action = p.action ?? "activate";

  if (action === "activate") {
    if (!p.serial) return json({ error: "Enter the serial number printed on your certificate." }, 422);
    const result = activate(p.serial, "Aybek Ten-Bed Specialy Surgical Hospital", p.machine ?? "local-machine");
    if (!result.ok) return json({ error: result.error, state: licenseState() }, 422);
    hAudit(user, "activated", "license", "license", `Activated a ${result.plan} serial`);
    return json({ ok: true, state: licenseState() });
  }

  if (action === "generate") {
    const count = Math.max(1, Math.min(50, Number(p.count ?? 1)));
    const list = Array.from({ length: count }, () => generateSerial((p.plan ?? "hospital") as SerialPlan).serial);
    hAudit(user, "generated", "license", "license", `Generated ${count} ${p.plan ?? "hospital"} serial(s)`);
    return json({ ok: true, serials: list });
  }

  if (action === "revoke") {
    if (!p.serial) return json({ error: "Which serial should be revoked?" }, 422);
    const serial = p.serial.trim().toUpperCase();
    const row = hGet<{ serial: string; status: string }>("SELECT serial, status FROM hms_licenses WHERE serial = ?", [serial]);
    if (!row) return json({ error: "That serial is not in the register." }, 404);
    if (row.status === "revoked") return json({ ok: true, already: true });
    hRun("UPDATE hms_licenses SET status = 'revoked' WHERE serial = ?", [serial]);
    // Revoking the serial this installation is running on locks it immediately.
    const lic = getSection<Record<string, unknown>>("license");
    if (String(lic.serial ?? "") === serial) {
      saveSettings("license", { status: "revoked", serial, plan: String(lic.plan ?? "") });
    }
    hAudit(user, "revoked", "license", serial, `Revoked serial ${serial}`);
    return json({ ok: true, state: licenseState() });
  }

  if (action === "validate") {
    return json(validateSerial(p.serial ?? ""));
  }

  return json({ error: "Unknown action" }, 422);
});

export const dynamic = "force-dynamic";
