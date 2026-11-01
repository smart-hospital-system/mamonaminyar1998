import { body, json, route } from "@/lib/api";
import { requireHmsApi } from "@/lib/hms/auth";
import { getSettings, hAudit, saveSettings, DEFAULT_SETTINGS } from "@/lib/hms/db";
import { APP_THEMES } from "@/lib/hms/templates";

export const GET = route(async () => {
  await requireHmsApi();
  return json({ settings: getSettings(), defaults: DEFAULT_SETTINGS });
});

/** Allowed range for every numeric setting. A value outside the range is a
 *  configuration mistake, not a preference: the monitor, the printer and the
 *  billing rules all read these numbers, so they are clamped to something the
 *  hospital can actually run with. */
const RANGES: Record<string, [min: number, max: number]> = {
  "clinical.default_template": [1, 10],
  "clinical.max_rx_items": [1, 20],
  "clinical.follow_up_days": [1, 365],
  "clinical.lab_turnaround_hours": [1, 168],
  "clinical.imaging_turnaround_hours": [1, 168],
  "billing.consultation_fee": [0, 100000],
  "billing.followup_fee": [0, 100000],
  "billing.bed_daily_rate": [0, 100000],
  "billing.tax_rate": [0, 100],
  "billing.lab_markup": [0, 100],
  "billing.imaging_markup": [0, 100],
  "alerts.interval_minutes": [5, 240],
  "alerts.escalation_hours": [1, 720],
};

/** Settings that may only hold one of a known set of words. */
const ENUMS: Record<string, string[]> = {
  "identity.language": ["en", "fa"],
  "identity.logo_mark": ["cross", "monogram", "shield", "pulse"],
};

const isTruthy = (v: unknown) => !(v === false || v === 0 || v === "0" || v === "false" || v === "no" || v === "" || v === null || v === undefined);

/**
 * Validate and normalise an incoming settings payload.
 * Returns either the cleaned values or a human-readable error naming the field —
 * a half-saved section is worse than a refused one.
 */
function normalise(
  section: string,
  values: Record<string, unknown>
): { ok: true; values: Record<string, unknown> } | { ok: false; error: string } {
  const template = (DEFAULT_SETTINGS[section] ?? {}) as Record<string, unknown>;
  const out: Record<string, unknown> = {};

  for (const [key, raw] of Object.entries(values)) {
    const path = `${section}.${key}`;
    const fallback = template[key];

    if (fallback === undefined) {
      // Unknown keys are refused rather than stored: the settings table should
      // never collect keys nobody reads.
      return { ok: false, error: `“${key}” is not a setting of ${section}.` };
    }

    if (typeof fallback === "boolean") {
      out[key] = isTruthy(raw);
      continue;
    }

    if (typeof fallback === "number") {
      const n = Number(raw);
      if (!Number.isFinite(n)) {
        return { ok: false, error: `“${key}” must be a number.` };
      }
      const range = RANGES[path];
      out[key] = range ? Math.min(range[1], Math.max(range[0], n)) : n;
      continue;
    }

    // Everything else is text.
    const text = String(raw ?? "").trim().slice(0, 500);
    const allowed = ENUMS[path];
    if (allowed && !allowed.includes(text)) {
      return { ok: false, error: `“${key}” must be one of: ${allowed.join(", ")}.` };
    }
    out[key] = text;
  }

  return { ok: true, values: out };
}

/** The appearance section is stored separately (theme.*) and checked here too. */
function normaliseTheme(values: Record<string, unknown>): { ok: true; values: Record<string, unknown> } | { ok: false; error: string } {
  const out: Record<string, unknown> = {};
  const ids = APP_THEMES.map((t) => t.id);

  if (values.active !== undefined) {
    const active = String(values.active);
    if (!ids.includes(active)) return { ok: false, error: `Unknown theme “${active}”.` };
    out.active = active;
  }
  if (values.rx_template !== undefined) {
    const n = Number(values.rx_template);
    if (!Number.isInteger(n) || n < 1 || n > 10) return { ok: false, error: "The prescription design must be a number from 1 to 10." };
    out.rx_template = n;
  }
  if (values.accent !== undefined) {
    const accent = String(values.accent).trim();
    if (!/^#[0-9a-fA-F]{6}$/.test(accent)) return { ok: false, error: "The accent colour must be a hex colour such as #0ea5a4." };
    out.accent = accent;
  }
  return { ok: true, values: out };
}

export const PATCH = route(async (req) => {
  const user = await requireHmsApi(["admin"]);
  const p = await body<{ section?: string; values?: Record<string, unknown> }>(req);
  if (!p.section || !p.values) return json({ error: "Section and values are required." }, 422);
  if (!DEFAULT_SETTINGS[p.section]) return json({ error: `Unknown settings section “${p.section}”.` }, 422);
  if (typeof p.values !== "object" || Array.isArray(p.values)) return json({ error: "Values must be an object." }, 422);

  const checked = p.section === "theme" ? normaliseTheme(p.values) : normalise(p.section, p.values);
  if (!checked.ok) return json({ error: checked.error }, 422);

  saveSettings(p.section, checked.values);
  hAudit(
    user,
    "settings",
    p.section,
    p.section,
    `Updated ${Object.keys(checked.values).length} value(s) in ${p.section}`
  );
  return json({ ok: true, settings: getSettings() });
});

export const dynamic = "force-dynamic";
