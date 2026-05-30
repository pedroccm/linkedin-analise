// Canonical LinkedIn URL: https://www.linkedin.com/<in|company>/<handle> (lowercased).
// Used as the global scrape-cache key so the same person/company maps to one entry
// regardless of how different users pasted the URL.
export function canonicalLinkedinUrl(url: string | null | undefined): string {
  if (!url) return "";
  try {
    const u = new URL(url);
    const parts = u.pathname.split("/").filter(Boolean);
    if (parts.length < 2) return url.toLowerCase();
    return `https://www.linkedin.com/${parts.slice(0, 2).join("/")}`.toLowerCase();
  } catch {
    return url.toLowerCase();
  }
}
