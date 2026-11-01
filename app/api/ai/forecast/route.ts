import { requireUser } from "@/lib/auth";
import { json, qp, route } from "@/lib/api";
import { aiForecast } from "@/lib/ai";

export const GET = route(async (req) => {
  await requireUser();
  const days = Number(qp(req).get("days") ?? 14);
  return json(aiForecast(days));
});

export const dynamic = "force-dynamic";
