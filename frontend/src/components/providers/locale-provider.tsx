"use client";

import {
  createContext,
  startTransition,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import {
  LOCALE_COOKIE_NAME,
  type Locale,
  createTranslator,
  normalizeLocale,
} from "@/lib/shared/i18n";

type LocaleContextValue = {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: string, vars?: Record<string, string | number>) => string;
};

const LocaleContext = createContext<LocaleContextValue | null>(null);

export function LocaleProvider({
  initialLocale,
  children,
}: {
  initialLocale: Locale;
  children: ReactNode;
}) {
  const router = useRouter();
  const [locale, setLocaleState] = useState<Locale>(initialLocale);

  function persistLocale(nextLocale: Locale) {
    document.documentElement.lang = nextLocale;
    document.cookie = `${LOCALE_COOKIE_NAME}=${nextLocale}; path=/; max-age=31536000; samesite=lax`;
    localStorage.setItem(LOCALE_COOKIE_NAME, nextLocale);
  }

  useEffect(() => {
    persistLocale(locale);
  }, [locale]);

  const value = useMemo<LocaleContextValue>(() => {
    const t = createTranslator(locale);
    return {
      locale,
      setLocale: (nextLocale) => {
        const normalized = normalizeLocale(nextLocale);

        if (normalized === locale) {
          return;
        }

        persistLocale(normalized);
        setLocaleState(normalized);
        startTransition(() => {
          router.refresh();
        });
      },
      t,
    };
  }, [locale, router]);

  return (
    <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>
  );
}

export function useLocale() {
  const context = useContext(LocaleContext);
  if (!context) {
    throw new Error("useLocale must be used inside LocaleProvider");
  }
  return context;
}
