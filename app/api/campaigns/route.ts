import { requireUser, logActivity, notify } from "@/lib/auth";
import { body, json, route } from "@/lib/api";
import { listCampaigns } from "@/lib/queries";
import { get, run, uid } from "@/lib/db";

export const GET = route(async () => {
  await requireUser();
  const items = listCampaigns();
  const sent = items.filter((i) => i.status === "sent");
  const recipients = sent.reduce((a, b) => a + b.recipients, 0);
  const opened = sent.reduce((a, b) => a + b.opened, 0);
  const clicked = sent.reduce((a, b) => a + b.clicked, 0);
  return json({
    items,
    summary: {
      sent: sent.length,
      recipients,
      openRate: recipients ? Math.round((opened / recipients) * 1000) / 10 : 0,
      clickRate: recipients ? Math.round((clicked / recipients) * 1000) / 10 : 0,
    },
  });
});

export const POST = route(async (req) => {
  const user = await requireUser(["owner", "manager"]);
  const p = await body<{
    name?: string; channel?: string; subject?: string; body?: string; audience?: string;
    scheduled_at?: string; status?: string;
  }>(req);
  if (!p.name?.trim()) return json({ error: "A campaign name is required" }, 422);
  const id = uid("cmp");
  const audience = p.audience ?? "all";
  const audienceCount = get<{ c: number }>(
    audience === "vip"
      ? "SELECT COUNT(*) AS c FROM customers WHERE vip = 1 AND marketing_opt_in = 1"
      : audience === "lapsed"
        ? "SELECT COUNT(*) AS c FROM customers WHERE marketing_opt_in = 1 AND last_visit_at < ?"
        : audience === "birthday"
          ? "SELECT COUNT(*) AS c FROM customers WHERE marketing_opt_in = 1"
          : "SELECT COUNT(*) AS c FROM customers WHERE marketing_opt_in = 1",
    audience === "lapsed" ? [new Date(Date.now() - 60 * 864e5).toISOString()] : []
  );
  run(
    `INSERT INTO campaigns (id, name, channel, subject, body, audience, status, recipients, opened, clicked, scheduled_at, sent_at, created_at)
     VALUES (?,?,?,?,?,?,?,?,0,0,?,NULL,?)`,
    [
      id,
      p.name.trim(),
      p.channel ?? "email",
      p.subject ?? null,
      p.body ?? null,
      audience,
      p.status ?? "draft",
      p.status === "sent" ? Number(audienceCount?.c ?? 0) : Number(audienceCount?.c ?? 0),
      p.scheduled_at ?? null,
      new Date().toISOString(),
    ]
  );
  if (p.status === "sent") {
    run("UPDATE campaigns SET sent_at = ? WHERE id = ?", [new Date().toISOString(), id]);
  }
  logActivity(user, "created", "campaign", id, `Created ${p.channel ?? "email"} campaign “${p.name}”`);
  return json({ ok: true, id, items: listCampaigns() }, 201);
});
