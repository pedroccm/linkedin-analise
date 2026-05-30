// Localized date + time without seconds (timeStyle "short" omits seconds).
export function fmtDateTime(
  value: string | number | Date | null | undefined
): string {
  if (value == null) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleString(undefined, { dateStyle: "short", timeStyle: "short" });
}
