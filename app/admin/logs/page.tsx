import Link from "next/link";
import { createServiceClient } from "@/lib/supabase/server";
import { microUsdToBrl, formatMicroUsd } from "@/lib/sync-log";

export const dynamic = "force-dynamic";

const RANGES = [
  { key: "24h", label: "24h", hours: 24 },
  { key: "7d", label: "7d", hours: 24 * 7 },
  { key: "30d", label: "30d", hours: 24 * 30 },
  { key: "all", label: "All", hours: 0 },
];

const TYPES = ["all", "details_posts", "reactions", "comments", "company_employees"];

function rangeSince(rangeKey: string): string | null {
  const r = RANGES.find((x) => x.key === rangeKey) ?? RANGES[2];
  if (r.hours === 0) return null;
  return new Date(Date.now() - r.hours * 60 * 60 * 1000).toISOString();
}

function buildQs(params: Record<string, string | undefined>): string {
  const out = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v) out.set(k, v);
  }
  const qs = out.toString();
  return qs ? `?${qs}` : "";
}

export default async function LogsPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string; type?: string; user?: string }>;
}) {
  const sp = await searchParams;
  const range = sp.range && RANGES.some((r) => r.key === sp.range) ? sp.range : "30d";
  const type = sp.type && TYPES.includes(sp.type) ? sp.type : "all";
  const userFilter = (sp.user ?? "").trim();

  const since = rangeSince(range);
  const admin = createServiceClient();

  // We need user emails to render and to filter by email substring
  const authUsersResp = await admin.auth.admin.listUsers({ perPage: 1000 });
  const emailMap = new Map(authUsersResp.data?.users.map((u) => [u.id, u.email ?? ""]) ?? []);
  let userIdFilter: string[] | null = null;
  if (userFilter) {
    const lower = userFilter.toLowerCase();
    userIdFilter = [...emailMap.entries()]
      .filter(([, email]) => email.toLowerCase().includes(lower))
      .map(([id]) => id);
    if (userIdFilter.length === 0) userIdFilter = ["__no_match__"];
  }

  // Query the log
  let q = admin
    .from("sync_log")
    .select("id, user_id, profile_id, sync_type, items_returned, cost_micro_usd, created_at")
    .order("created_at", { ascending: false })
    .limit(500);
  if (since) q = q.gte("created_at", since);
  if (type !== "all") q = q.eq("sync_type", type);
  if (userIdFilter) q = q.in("user_id", userIdFilter);

  const { data: logs } = await q;
  const rows = logs ?? [];

  // Aggregations on the same filter (range + type + user) — separate sum query for stable totals
  let aggQ = admin
    .from("sync_log")
    .select("sync_type, items_returned, cost_micro_usd");
  if (since) aggQ = aggQ.gte("created_at", since);
  if (type !== "all") aggQ = aggQ.eq("sync_type", type);
  if (userIdFilter) aggQ = aggQ.in("user_id", userIdFilter);
  const { data: aggRows } = await aggQ;

  const totalCallsInScope = aggRows?.length ?? 0;
  const totalCostMicro = (aggRows ?? []).reduce(
    (s, r) => s + (r.cost_micro_usd ?? 0),
    0
  );
  const totalItems = (aggRows ?? []).reduce(
    (s, r) => s + (r.items_returned ?? 0),
    0
  );

  // Breakdown by type
  const byType = new Map<string, { count: number; cost: number; items: number }>();
  for (const r of aggRows ?? []) {
    const cur = byType.get(r.sync_type) ?? { count: 0, cost: 0, items: 0 };
    cur.count += 1;
    cur.cost += r.cost_micro_usd ?? 0;
    cur.items += r.items_returned ?? 0;
    byType.set(r.sync_type, cur);
  }
  const breakdown = [...byType.entries()].sort((a, b) => b[1].cost - a[1].cost);

  // We also need profile names for the table — fetch in one query
  const profileIds = [...new Set(rows.map((r) => r.profile_id).filter(Boolean))] as string[];
  const profileMap = new Map<string, { full_name: string | null; handle: string | null; profile_type: string }>();
  if (profileIds.length > 0) {
    const { data: profs } = await admin
      .from("linkedin_profiles")
      .select("id, full_name, handle, profile_type")
      .in("id", profileIds);
    for (const p of profs ?? []) {
      profileMap.set(p.id, {
        full_name: p.full_name,
        handle: p.handle,
        profile_type: p.profile_type,
      });
    }
  }

  return (
    <div className="space-y-6">
      <section className="flex items-baseline justify-between flex-wrap gap-3">
        <h1 className="text-2xl font-semibold">API call logs</h1>
        <span className="text-xs text-[var(--color-text-muted)]">
          Showing last {rows.length} events · totals computed across all events in scope
        </span>
      </section>

      {/* Totals */}
      <section className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Stat label="Events" value={totalCallsInScope.toLocaleString()} />
        <Stat label="Items returned" value={totalItems.toLocaleString()} />
        <Stat label="Cost (USD)" value={formatMicroUsd(totalCostMicro)} />
        <Stat label="Cost (BRL)" value={microUsdToBrl(totalCostMicro)} />
      </section>

      {/* Breakdown by type */}
      {breakdown.length > 0 && (
        <section className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg overflow-hidden">
          <div className="px-4 py-3 border-b border-[var(--color-border)] text-sm font-semibold">
            Breakdown by call type
          </div>
          <table className="w-full text-sm">
            <thead className="bg-[var(--color-bg-2)] text-[var(--color-text-muted)]">
              <tr>
                <th className="text-left px-3 py-2 font-medium">Type</th>
                <th className="text-right px-3 py-2 font-medium">Calls</th>
                <th className="text-right px-3 py-2 font-medium">Items</th>
                <th className="text-right px-3 py-2 font-medium">Cost (USD)</th>
                <th className="text-right px-3 py-2 font-medium">Cost (BRL)</th>
              </tr>
            </thead>
            <tbody>
              {breakdown.map(([t, agg]) => (
                <tr key={t} className="border-t border-[var(--color-border)]">
                  <td className="px-3 py-2 font-mono text-xs">{t}</td>
                  <td className="px-3 py-2 text-right">{agg.count}</td>
                  <td className="px-3 py-2 text-right">{agg.items}</td>
                  <td className="px-3 py-2 text-right">{formatMicroUsd(agg.cost)}</td>
                  <td className="px-3 py-2 text-right text-[var(--color-text-muted)]">
                    {microUsdToBrl(agg.cost)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}

      {/* Filters */}
      <section className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg p-4 space-y-3">
        <div className="flex flex-wrap gap-2 items-center">
          <span className="text-xs uppercase tracking-wide text-[var(--color-text-muted)]">
            Period
          </span>
          {RANGES.map((r) => {
            const active = r.key === range;
            return (
              <Link
                key={r.key}
                href={`/admin/logs${buildQs({ range: r.key, type, user: userFilter })}`}
                className={
                  "text-xs px-3 py-1 rounded-full border no-underline transition-colors " +
                  (active
                    ? "bg-[var(--color-accent)] border-[var(--color-accent)] text-white"
                    : "border-[var(--color-border)] text-[var(--color-text-muted)] hover:text-white")
                }
              >
                {r.label}
              </Link>
            );
          })}
        </div>
        <div className="flex flex-wrap gap-2 items-center">
          <span className="text-xs uppercase tracking-wide text-[var(--color-text-muted)]">
            Type
          </span>
          {TYPES.map((t) => {
            const active = t === type;
            return (
              <Link
                key={t}
                href={`/admin/logs${buildQs({ range, type: t, user: userFilter })}`}
                className={
                  "text-xs px-3 py-1 rounded-full border no-underline transition-colors " +
                  (active
                    ? "bg-[var(--color-accent)] border-[var(--color-accent)] text-white"
                    : "border-[var(--color-border)] text-[var(--color-text-muted)] hover:text-white")
                }
              >
                {t}
              </Link>
            );
          })}
        </div>
        <form className="flex items-center gap-2">
          <input type="hidden" name="range" value={range} />
          <input type="hidden" name="type" value={type} />
          <span className="text-xs uppercase tracking-wide text-[var(--color-text-muted)]">
            User email
          </span>
          <input
            name="user"
            type="search"
            defaultValue={userFilter}
            placeholder="filter by email substring"
            className="bg-[var(--color-bg)] border border-[var(--color-border)] rounded px-3 py-1 text-sm focus:outline-none focus:border-[var(--color-accent-2)] flex-1 max-w-xs"
          />
          <button
            type="submit"
            className="text-xs px-3 py-1 rounded border border-[var(--color-border)] hover:border-[var(--color-accent-2)] text-white"
          >
            Apply
          </button>
          {userFilter && (
            <Link
              href={`/admin/logs${buildQs({ range, type })}`}
              className="text-xs text-[var(--color-text-muted)] hover:text-white no-underline"
            >
              clear
            </Link>
          )}
        </form>
      </section>

      {/* Event table */}
      <section className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-[var(--color-bg-2)] text-[var(--color-text-muted)]">
            <tr>
              <th className="text-left px-3 py-2 font-medium">When</th>
              <th className="text-left px-3 py-2 font-medium">User</th>
              <th className="text-left px-3 py-2 font-medium">Profile</th>
              <th className="text-left px-3 py-2 font-medium">Type</th>
              <th className="text-right px-3 py-2 font-medium">Items</th>
              <th className="text-right px-3 py-2 font-medium">Cost</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr>
                <td colSpan={6} className="text-center py-6 text-[var(--color-text-muted)]">
                  No log entries match this filter.
                </td>
              </tr>
            )}
            {rows.map((r) => {
              const prof = r.profile_id ? profileMap.get(r.profile_id) : null;
              return (
                <tr key={r.id} className="border-t border-[var(--color-border)]">
                  <td className="px-3 py-2 text-[var(--color-text-muted)] text-xs whitespace-nowrap">
                    {new Date(r.created_at).toLocaleString()}
                  </td>
                  <td className="px-3 py-2 truncate max-w-[200px]">
                    <Link
                      href={`/admin/users/${r.user_id}`}
                      className="text-white no-underline hover:underline"
                    >
                      {emailMap.get(r.user_id) ?? r.user_id.slice(0, 8)}
                    </Link>
                  </td>
                  <td className="px-3 py-2 truncate max-w-[220px]">
                    {prof ? (
                      <Link
                        href={`/profiles/${r.profile_id}`}
                        className="text-white no-underline hover:underline"
                      >
                        {prof.full_name || prof.handle || "Unknown"}
                      </Link>
                    ) : (
                      <span className="text-[var(--color-text-muted)]">—</span>
                    )}
                    {prof && (
                      <span className="text-[10px] text-[var(--color-text-muted)] ml-2 uppercase">
                        {prof.profile_type}
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-2 font-mono text-xs">{r.sync_type}</td>
                  <td className="px-3 py-2 text-right">{r.items_returned}</td>
                  <td className="px-3 py-2 text-right text-[var(--color-text-muted)]">
                    {microUsdToBrl(r.cost_micro_usd)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </section>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg p-4">
      <div className="text-[10px] uppercase tracking-wide text-[var(--color-text-muted)]">
        {label}
      </div>
      <div className="text-2xl font-semibold mt-1">{value}</div>
    </div>
  );
}
