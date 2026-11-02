import { requireUser, logActivity } from "@/lib/auth";
import { body, fail, json, route } from "@/lib/api";
import { get, run } from "@/lib/db";

export const PATCH = route<{ id: string }>(async (req, { params }) => {
  const user = await requireUser();
  const { id } = await params;
  const review = get<{ id: string; comment: string | null }>("SELECT * FROM reviews WHERE id = ?", [id]);
  if (!review) return fail("Review not found", 404);
  const p = await body<{ reply?: string; comment?: string; rating?: number }>(req);
  const sets: string[] = [];
  const values: unknown[] = [];
  if (p.reply !== undefined) {
    sets.push("reply = ?");
    values.push(p.reply || null);
  }
  if (p.comment !== undefined) {
    sets.push("comment = ?");
    values.push(p.comment);
  }
  if (p.rating !== undefined) {
    sets.push("rating = ?");
    values.push(Number(p.rating));
  }
  if (sets.length) run(`UPDATE reviews SET ${sets.join(", ")} WHERE id = ?`, [...values, id]);
  if (p.reply !== undefined) logActivity(user, "replied", "review", id, "Replied to a customer review");
  return json({ ok: true });
});

export const DELETE = route<{ id: string }>(async (_req, { params }) => {
  const user = await requireUser(["owner", "manager"]);
  const { id } = await params;
  run("DELETE FROM reviews WHERE id = ?", [id]);
  logActivity(user, "deleted", "review", id, "Deleted a review");
  return json({ ok: true });
});
