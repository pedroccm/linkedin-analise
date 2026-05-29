import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getSubscriptionStatus } from "@/lib/subscription";
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

  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      <section>
        <h1 className="text-2xl font-semibold mb-1">Billing</h1>
        <p className="text-[var(--color-text-muted)] text-sm">
          Pay via PIX — instant activation, 30 days of access per payment.
        </p>
      </section>

      {reason === "limit" && (
        <div className="bg-[#3a2e0f] border border-[#5a4a1f] text-[#f5c563] rounded-lg p-4 text-sm">
          You&apos;ve hit the profile limit of your {PLANS[status.activeTier].name} plan
          ({status.profileLimit} profile{status.profileLimit === 1 ? "" : "s"}). Upgrade below to add more.
        </div>
      )}

      <section className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg p-5">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <div className="text-xs uppercase tracking-wide text-[var(--color-text-muted)]">
              Current plan
            </div>
            <div className="text-xl font-semibold mt-1">
              {PLANS[status.activeTier].name}
              {!status.isActive && status.tier !== "free" && (
                <span className="ml-2 text-sm text-[var(--color-danger)] font-normal">
                  (expired)
                </span>
              )}
            </div>
          </div>
          <div className="text-right">
            <div className="text-xs uppercase tracking-wide text-[var(--color-text-muted)]">
              Profiles
            </div>
            <div className="text-xl font-semibold mt-1">
              {status.profilesUsed} / {status.profileLimit}
            </div>
          </div>
          {status.daysLeft !== null && (
            <div className="text-right">
              <div className="text-xs uppercase tracking-wide text-[var(--color-text-muted)]">
                Days left
              </div>
              <div className="text-xl font-semibold mt-1">{status.daysLeft}</div>
            </div>
          )}
        </div>
      </section>

      <section className="grid md:grid-cols-2 gap-4">
        {(["starter", "pro"] as PlanTier[]).map((tier) => (
          <PlanCard
            key={tier}
            plan={PLANS[tier]}
            isCurrent={status.activeTier === tier && status.isActive}
          />
        ))}
      </section>

      <p className="text-xs text-[var(--color-text-muted)] text-center">
        Paying again extends your access by another 30 days from your current expiry.
        Cancel anytime by simply not renewing.
      </p>
    </div>
  );
}
