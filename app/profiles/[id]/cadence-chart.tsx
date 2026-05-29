import { createClient } from "@/lib/supabase/server";
import type { Dict } from "@/lib/i18n/dictionaries";

function weekStart(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - d.getDay()); // Sunday
  return d;
}

export async function CadenceChart({ profileId, t }: { profileId: string; t: Dict["profile"] }) {
  const supabase = await createClient();
  const { data: posts } = await supabase
    .from("linkedin_posts")
    .select("posted_at, reactions_count, comments_count, reposts_count")
    .eq("profile_id", profileId)
    .not("posted_at", "is", null);

  if (!posts || posts.length === 0) return null;

  // Bucket by week (Sun-Sat)
  const buckets = new Map<
    number,
    { count: number; engagement: number; date: Date }
  >();

  for (const p of posts) {
    if (!p.posted_at) continue;
    const w = weekStart(new Date(p.posted_at)).getTime();
    const cur = buckets.get(w) ?? { count: 0, engagement: 0, date: new Date(w) };
    cur.count += 1;
    cur.engagement +=
      (p.reactions_count ?? 0) +
      (p.comments_count ?? 0) +
      (p.reposts_count ?? 0);
    buckets.set(w, cur);
  }

  // Last ~26 weeks (6 months)
  const sorted = [...buckets.values()].sort(
    (a, b) => a.date.getTime() - b.date.getTime()
  );
  const window = sorted.slice(-26);
  const maxCount = Math.max(1, ...window.map((b) => b.count));

  return (
    <section className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg p-5">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-[var(--color-text-muted)] uppercase tracking-wide">
          {t.cadence.title}
        </h3>
        <span className="text-xs text-[var(--color-text-muted)]">
          {t.cadence.last6m} · {window.reduce((a, b) => a + b.count, 0)} {t.cadence.postsShown}
        </span>
      </div>
      <div className="flex items-end gap-1 h-28">
        {window.map((b) => {
          const heightPct = (b.count / maxCount) * 100;
          const title = `${b.date.toLocaleDateString()}: ${b.count} posts · ❤💬↻ ${b.engagement}`;
          return (
            <div
              key={b.date.getTime()}
              className="flex-1 flex flex-col items-center justify-end gap-1 group cursor-help"
              title={title}
            >
              <span className="text-[9px] leading-none text-[var(--color-text-muted)] group-hover:text-white">
                {b.count > 0 ? b.count : ""}
              </span>
              <div
                className="w-full bg-[var(--color-accent)] group-hover:bg-[var(--color-accent-2)] rounded-t transition-colors min-h-[2px]"
                style={{ height: `${heightPct}%` }}
              />
            </div>
          );
        })}
      </div>
      <div className="flex justify-between mt-2 text-[10px] text-[var(--color-text-muted)]">
        <span>{window[0]?.date.toLocaleDateString() ?? ""}</span>
        <span>{window[window.length - 1]?.date.toLocaleDateString() ?? ""}</span>
      </div>
    </section>
  );
}
