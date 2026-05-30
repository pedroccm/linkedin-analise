// Localized date + time without seconds (timeStyle "short" omits seconds).
export function fmtDateTime(
  value: string | number | Date | null | undefined
): string {
  if (value == null) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleString(undefined, { dateStyle: "short", timeStyle: "short" });
}

// Time only, no seconds (e.g. "14:32").
export function fmtTime(
  value: string | number | Date | null | undefined
): string {
  if (value == null) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
}

// Day header label (e.g. "qui, 13 mar 2026").
export function fmtDay(
  value: string | number | Date | null | undefined
): string {
  if (value == null) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString(undefined, {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}
