import { createServiceClient } from "@/lib/supabase/server";
import { PLANS, formatPrice, type PlanTier } from "@/lib/plans";
import { microUsdToBrl } from "@/lib/sync-log";

export const dynamic = "force-dynamic";

function Stat({
  label,
  value,
  sub,
}: {
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg p-4">
      <div className="text-[10px] uppercase tracking-wide text-[var(--color-text-muted)]">
        {label}
      </div>
      <div className="text-2xl font-semibold mt-1">{value}</div>
      {sub && (
        <div className="text-xs text-[var(--color-text-muted)] mt-1">{sub}</div>
      )}
    </div>
  );
}

export default async function AdminDashboardPage() {
  const admin = createServiceClient();
  const now = new Date();
  const since30d = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();

  // Run everything in parallel
  const [authUsersResp, metas, payments30, syncs30, paymentsAll] = await Promise.all([
    admin.auth.admin.listUsers({ perPage: 1000 }),
    admin.from("linkedin_users_meta").select("user_id, plan_tier, subscription_until"),
    admin
      .from("linkedin_payments")
      .select("amount_cents, status, paid_at, plan_tier")
      .gte("created_at", since30d),
    admin
      .from("linkedin_sync_log")
      .select("cost_micro_usd")
      .gte("created_at", since30d),
    admin.from("linkedin_payments").select("amount_cents, status, paid_at"),
  ]);

  const authUsers = authUsersResp.data?.users ?? [];
  const totalUsers = authUsers.length;
  const newUsers30d = authUsers.filter(
    (u) => u.created_at && new Date(u.created_at) >= new Date(since30d)
  ).length;

  // Active subs by tier (subscription_until in the future)
  const activeByTier: Record<PlanTier, number> = { free: 0, starter: 0, pro: 0 };
  let activePaid = 0;
  for (const m of metas.data ?? []) {
    const active =
      m.subscription_until && new Date(m.subscription_until) > now;
    const tier = (m.plan_tier as PlanTier) ?? "free";
    if (tier !== "free" && active) {
      activeByTier[tier] += 1;
      activePaid += 1;
    } else {
      activeByTier.free += 1;
    }
  }

  const mrrCents =
    activeByTier.starter * PLANS.starter.priceCents +
    activeByTier.pro * PLANS.pro.priceCents;

  const revenue30dCents = (payments30.data ?? [])
    .filter((p) => p.status === "paid")
    .reduce((sum, p) => sum + (p.amount_cents ?? 0), 0);

  const lifetimeRevenueCents = (paymentsAll.data ?? [])
    .filter((p) => p.status === "paid")
    .reduce((sum, p) => sum + (p.amount_cents ?? 0), 0);

  const pendingPayments = (paymentsAll.data ?? []).filter(
    (p) => p.status === "pending"
  ).length;

  const apifyCost30dMicro = (syncs30.data ?? []).reduce(
    (sum, s) => sum + (s.cost_micro_usd ?? 0),
    0
  );
  const apifyCost30dBrl = (apifyCost30dMicro / 1_000_000) * 5.0;
  const grossMargin30dCents = revenue30dCents - apifyCost30dBrl * 100;

  return (
    <div className="space-y-6">
      <section>
        <h1 className="text-2xl font-semibold">Admin Dashboard</h1>
        <p className="text-sm text-[var(--color-text-muted)]">
          Quick overview of users, subscriptions, revenue and infrastructure cost.
        </p>
      </section>

      {/* Revenue */}
      <section>
        <h2 className="text-xs uppercase tracking-wide text-[var(--color-text-muted)] mb-2">
          Revenue
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Stat
            label="MRR (estimated)"
            value={formatPrice(mrrCents)}
            sub={`${activePaid} paying ${activePaid === 1 ? "user" : "users"}`}
          />
          <Stat label="Revenue (30d)" value={formatPrice(revenue30dCents)} />
          <Stat label="Lifetime revenue" value={formatPrice(lifetimeRevenueCents)} />
          <Stat
            label="Gross margin (30d)"
            value={formatPrice(Math.max(0, grossMargin30dCents))}
            sub={`Revenue minus Apify cost`}
          />
        </div>
      </section>

      {/* Users */}
      <section>
        <h2 className="text-xs uppercase tracking-wide text-[var(--color-text-muted)] mb-2">
          Users
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Stat label="Total users" value={totalUsers.toString()} />
          <Stat label="New (30d)" value={newUsers30d.toString()} />
          <Stat label="Active Starter" value={activeByTier.starter.toString()} />
          <Stat label="Active Pro" value={activeByTier.pro.toString()} />
        </div>
      </section>

      {/* Infra */}
      <section>
        <h2 className="text-xs uppercase tracking-wide text-[var(--color-text-muted)] mb-2">
          Infrastructure
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          <Stat
            label="Apify cost (30d)"
            value={microUsdToBrl(apifyCost30dMicro)}
            sub={`$${(apifyCost30dMicro / 1_000_000).toFixed(2)} USD`}
          />
          <Stat
            label="Pending PIX"
            value={pendingPayments.toString()}
            sub="Payments awaiting confirmation"
          />
          <Stat
            label="Conversion (30d)"
            value={
              newUsers30d > 0
                ? `${Math.round((activePaid / Math.max(1, totalUsers)) * 100)}%`
                : "—"
            }
            sub="Paid / total users"
          />
        </div>
      </section>
    </div>
  );
}
