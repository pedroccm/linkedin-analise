import Link from "next/link";
import { createServiceClient } from "@/lib/supabase/server";
import type { PlanTier } from "@/lib/plans";
import { SyncUserButton } from "./sync-user-button";

export const dynamic = "force-dynamic";

type Row = {
  user_id: string;
  email: string | null;
  created_at: string | null;
  plan_tier: PlanTier;
  subscription_until: string | null;
  active: boolean;
  profile_count: number;
};

export default async function UsersListPage() {
  const admin = createServiceClient();

  const [authUsersResp, metas, profileCounts] = await Promise.all([
    admin.auth.admin.listUsers({ perPage: 1000 }),
    admin.from("users_meta").select("user_id, plan_tier, subscription_until"),
    admin.from("linkedin_profiles").select("user_id"),
  ]);

  const metaMap = new Map(metas.data?.map((m) => [m.user_id, m]) ?? []);
  const profileCountMap = new Map<string, number>();
  for (const p of profileCounts.data ?? []) {
    profileCountMap.set(p.user_id, (profileCountMap.get(p.user_id) ?? 0) + 1);
  }

  const rows: Row[] = (authUsersResp.data?.users ?? [])
    .map((u) => {
      const m = metaMap.get(u.id);
      const tier = ((m?.plan_tier as PlanTier) ?? "free") as PlanTier;
      const active =
        Boolean(m?.subscription_until) &&
        new Date(m!.subscription_until!) > new Date();
      return {
        user_id: u.id,
        email: u.email ?? null,
        created_at: u.created_at,
        plan_tier: tier,
        subscription_until: m?.subscription_until ?? null,
        active,
        profile_count: profileCountMap.get(u.id) ?? 0,
      };
    })
    .sort(
      (a, b) =>
        new Date(b.created_at ?? 0).getTime() -
        new Date(a.created_at ?? 0).getTime()
    );

  return (
    <div className="space-y-4">
      <section className="flex items-baseline justify-between">
        <h1 className="text-2xl font-semibold">Users</h1>
        <span className="text-xs text-[var(--color-text-muted)]">
          {rows.length} total
        </span>
      </section>

      <section className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-[var(--color-bg-2)] text-[var(--color-text-muted)]">
            <tr>
              <th className="text-left px-3 py-2 font-medium">Email</th>
              <th className="text-left px-3 py-2 font-medium">Signed up</th>
              <th className="text-left px-3 py-2 font-medium">Plan</th>
              <th className="text-left px-3 py-2 font-medium">Until</th>
              <th className="text-right px-3 py-2 font-medium">Profiles</th>
              <th className="text-right px-3 py-2 font-medium">Sync</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr>
                <td colSpan={6} className="text-center py-6 text-[var(--color-text-muted)]">
                  No users yet.
                </td>
              </tr>
            )}
            {rows.map((r) => (
              <tr
                key={r.user_id}
                className="border-t border-[var(--color-border)] hover:bg-[var(--color-bg-2)]"
              >
                <td className="px-3 py-2">
                  <Link
                    href={`/admin/users/${r.user_id}`}
                    className="text-white no-underline hover:underline"
                  >
                    {r.email}
                  </Link>
                </td>
                <td className="px-3 py-2 text-[var(--color-text-muted)]">
                  {r.created_at ? new Date(r.created_at).toLocaleDateString() : "—"}
                </td>
                <td className="px-3 py-2">
                  <span
                    className={
                      "text-xs uppercase tracking-wide px-2 py-0.5 rounded border " +
                      (r.active && r.plan_tier !== "free"
                        ? "bg-[#0f3a1f] text-[#7ee2a5] border-[#1f5a36]"
                        : "bg-[var(--color-bg-2)] text-[var(--color-text-muted)] border-[var(--color-border)]")
                    }
                  >
                    {r.active ? r.plan_tier : "free"}
                  </span>
                </td>
                <td className="px-3 py-2 text-[var(--color-text-muted)]">
                  {r.subscription_until
                    ? new Date(r.subscription_until).toLocaleDateString()
                    : "—"}
                </td>
                <td className="px-3 py-2 text-right">{r.profile_count}</td>
                <td className="px-3 py-2 text-right">
                  {r.profile_count > 0 ? (
                    <SyncUserButton userId={r.user_id} />
                  ) : (
                    <span className="text-xs text-[var(--color-text-muted)]">—</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}
