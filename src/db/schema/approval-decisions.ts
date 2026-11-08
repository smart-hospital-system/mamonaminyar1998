import { sql } from "drizzle-orm";
import { check, text, timestamp, uuid, varchar } from "drizzle-orm/pg-core";
import { approvalRequests } from "./approval-requests";
import { securitySchema } from "./namespaces";
import { users } from "./users";

export const APPROVAL_DECISIONS = ["APPROVED", "REJECTED"] as const;

export const approvalDecisions = securitySchema.table(
  "approval_decisions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    approvalRequestId: uuid("approval_request_id")
      .notNull()
      .unique("approval_decisions_request_unique")
      .references(() => approvalRequests.id, { onDelete: "restrict" }),
    approverUserId: uuid("approver_user_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    decision: varchar("decision", { length: 20 }).notNull(),
    reason: text("reason"),
    decidedAt: timestamp("decided_at", { withTimezone: true, mode: "date" })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    check(
      "approval_decisions_decision_check",
      sql`${table.decision} in ('APPROVED', 'REJECTED')`,
    ),
  ],
);
