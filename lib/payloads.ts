import type {
  getBookingStatusCounts, getCustomerGrowth, getKpis, getMonthlyRevenue, getPeakHours,
  getRevenueByCategory, getRevenueSeries, getServiceMix, getStaffPerformance,
} from "./analytics";
import type { aiForecast } from "./ai";

export type AnalyticsPayload = {
  range: number;
  kpis: ReturnType<typeof getKpis>;
  series: ReturnType<typeof getRevenueSeries>;
  monthly: ReturnType<typeof getMonthlyRevenue>;
  statuses: ReturnType<typeof getBookingStatusCounts>;
  services: ReturnType<typeof getServiceMix>;
  staff: ReturnType<typeof getStaffPerformance>;
  growth: ReturnType<typeof getCustomerGrowth>;
  peak: ReturnType<typeof getPeakHours>;
  categories: ReturnType<typeof getRevenueByCategory>;
  forecast: ReturnType<typeof aiForecast>;
};
