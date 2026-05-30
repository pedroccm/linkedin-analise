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

// Client-side filtering: all posts are already loaded, so sort / search apply
// instantly with no server round-trip and no scroll jump.
export function PostsPanel({ posts }: { posts: Post[] }) {
  const dict = useDict();
  const c = dict.common;
  const p = dict.profile;

  const [sort, setSort] = useState<SortKey>("recent");
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    let arr = posts;
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
  }, [posts, sort, query]);

  const SORTS: Array<{ key: SortKey; label: string }> = [
    { key: "recent", label: c.sortRecent },
    { key: "likes", label: c.sortLikes },
    { key: "comments", label: c.sortComments },
    { key: "reposts", label: c.sortReposts },
  ];

  return (
    <section className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={c.searchPlaceholder}
          className="flex-1 min-w-[180px] bg-[var(--color-bg)] border border-[var(--color-border)] rounded px-3 py-1.5 text-sm outline-none focus:border-[var(--color-accent-2)]"
        />
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value as SortKey)}
          className="bg-[var(--color-bg)] border border-[var(--color-border)] rounded px-3 py-1.5 text-sm focus:outline-none focus:border-[var(--color-accent-2)]"
        >
          {SORTS.map((o) => (
            <option key={o.key} value={o.key}>
              {o.label}
            </option>
          ))}
        </select>
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
