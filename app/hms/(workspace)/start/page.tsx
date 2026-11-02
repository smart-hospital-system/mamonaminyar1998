import { requireHmsPage } from "@/lib/hms/auth";
import { hmsReady } from "@/lib/hms/db";
import { StartSteps } from "./steps";

export const dynamic = "force-dynamic";

export default async function StartPage() {
  const me = await requireHmsPage();
  await hmsReady();
  return <StartSteps role={me.role} />;
}
