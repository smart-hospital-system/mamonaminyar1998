"use client";

import { createContext, useContext, useMemo, type ReactNode } from "react";
import { dirOf, t as translate, tx as inline, type Lang } from "@/lib/hms/i18n";

type Ctx = {
  lang: Lang;
  dir: "ltr" | "rtl";
  t: (key: string, vars?: Record<string, string | number>) => string;
  tx: (en: string, fa: string, vars?: Record<string, string | number>) => string;
};

const LangContext = createContext<Ctx>({
  lang: "en",
  dir: "ltr",
  t: (key) => key,
  tx: (_en, fa) => fa,
});

export function LangProvider({ lang, children }: { lang: Lang; children: ReactNode }) {
  const value = useMemo<Ctx>(
    () => ({
      lang,
      dir: dirOf(lang),
      t: (key, vars) => translate(lang, key, vars),
      tx: (en, fa, vars) => inline(lang, en, fa, vars),
    }),
    [lang]
  );
  return <LangContext.Provider value={value}>{children}</LangContext.Provider>;
}

/** `const t = useTr()` inside any client component under the provider. */
export function useTr() {
  return useContext(LangContext).t;
}

/** `const tx = useTx()` — inline bilingual text in client components. */
export function useTx() {
  return useContext(LangContext).tx;
}

export function useLang() {
  return useContext(LangContext);
}
