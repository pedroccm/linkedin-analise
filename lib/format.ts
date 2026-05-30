// Map the app locale ("pt"/"en") to a BCP-47 tag so dates follow the UI language.
function bcp47(locale?: string): string | undefined {
  return locale === "pt" ? "pt-BR" : locale === "en" ? "en-US" : locale || undefined;
}

// Localized date + time without seconds (timeStyle "short" omits seconds).
export function fmtDateTime(
  value: string | number | Date | null | undefined,
  locale?: string
): string {
  if (value == null) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleString(bcp47(locale), { dateStyle: "short", timeStyle: "short" });
}

// Time only, no seconds (e.g. "14:32").
export function fmtTime(
  value: string | number | Date | null | undefined,
  locale?: string
): string {
  if (value == null) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleTimeString(bcp47(locale), { hour: "2-digit", minute: "2-digit" });
}

// Day header label following the app language, without the year (e.g. "qui, 13 mar").
export function fmtDay(
  value: string | number | Date | null | undefined,
  locale?: string
): string {
  if (value == null) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString(bcp47(locale), {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
}
