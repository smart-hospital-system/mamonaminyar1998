import { hAll, hGet, hNow, hRun, hUid, getSection, saveSettings } from "./db";

/* =====================================================================
 * Self-monitoring health engine
 * Scans the whole installation every 30 minutes (client heartbeat), raises
 * alarms by severity and escalates after 48 hours. Never repairs clinical records.
 * ===================================================================== */

export type Severity = "critical" | "warning" | "info";

export type Finding = {
  code: string;
  severity: Severity;
  category: string;
  title: string;
  detail: string;
  link?: string;
  autoFixable: boolean;
  fix?: () => string; // returns a human description of what was repaired
};

export type AlertRow = {
  id: string;
  code: string;
  severity: Severity;
  category: string;
  title: string;
  detail: string | null;
  link: string | null;
  auto_fixable: number;
  status: "open" | "acknowledged" | "resolved";
  first_seen: string;
  last_seen: string;
  due_at: string | null;
  resolved_at: string | null;
  resolution: string | null;
  occurrences: number;
};

/** Run every integrity and business rule and return the current findings. */
export function scan(): Finding[] {
  const out: Finding[] = [];

  /* ---- data integrity -------------------------------------------------- */
  const orphanRx = hGet<{ c: number }>(
    "SELECT COUNT(*) AS c FROM hms_prescriptions r LEFT JOIN hms_patients p ON p.id = r.patient_id WHERE p.id IS NULL"
  );
  if (Number(orphanRx?.c ?? 0) > 0) {
    out.push({
      code: "orphan-prescription",
      severity: "critical",
      category: "Data integrity",
      title: `${orphanRx?.c} prescription(s) reference a deleted patient`,
      detail: "Orphan records break audit reporting and can hide a medication error. Preserve the original links, verify backups and ask the clinician/data custodian to reconcile them manually.",
      link: "/hms/settings?section=alerts",
      autoFixable: false,

    });
  }

  const dupMrn = hGet<{ c: number }>("SELECT COUNT(*) AS c FROM (SELECT mrn FROM hms_patients GROUP BY mrn HAVING COUNT(*) > 1)");
  if (Number(dupMrn?.c ?? 0) > 0) {
    out.push({
      code: "duplicate-mrn",
      severity: "critical",
      category: "Data integrity",
      title: "Duplicate medical record numbers detected",
      detail: "Two patients share an MRN, which can merge histories. Do not renumber automatically; reconcile identity with the responsible staff.",
      link: "/hms/patients",
      autoFixable: false,

    });
  }

  const bedConflict = hGet<{ c: number }>(
    `SELECT COUNT(*) AS c FROM (SELECT bed_id FROM hms_admissions WHERE status = 'admitted' AND bed_id IS NOT NULL
     GROUP BY bed_id HAVING COUNT(*) > 1)`
  );
  if (Number(bedConflict?.c ?? 0) > 0) {
    out.push({
      code: "bed-conflict",
      severity: "critical",
      category: "Inpatient",
      title: "Two patients assigned to the same bed",
      detail: "A bed can only hold one inpatient. Verify the actual bedside situation with ward staff; no automatic reassignment is permitted.",
      link: "/hms/inpatients",
      autoFixable: false,

    });
  }

  /* ---- pharmacy -------------------------------------------------------- */
  const expired = hAll<{ id: string; name: string; batch: string; expiry: string }>(
    "SELECT id, name, batch, expiry FROM hms_medicines WHERE expiry IS NOT NULL AND expiry < date('now') AND active = 1"
  );
  if (expired.length) {
    out.push({
      code: "expired-stock",
      severity: "critical",
      category: "Pharmacy",
      title: `${expired.length} expired medicine batch(es) in active stock`,
      detail: `${expired.slice(0, 3).map((e) => `${e.name} (${e.batch}, exp ${e.expiry})`).join("; ")}. Dispensing expired stock is a patient-safety breach.`,
      link: "/hms/pharmacy?tab=stock",
      autoFixable: false,

    });
  }

  const low = hAll<{ id: string; name: string; stock: number; reorder_level: number }>(
    "SELECT id, name, stock, reorder_level FROM hms_medicines WHERE active = 1 AND stock <= reorder_level ORDER BY stock ASC LIMIT 8"
  );
  if (low.length) {
    out.push({
      code: "low-stock",
      severity: "warning",
      category: "Pharmacy",
      title: `${low.length} medicine(s) at or below reorder level`,
      detail: `${low.map((m) => `${m.name} — ${m.stock} left (reorder at ${m.reorder_level})`).join("; ")}.`,
      link: "/hms/pharmacy?tab=stock",
      autoFixable: false,
    });
  }

  const unsigned = hAll<{ id: string; rx_no: string; created_at: string }>(
    "SELECT id, rx_no, created_at FROM hms_prescriptions WHERE status = 'pending' AND created_at < ? LIMIT 10",
    [new Date(Date.now() - 24 * 3600_000).toISOString()]
  );
  if (unsigned.length) {
    out.push({
      code: "unsigned-rx",
      severity: "warning",
      category: "Clinical",
      title: `${unsigned.length} prescription(s) unsigned for over 24 hours`,
      detail: `${unsigned.map((r) => r.rx_no).join(", ")} cannot be dispensed until the prescriber signs them.`,
      link: "/hms/prescriptions?status=pending",
      autoFixable: false,
    });
  }

  /* ---- workflow -------------------------------------------------------- */
  const stale = hGet<{ c: number }>(
    "SELECT COUNT(*) AS c FROM hms_lab_orders WHERE status != 'verified' AND created_at < ?",
    [new Date(Date.now() - 48 * 3600_000).toISOString()]
  );
  if (Number(stale?.c ?? 0) > 0) {
    out.push({
      code: "lab-overdue",
      severity: "warning",
      category: "Laboratory",
      title: `${stale?.c} lab order(s) open for more than 48 hours`,
      detail: "Results are past the promised turnaround. Escalate to the senior technologist and notify the ordering physician.",
      link: "/hms/lab",
      autoFixable: false,
    });
  }

  const unrereport = hGet<{ c: number }>(
    "SELECT COUNT(*) AS c FROM hms_imaging_orders WHERE status != 'reported' AND created_at < ?",
    [new Date(Date.now() - 36 * 3600_000).toISOString()]
  );
  if (Number(unrereport?.c ?? 0) > 0) {
    out.push({
      code: "imaging-overdue",
      severity: "warning",
      category: "Radiology",
      title: `${unrereport?.c} imaging study(ies) awaiting a report`,
      detail: "Unreported studies delay surgical decisions. Radiologist review is required today.",
      link: "/hms/radiology",
      autoFixable: false,
    });
  }

  const bed = hGet<{ total: number; occupied: number }>(
    "SELECT COUNT(*) AS total, SUM(CASE WHEN status = 'occupied' THEN 1 ELSE 0 END) AS occupied FROM hms_beds"
  );
  const occupancy = bed?.total ? (Number(bed.occupied) / Number(bed.total)) * 100 : 0;
  if (occupancy >= 80) {
    out.push({
      code: "bed-capacity",
      severity: "warning",
      category: "Inpatient",
      title: `Bed occupancy at ${Math.round(occupancy)}%`,
      detail: "Seven or more of the ten beds are in use. Start discharge rounds and keep the high-dependency bed free.",
      link: "/hms/inpatients",
      autoFixable: false,
    });
  }

  const theatre = hGet<{ c: number }>(
    "SELECT COUNT(*) AS c FROM hms_surgeries WHERE status = 'scheduled' AND scheduled_at < ? ",
    [new Date().toISOString()]
  );
  if (Number(theatre?.c ?? 0) > 0) {
    out.push({
      code: "surgery-past",
      severity: "warning",
      category: "Surgery",
      title: `${theatre?.c} surgical case(s) still marked scheduled after their start time`,
      detail: "Update the theatre board to completed, in-progress or cancelled so the list stays truthful.",
      link: "/hms/surgery",
      autoFixable: false,
    });
  }

  const noBed = hGet<{ c: number }>(
    "SELECT COUNT(*) AS c FROM hms_admissions WHERE status = 'admitted' AND bed_id IS NULL"
  );
  if (Number(noBed?.c ?? 0) > 0) {
    out.push({
      code: "admission-without-bed",
      severity: "warning",
      category: "Inpatient",
      title: `${noBed?.c} admitted patient(s) without a bed`,
      detail: "Every inpatient must occupy a bed for billing and safety rounds.",
      link: "/hms/inpatients",
      autoFixable: false,

    });
  }

  /* ---- system ---------------------------------------------------------- */
  const settings = getSection<Record<string, unknown>>("alerts");
  if (settings.enabled === false) {
    out.push({
      code: "monitor-off",
      severity: "warning",
      category: "System",
      title: "Automatic health monitoring is switched off",
      detail: "Without monitoring, expired stock and orphan records go unnoticed. Re-enable it in Settings → Alerts.",
      link: "/hms/settings?section=alerts",
      autoFixable: true,
      fix: () => {
        saveSettings("alerts", { enabled: true });
        return "Re-enabled the 30-minute health monitor.";
      },
    });
  }

  const sessions = hGet<{ c: number }>("SELECT COUNT(*) AS c FROM hms_sessions WHERE expires_at < ?", [hNow()]);
  if (Number(sessions?.c ?? 0) > 0) {
    out.push({
      code: "stale-sessions",
      severity: "info",
      category: "System",
      title: `${sessions?.c} expired session(s) still stored`,
      detail: "Housekeeping only — expired sessions are ignored but should be purged to keep the audit table lean.",
      autoFixable: true,
      fix: () => {
        const r = hRun("DELETE FROM hms_sessions WHERE expires_at < ?", [hNow()]);
        return `Purged ${r.changes} expired session(s).`;
      },
    });
  }

  return out;
}

const MONITOR_CODES = new Set(["orphan-prescription", "duplicate-mrn", "bed-conflict", "expired-stock", "low-stock", "unsigned-rx", "lab-overdue", "imaging-overdue", "bed-capacity", "surgery-past", "admission-without-bed", "monitor-off", "stale-sessions"]);

export function syncAlerts(findings: Finding[]): AlertRow[] {
  const existing = hAll<AlertRow>("SELECT * FROM hms_alerts");
  const now = hNow();
  const configuredHours = Number(getSection<Record<string, unknown>>("alerts").escalation_hours ?? 48);
  const hours = Number.isFinite(configuredHours) ? Math.max(1, Math.min(720, configuredHours)) : 48;
  const due = new Date(Date.now() + hours * 3600_000).toISOString();
  const seen = new Set<string>();

  for (const f of findings) {
    seen.add(f.code);
    const row = existing.find((e) => e.code === f.code && e.status !== "resolved");
    if (row) {
      hRun("UPDATE hms_alerts SET severity = ?, title = ?, detail = ?, last_seen = ?, auto_fixable = ?, occurrences = occurrences + 0 WHERE id = ?", [
        row.due_at && row.due_at < now ? "critical" : f.severity, f.title, f.detail, now, f.autoFixable ? 1 : 0, row.id,
      ]);
    } else {
      const resolvedBefore = existing.find((e) => e.code === f.code && e.status === "resolved");
      if (resolvedBefore) {
        hRun("UPDATE hms_alerts SET status = 'open', severity = ?, title = ?, detail = ?, last_seen = ?, due_at = ?, auto_fixable = ?, resolved_at = NULL WHERE id = ?", [
          f.severity, f.title, f.detail, now, due, f.autoFixable ? 1 : 0, resolvedBefore.id,
        ]);
      } else {
        hRun(
          `INSERT INTO hms_alerts (id, code, severity, category, title, detail, link, auto_fixable, status, first_seen, last_seen, due_at, occurrences)
           VALUES (?,?,?,?,?,?,?,?, 'open', ?,?,?,1)`,
          [hUid("alt"), f.code, f.severity, f.category, f.title, f.detail, f.link ?? null, f.autoFixable ? 1 : 0, now, now, due]
        );
      }
    }
  }

  // anything open that no longer appears in the scan is auto-resolved
  for (const row of existing) {
    if (MONITOR_CODES.has(row.code) && !seen.has(row.code) && row.status !== "resolved") {
      hRun("UPDATE hms_alerts SET status = 'resolved', resolved_at = ?, resolution = ? WHERE id = ?", [
        now, "Condition cleared — verified by the automatic health scan.", row.id,
      ]);
    }
  }

  return openAlerts();
}

export function openAlerts() {
  return hAll<AlertRow>(
    "SELECT * FROM hms_alerts WHERE status != 'resolved' ORDER BY CASE severity WHEN 'critical' THEN 0 WHEN 'warning' THEN 1 ELSE 2 END, last_seen DESC"
  );
}

export function allAlerts(limit = 60) {
  return hAll<AlertRow>("SELECT * FROM hms_alerts ORDER BY last_seen DESC LIMIT ?", [limit]);
}

export function acknowledge(id: string, by: string) {
  hRun("UPDATE hms_alerts SET status = 'acknowledged' WHERE id = ?", [id]);
  hRun(
    "INSERT INTO hms_audit (id, user_id, user_name, action, entity, entity_id, detail, created_at) VALUES (?,?,?,?,?,?,?,?)",
    [hUid("aud"), by, by, "acknowledged", "alert", id, "Acknowledged a health alert", hNow()]
  );
}

export function resolve(id: string, note: string, by: string) {
  hRun("UPDATE hms_alerts SET status = 'resolved', resolved_at = ?, resolution = ? WHERE id = ?", [hNow(), note, id]);
  hRun(
    "INSERT INTO hms_audit (id, user_id, user_name, action, entity, entity_id, detail, created_at) VALUES (?,?,?,?,?,?,?,?)",
    [hUid("aud"), by, by, "resolved", "alert", id, note, hNow()]
  );
}

/** Try the registered repair for an alert code. Returns a description or null. */
export function autoHeal(id: string, by: string): { ok: boolean; message: string } {
  const alert = hGet<AlertRow>("SELECT * FROM hms_alerts WHERE id = ?", [id]);
  if (!alert) return { ok: false, message: "Alert not found." };
  // Explicitly scoped housekeeping only; never execute a clinical/data repair.
  if (!["stale-sessions", "monitor-off"].includes(alert.code)) {
    return { ok: false, message: "Clinical and inventory records require manual authorized review; automatic repair is disabled." };
  }
  const findings = scan();
  const finding = findings.find((f) => f.code === alert.code);
  if (!finding || !finding.fix) {
    return { ok: false, message: "This condition needs a human decision — no automatic repair is defined." };
  }
  const message = finding.fix();
  resolve(id, `Auto-healed: ${message}`, by);
  return { ok: true, message };
}

/** Escalate anything that has breached its 48 hour deadline. */
export function escalateExpired() {
  const expiredRows = hAll<AlertRow>(
    "SELECT * FROM hms_alerts WHERE status IN ('open','acknowledged') AND due_at IS NOT NULL AND due_at < ?",
    [hNow()]
  );
  const report: { code: string; healed: boolean; message: string }[] = [];
  for (const row of expiredRows) {
    hRun("UPDATE hms_alerts SET severity = 'critical' WHERE id = ?", [row.id]);
    report.push({ code: row.code, healed: false, message: "Deadline exceeded: escalated for manual review. Clinical data was not modified." });
  }
  return report;
}

export function healthSummary() {
  const open = openAlerts();
  const critical = open.filter((a) => a.severity === "critical").length;
  const warning = open.filter((a) => a.severity === "warning").length;
  const score = Math.max(0, 100 - critical * 18 - warning * 6);
  return {
    score,
    status: critical > 0 ? "critical" : warning > 0 ? "warning" : "healthy",
    open: open.length,
    critical,
    warning,
    lastScan: hGet<{ last_seen: string }>("SELECT last_seen FROM hms_alerts ORDER BY last_seen DESC LIMIT 1")?.last_seen ?? null,
  };
}
