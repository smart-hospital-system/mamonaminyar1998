import { sql } from "drizzle-orm";
import { check, index, text, timestamp, uuid, varchar } from "drizzle-orm/pg-core";
import { securitySchema } from "./namespaces";
import { users } from "./users";

export const SECURITY_ALERT_SEVERITIES = ["LOW", "MEDIUM", "HIGH", "CRITICAL"] as const;
export const SECURITY_ALERT_STATUSES = ["OPEN", "ACKNOWLEDGED", "RESOLVED"] as const;

export const securityAlerts = securitySchema.table(
  "security_alerts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    alertType: varchar("alert_type", { length: 80 }).notNull(),
    severity: varchar("severity", { length: 20 }).notNull(),
    userId: uuid("user_id").references(() => users.id, { onDelete: "restrict" }),
    description: text("description").notNull(),
    // Deliberately not an FK: retention/partitioning must not erase alert history.
    relatedEventId: uuid("related_event_id"),
    status: varchar("status", { length: 20 }).notNull().default("OPEN"),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
      .notNull()
      .defaultNow(),
    resolvedAt: timestamp("resolved_at", { withTimezone: true, mode: "date" }),
    resolvedByUserId: uuid("resolved_by_user_id").references(() => users.id, {
      onDelete: "restrict",
    }),
  },
  (table) => [
    index("security_alerts_status_created_idx").on(table.status, table.createdAt),
    check(
      "security_alerts_severity_check",
      sql`${table.severity} in ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')`,
    ),
    check(
      "security_alerts_status_check",
      sql`${table.status} in ('OPEN', 'ACKNOWLEDGED', 'RESOLVED')`,
    ),
    check(
      "security_alerts_resolution_check",
      sql`${table.resolvedAt} is null or ${table.resolvedAt} >= ${table.createdAt}`,
    ),
  ],
);
