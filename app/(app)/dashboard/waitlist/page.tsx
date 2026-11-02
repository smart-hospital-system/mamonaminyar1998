import { WaitlistClient } from "@/components/dashboard/waitlist-client";
import { all } from "@/lib/db";
import { listWaitlist } from "@/lib/queries";
import { guardRole } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function WaitlistPage() {
  await guardRole(["owner", "manager"]);
  return (
    <WaitlistClient
      initial={listWaitlist()}
      services={all<{ id: string; name: string }>("SELECT id, name FROM services WHERE active = 1 ORDER BY name")}
      staff={all<{ id: string; name: string }>("SELECT id, name FROM staff WHERE active = 1 ORDER BY name")}
      customers={all<{ id: string; name: string }>("SELECT id, name FROM customers ORDER BY name LIMIT 500")}
    />
  );
}
