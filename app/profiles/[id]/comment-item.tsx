"use client";

import { useState } from "react";

type Comment = {
  id: string;
  comment_url: string | null;
  commentary: string | null;
  commented_at: string | null;
  likes: number | null;
  replies: number | null;
  parent_post_url: string | null;
  parent_post_content: string | null;
  parent_post_author_name: string | null;
  parent_post_author_url: string | null;
};

const LIMIT = 240;

export function CommentItem({ comment }: { comment: Comment }) {
  const [expanded, setExpanded] = useState(false);
  const text = comment.commentary ?? "";
  const isLong = text.length > LIMIT;
  const visible = expanded || !isLong ? text : text.slice(0, LIMIT).trimEnd() + "…";

  return (
    <li className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg p-4">
      <div className="flex items-center justify-between gap-3 text-xs text-[var(--color-text-muted)] mb-2">
        <div className="truncate">
          on post by{" "}
          {comment.parent_post_author_url ? (
            <a href={comment.parent_post_author_url} target="_blank" rel="noreferrer">
              {comment.parent_post_author_name || "unknown"}
            </a>
          ) : (
            <span>{comment.parent_post_author_name || "unknown"}</span>
          )}
          {comment.commented_at && (
            <span className="ml-2">
              · {new Date(comment.commented_at).toLocaleString()}
            </span>
          )}
        </div>
        {comment.comment_url && (
          <a href={comment.comment_url} target="_blank" rel="noreferrer">
            Open ↗
          </a>
        )}
      </div>

      {text && (
        <div className="text-sm leading-relaxed">
          <p className="whitespace-pre-wrap">{visible}</p>
          {isLong && (
            <button
              type="button"
              onClick={() => setExpanded((v) => !v)}
              className="mt-2 text-xs text-[var(--color-accent-2)] hover:underline"
            >
              {expanded ? "− show less" : "+ show more"}
            </button>
          )}
        </div>
      )}

      {comment.parent_post_content && (
        <blockquote className="mt-3 text-xs text-[var(--color-text-muted)] italic border-l-2 border-[var(--color-border)] pl-3 whitespace-pre-wrap">
          {comment.parent_post_content.length > 160
            ? comment.parent_post_content.slice(0, 160).trimEnd() + "…"
            : comment.parent_post_content}
        </blockquote>
      )}

      <div className="flex gap-4 mt-3 text-xs text-[var(--color-text-muted)]">
        <span>❤ {comment.likes ?? 0}</span>
        <span>↩ {comment.replies ?? 0}</span>
      </div>
    </li>
  );
}
