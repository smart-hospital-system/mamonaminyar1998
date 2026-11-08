import { sql } from "drizzle-orm";
import { check, date, index, timestamp, uniqueIndex, uuid, varchar } from "drizzle-orm/pg-core";
import { departments } from "./departments";
import { appSchema } from "./namespaces";
import { staff } from "./staff";

export const DEPARTMENT_ASSIGNMENT_TYPES = ["PRIMARY", "SECONDARY"] as const;

/** Historical many-to-many membership; no department foreign key lives in staff. */
export const staffDepartments = appSchema.table(
  "staff_departments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    staffId: uuid("staff_id")
      .notNull()
      .references(() => staff.id, { onDelete: "restrict" }),
    departmentId: uuid("department_id")
      .notNull()
      .references(() => departments.id, { onDelete: "restrict" }),
    assignmentType: varchar("assignment_type", { length: 20 }).notNull(),
    startDate: date("start_date", { mode: "string" }).notNull(),
    endDate: date("end_date", { mode: "string" }),
    assignedBy: uuid("assigned_by")
      .notNull()
      .references(() => staff.id, { onDelete: "restrict" }),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("staff_departments_department_id_idx").on(table.departmentId),
    uniqueIndex("staff_departments_open_membership_unique")
      .on(table.staffId, table.departmentId)
      .where(sql`${table.endDate} is null`),
    uniqueIndex("staff_departments_one_active_primary_unique")
      .on(table.staffId)
      .where(sql`${table.assignmentType} = 'PRIMARY' and ${table.endDate} is null`),
    check(
      "staff_departments_assignment_type_check",
      sql`${table.assignmentType} in ('PRIMARY', 'SECONDARY')`,
    ),
    check(
      "staff_departments_period_check",
      sql`${table.endDate} is null or ${table.endDate} >= ${table.startDate}`,
    ),
  ],
);
