import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { LOCALE_COOKIE, isLocale } from "@/lib/i18n/config";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const { locale } = (await req.json().catch(() => ({}))) as { locale?: string };
  if (!isLocale(locale)) {
    return NextResponse.json({ error: "Invalid locale" }, { status: 400 });
  }

  const res = NextResponse.json({ ok: true, locale });
  // 1 year cookie, applies to everyone (anon + logged in)
  res.cookies.set(LOCALE_COOKIE, locale, {
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
    sameSite: "lax",
  });

  // Persist preference for logged-in users so it follows them across devices
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) {
    await supabase.from("linkedin_users_meta").update({ locale }).eq("user_id", user.id);
  }

  return res;
}
