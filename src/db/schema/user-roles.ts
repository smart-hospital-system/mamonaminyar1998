import { sql } from "drizzle-orm";
import { check, index, timestamp, uniqueIndex, uuid, varchar } from "drizzle-orm/pg-core";
import { departments } from "./departments";
import { securitySchema } from "./namespaces";
import { roles } from "./roles";
import { users } from "./users";

export const ROLE_SCOPE_TYPES = ["GLOBAL", "DEPARTMENT"] as const;

export const userRoles = securitySchema.table(
  "user_roles",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    roleId: uuid("role_id")
      .notNull()
      .references(() => roles.id, { onDelete: "restrict" }),
    scopeType: varchar("scope_type", { length: 20 }).notNull(),
    departmentId: uuid("department_id").references(() => departments.id, {
      onDelete: "restrict",
    }),
    assignedByUserId: uuid("assigned_by_user_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    assignedAt: timestamp("assigned_at", { withTimezone: true, mode: "date" })
      .notNull()
      .defaultNow(),
    expiresAt: timestamp("expires_at", { withTimezone: true, mode: "date" }),
    revokedAt: timestamp("revoked_at", { withTimezone: true, mode: "date" }),
  },
  (table) => [
    index("user_roles_user_id_idx").on(table.userId),
    index("user_roles_role_id_idx").on(table.roleId),
    check("user_roles_scope_type_check", sql`${table.scopeType} in ('GLOBAL', 'DEPARTMENT')`),
    check(
      "user_roles_scope_department_check",
      sql`(${table.scopeType} = 'GLOBAL' and ${table.departmentId} is null) or (${table.scopeType} = 'DEPARTMENT' and ${table.departmentId} is not null)`,
    ),
    check(
      "user_roles_expiration_check",
      sql`${table.expiresAt} is null or ${table.expiresAt} > ${table.assignedAt}`,
    ),
    check(
      "user_roles_revocation_check",
      sql`${table.revokedAt} is null or ${table.revokedAt} >= ${table.assignedAt}`,
    ),
    check("user_roles_no_self_grant_check", sql`${table.userId} <> ${table.assignedByUserId}`),
    // The all-zero UUID is an index-only sentinel; GLOBAL keeps a real NULL FK.
    uniqueIndex("user_roles_one_unrevoked_assignment_unique")
      .on(
        table.userId,
        table.roleId,
        table.scopeType,
        sql`coalesce(${table.departmentId}, '00000000-0000-0000-0000-000000000000'::uuid)`,
      )
      .where(sql`${table.revokedAt} is null`),
  ],
);
