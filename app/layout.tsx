import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getSubscriptionStatus } from "@/lib/subscription";
import { ensureLiaUser } from "@/lib/ensure-lia-user";
import { PLANS } from "@/lib/plans";
import { isAdminEmail } from "@/lib/admin";
import "./globals.css";

export const metadata: Metadata = {
  title: "LinkedIn Analysis",
  description: "Analyze LinkedIn profiles and their posts via Apify",
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

  return (
    <html lang="en">
      <body>
        <header className="border-b border-[var(--color-border)] bg-[var(--color-bg-2)]">
          <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between gap-6">
            <div className="flex items-center gap-6">
              <Link href="/" className="text-lg font-semibold text-white no-underline">
                LinkedIn Analysis
              </Link>
              {user && (
                <nav className="flex items-center gap-4 text-sm">
                  <Link
                    href="/"
                    className="text-[var(--color-text-muted)] hover:text-white no-underline"
                  >
                    Profiles
                  </Link>
                  <Link
                    href="/feed"
                    className="text-[var(--color-text-muted)] hover:text-white no-underline"
                  >
                    Feed
                  </Link>
                  <Link
                    href="/timeline"
                    className="text-[var(--color-text-muted)] hover:text-white no-underline"
                  >
                    Timeline
                  </Link>
                  {isAdmin && (
                    <Link
                      href="/admin"
                      className="text-[var(--color-text-muted)] hover:text-white no-underline"
                    >
                      Admin
                    </Link>
                  )}
                </nav>
              )}
            </div>
            {user && status ? (
              <div className="flex items-center gap-4 text-sm">
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
                    <span className="ml-1">· {status.daysLeft}d left</span>
                  )}
                </Link>
                <span className="text-[var(--color-text-muted)]">{user.email}</span>
                <form action="/auth/signout" method="post">
                  <button
                    type="submit"
                    className="text-[var(--color-text-muted)] hover:text-white text-sm"
                  >
                    Sign out
                  </button>
                </form>
              </div>
            ) : (
              <Link
                href="/auth/login"
                className="text-sm text-[var(--color-text-muted)] hover:text-white no-underline"
              >
                Sign in
              </Link>
            )}
          </div>
        </header>
        <main className="max-w-6xl mx-auto px-6 py-8">{children}</main>
      </body>
    </html>
  );
}
