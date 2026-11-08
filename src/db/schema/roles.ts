import { boolean, text, timestamp, uuid, varchar } from "drizzle-orm/pg-core";
import { securitySchema } from "./namespaces";

export const SYSTEM_ROLE_CODES = [
  "SYSTEM_ADMIN",
  "GENERAL_ADMIN",
  "DEPARTMENT_MANAGER",
  "DOCTOR",
  "NURSE",
  "MIDWIFE",
  "LAB_STAFF",
  "RADIOLOGY_STAFF",
  "PHARMACY_MANAGER",
  "ACCOUNTANT",
  "RECEPTIONIST",
] as const;

export const roles = securitySchema.table("roles", {
  id: uuid("id").primaryKey().defaultRandom(),
  code: varchar("code", { length: 60 }).notNull().unique("roles_code_unique"),
  name: varchar("name", { length: 120 }).notNull(),
  description: text("description"),
  isSystemRole: boolean("is_system_role").notNull().default(false),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
    .notNull()
    .defaultNow(),
});
