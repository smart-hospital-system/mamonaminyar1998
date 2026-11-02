import { requireUser } from "@/lib/auth";
import { json, route } from "@/lib/api";
import { generateInsights, noShowRisk } from "@/lib/ai";

export const GET = route(async () => {
  await requireUser();
  return json({ insights: generateInsights(), risk: noShowRisk(8) });
});

export const dynamic = "force-dynamic";
