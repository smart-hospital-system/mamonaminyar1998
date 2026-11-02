import { requireUser, logActivity, notify } from "@/lib/auth";
import { body, fail, json, route } from "@/lib/api";
import { listCampaigns } from "@/lib/queries";
import { get, run } from "@/lib/db";

export const PATCH = route<{ id: string }>(async (req, { params }) => {
  const user = await requireUser(["owner", "manager"]);
  const { id } = await params;
  const current = get<Record<string, unknown>>("SELECT * FROM campaigns WHERE id = ?", [id]);
  if (!current) return fail("Campaign not found", 404);
  const p = await body<Record<string, unknown>>(req);

  if (p.action === "send") {
    const audience = (current.audience as string) ?? "all";
    const count = get<{ c: number }>(
      audience === "vip"
        ? "SELECT COUNT(*) AS c FROM customers WHERE vip = 1 AND marketing_opt_in = 1"
        : audience === "lapsed"
          ? "SELECT COUNT(*) AS c FROM customers WHERE marketing_opt_in = 1 AND last_visit_at < ?"
          : "SELECT COUNT(*) AS c FROM customers WHERE marketing_opt_in = 1",
      audience === "lapsed" ? [new Date(Date.now() - 60 * 864e5).toISOString()] : []
    );
    run("UPDATE campaigns SET status = 'sent', sent_at = ?, recipients = ? WHERE id = ?", [
      new Date().toISOString(),
      Number(count?.c ?? 0),
      id,
    ]);
    logActivity(user, "sent", "campaign", id, `Sent campaign “${current.name}” to ${count?.c ?? 0} clients`);
    notify({ type: "marketing", title: "Campaign sent", body: `“${current.name}” went out to ${count?.c ?? 0} clients.`, link: "/dashboard/marketing" });
    return json({ ok: true, items: listCampaigns() });
  }

  run(
    `UPDATE campaigns SET name = ?, channel = ?, subject = ?, body = ?, audience = ?, status = ?, scheduled_at = ? WHERE id = ?`,
    [
      (p.name as string) ?? current.name,
      (p.channel as string) ?? current.channel,
      p.subject !== undefined ? ((p.subject as string) || null) : (current.subject as string),
      p.body !== undefined ? ((p.body as string) || null) : (current.body as string),
      (p.audience as string) ?? current.audience,
      (p.status as string) ?? current.status,
      p.scheduled_at !== undefined ? ((p.scheduled_at as string) || null) : (current.scheduled_at as string),
      id,
    ]
  );
  logActivity(user, "updated", "campaign", id, `Updated campaign “${current.name}”`);
  return json({ ok: true, items: listCampaigns() });
});

export const DELETE = route<{ id: string }>(async (_req, { params }) => {
  const user = await requireUser(["owner", "manager"]);
  const { id } = await params;
  run("DELETE FROM campaigns WHERE id = ?", [id]);
  logActivity(user, "deleted", "campaign", id, "Deleted a campaign");
  return json({ ok: true, items: listCampaigns() });
});
