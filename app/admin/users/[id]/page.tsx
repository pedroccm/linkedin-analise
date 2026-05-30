import Link from "next/link";
import { notFound } from "next/navigation";
import { createServiceClient } from "@/lib/supabase/server";
import { PLANS, formatPrice, type PlanTier } from "@/lib/plans";
import { microUsdToBrl } from "@/lib/sync-log";
import { fmtDateTime } from "@/lib/format";
import { extendSubscription, setPlanTier } from "../../actions";

export const dynamic = "force-dynamic";

export default async function UserDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const admin = createServiceClient();

  const [authUserResp, metaResp, profilesResp, paymentsResp, syncResp] =
    await Promise.all([
      admin.auth.admin.getUserById(id),
      admin
        .from("linkedin_users_meta")
        .select("plan_tier, subscription_until, full_name, created_at")
        .eq("user_id", id)
        .single(),
      admin
        .from("linkedin_profiles")
        .select(
          "id, profile_type, full_name, handle, profile_url, posts_count, last_synced_at, created_at"
        )
        .eq("user_id", id)
        .order("created_at", { ascending: false }),
      admin
        .from("linkedin_payments")
        .select(
          "id, plan_tier, amount_cents, status, paid_at, pix_expires_at, created_at"
        )
        .eq("user_id", id)
        .order("created_at", { ascending: false }),
      admin
        .from("linkedin_sync_log")
        .select("sync_type, items_returned, cost_micro_usd, created_at")
        .eq("user_id", id)
        .order("created_at", { ascending: false })
        .limit(50),
    ]);

  const authUser = authUserResp.data?.user;
  if (!authUser) notFound();

  const meta = metaResp.data;
  const tier = (meta?.plan_tier as PlanTier) ?? "free";
  const active =
    Boolean(meta?.subscription_until) &&
    new Date(meta!.subscription_until!) > new Date();
  const profiles = profilesResp.data ?? [];
  const payments = paymentsResp.data ?? [];
  const syncs = syncResp.data ?? [];

  const totalCostMicro = syncs.reduce((s, x) => s + (x.cost_micro_usd ?? 0), 0);
  const paidTotalCents = payments
    .filter((p) => p.status === "paid")
    .reduce((s, p) => s + p.amount_cents, 0);

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/admin/users"
          className="text-sm text-[var(--color-text-muted)] no-underline hover:text-white"
        >
          ← Users
        </Link>
      </div>

      <section className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg p-5">
        <div className="flex items-start justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-xl font-semibold">{authUser.email}</h1>
            {meta?.full_name && (
              <p className="text-sm text-[var(--color-text-muted)]">{meta.full_name}</p>
            )}
            <p className="text-xs text-[var(--color-text-muted)] mt-1">
              Signed up{" "}
              {authUser.created_at
                ? fmtDateTime(authUser.created_at)
                : "?"}{" "}
              · ID {authUser.id}
            </p>
          </div>
          <div className="text-right">
            <span
              className={
                "text-xs uppercase tracking-wide px-2 py-0.5 rounded border " +
                (active && tier !== "free"
                  ? "bg-[#0f3a1f] text-[#7ee2a5] border-[#1f5a36]"
                  : "bg-[var(--color-bg-2)] text-[var(--color-text-muted)] border-[var(--color-border)]")
              }
            >
              {active ? tier : "free"}
            </span>
            {meta?.subscription_until && (
              <p className="text-xs text-[var(--color-text-muted)] mt-1">
                Until {new Date(meta.subscription_until).toLocaleDateString()}
              </p>
            )}
          </div>
        </div>
      </section>

      {/* Admin actions */}
      <section className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg p-5 space-y-4">
        <h2 className="text-sm font-semibold text-[var(--color-text-muted)] uppercase tracking-wide">
          Admin actions
        </h2>

        <div className="flex flex-wrap gap-3 items-center">
          <form action={extendSubscription} className="flex items-center gap-2">
            <input type="hidden" name="user_id" value={authUser.id} />
            <span className="text-sm text-[var(--color-text-muted)]">Extend</span>
            <select
              name="days"
              defaultValue="30"
              className="bg-[var(--color-bg)] border border-[var(--color-border)] rounded px-2 py-1 text-sm"
            >
              <option value="7">7 days</option>
              <option value="30">30 days</option>
              <option value="90">90 days</option>
              <option value="365">1 year</option>
            </select>
            <button
              type="submit"
              className="text-sm px-3 py-1.5 rounded border border-[var(--color-border)] hover:border-[var(--color-accent-2)] text-white"
            >
              Apply
            </button>
          </form>

          <form action={setPlanTier} className="flex items-center gap-2">
            <input type="hidden" name="user_id" value={authUser.id} />
            <span className="text-sm text-[var(--color-text-muted)]">Set plan</span>
            <select
              name="tier"
              defaultValue={tier}
              className="bg-[var(--color-bg)] border border-[var(--color-border)] rounded px-2 py-1 text-sm"
            >
              <option value="free">Free</option>
              <option value="starter">Starter</option>
              <option value="pro">Pro</option>
            </select>
            <button
              type="submit"
              className="text-sm px-3 py-1.5 rounded border border-[var(--color-border)] hover:border-[var(--color-accent-2)] text-white"
            >
              Apply
            </button>
          </form>
        </div>
      </section>

      {/* Summary cards */}
      <section className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Stat label="Profiles" value={profiles.length.toString()} />
        <Stat label="Payments" value={payments.length.toString()} />
        <Stat label="Total paid" value={formatPrice(paidTotalCents)} />
        <Stat label="Apify cost" value={microUsdToBrl(totalCostMicro)} />
      </section>

      {/* Profiles */}
      <section className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg overflow-hidden">
        <div className="px-4 py-3 border-b border-[var(--color-border)] text-sm font-semibold">
          Tracked profiles
        </div>
        <table className="w-full text-sm">
          <thead className="bg-[var(--color-bg-2)] text-[var(--color-text-muted)]">
            <tr>
              <th className="text-left px-3 py-2 font-medium">Type</th>
              <th className="text-left px-3 py-2 font-medium">Name</th>
              <th className="text-left px-3 py-2 font-medium">URL</th>
              <th className="text-right px-3 py-2 font-medium">Posts</th>
              <th className="text-right px-3 py-2 font-medium">Last sync</th>
            </tr>
          </thead>
          <tbody>
            {profiles.length === 0 && (
              <tr>
                <td colSpan={5} className="text-center py-4 text-[var(--color-text-muted)]">
                  No profiles tracked.
                </td>
              </tr>
            )}
            {profiles.map((p) => (
              <tr key={p.id} className="border-t border-[var(--color-border)]">
                <td className="px-3 py-2 text-xs text-[var(--color-text-muted)]">
                  {p.profile_type}
                </td>
                <td className="px-3 py-2">{p.full_name || p.handle || "—"}</td>
                <td className="px-3 py-2 text-[var(--color-text-muted)] truncate max-w-[260px]">
                  {p.profile_url}
                </td>
                <td className="px-3 py-2 text-right">{p.posts_count ?? 0}</td>
                <td className="px-3 py-2 text-right text-[var(--color-text-muted)] text-xs">
                  {p.last_synced_at
                    ? new Date(p.last_synced_at).toLocaleDateString()
                    : "never"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      {/* Payments */}
      <section className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg overflow-hidden">
        <div className="px-4 py-3 border-b border-[var(--color-border)] text-sm font-semibold">
          Payments
        </div>
        <table className="w-full text-sm">
          <thead className="bg-[var(--color-bg-2)] text-[var(--color-text-muted)]">
            <tr>
              <th className="text-left px-3 py-2 font-medium">Created</th>
              <th className="text-left px-3 py-2 font-medium">Plan</th>
              <th className="text-right px-3 py-2 font-medium">Amount</th>
              <th className="text-left px-3 py-2 font-medium">Status</th>
              <th className="text-right px-3 py-2 font-medium">Paid at</th>
            </tr>
          </thead>
          <tbody>
            {payments.length === 0 && (
              <tr>
                <td colSpan={5} className="text-center py-4 text-[var(--color-text-muted)]">
                  No payments yet.
                </td>
              </tr>
            )}
            {payments.map((p) => (
              <tr key={p.id} className="border-t border-[var(--color-border)]">
                <td className="px-3 py-2 text-[var(--color-text-muted)] text-xs">
                  {fmtDateTime(p.created_at)}
                </td>
                <td className="px-3 py-2">{p.plan_tier}</td>
                <td className="px-3 py-2 text-right">{formatPrice(p.amount_cents)}</td>
                <td className="px-3 py-2">
                  <PaymentStatus status={p.status} />
                </td>
                <td className="px-3 py-2 text-right text-[var(--color-text-muted)] text-xs">
                  {p.paid_at ? new Date(p.paid_at).toLocaleDateString() : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      {/* Recent syncs */}
      <section className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg overflow-hidden">
        <div className="px-4 py-3 border-b border-[var(--color-border)] text-sm font-semibold">
          Last 50 sync events
        </div>
        <table className="w-full text-sm">
          <thead className="bg-[var(--color-bg-2)] text-[var(--color-text-muted)]">
            <tr>
              <th className="text-left px-3 py-2 font-medium">When</th>
              <th className="text-left px-3 py-2 font-medium">Type</th>
              <th className="text-right px-3 py-2 font-medium">Items</th>
              <th className="text-right px-3 py-2 font-medium">Cost</th>
            </tr>
          </thead>
          <tbody>
            {syncs.length === 0 && (
              <tr>
                <td colSpan={4} className="text-center py-4 text-[var(--color-text-muted)]">
                  No syncs yet.
                </td>
              </tr>
            )}
            {syncs.map((s, idx) => (
              <tr key={idx} className="border-t border-[var(--color-border)]">
                <td className="px-3 py-2 text-[var(--color-text-muted)] text-xs">
                  {fmtDateTime(s.created_at)}
                </td>
                <td className="px-3 py-2 text-xs">{s.sync_type}</td>
                <td className="px-3 py-2 text-right">{s.items_returned}</td>
                <td className="px-3 py-2 text-right text-[var(--color-text-muted)]">
                  {microUsdToBrl(s.cost_micro_usd)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg p-3">
      <div className="text-[10px] uppercase tracking-wide text-[var(--color-text-muted)]">
        {label}
      </div>
      <div className="text-xl font-semibold mt-1">{value}</div>
    </div>
  );
}

function PaymentStatus({ status }: { status: string }) {
  const tone =
    status === "paid"
      ? "bg-[#0f3a1f] text-[#7ee2a5] border-[#1f5a36]"
      : status === "pending"
      ? "bg-[#3a2e0f] text-[#f5c563] border-[#5a4a1f]"
      : "bg-[var(--color-bg-2)] text-[var(--color-text-muted)] border-[var(--color-border)]";
  return (
    <span className={`text-xs uppercase tracking-wide px-2 py-0.5 rounded border ${tone}`}>
      {status}
    </span>
  );
}
