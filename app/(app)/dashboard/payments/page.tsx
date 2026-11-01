import { PaymentsClient } from "@/components/dashboard/payments-client";
import { getCurrentUser } from "@/lib/auth";
import { all } from "@/lib/db";
import { listPayments } from "@/lib/queries";
import { guardRole } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function PaymentsPage() {
  await guardRole(["owner", "manager"]);
  const user = await getCurrentUser();
  const initial = listPayments({ limit: 200 });
  const customers = all<{ id: string; name: string; email: string | null }>(
    "SELECT id, name, email FROM customers ORDER BY name LIMIT 500"
  );

  return (
    <PaymentsClient
      initial={initial}
      customers={customers}
      canManage={user?.role === "owner" || user?.role === "manager"}
    />
  );
}
