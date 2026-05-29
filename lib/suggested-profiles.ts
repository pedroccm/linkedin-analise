// Curated list of well-known LinkedIn public figures ("top voices") shown as
// quick-add suggestions. Public profiles only.
export const SUGGESTED_PROFILES: Array<{ name: string; url: string }> = [
  { name: "Bill Gates", url: "https://www.linkedin.com/in/williamhgates" },
  { name: "Satya Nadella", url: "https://www.linkedin.com/in/satyanadella" },
  { name: "Richard Branson", url: "https://www.linkedin.com/in/rbranson" },
  { name: "Melinda French Gates", url: "https://www.linkedin.com/in/melindagates" },
  { name: "Arianna Huffington", url: "https://www.linkedin.com/in/ariannahuffington" },
  { name: "Gary Vaynerchuk", url: "https://www.linkedin.com/in/garyvaynerchuk" },
  { name: "Simon Sinek", url: "https://www.linkedin.com/in/simonsinek" },
  { name: "Adam Grant", url: "https://www.linkedin.com/in/adammgrant" },
  { name: "Reid Hoffman", url: "https://www.linkedin.com/in/reidhoffman" },
  { name: "Brené Brown", url: "https://www.linkedin.com/in/brenebrown" },
];

// Pick n distinct random suggestions, excluding any already-tracked URLs.
export function pickSuggestions(
  count: number,
  excludeCanonUrls: Set<string>
): Array<{ name: string; url: string }> {
  const pool = SUGGESTED_PROFILES.filter(
    (s) => !excludeCanonUrls.has(s.url.toLowerCase())
  );
  // Fisher-Yates-ish shuffle
  const arr = [...pool];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr.slice(0, count);
}
