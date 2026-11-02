import { requireUser } from "@/lib/auth";
import { body, json, route } from "@/lib/api";
import { listNotifications } from "@/lib/queries";
import { run } from "@/lib/db";

export const GET = route(async () => {
  await requireUser();
  const items = listNotifications(40);
  return json({ items, unread: items.filter((n) => !n.read).length });
});

export const PATCH = route(async (req) => {
  await requireUser();
  const p = await body<{ id?: string; all?: boolean }>(req);
  if (p.all) run("UPDATE notifications SET read = 1");
  else if (p.id) run("UPDATE notifications SET read = 1 WHERE id = ?", [p.id]);
  return json({ ok: true, unread: listNotifications(40).filter((n) => !n.read).length });
});
