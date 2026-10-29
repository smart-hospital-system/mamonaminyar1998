import { requireUser } from "@/lib/auth";
import { json, qp, route } from "@/lib/api";
import { listActivity } from "@/lib/queries";

export const GET = route(async (req) => {
  await requireUser();
  const p = qp(req);
  return json({
    items: listActivity({
      entity: p.get("entity") ?? undefined,
      q: p.get("q") ?? undefined,
      limit: p.get("limit") ? Number(p.get("limit")) : 150,
    }),
  });
});
