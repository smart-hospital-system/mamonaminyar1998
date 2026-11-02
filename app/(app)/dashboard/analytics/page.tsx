import { AnalyticsClient } from "@/components/dashboard/analytics-client";
import { guardRole } from "@/lib/auth";
import {
  aiForecastSafe, getBookingStatusCounts, getCustomerGrowth, getKpis, getMonthlyRevenue,
  getPeakHours, getRevenueByCategory, getRevenueSeries, getServiceMix, getStaffPerformance, rangeFor,
} from "@/lib/analytics-bundle";

export const dynamic = "force-dynamic";

export default async function AnalyticsPage() {
  await guardRole(["owner", "manager"]);
  const r = rangeFor(30);
  const initial = {
    range: 30,
    kpis: getKpis(30),
    series: getRevenueSeries(30),
    monthly: getMonthlyRevenue(6),
    statuses: getBookingStatusCounts(30),
    services: getServiceMix(30),
    staff: getStaffPerformance(r.fromIso, r.toIso),
    growth: getCustomerGrowth(6),
    peak: getPeakHours(30),
    categories: getRevenueByCategory(30),
    forecast: aiForecastSafe(14),
  };
  return <AnalyticsClient initial={initial} />;
}
