import { MarketingClient } from "@/components/dashboard/marketing-client";
import { all } from "@/lib/db";
import { listCampaigns, listCoupons, listReferrals } from "@/lib/queries";
import { guardRole } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function MarketingPage({
  searchParams,
}: {
  searchParams: Promise<{ compose?: string; tab?: string }>;
}) {
  await guardRole(["owner", "manager"]);
  const sp = await searchParams;
  const customers = all<{ id: string; name: string }>("SELECT id, name FROM customers ORDER BY name LIMIT 500");

  return (
    <MarketingClient
      initialCampaigns={listCampaigns()}
      initialCoupons={listCoupons()}
      initialReferrals={listReferrals()}
      customers={customers}
      initialTab={sp.tab}
      composeFrom={sp.compose}
    />
  );
}
