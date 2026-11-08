import { boolean, index, text, timestamp, uuid, varchar } from "drizzle-orm/pg-core";
import { securitySchema } from "./namespaces";
import { users } from "./users";

export const loginAttempts = securitySchema.table(
  "login_attempts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").references(() => users.id, { onDelete: "restrict" }),
    usernameSubmitted: varchar("username_submitted", { length: 80 }).notNull(),
    attemptedAt: timestamp("attempted_at", { withTimezone: true, mode: "date" })
      .notNull()
      .defaultNow(),
    success: boolean("success").notNull(),
    sourceIdentifierHash: text("source_identifier_hash"),
  },
  (table) => [
    index("login_attempts_user_attempted_idx").on(table.userId, table.attemptedAt),
  ],
);
