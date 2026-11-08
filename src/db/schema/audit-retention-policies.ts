import { sql } from "drizzle-orm";
import { boolean, check, integer, text, timestamp, uuid, varchar } from "drizzle-orm/pg-core";
import { securitySchema } from "./namespaces";
import { users } from "./users";

export const auditRetentionPolicies = securitySchema.table(
  "audit_retention_policies",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    recordType: varchar("record_type", { length: 80 }).notNull(),
    retentionYears: integer("retention_years").notNull(),
    legalBasis: text("legal_basis").notNull(),
    // No retention/delete job becomes active by omission.
    isActive: boolean("is_active").notNull().default(false),
    approvedByUserId: uuid("approved_by_user_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    check("audit_retention_policies_years_check", sql`${table.retentionYears} > 0`),
    check(
      "audit_retention_policies_audit_minimum_check",
      sql`${table.recordType} <> 'audit_logs' or ${table.retentionYears} >= 5`,
    ),
  ],
);
