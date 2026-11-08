import { sql } from "drizzle-orm";
import { boolean, check, timestamp, unique, uuid, varchar } from "drizzle-orm/pg-core";
import { securitySchema } from "./namespaces";
import { roles } from "./roles";

export const roleGrantRules = securitySchema.table(
  "role_grant_rules",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    grantorRoleId: uuid("grantor_role_id")
      .notNull()
      .references(() => roles.id, { onDelete: "restrict" }),
    targetRoleId: uuid("target_role_id")
      .notNull()
      .references(() => roles.id, { onDelete: "restrict" }),
    scopeType: varchar("scope_type", { length: 20 }).notNull(),
    isAllowed: boolean("is_allowed").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    unique("role_grant_rules_grantor_target_scope_unique").on(
      table.grantorRoleId,
      table.targetRoleId,
      table.scopeType,
    ),
    check(
      "role_grant_rules_scope_type_check",
      sql`${table.scopeType} in ('GLOBAL', 'DEPARTMENT')`,
    ),
  ],
);
