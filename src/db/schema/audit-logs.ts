import { sql } from "drizzle-orm";
import { check, index, jsonb, text, timestamp, uuid, varchar } from "drizzle-orm/pg-core";
import { departments } from "./departments";
import { securitySchema } from "./namespaces";
import { users } from "./users";

export const AUDIT_OUTCOMES = ["SUCCESS", "FAILURE", "DENIED", "PARTIAL"] as const;
export type AuditData = Record<string, unknown>;

export const auditLogs = securitySchema.table(
  "audit_logs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    eventId: uuid("event_id").notNull().unique("audit_logs_event_id_unique").defaultRandom(),
    actorUserId: uuid("actor_user_id").references(() => users.id, { onDelete: "restrict" }),
    action: varchar("action", { length: 100 }).notNull(),
    resourceType: varchar("resource_type", { length: 80 }).notNull(),
    resourceId: uuid("resource_id"),
    departmentId: uuid("department_id").references(() => departments.id, {
      onDelete: "restrict",
    }),
    beforeData: jsonb("before_data").$type<AuditData>(),
    afterData: jsonb("after_data").$type<AuditData>(),
    outcome: varchar("outcome", { length: 20 }).notNull(),
    sourceIdentifierHash: text("source_identifier_hash"),
    correlationId: uuid("correlation_id").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("audit_logs_created_at_idx").on(table.createdAt),
    index("audit_logs_actor_created_idx").on(table.actorUserId, table.createdAt),
    index("audit_logs_resource_created_idx").on(
      table.resourceType,
      table.resourceId,
      table.createdAt,
    ),
    check(
      "audit_logs_outcome_check",
      sql`${table.outcome} in ('SUCCESS', 'FAILURE', 'DENIED', 'PARTIAL')`,
    ),
  ],
);
