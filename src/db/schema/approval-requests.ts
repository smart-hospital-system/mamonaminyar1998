import { sql } from "drizzle-orm";
import { check, index, jsonb, text, timestamp, uuid, varchar } from "drizzle-orm/pg-core";
import { securitySchema } from "./namespaces";
import { users } from "./users";

export const APPROVAL_REQUEST_STATUSES = [
  "PENDING",
  "APPROVED",
  "REJECTED",
  "EXPIRED",
  "CANCELLED",
  "EXECUTED",
  "FAILED",
] as const;

export type ApprovalPayload = Record<string, unknown>;

export const approvalRequests = securitySchema.table(
  "approval_requests",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    requestType: varchar("request_type", { length: 60 }).notNull(),
    requestedByUserId: uuid("requested_by_user_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    targetReference: varchar("target_reference", { length: 150 }).notNull(),
    requestPayload: jsonb("request_payload").$type<ApprovalPayload>().notNull(),
    payloadHash: text("payload_hash").notNull(),
    status: varchar("status", { length: 20 }).notNull().default("PENDING"),
    expiresAt: timestamp("expires_at", { withTimezone: true, mode: "date" }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
      .notNull()
      .defaultNow(),
    executedAt: timestamp("executed_at", { withTimezone: true, mode: "date" }),
    executionReference: varchar("execution_reference", { length: 150 }),
  },
  (table) => [
    index("approval_requests_status_expires_idx").on(table.status, table.expiresAt),
    check(
      "approval_requests_status_check",
      sql`${table.status} in ('PENDING', 'APPROVED', 'REJECTED', 'EXPIRED', 'CANCELLED', 'EXECUTED', 'FAILED')`,
    ),
    check("approval_requests_expiration_check", sql`${table.expiresAt} > ${table.createdAt}`),
    check(
      "approval_requests_execution_check",
      sql`${table.executedAt} is null or ${table.executedAt} >= ${table.createdAt}`,
    ),
  ],
);
