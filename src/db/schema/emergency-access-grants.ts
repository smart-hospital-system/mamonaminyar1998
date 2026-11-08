import { sql } from "drizzle-orm";
import { check, index, jsonb, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { securitySchema } from "./namespaces";
import { users } from "./users";

export const emergencyAccessGrants = securitySchema.table(
  "emergency_access_grants",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    requestedByUserId: uuid("requested_by_user_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    reason: text("reason").notNull(),
    grantedPermissions: jsonb("granted_permissions").$type<string[]>().notNull(),
    startedAt: timestamp("started_at", { withTimezone: true, mode: "date" })
      .notNull()
      .defaultNow(),
    expiresAt: timestamp("expires_at", { withTimezone: true, mode: "date" }).notNull(),
    revokedAt: timestamp("revoked_at", { withTimezone: true, mode: "date" }),
    reviewedByUserId: uuid("reviewed_by_user_id").references(() => users.id, {
      onDelete: "restrict",
    }),
    reviewedAt: timestamp("reviewed_at", { withTimezone: true, mode: "date" }),
    reviewNotes: text("review_notes"),
  },
  (table) => [
    index("emergency_access_grants_user_expires_idx").on(table.userId, table.expiresAt),
    check("emergency_access_grants_expiration_check", sql`${table.expiresAt} > ${table.startedAt}`),
    check(
      "emergency_access_grants_revocation_check",
      sql`${table.revokedAt} is null or ${table.revokedAt} >= ${table.startedAt}`,
    ),
    check(
      "emergency_access_grants_review_check",
      sql`${table.reviewedAt} is null or ${table.reviewedAt} >= ${table.startedAt}`,
    ),
  ],
);
