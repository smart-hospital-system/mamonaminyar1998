/**
 * Machine-readable status for the PowerShell doctor (10-doctor.ps1).
 * Prints one line of JSON; the script parses it and prints a human table.
 */
import { hmsReady, hAll, getSection } from "../lib/hms/db";
import { licenseState } from "../lib/hms/license";
import { RX_TEMPLATES, DOC_TEMPLATES, APP_THEMES } from "../lib/hms/templates";

hmsReady();
const count = (t: string) => Number(hAll<{ c: number }>(`SELECT COUNT(*) AS c FROM ${t}`)[0]?.c ?? 0);
const identity = getSection<Record<string, unknown>>("identity");
const licence = licenseState();

console.log(
  JSON.stringify({
    hospital: String(identity.name ?? ""),
    licence: { status: licence.status, plan: licence.plan, daysLeft: licence.daysLeft, owner: licence.owner },
    templates: { rx: RX_TEMPLATES.length, documents: DOC_TEMPLATES.length, themes: APP_THEMES.length },
    counts: {
      users: count("hms_users"),
      patients: count("hms_patients"),
      appointments: count("hms_appointments"),
      prescriptions: count("hms_prescriptions"),
      lab: count("hms_lab_orders"),
      imaging: count("hms_imaging_orders"),
      beds: count("hms_beds"),
      medicines: count("hms_medicines"),
      surgeries: count("hms_surgeries"),
      invoices: count("hms_invoices"),
      alerts: count("hms_alerts"),
    },
  })
);
