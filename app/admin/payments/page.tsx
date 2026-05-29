import Link from "next/link";
import { createServiceClient } from "@/lib/supabase/server";
import { formatPrice } from "@/lib/plans";

export const dynamic = "force-dynamic";

const STATUS_OPTIONS = ["all", "pending", "paid", "expired", "cancelled", "refunded"];

export default async function PaymentsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const sp = await searchParams;
  const status = STATUS_OPTIONS.includes(sp.status ?? "") ? sp.status! : "all";

  const admin = createServiceClient();

  let query = admin
    .from("payments")
    .select("id, user_id, plan_tier, amount_cents, status, paid_at, pix_expires_at, created_at")
    .order("created_at", { ascending: false })
    .limit(500);

  if (status !== "all") query = query.eq("status", status);

  const [paymentsResp, authUsersResp] = await Promise.all([
    query,
    admin.auth.admin.listUsers({ perPage: 1000 }),
  ]);

  const payments = paymentsResp.data ?? [];
  const emailMap = new Map(
    (authUsersResp.data?.users ?? []).map((u) => [u.id, u.email])
  );

  const totalPaid = payments
    .filter((p) => p.status === "paid")
    .reduce((s, p) => s + p.amount_cents, 0);

  return (
    <div className="space-y-4">
      <section className="flex items-baseline justify-between flex-wrap gap-3">
        <h1 className="text-2xl font-semibold">Payments</h1>
        <span className="text-xs text-[var(--color-text-muted)]">
          {payments.length} payments shown · {formatPrice(totalPaid)} paid
        </span>
      </section>

      <section className="flex gap-1 flex-wrap">
        {STATUS_OPTIONS.map((s) => {
          const isActive = s === status;
          const href = s === "all" ? "/admin/payments" : `/admin/payments?status=${s}`;
          return (
            <Link
              key={s}
              href={href}
              className={
                "text-xs px-3 py-1.5 rounded-full border no-underline transition-colors " +
                (isActive
                  ? "bg-[var(--color-accent)] border-[var(--color-accent)] text-white"
                  : "border-[var(--color-border)] text-[var(--color-text-muted)] hover:text-white hover:border-[var(--color-accent-2)]")
              }
            >
              {s}
            </Link>
          );
        })}
      </section>

      <section className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-[var(--color-bg-2)] text-[var(--color-text-muted)]">
            <tr>
              <th className="text-left px-3 py-2 font-medium">Created</th>
              <th className="text-left px-3 py-2 font-medium">User</th>
              <th className="text-left px-3 py-2 font-medium">Plan</th>
              <th className="text-right px-3 py-2 font-medium">Amount</th>
              <th className="text-left px-3 py-2 font-medium">Status</th>
              <th className="text-right px-3 py-2 font-medium">Paid at</th>
            </tr>
          </thead>
          <tbody>
            {payments.length === 0 && (
              <tr>
                <td colSpan={6} className="text-center py-6 text-[var(--color-text-muted)]">
                  No payments matching this filter.
                </td>
              </tr>
            )}
            {payments.map((p) => (
              <tr
                key={p.id}
                className="border-t border-[var(--color-border)] hover:bg-[var(--color-bg-2)]"
              >
                <td className="px-3 py-2 text-[var(--color-text-muted)] text-xs">
                  {new Date(p.created_at).toLocaleString()}
                </td>
                <td className="px-3 py-2">
                  <Link
                    href={`/admin/users/${p.user_id}`}
                    className="text-white no-underline hover:underline truncate block max-w-[220px]"
                  >
                    {emailMap.get(p.user_id) ?? p.user_id}
                  </Link>
                </td>
                <td className="px-3 py-2">{p.plan_tier}</td>
                <td className="px-3 py-2 text-right">{formatPrice(p.amount_cents)}</td>
                <td className="px-3 py-2">
                  <PaymentStatus status={p.status} />
                </td>
                <td className="px-3 py-2 text-right text-[var(--color-text-muted)] text-xs">
                  {p.paid_at ? new Date(p.paid_at).toLocaleString() : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
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
