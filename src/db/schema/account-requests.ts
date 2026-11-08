import { sql } from "drizzle-orm";
import { check, text, timestamp, uuid, varchar } from "drizzle-orm/pg-core";
import { securitySchema } from "./namespaces";
import { staff } from "./staff";
import { users } from "./users";

export const ACCOUNT_REQUEST_STATUSES = [
  "PENDING",
  "APPROVED",
  "REJECTED",
  "CANCELLED",
  "COMPLETED",
] as const;

export const accountRequests = securitySchema.table(
  "account_requests",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    staffId: uuid("staff_id")
      .notNull()
      .references(() => staff.id, { onDelete: "restrict" }),
    requestedUsername: varchar("requested_username", { length: 80 }).notNull(),
    requestedByUserId: uuid("requested_by_user_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    status: varchar("status", { length: 20 }).notNull().default("PENDING"),
    reviewedByUserId: uuid("reviewed_by_user_id").references(() => users.id, {
      onDelete: "restrict",
    }),
    reviewReason: text("review_reason"),
    reviewedAt: timestamp("reviewed_at", { withTimezone: true, mode: "date" }),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    check(
      "account_requests_status_check",
      sql`${table.status} in ('PENDING', 'APPROVED', 'REJECTED', 'CANCELLED', 'COMPLETED')`,
    ),
    check(
      "account_requests_no_self_review_check",
      sql`${table.reviewedByUserId} is null or ${table.reviewedByUserId} <> ${table.requestedByUserId}`,
    ),
    check(
      "account_requests_reviewed_at_check",
      sql`${table.reviewedAt} is null or ${table.reviewedAt} >= ${table.createdAt}`,
    ),
  ],
);
