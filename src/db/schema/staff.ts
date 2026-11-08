import { sql } from "drizzle-orm";
import { check, date, timestamp, uuid, varchar } from "drizzle-orm/pg-core";
import { appSchema } from "./namespaces";

export const EMPLOYMENT_STATUSES = ["ACTIVE", "SUSPENDED", "TERMINATED"] as const;

export const staff = appSchema.table(
  "staff",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    staffNumber: varchar("staff_number", { length: 40 })
      .notNull()
      .unique("staff_staff_number_unique"),
    firstName: varchar("first_name", { length: 100 }).notNull(),
    lastName: varchar("last_name", { length: 100 }).notNull(),
    jobTitle: varchar("job_title", { length: 120 }).notNull(),
    phone: varchar("phone", { length: 30 }),
    employmentStatus: varchar("employment_status", { length: 20 }).notNull(),
    hiredAt: date("hired_at", { mode: "string" }),
    terminatedAt: date("terminated_at", { mode: "string" }),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    check(
      "staff_employment_status_check",
      sql`${table.employmentStatus} in ('ACTIVE', 'SUSPENDED', 'TERMINATED')`,
    ),
    check(
      "staff_employment_period_check",
      sql`${table.terminatedAt} is null or ${table.hiredAt} is null or ${table.terminatedAt} >= ${table.hiredAt}`,
    ),
  ],
);
