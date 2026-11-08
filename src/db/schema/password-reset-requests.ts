import { sql } from "drizzle-orm";
import { check, index, text, timestamp, uuid, varchar } from "drizzle-orm/pg-core";
import { securitySchema } from "./namespaces";
import { users } from "./users";

/** Proposed state machine; final names remain subject to service-level review. */
export const PASSWORD_RESET_REQUEST_STATUSES = [
  "PENDING",
  "APPROVED",
  "REJECTED",
  "CANCELLED",
  "COMPLETED",
  "EXPIRED",
] as const;

export const passwordResetRequests = securitySchema.table(
  "password_reset_requests",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    requestedByUserId: uuid("requested_by_user_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    // Nullable until an authorized reset is issued; NULL is not a usable token.
    resetTokenHash: text("reset_token_hash").unique("password_reset_requests_token_hash_unique"),
    status: varchar("status", { length: 20 }).notNull().default("PENDING"),
    expiresAt: timestamp("expires_at", { withTimezone: true, mode: "date" }),
    completedAt: timestamp("completed_at", { withTimezone: true, mode: "date" }),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("password_reset_requests_user_created_idx").on(table.userId, table.createdAt),
    check(
      "password_reset_requests_status_check",
      sql`${table.status} in ('PENDING', 'APPROVED', 'REJECTED', 'CANCELLED', 'COMPLETED', 'EXPIRED')`,
    ),
    check(
      "password_reset_requests_expiration_check",
      sql`${table.expiresAt} is null or ${table.expiresAt} > ${table.createdAt}`,
    ),
    check(
      "password_reset_requests_completion_check",
      sql`${table.completedAt} is null or ${table.completedAt} >= ${table.createdAt}`,
    ),
  ],
);
