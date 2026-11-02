import { requireUser, logActivity } from "@/lib/auth";
import { body, json, route } from "@/lib/api";
import { assistant } from "@/lib/ai";

export const POST = route(async (req) => {
  const user = await requireUser();
  const { message, log } = await body<{ message?: string; log?: boolean }>(req);
  if (!message?.trim()) return json({ error: "A message is required" }, 422);
  const reply = assistant(message);
  if (log !== false) {
    logActivity(user, "asked ai", "ai", null, `AI assistant: “${message.slice(0, 90)}”`);
  }
  return json({ reply, at: new Date().toISOString() });
});
