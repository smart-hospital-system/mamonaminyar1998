import { requireUser } from "@/lib/auth";
import { all } from "@/lib/db";
import { route } from "@/lib/api";
import { NextResponse } from "next/server";

const TABLES = [
  "users", "staff", "staff_schedules", "staff_time_off", "staff_services", "services", "service_addons",
  "customers", "bookings", "waitlist", "payments", "reviews", "coupons", "campaigns", "referrals",
  "notifications", "activity_logs", "settings",
];

export const GET = route(async () => {
  await requireUser(["owner", "manager"]);
  const dump: Record<string, unknown> = {
    exported_at: new Date().toISOString(),
    version: 1,
    tables: {},
  };
  for (const t of TABLES) {
    (dump.tables as Record<string, unknown[]>)[t] = all(`SELECT * FROM ${t}`);
  }
  return new NextResponse(JSON.stringify(dump, null, 2), {
    headers: {
      "content-type": "application/json",
      "content-disposition": `attachment; filename="slotly-backup-${new Date().toISOString().slice(0, 10)}.json"`,
    },
  });
});
