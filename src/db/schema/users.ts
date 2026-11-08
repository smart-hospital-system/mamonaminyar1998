import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  integer,
  text,
  timestamp,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { securitySchema } from "./namespaces";
import { staff } from "./staff";

export const ACCOUNT_STATUSES = ["ACTIVE", "SUSPENDED", "DISABLED"] as const;

export const users = securitySchema.table(
  "users",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    staffId: uuid("staff_id")
      .notNull()
      .unique("users_staff_id_unique")
      .references(() => staff.id, { onDelete: "restrict" }),
    username: varchar("username", { length: 80 }).notNull().unique("users_username_unique"),
    passwordHash: text("password_hash").notNull(),
    // Account-request approval alone must not make an account usable.
    accountStatus: varchar("account_status", { length: 20 }).notNull().default("DISABLED"),
    mfaEnabled: boolean("mfa_enabled").notNull().default(false),
    mfaMethod: varchar("mfa_method", { length: 30 }),
    failedLoginCount: integer("failed_login_count").notNull().default(0),
    lockedUntil: timestamp("locked_until", { withTimezone: true, mode: "date" }),
    passwordChangedAt: timestamp("password_changed_at", { withTimezone: true, mode: "date" })
      .notNull()
      .defaultNow(),
    lastLoginAt: timestamp("last_login_at", { withTimezone: true, mode: "date" }),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    check(
      "users_account_status_check",
      sql`${table.accountStatus} in ('ACTIVE', 'SUSPENDED', 'DISABLED')`,
    ),
    check("users_failed_login_count_check", sql`${table.failedLoginCount} >= 0`),
    check(
      "users_mfa_method_check",
      sql`${table.mfaEnabled} = false or ${table.mfaMethod} is not null`,
    ),
  ],
);
