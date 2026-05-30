"use client";

import { useState } from "react";
import Link from "next/link";
import { useDict } from "@/lib/i18n/client";
import { fmtDateTime, fmtTime } from "@/lib/format";

type Author = {
  id: string;
  full_name: string | null;
  handle: string | null;
  avatar_url: string | null;
  profile_type: "person" | "company";
};

type FeedPost = {
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

const COLLAPSED_CHAR_LIMIT = 240;

export function FeedPostItem({
  post,
  timeOnly = false,
}: {
  post: FeedPost;
  timeOnly?: boolean;
}) {
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
      {/* Author chip */}
      {post.author && (
        <div className="flex items-center gap-3 mb-3 pb-3 border-b border-[var(--color-border)]">
          {post.author.avatar_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={post.author.avatar_url}
              alt=""
              className={`w-9 h-9 ${
                post.author.profile_type === "company" ? "rounded" : "rounded-full"
              } shrink-0`}
            />
          ) : (
            <div
              className={`w-9 h-9 ${
                post.author.profile_type === "company" ? "rounded" : "rounded-full"
              } bg-[var(--color-bg-2)] shrink-0`}
            />
          )}
          <div className="min-w-0 flex-1">
            <Link
              href={`/profiles/${post.author.handle || post.author.id}`}
              className="text-sm font-medium text-white no-underline hover:underline truncate block"
            >
              {post.author.full_name || post.author.handle || p.unknown}
            </Link>
            <div className="text-xs text-[var(--color-text-muted)] flex items-center gap-2">
              <span
                className={`text-[10px] uppercase tracking-wide px-1.5 py-0.5 rounded ${
                  post.author.profile_type === "company"
                    ? "bg-[#0f1f3a] text-[#7ea5e2]"
                    : "bg-[var(--color-bg-2)] text-[var(--color-text-muted)]"
                }`}
              >
                {post.author.profile_type}
              </span>
              {post.posted_at && (
                <span>
                  {timeOnly ? fmtTime(post.posted_at) : fmtDateTime(post.posted_at)}
                </span>
              )}
            </div>
          </div>
          {post.post_url && (
            <a
              href={post.post_url}
              target="_blank"
              rel="noreferrer"
              className="text-xs text-[var(--color-text-muted)] hover:text-white no-underline shrink-0"
            >
              {c.open}
            </a>
          )}
        </div>
      )}

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
