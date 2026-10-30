/**
 * One way to call the hospital API from a client component.
 *
 * Every mutation returns a result instead of throwing, so a screen can always
 * tell the person what happened. The old pattern — firing a fetch and refreshing
 * the router regardless — showed “saved” even when the server had refused, which
 * is exactly the kind of silence a hospital cannot afford.
 */
/** The language of the person using this browser, read straight from the cookie
 *  the switcher writes — client components cannot ask the server for it. */
function uiLang(): "en" | "fa" {
  if (typeof document === "undefined") return "en";
  return /(?:^|;\s*)aybek_lang=fa(?:;|$)/.test(document.cookie) ? "fa" : "en";
}

const FALLBACK = {
  session: {
    en: "Your session has expired — sign in again.",
    fa: "نشست شما پایان یافته — دوباره وارد شوید.",
  },
  role: {
    en: "Your role is not allowed to do this.",
    fa: "نقش شما اجازهٔ این کار را ندارد.",
  },
  status: { en: "The hospital server answered", fa: "سرور شفاخانه پاسخ داد" },
  network: {
    en: "Network error — the hospital server did not answer.",
    fa: "خطای شبکه — سرور شفاخانه پاسخ نداد.",
  },
};

export type ApiResult<T = Record<string, unknown>> =
  | { ok: true; data: T }
  | { ok: false; error: string; status: number };

export async function send<T = Record<string, unknown>>(
  path: string,
  method: "POST" | "PATCH" | "DELETE",
  payload?: unknown
): Promise<ApiResult<T>> {
  try {
    const res = await fetch(path, {
      method,
      headers: { "content-type": "application/json" },
      body: payload === undefined ? undefined : JSON.stringify(payload),
    });
    let data: Record<string, unknown> = {};
    try {
      data = (await res.json()) as Record<string, unknown>;
    } catch {
      /* an empty body is fine for a 204-style reply */
    }
    if (!res.ok) {
      const lang = uiLang();
      const message =
        (typeof data.error === "string" && data.error) ||
        (res.status === 401
          ? FALLBACK.session[lang]
          : res.status === 403
            ? FALLBACK.role[lang]
            : `${FALLBACK.status[lang]} ${res.status}.`);
      return { ok: false, error: message, status: res.status };
    }
    return { ok: true, data: data as T };
  } catch {
    return { ok: false, error: FALLBACK.network[uiLang()], status: 0 };
  }
}
