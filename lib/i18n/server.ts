import { cookies, headers } from "next/headers";
import { DEFAULT_LOCALE, LOCALE_COOKIE, isLocale, type Locale } from "./config";
import { getDictionary, type Dict } from "./dictionaries";
import { createClient } from "@/lib/supabase/server";

// Countries that map to Portuguese; everything else falls back to English
// (we only ship pt/en for now).
const PT_COUNTRIES = new Set(["BR", "PT", "AO", "MZ", "CV", "GW", "ST", "TL"]);

function parseNetlifyGeoCountry(raw: string | null): string | null {
  if (!raw) return null;
  try {
    // Netlify sends x-nf-geo as base64-encoded JSON
    const json = JSON.parse(Buffer.from(raw, "base64").toString("utf8"));
    return json?.country?.code ?? null;
  } catch {
    return null;
  }
}

// Resolution order: explicit cookie (set by switcher) > geo IP > Accept-Language > default.
// A logged-in user's saved preference is applied separately in the layout (highest priority).
export async function resolveLocaleFromRequest(): Promise<Locale> {
  const c = await cookies();
  const cookieLoc = c.get(LOCALE_COOKIE)?.value;
  if (isLocale(cookieLoc)) return cookieLoc;

  const h = await headers();

  const country =
    h.get("x-country") ||
    h.get("x-vercel-ip-country") ||
    parseNetlifyGeoCountry(h.get("x-nf-geo"));
  if (country) {
    return PT_COUNTRIES.has(country.toUpperCase()) ? "pt" : "en";
  }

  const accept = (h.get("accept-language") || "").toLowerCase();
  if (accept.startsWith("pt")) return "pt";
  if (accept.startsWith("en")) return "en";

  return DEFAULT_LOCALE;
}

// Single source of truth for server components/pages: a logged-in user's saved
// preference wins; otherwise fall back to request-based detection.
export async function getServerI18n(): Promise<{ locale: Locale; dict: Dict }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let locale = await resolveLocaleFromRequest();
  if (user) {
    const { data: meta } = await supabase
      .from("linkedin_users_meta")
      .select("locale")
      .eq("user_id", user.id)
      .maybeSingle();
    if (isLocale(meta?.locale)) locale = meta.locale;
  }
  return { locale, dict: getDictionary(locale) };
}
