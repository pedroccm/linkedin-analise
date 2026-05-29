export const LOCALES = ["pt", "en"] as const;
export type Locale = (typeof LOCALES)[number];
export const DEFAULT_LOCALE: Locale = "pt";
export const LOCALE_COOKIE = "lia_locale";

export function isLocale(v: unknown): v is Locale {
  return v === "pt" || v === "en";
}
