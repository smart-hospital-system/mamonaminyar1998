import { sql } from "drizzle-orm";
import { check, index, text, timestamp, uuid, varchar } from "drizzle-orm/pg-core";
import { securitySchema } from "./namespaces";
import { users } from "./users";

export const authSessions = securitySchema.table(
  "auth_sessions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    tokenHash: text("token_hash").notNull().unique("auth_sessions_token_hash_unique"),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
      .notNull()
      .defaultNow(),
    expiresAt: timestamp("expires_at", { withTimezone: true, mode: "date" }).notNull(),
    revokedAt: timestamp("revoked_at", { withTimezone: true, mode: "date" }),
    revokeReason: varchar("revoke_reason", { length: 100 }),
    lastActivityAt: timestamp("last_activity_at", { withTimezone: true, mode: "date" })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("auth_sessions_user_expires_idx").on(table.userId, table.expiresAt),
    check(
      "auth_sessions_absolute_24h_check",
      sql`${table.expiresAt} = ${table.createdAt} + interval '24 hours'`,
    ),
    check(
      "auth_sessions_revocation_check",
      sql`${table.revokedAt} is null or ${table.revokedAt} >= ${table.createdAt}`,
    ),
    check(
      "auth_sessions_activity_check",
      sql`${table.lastActivityAt} >= ${table.createdAt}`,
    ),
  ],
);
