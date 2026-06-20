"use client";

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { NextIntlClientProvider } from "next-intl";
import en from "@/messages/en.json";
import hi from "@/messages/hi.json";
import te from "@/messages/te.json";
import ta from "@/messages/ta.json";
import kn from "@/messages/kn.json";
import mr from "@/messages/mr.json";
import bn from "@/messages/bn.json";
import or from "@/messages/or.json";
import { DEFAULT_LOCALE, isLocaleCode, type LocaleCode } from "@/lib/locale";

const MESSAGES: Record<LocaleCode, typeof en> = { en, hi, te, ta, kn, mr, bn, or };

export const LOCALE_STORAGE_KEY = "rurallink.locale";

interface LocaleSwitcherContextValue {
  setLocale: (locale: LocaleCode) => void;
}

const LocaleSwitcherContext = createContext<LocaleSwitcherContextValue | null>(null);

/** Returns a setter for the active locale; pair with next-intl's own `useLocale()` to read it. */
export function useLocaleSwitcher(): LocaleSwitcherContextValue {
  const context = useContext(LocaleSwitcherContext);
  if (!context) throw new Error("useLocaleSwitcher must be used within IntlProvider");
  return context;
}

export default function IntlProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<LocaleCode>(DEFAULT_LOCALE);

  // localStorage isn't available during SSR, so the page renders in the
  // default locale first and switches client-side once this effect runs —
  // an inherent tradeoff of persisting the choice in localStorage rather
  // than a cookie that the server could read on the initial request.
  useEffect(() => {
    const saved = window.localStorage.getItem(LOCALE_STORAGE_KEY);
    if (saved && isLocaleCode(saved)) setLocaleState(saved);
  }, []);

  const setLocale = useMemo(
    () => (next: LocaleCode) => {
      setLocaleState(next);
      window.localStorage.setItem(LOCALE_STORAGE_KEY, next);
    },
    []
  );

  const contextValue = useMemo(() => ({ setLocale }), [setLocale]);

  return (
    <LocaleSwitcherContext.Provider value={contextValue}>
      <NextIntlClientProvider locale={locale} messages={MESSAGES[locale]} timeZone="Asia/Kolkata">
        {children}
      </NextIntlClientProvider>
    </LocaleSwitcherContext.Provider>
  );
}
