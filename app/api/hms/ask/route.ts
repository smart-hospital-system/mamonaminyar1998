import { json, qp, route } from "@/lib/api";
import { requireHmsApi } from "@/lib/hms/auth";
import { answer } from "@/lib/hms/ask";
import { hmsReady } from "@/lib/hms/db";
import { getLang } from "@/lib/hms/lang-server";

/**
 * GET /api/hms/ask?q=…
 *
 * The same deterministic reader the Ask page uses, exposed so the command
 * palette and any future kiosk can ask the hospital a question.
 */
export const GET = route(async (req) => {
  await requireHmsApi();
  await hmsReady();
  const q = (qp(req).get("q") ?? "").trim();
  const lang = await getLang();
  return json({ q, lang, answer: answer(q, lang) });
});

export const dynamic = "force-dynamic";
