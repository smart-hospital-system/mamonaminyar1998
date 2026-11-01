import { requireUser } from "@/lib/auth";
import { json, qp, route } from "@/lib/api";
import {
  aiForecastSafe,
  getBookingStatusCounts,
  getCustomerGrowth,
  getKpis,
  getMonthlyRevenue,
  getPeakHours,
  getRevenueByCategory,
  getRevenueSeries,
  getServiceMix,
  getStaffPerformance,
  rangeFor,
} from "@/lib/analytics-bundle";

export const GET = route(async (req) => {
  await requireUser();
  const days = Number(qp(req).get("range") ?? 30);
  const r = rangeFor(days);
  return json({
    range: days,
    kpis: getKpis(days),
    series: getRevenueSeries(Math.min(days, 90)),
    monthly: getMonthlyRevenue(6),
    statuses: getBookingStatusCounts(days),
    services: getServiceMix(days),
    staff: getStaffPerformance(r.fromIso, r.toIso),
    growth: getCustomerGrowth(6),
    peak: getPeakHours(Math.min(days, 60)),
    categories: getRevenueByCategory(days),
    forecast: aiForecastSafe(14),
  });
});
