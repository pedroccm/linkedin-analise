"use client";

import { useMemo } from "react";
import { FeedPostItem } from "../profiles/[id]/feed-post-item";
import { fmtDay } from "@/lib/format";
import type { GlobalSortKey } from "./sort-pills";

type Author = {
  id: string;
  full_name: string | null;
  handle: string | null;
  avatar_url: string | null;
  profile_type: "person" | "company";
};

export type FeedListPost = {
  id: string;
  post_url: string | null;
  posted_at: string | null;
  text_content: string | null;
  post_type: string | null;
  reactions_count: number | null;
  comments_count: number | null;
  reposts_count: number | null;
  author: Author | null;
};

// Posts grouped by day: the date is a header once, posts of that day show only
// the time. The sort dropdown reorders posts WITHIN each day; days are newest first.
export function FeedList({
  posts,
  sort,
}: {
  posts: FeedListPost[];
  sort: GlobalSortKey;
}) {
  const groups = useMemo(() => {
    const cmp = (a: FeedListPost, b: FeedListPost): number => {
      if (sort === "likes")
        return (b.reactions_count ?? 0) - (a.reactions_count ?? 0);
      if (sort === "comments")
        return (b.comments_count ?? 0) - (a.comments_count ?? 0);
      if (sort === "reposts")
        return (b.reposts_count ?? 0) - (a.reposts_count ?? 0);
      const at = a.posted_at ? new Date(a.posted_at).getTime() : 0;
      const bt = b.posted_at ? new Date(b.posted_at).getTime() : 0;
      return bt - at;
    };

    const map = new Map<string, { label: string; rows: FeedListPost[] }>();
    for (const p of posts) {
      const d = p.posted_at ? new Date(p.posted_at) : null;
      const key = d
        ? `${d.getFullYear()}-${String(d.getMonth()).padStart(2, "0")}-${String(
            d.getDate()
          ).padStart(2, "0")}`
        : "0000-z-none";
      if (!map.has(key)) map.set(key, { label: fmtDay(p.posted_at), rows: [] });
      map.get(key)!.rows.push(p);
    }

    return [...map.entries()]
      .sort((a, b) => (a[0] < b[0] ? 1 : a[0] > b[0] ? -1 : 0))
      .map(([, v]) => ({ label: v.label, rows: [...v.rows].sort(cmp) }));
  }, [posts, sort]);

  return (
    <div className="space-y-5">
      {groups.map((g) => (
        <div key={g.label} className="space-y-2">
          <div className="text-xs font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">
            {g.label}
          </div>
          <ul className="grid gap-3">
            {g.rows.map((p) => (
              <FeedPostItem key={p.id} post={p} timeOnly />
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}
