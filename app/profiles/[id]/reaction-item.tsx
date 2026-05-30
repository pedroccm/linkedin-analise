"use client";

import { useState } from "react";
import { useDict, useLocale } from "@/lib/i18n/client";
import { fmtDateTime } from "@/lib/format";

type Reaction = {
  id: string;
  reaction_url: string | null;
  action_text: string | null;
  reacted_at: string | null;
  post_url: string | null;
  post_content: string | null;
  post_author_name: string | null;
  post_author_url: string | null;
  post_posted_at: string | null;
  post_likes: number | null;
  post_comments: number | null;
  post_shares: number | null;
};

const LIMIT = 240;

export function ReactionItem({ reaction }: { reaction: Reaction }) {
  const [expanded, setExpanded] = useState(false);
  const dict = useDict();
  const locale = useLocale();
  const c = dict.common;
  const p = dict.profile;
  const text = reaction.post_content ?? "";
  const isLong = text.length > LIMIT;
  const visible = expanded || !isLong ? text : text.slice(0, LIMIT).trimEnd() + "…";

  return (
    <li className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg p-4">
      <div className="flex items-center justify-between gap-3 text-xs text-[var(--color-text-muted)] mb-2">
        <div className="truncate">
          {reaction.action_text && (
            <span className="text-white font-medium">{reaction.action_text}</span>
          )}
          {reaction.reacted_at && (
            <span className="ml-2">
              · {fmtDateTime(reaction.reacted_at, locale)}
            </span>
          )}
        </div>
        {reaction.post_url && (
          <a href={reaction.post_url} target="_blank" rel="noreferrer">
            {c.openPost}
          </a>
        )}
      </div>

      <div className="text-xs text-[var(--color-text-muted)] mb-2">
        {reaction.post_author_url ? (
          <a href={reaction.post_author_url} target="_blank" rel="noreferrer">
            {reaction.post_author_name || p.unknown}
          </a>
        ) : (
          <span>{reaction.post_author_name || p.unknown}</span>
        )}
        {reaction.post_posted_at && (
          <span className="ml-2">
            · {p.postedOn} {new Date(reaction.post_posted_at).toLocaleDateString()}
          </span>
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
              {expanded ? c.showLess : c.showMore}
            </button>
          )}
        </div>
      )}
      <div className="flex gap-4 mt-3 text-xs text-[var(--color-text-muted)]">
        <span>❤ {reaction.post_likes ?? 0}</span>
        <span>💬 {reaction.post_comments ?? 0}</span>
        <span>↻ {reaction.post_shares ?? 0}</span>
      </div>
    </li>
  );
}
