import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getSubscriptionStatus } from "@/lib/subscription";
import { getServerI18n } from "@/lib/i18n/server";
import { PLANS } from "@/lib/plans";
import { updateAccountName } from "./actions";
import { SubmitButton } from "../submit-button";
import { OrgSection } from "./org-section";

export const dynamic = "force-dynamic";

export default async function AccountPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const { dict } = await getServerI18n();
  const t = dict.account;
  const status = await getSubscriptionStatus(user.id);

  const { data: meta } = await supabase
    .from("linkedin_users_meta")
    .select("full_name, whatsapp")
    .eq("user_id", user.id)
    .maybeSingle();

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <h1 className="text-2xl font-semibold">{t.title}</h1>

      {/* Profile data */}
      <section className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg p-5 space-y-4">
        <h2 className="text-sm font-semibold text-[var(--color-text-muted)] uppercase tracking-wide">
          {t.yourData}
        </h2>
        <div>
          <div className="text-xs text-[var(--color-text-muted)]">{t.email}</div>
          <div className="text-sm">{user.email}</div>
        </div>
        <form action={updateAccountName} className="space-y-3">
          <div className="flex flex-col sm:flex-row gap-2 sm:items-end">
            <label className="block flex-1">
              <span className="text-xs text-[var(--color-text-muted)]">{t.name}</span>
              <input
                name="full_name"
                type="text"
                defaultValue={meta?.full_name ?? ""}
                placeholder={t.namePlaceholder}
                className="mt-1 w-full bg-[var(--color-bg)] border border-[var(--color-border)] rounded px-3 py-2 text-sm focus:outline-none focus:border-[var(--color-accent-2)]"
              />
            </label>
            <label className="block flex-1">
              <span className="text-xs text-[var(--color-text-muted)]">{t.whatsapp}</span>
              <input
                name="whatsapp"
                type="tel"
                defaultValue={meta?.whatsapp ?? ""}
                placeholder={t.whatsappPlaceholder}
                className="mt-1 w-full bg-[var(--color-bg)] border border-[var(--color-border)] rounded px-3 py-2 text-sm focus:outline-none focus:border-[var(--color-accent-2)]"
              />
            </label>
          </div>
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <p className="text-xs text-[var(--color-text-muted)]">{t.whatsappHint}</p>
            <SubmitButton
              idle={t.save}
              pending={t.saving}
              className="bg-[var(--color-accent)] hover:bg-[var(--color-accent-2)] text-white font-medium px-4 py-2 rounded text-sm transition-colors"
            />
          </div>
        </form>
      </section>

      {/* Plan */}
      <section className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg p-5">
        <h2 className="text-sm font-semibold text-[var(--color-text-muted)] uppercase tracking-wide mb-3">
          {t.plan}
        </h2>
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <div className="text-xl font-semibold">{PLANS[status.activeTier].name}</div>
            <div className="text-xs text-[var(--color-text-muted)] mt-1">
              {status.profilesUsed}/{status.profileLimit} {dict.billing.profiles.toLowerCase()}
              {status.daysLeft !== null && status.daysLeft > 0 && ` · ${status.daysLeft} ${dict.billing.daysLeft.toLowerCase()}`}
            </div>
          </div>
          <Link
            href="/billing"
            className="text-sm px-4 py-2 rounded bg-[var(--color-accent)] hover:bg-[var(--color-accent-2)] text-white no-underline transition-colors"
          >
            {t.manageBilling}
          </Link>
        </div>
      </section>

      {/* Organization */}
      <OrgSection a={t} />

      {/* Logout */}
      <section>
        <form action="/auth/signout" method="post">
          <button
            type="submit"
            className="text-sm px-4 py-2 rounded border border-[var(--color-border)] text-[var(--color-text-muted)] hover:text-[var(--color-danger)] hover:border-[var(--color-danger)] transition-colors"
          >
            {t.logout}
          </button>
        </form>
      </section>
    </div>
  );
}
