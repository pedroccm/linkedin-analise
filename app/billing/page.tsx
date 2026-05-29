import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getSubscriptionStatus } from "@/lib/subscription";
import { getServerI18n } from "@/lib/i18n/server";
import { PLANS, type PlanTier } from "@/lib/plans";
import { PlanCard } from "./plan-card";

export const dynamic = "force-dynamic";

export default async function BillingPage({
  searchParams,
}: {
  searchParams: Promise<{ reason?: string }>;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const status = await getSubscriptionStatus(user.id);
  const { reason } = await searchParams;
  const t = (await getServerI18n()).dict.billing;

  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      <section>
        <h1 className="text-2xl font-semibold mb-1">{t.title}</h1>
        <p className="text-[var(--color-text-muted)] text-sm">{t.subtitle}</p>
      </section>

      {reason === "limit" && (
        <div className="bg-[#3a2e0f] border border-[#5a4a1f] text-[#f5c563] rounded-lg p-4 text-sm">
          {t.limitWarn}
        </div>
      )}

      <section className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg p-5">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <div className="text-xs uppercase tracking-wide text-[var(--color-text-muted)]">
              {t.currentPlan}
            </div>
            <div className="text-xl font-semibold mt-1">
              {PLANS[status.activeTier].name}
              {!status.isActive && status.tier !== "free" && (
                <span className="ml-2 text-sm text-[var(--color-danger)] font-normal">
                  {t.expired}
                </span>
              )}
            </div>
          </div>
          <div className="text-right">
            <div className="text-xs uppercase tracking-wide text-[var(--color-text-muted)]">
              {t.profiles}
            </div>
            <div className="text-xl font-semibold mt-1">
              {status.profilesUsed} / {status.profileLimit}
            </div>
          </div>
          {status.daysLeft !== null && (
            <div className="text-right">
              <div className="text-xs uppercase tracking-wide text-[var(--color-text-muted)]">
                {t.daysLeft}
              </div>
              <div className="text-xl font-semibold mt-1">{status.daysLeft}</div>
            </div>
          )}
        </div>
      </section>

      <section className="grid md:grid-cols-3 gap-4">
        {(["starter", "pro", "corporate"] as PlanTier[]).map((tier) => (
          <PlanCard
            key={tier}
            plan={PLANS[tier]}
            isCurrent={status.activeTier === tier && status.isActive}
          />
        ))}
      </section>

      <p className="text-xs text-[var(--color-text-muted)] text-center">{t.footer}</p>
    </div>
  );
}
