import { redirect, notFound } from "next/navigation";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { isAdminEmail } from "@/lib/admin";
import { formatMicroUsd, microUsdToBrl } from "@/lib/sync-log";

export const dynamic = "force-dynamic";

type UserRow = {
  user_id: string;
  email: string | null;
  plan_tier: string;
  subscription_until: string | null;
  profile_count: number;
  syncs_30d: number;
  cost_30d_micro_usd: number;
  total_syncs: number;
};

export default async function AdminUsagePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");
  if (!isAdminEmail(user.email)) notFound();

  const admin = createServiceClient();

  // 1) Auth users
  const { data: authUsersResp } = await admin.auth.admin.listUsers({ perPage: 200 });
  const authUsers = authUsersResp?.users ?? [];

  // 2) users_meta
  const { data: metas } = await admin
    .from("users_meta")
    .select("user_id, plan_tier, subscription_until");

  // 3) Profile counts
  const { data: profileCounts } = await admin
    .from("linkedin_profiles")
    .select("user_id");

  // 4) Sync log last 30 days
  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const { data: syncs30d } = await admin
    .from("sync_log")
    .select("user_id, cost_micro_usd")
    .gte("created_at", since);

  // 5) Total syncs ever
  const { data: syncsAll } = await admin.from("sync_log").select("user_id");

  // Aggregate
  const metaMap = new Map(metas?.map((m) => [m.user_id, m]) ?? []);
  const profileCountMap = new Map<string, number>();
  for (const p of profileCounts ?? []) {
    profileCountMap.set(p.user_id, (profileCountMap.get(p.user_id) ?? 0) + 1);
  }
  const syncs30dMap = new Map<string, { count: number; cost: number }>();
  for (const s of syncs30d ?? []) {
    const cur = syncs30dMap.get(s.user_id) ?? { count: 0, cost: 0 };
    cur.count += 1;
    cur.cost += s.cost_micro_usd;
    syncs30dMap.set(s.user_id, cur);
  }
  const totalSyncsMap = new Map<string, number>();
  for (const s of syncsAll ?? []) {
    totalSyncsMap.set(s.user_id, (totalSyncsMap.get(s.user_id) ?? 0) + 1);
  }

  const rows: UserRow[] = authUsers
    .map((u) => {
      const meta = metaMap.get(u.id);
      const s30 = syncs30dMap.get(u.id) ?? { count: 0, cost: 0 };
      return {
        user_id: u.id,
        email: u.email ?? null,
        plan_tier: meta?.plan_tier ?? "free",
        subscription_until: meta?.subscription_until ?? null,
        profile_count: profileCountMap.get(u.id) ?? 0,
        syncs_30d: s30.count,
        cost_30d_micro_usd: s30.cost,
        total_syncs: totalSyncsMap.get(u.id) ?? 0,
      };
    })
    .sort((a, b) => b.cost_30d_micro_usd - a.cost_30d_micro_usd);

  const totalCost30d = rows.reduce((a, r) => a + r.cost_30d_micro_usd, 0);
  const totalSyncs30d = rows.reduce((a, r) => a + r.syncs_30d, 0);

  return (
    <div className="space-y-6">
      <section className="flex items-baseline justify-between">
        <h1 className="text-2xl font-semibold">Admin · Usage</h1>
        <span className="text-xs text-[var(--color-text-muted)]">
          Internal only · {rows.length} users
        </span>
      </section>

      <section className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Stat label="Users total" value={rows.length.toString()} />
        <Stat label="Syncs (30d)" value={totalSyncs30d.toString()} />
        <Stat label="Apify cost (30d)" value={formatMicroUsd(totalCost30d)} />
        <Stat label="≈ BRL (30d)" value={microUsdToBrl(totalCost30d)} />
      </section>

      <section className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-[var(--color-bg-2)] text-[var(--color-text-muted)]">
            <tr>
              <th className="text-left px-3 py-2 font-medium">Email</th>
              <th className="text-left px-3 py-2 font-medium">Plan</th>
              <th className="text-right px-3 py-2 font-medium">Profiles</th>
              <th className="text-right px-3 py-2 font-medium">Syncs 30d</th>
              <th className="text-right px-3 py-2 font-medium">Total syncs</th>
              <th className="text-right px-3 py-2 font-medium">Cost 30d</th>
              <th className="text-right px-3 py-2 font-medium">≈ BRL</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr>
                <td colSpan={7} className="text-center py-6 text-[var(--color-text-muted)]">
                  No users yet.
                </td>
              </tr>
            )}
            {rows.map((r) => {
              const active =
                r.subscription_until &&
                new Date(r.subscription_until) > new Date();
              return (
                <tr key={r.user_id} className="border-t border-[var(--color-border)]">
                  <td className="px-3 py-2 truncate max-w-[260px]">{r.email}</td>
                  <td className="px-3 py-2">
                    <span
                      className={
                        "text-xs uppercase tracking-wide px-2 py-0.5 rounded border " +
                        (active && r.plan_tier !== "free"
                          ? "bg-[#0f3a1f] text-[#7ee2a5] border-[#1f5a36]"
                          : "bg-[var(--color-bg-2)] text-[var(--color-text-muted)] border-[var(--color-border)]")
                      }
                    >
                      {active ? r.plan_tier : "free"}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-right">{r.profile_count}</td>
                  <td className="px-3 py-2 text-right">{r.syncs_30d}</td>
                  <td className="px-3 py-2 text-right text-[var(--color-text-muted)]">
                    {r.total_syncs}
                  </td>
                  <td className="px-3 py-2 text-right">
                    {formatMicroUsd(r.cost_30d_micro_usd)}
                  </td>
                  <td className="px-3 py-2 text-right text-[var(--color-text-muted)]">
                    {microUsdToBrl(r.cost_30d_micro_usd)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </section>

      <p className="text-xs text-[var(--color-text-muted)]">
        Costs are estimates based on Apify per-item pricing
        (posts $0.002, reactions $0.002, comments $0.002, profile details $0.004). BRL at R$ 5,00/USD.
      </p>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded p-3">
      <div className="text-[10px] uppercase tracking-wide text-[var(--color-text-muted)]">
        {label}
      </div>
      <div className="text-xl font-semibold mt-1">{value}</div>
    </div>
  );
}
