import { text, timestamp, uuid, varchar } from "drizzle-orm/pg-core";
import { securitySchema } from "./namespaces";

export const permissions = securitySchema.table("permissions", {
  id: uuid("id").primaryKey().defaultRandom(),
  code: varchar("code", { length: 100 }).notNull().unique("permissions_code_unique"),
  name: varchar("name", { length: 150 }).notNull(),
  module: varchar("module", { length: 60 }).notNull(),
  description: text("description"),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
    .notNull()
    .defaultNow(),
});
