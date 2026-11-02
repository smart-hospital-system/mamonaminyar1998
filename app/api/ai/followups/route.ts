import { requireUser, logActivity, notify } from "@/lib/auth";
import { body, json, route } from "@/lib/api";
import { generateFollowUps } from "@/lib/ai";

export const GET = route(async () => {
  await requireUser();
  return json({ items: generateFollowUps() });
});

export const POST = route(async (req) => {
  const user = await requireUser();
  const { ids } = await body<{ ids?: string[] }>(req);
  const items = generateFollowUps();
  const selected = ids?.length ? items.filter((i) => ids.includes(i.id)) : items;
  logActivity(
    user,
    "sent",
    "campaign",
    null,
    `AI follow-ups queued for ${selected.length} client${selected.length === 1 ? "" : "s"}`
  );
  notify({
    type: "ai",
    title: "AI follow-ups queued",
    body: `${selected.length} personalised message${selected.length === 1 ? "" : "s"} will send over the next 24 hours.`,
    link: "/dashboard/ai",
  });
  return json({ ok: true, queued: selected.map((s) => ({ id: s.id, customer: s.customer_name, channel: s.channel })) });
});
