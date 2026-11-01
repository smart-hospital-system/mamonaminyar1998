import { requireUser, logActivity } from "@/lib/auth";
import { body, json, route } from "@/lib/api";
import { listReferrals } from "@/lib/queries";
import { run, uid } from "@/lib/db";

export const GET = route(async () => {
  await requireUser();
  const items = listReferrals();
  return json({
    items,
    summary: {
      total: items.length,
      rewarded: items.filter((i) => i.status === "rewarded").length,
      pending: items.filter((i) => i.status === "pending").length,
      value: items.reduce((a, b) => a + (b.status === "rewarded" ? b.reward : 0), 0),
    },
  });
});

export const POST = route(async (req) => {
  const user = await requireUser();
  const p = await body<{ referrer_customer_id?: string; referred_name?: string; referred_email?: string; reward?: number }>(req);
  if (!p.referrer_customer_id || !p.referred_name) return json({ error: "Referrer and referred name are required" }, 422);
  const id = uid("ref");
  run(
    `INSERT INTO referrals (id, referrer_customer_id, referred_name, referred_email, code, status, reward, created_at)
     VALUES (?,?,?,?,?, 'pending', ?, ?)`,
    [
      id,
      p.referrer_customer_id,
      p.referred_name,
      p.referred_email ?? null,
      `LUM-${Math.random().toString(36).slice(2, 6).toUpperCase()}`,
      Number(p.reward ?? 25),
      new Date().toISOString(),
    ]
  );
  logActivity(user, "created", "referral", id, `Logged referral for ${p.referred_name}`);
  return json({ ok: true, items: listReferrals() }, 201);
});

export const PATCH = route(async (req) => {
  const user = await requireUser(["owner", "manager"]);
  const p = await body<{ id?: string; status?: string }>(req);
  if (!p.id || !p.status) return json({ error: "id and status are required" }, 422);
  run("UPDATE referrals SET status = ? WHERE id = ?", [p.status, p.id]);
  logActivity(user, "updated", "referral", p.id, `Referral marked ${p.status}`);
  return json({ ok: true, items: listReferrals() });
});
