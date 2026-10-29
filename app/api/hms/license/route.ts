import { body, json, route } from "@/lib/api";
import { requireHmsApi } from "@/lib/hms/auth";
import { hAudit } from "@/lib/hms/db";
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

  if (action === "validate") {
    return json(validateSerial(p.serial ?? ""));
  }

  return json({ error: "Unknown action" }, 422);
});

export const dynamic = "force-dynamic";
