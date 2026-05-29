"use client";

import { useMemo, useState } from "react";
import { PostItem } from "./post-item";
import { useDict } from "@/lib/i18n/client";

type Post = {
  id: string;
  post_url: string | null;
  posted_at: string | null;
  text_content: string | null;
  post_type: string | null;
  reactions_count: number | null;
  comments_count: number | null;
  reposts_count: number | null;
};

type SortKey = "recent" | "likes" | "comments" | "reposts";

function rangeSinceMs(range: string): number | null {
  const now = Date.now();
  const DAY = 24 * 60 * 60 * 1000;
  switch (range) {
    case "30d": return now - 30 * DAY;
    case "90d": return now - 90 * DAY;
    case "6m": return now - 182 * DAY;
    case "1y": return now - 365 * DAY;
    default: return null;
  }
}

// Client-side filtering: all posts are already loaded, so sort / date range /
// search apply instantly with no server round-trip and no scroll jump.
export function PostsPanel({ posts }: { posts: Post[] }) {
  const dict = useDict();
  const c = dict.common;
  const p = dict.profile;

  const [sort, setSort] = useState<SortKey>("recent");
  const [range, setRange] = useState("");
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    let arr = posts;
    const since = rangeSinceMs(range);
    if (since != null) {
      arr = arr.filter(
        (x) => x.posted_at && new Date(x.posted_at).getTime() >= since
      );
    }
    const qq = query.trim().toLowerCase();
    if (qq) {
      arr = arr.filter((x) => (x.text_content ?? "").toLowerCase().includes(qq));
    }
    const sorted = [...arr];
    sorted.sort((a, b) => {
      switch (sort) {
        case "likes":
          return (b.reactions_count ?? 0) - (a.reactions_count ?? 0);
        case "comments":
          return (b.comments_count ?? 0) - (a.comments_count ?? 0);
        case "reposts":
          return (b.reposts_count ?? 0) - (a.reposts_count ?? 0);
        default: {
          const av = a.posted_at ? new Date(a.posted_at).getTime() : 0;
          const bv = b.posted_at ? new Date(b.posted_at).getTime() : 0;
          return bv - av;
        }
      }
    });
    return sorted;
  }, [posts, sort, range, query]);

  const SORTS: Array<{ key: SortKey; label: string }> = [
    { key: "recent", label: c.sortRecent },
    { key: "likes", label: c.sortLikes },
    { key: "comments", label: c.sortComments },
    { key: "reposts", label: c.sortReposts },
  ];
  const RANGES: Array<{ key: string; label: string }> = [
    { key: "", label: c.allTime },
    { key: "30d", label: c.d30 },
    { key: "90d", label: c.d90 },
    { key: "6m", label: c.m6 },
    { key: "1y", label: c.y1 },
  ];

  const pill = (active: boolean) =>
    "text-xs px-3 py-1.5 rounded-full border transition-colors " +
    (active
      ? "bg-[var(--color-accent)] border-[var(--color-accent)] text-white"
      : "border-[var(--color-border)] text-[var(--color-text-muted)] hover:text-white hover:border-[var(--color-accent-2)]");

  return (
    <section className="space-y-3">
      <div className="flex flex-wrap gap-3 items-center justify-between">
        <h3 className="text-sm font-semibold text-[var(--color-text-muted)] uppercase tracking-wide">
          {p.allPosts}
        </h3>
        <div className="flex gap-1 flex-wrap">
          {SORTS.map((o) => (
            <button
              key={o.key}
              type="button"
              onClick={() => setSort(o.key)}
              className={pill(o.key === sort)}
            >
              {o.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap gap-3 items-center">
        <div className="flex-1 min-w-[200px]">
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={c.searchPlaceholder}
            className="w-full bg-[var(--color-bg)] border border-[var(--color-border)] rounded px-3 py-1.5 text-sm outline-none focus:border-[var(--color-accent-2)]"
          />
        </div>
        <div className="flex gap-1 flex-wrap">
          {RANGES.map((d) => (
            <button
              key={d.key || "all"}
              type="button"
              onClick={() => setRange(d.key)}
              className={pill(d.key === range)}
            >
              {d.label}
            </button>
          ))}
        </div>
      </div>

      <p className="text-xs text-[var(--color-text-muted)]">
        {filtered.length} {p.postsMatch}
      </p>
      {filtered.length === 0 && (
        <p className="text-[var(--color-text-muted)] text-sm">{p.noPostsFilter}</p>
      )}
      <ul className="grid gap-3">
        {filtered.map((post) => (
          <PostItem key={post.id} post={post} />
        ))}
      </ul>
    </section>
  );
}
