import { CustomersClient } from "@/components/dashboard/customers-client";
import { getCurrentUser } from "@/lib/auth";
import { listCustomers } from "@/lib/queries";

export const dynamic = "force-dynamic";

export default async function CustomersPage() {
  const user = await getCurrentUser();
  const initial = listCustomers({ sort: "spent", limit: 200 });
  return <CustomersClient initial={initial} canDelete={user?.role === "owner" || user?.role === "manager"} />;
}
