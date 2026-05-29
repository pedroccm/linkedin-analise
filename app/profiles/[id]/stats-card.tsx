import { createClient } from "@/lib/supabase/server";

function fmt(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(n)) return "—";
  if (n >= 1000) return n.toLocaleString();
  return Math.round(n).toString();
}

function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
}

export async function StatsCard({ profileId }: { profileId: string }) {
  const supabase = await createClient();
  const { data: posts } = await supabase
    .from("linkedin_posts")
    .select("reactions_count, comments_count, reposts_count, posted_at, post_type")
    .eq("profile_id", profileId);

  if (!posts || posts.length === 0) return null;

  const likes = posts.map((p) => p.reactions_count ?? 0);
  const comments = posts.map((p) => p.comments_count ?? 0);
  const reposts = posts.map((p) => p.reposts_count ?? 0);

  const totalEngagement = likes.reduce((a, b) => a + b, 0)
    + comments.reduce((a, b) => a + b, 0)
    + reposts.reduce((a, b) => a + b, 0);

  const dates = posts
    .map((p) => p.posted_at)
    .filter((d): d is string => Boolean(d))
    .map((d) => new Date(d).getTime());
  const minDate = dates.length ? new Date(Math.min(...dates)) : null;
  const maxDate = dates.length ? new Date(Math.max(...dates)) : null;

  const repostCount = posts.filter((p) => p.post_type && p.post_type !== "post").length;
  const repostShare = (repostCount / posts.length) * 100;

  const stats = [
    { label: "Posts", value: fmt(posts.length) },
    { label: "Total engagement", value: fmt(totalEngagement) },
    { label: "Avg likes/post", value: fmt(likes.reduce((a, b) => a + b, 0) / likes.length) },
    { label: "Median likes/post", value: fmt(median(likes)) },
    { label: "Avg comments/post", value: fmt(comments.reduce((a, b) => a + b, 0) / comments.length) },
    { label: "Avg reposts/post", value: fmt(reposts.reduce((a, b) => a + b, 0) / reposts.length) },
    { label: "Best post (likes)", value: fmt(Math.max(...likes)) },
    { label: "Reshares share", value: `${repostShare.toFixed(0)}%` },
  ];

  return (
    <section className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg p-5">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-[var(--color-text-muted)] uppercase tracking-wide">
          Stats
        </h3>
        {minDate && maxDate && (
          <span className="text-xs text-[var(--color-text-muted)]">
            {minDate.toLocaleDateString()} → {maxDate.toLocaleDateString()}
          </span>
        )}
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {stats.map((s) => (
          <div key={s.label} className="bg-[var(--color-bg-2)] rounded p-3 border border-[var(--color-border)]">
            <div className="text-[10px] uppercase tracking-wide text-[var(--color-text-muted)]">
              {s.label}
            </div>
            <div className="text-xl font-semibold mt-1">{s.value}</div>
          </div>
        ))}
      </div>
    </section>
  );
}
