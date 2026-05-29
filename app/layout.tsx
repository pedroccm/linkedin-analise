import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getSubscriptionStatus } from "@/lib/subscription";
import { ensureLiaUser } from "@/lib/ensure-lia-user";
import { PLANS } from "@/lib/plans";
import { isAdminEmail } from "@/lib/admin";
import { getServerI18n } from "@/lib/i18n/server";
import { I18nProvider } from "@/lib/i18n/client";
import { LocaleSwitcher } from "./locale-switcher";
import "./globals.css";

export const metadata: Metadata = {
  title: "LIA · LinkedIn Intelligence",
  description: "Acompanhe perfis e empresas do LinkedIn",
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) await ensureLiaUser(supabase, user.id);

  const status = user ? await getSubscriptionStatus(user.id) : null;
  const isAdmin = isAdminEmail(user?.email);

  const { locale, dict } = await getServerI18n();
  const t = dict.nav;

  return (
    <html lang={locale}>
      <body>
        <I18nProvider locale={locale} dict={dict}>
          <header className="border-b border-[var(--color-border)] bg-[var(--color-bg-2)]">
            <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between gap-6">
              <div className="flex items-center gap-6">
                <Link href="/" className="text-lg font-semibold text-white no-underline">
                  LIA
                </Link>
                {user && (
                  <nav className="flex items-center gap-4 text-sm">
                    <Link
                      href="/"
                      className="text-[var(--color-text-muted)] hover:text-white no-underline"
                    >
                      {t.profiles}
                    </Link>
                    <Link
                      href="/feed"
                      className="text-[var(--color-text-muted)] hover:text-white no-underline"
                    >
                      {t.feed}
                    </Link>
                    <Link
                      href="/timeline"
                      className="text-[var(--color-text-muted)] hover:text-white no-underline"
                    >
                      {t.timeline}
                    </Link>
                    {isAdmin && (
                      <Link
                        href="/admin"
                        className="text-[var(--color-text-muted)] hover:text-white no-underline"
                      >
                        {t.admin}
                      </Link>
                    )}
                  </nav>
                )}
              </div>
              <div className="flex items-center gap-4 text-sm">
                <LocaleSwitcher />
                {user && status ? (
                  <>
                    <Link
                      href="/billing"
                      className="text-[var(--color-text-muted)] hover:text-white no-underline"
                      title="Manage plan"
                    >
                      <span className="text-white font-medium">
                        {PLANS[status.activeTier].name}
                      </span>
                      <span className="ml-1">
                        · {status.profilesUsed}/{status.profileLimit}
                      </span>
                      {status.daysLeft !== null && status.daysLeft > 0 && (
                        <span className="ml-1">· {status.daysLeft}d</span>
                      )}
                    </Link>
                    <span className="text-[var(--color-text-muted)] hidden sm:inline">
                      {user.email}
                    </span>
                    <form action="/auth/signout" method="post">
                      <button
                        type="submit"
                        className="text-[var(--color-text-muted)] hover:text-white text-sm"
                      >
                        {t.signOut}
                      </button>
                    </form>
                  </>
                ) : (
                  <Link
                    href="/auth/login"
                    className="text-[var(--color-text-muted)] hover:text-white no-underline"
                  >
                    {t.signIn}
                  </Link>
                )}
              </div>
            </div>
          </header>
          <main className="max-w-6xl mx-auto px-6 py-8">{children}</main>
        </I18nProvider>
      </body>
    </html>
  );
}
