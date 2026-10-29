import { redirect } from "next/navigation";
import { getHmsUser } from "@/lib/hms/auth";
import { getCurrentUser } from "@/lib/auth";

/**
 * The hospital is the primary product now, so the root takes staff straight to
 * the ward. The salon booking workspace from the earlier project stays one click
 * away at /login (and is never removed).
 */
export default async function Home() {
  const hmsUser = await getHmsUser();
  if (hmsUser) redirect("/hms");
  const salonUser = await getCurrentUser();
  if (salonUser) redirect("/dashboard");
  redirect("/hms/login");
}
