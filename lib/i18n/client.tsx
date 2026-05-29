"use client";

import { createContext, useContext } from "react";
import type { Dict } from "./dictionaries";
import type { Locale } from "./config";

type I18nValue = { locale: Locale; dict: Dict };

const I18nContext = createContext<I18nValue | null>(null);

export function I18nProvider({
  locale,
  dict,
  children,
}: {
  locale: Locale;
  dict: Dict;
  children: React.ReactNode;
}) {
  return (
    <I18nContext.Provider value={{ locale, dict }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n(): I18nValue {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18n must be used within I18nProvider");
  return ctx;
}

// Convenience: returns the dictionary directly for ergonomic access (t.home.heading).
export function useDict(): Dict {
  return useI18n().dict;
}

export function useLocale(): Locale {
  return useI18n().locale;
}
