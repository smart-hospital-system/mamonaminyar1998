import { cookies } from "next/headers";
import { getSection } from "./db";
import { isLang, LANG_COOKIE, type Lang } from "./i18n";

/**
 * The language of the person making this request.
 *
 * Order of preference:
 *   1. the cookie set by the switcher in the top bar (per browser, per person)
 *   2. the hospital default chosen in Settings → Identity (for new browsers)
 *   3. English
 *
 * Server-only: this reads `next/headers`, so it must never be imported into a
 * client component. Client components receive the language through the
 * LangProvider in `components/hms/lang-provider.tsx`.
 */
export async function getLang(): Promise<Lang> {
  const jar = await cookies();
  const fromCookie = jar.get(LANG_COOKIE)?.value;
  if (isLang(fromCookie)) return fromCookie;
  try {
    const identity = getSection<Record<string, unknown>>("identity");
    const fallback = identity.language;
    if (isLang(fallback)) return fallback;
  } catch {
    /* the database is not ready yet — English is always safe */
  }
  return "en";
}
