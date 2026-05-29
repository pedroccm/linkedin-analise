import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isAdminEmail } from "@/lib/admin";
import { AdminNav } from "./admin-nav";

export const dynamic = "force-dynamic";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");
  if (!isAdminEmail(user.email)) notFound();

  return (
    <div className="grid md:grid-cols-[180px_1fr] gap-6">
      <aside className="md:sticky md:top-6 md:self-start">
        <div className="text-[10px] uppercase tracking-wide text-[var(--color-text-muted)] mb-2 px-3">
          Admin
        </div>
        <AdminNav />
        <div className="mt-6 px-3 text-xs text-[var(--color-text-muted)]">
          <Link href="/" className="hover:text-white no-underline">
            ← Back to app
          </Link>
        </div>
      </aside>
      <div className="min-w-0">{children}</div>
    </div>
  );
}
