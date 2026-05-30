"use client";

import { useState } from "react";
import { useDict } from "@/lib/i18n/client";
import { fmtDateTime } from "@/lib/format";

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

const COLLAPSED_CHAR_LIMIT = 240;

export function PostItem({ post }: { post: Post }) {
  const [expanded, setExpanded] = useState(false);
  const dict = useDict();
  const c = dict.common;
  const p = dict.profile;

  const text = post.text_content ?? "";
  const isLong = text.length > COLLAPSED_CHAR_LIMIT;
  const visibleText =
    expanded || !isLong ? text : text.slice(0, COLLAPSED_CHAR_LIMIT).trimEnd() + "…";

  return (
    <li className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg p-4">
      <div className="flex items-center justify-between gap-4 text-xs text-[var(--color-text-muted)] mb-2">
        <div>
          {post.posted_at
            ? fmtDateTime(post.posted_at)
            : p.unknownDate}
          {post.post_type && <span className="ml-2">· {post.post_type}</span>}
        </div>
        {post.post_url && (
          <a href={post.post_url} target="_blank" rel="noreferrer">
            {c.openOnLinkedIn}
          </a>
        )}
      </div>

      {text && (
        <div className="text-sm leading-relaxed">
          <p className="whitespace-pre-wrap">{visibleText}</p>
          {isLong && (
            <button
              type="button"
              onClick={() => setExpanded((v) => !v)}
              className="mt-2 text-xs text-[var(--color-accent-2)] hover:underline"
            >
              {expanded ? c.showLess : c.showMore}
            </button>
          )}
        </div>
      )}

      <div className="flex gap-4 mt-3 text-xs text-[var(--color-text-muted)]">
        <span>❤ {post.reactions_count ?? 0}</span>
        <span>💬 {post.comments_count ?? 0}</span>
        <span>↻ {post.reposts_count ?? 0}</span>
      </div>
    </li>
  );
}
