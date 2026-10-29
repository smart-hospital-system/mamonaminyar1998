import { AiStudio } from "@/components/dashboard/ai-studio";
import { aiForecast, generateFollowUps, generateInsights, noShowRisk } from "@/lib/ai";
import { listServices } from "@/lib/queries";
import { all } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function AiPage() {
  const services = listServices(true)
    .filter((s) => s.active)
    .map((s) => ({ id: s.id, name: s.name, category: s.category, duration_min: s.duration_min }));
  const staff = all<{ id: string; name: string; avatar_color: string | null }>(
    "SELECT id, name, avatar_color FROM staff WHERE active = 1 ORDER BY name"
  );

  return (
    <AiStudio
      insights={generateInsights()}
      risk={noShowRisk(8)}
      forecast={aiForecast(14)}
      followUps={generateFollowUps()}
      services={services}
      staff={staff}
    />
  );
}
