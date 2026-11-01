import { json, route } from "@/lib/api";
import { requireHmsApi } from "@/lib/hms/auth";
import { hmsReady, getSettings } from "@/lib/hms/db";
import { departmentLoad, forecastOpd, generateFollowUps, insights, noShowRisk } from "@/lib/hms/ai";
import { healthSummary, openAlerts } from "@/lib/hms/alerts";
import {
  departmentMix, hmsKpis, listAdmissions, listAppointments, listBeds, listInvoices, listLabOrders,
  listPrescriptions, listSurgeries, patientChart, recentActivity, revenueSeries, topDiagnoses,
} from "@/lib/hms/queries";

export const GET = route(async () => {
  await requireHmsApi();
  hmsReady();
  const today = new Date().toISOString().slice(0, 10);
  return json({
    kpis: hmsKpis(),
    revenue: revenueSeries(14),
    mix: departmentMix(),
    diagnoses: topDiagnoses(8),
    appointments: listAppointments(today),
    prescriptions: listPrescriptions({ limit: 8 }),
    labs: listLabOrders(),
    beds: listBeds(),
    admissions: listAdmissions(),
    surgeries: listSurgeries(),
    invoices: listInvoices().slice(0, 8),
    alerts: openAlerts(),
    health: healthSummary(),
    insights: insights(),
    load: departmentLoad(),
    forecast: forecastOpd(14),
    followUps: generateFollowUps(),
    noShow: noShowRisk(6),
    activity: recentActivity(10),
    settings: getSettings(),
  });
});

export const dynamic = "force-dynamic";
