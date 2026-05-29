"use client";

import { useState } from "react";
import Link from "next/link";
import { useDict } from "@/lib/i18n/client";

export type TimelineKind = "reaction" | "comment";

export type TimelineRow = {
  key: string;
  kind: TimelineKind;
  occurredAt: string | null;
  actor: {
    id: string;
    name: string | null;
    handle: string | null;
    avatar: string | null;
    profileType: "person" | "company";
  } | null;
  // Reaction-only
  actionText?: string | null;
  // Comment-only
  commentary?: string | null;
  // Target post
  postUrl?: string | null;
  postContent?: string | null;
  postAuthorName?: string | null;
  postAuthorUrl?: string | null;
};

const LIMIT = 220;

export function TimelineItem({ row }: { row: TimelineRow }) {
  const [expanded, setExpanded] = useState(false);
  const dict = useDict();
  const tl = dict.timeline;
  const c = dict.common;

  const verb =
    row.kind === "reaction" ? (
      <span className="text-[var(--color-danger)] font-medium">❤ {tl.liked}</span>
    ) : (
      <span className="text-[var(--color-accent-2)] font-medium">💬 {tl.commentedOn}</span>
    );

  const targetSnippet = row.postContent ?? "";
  const targetIsLong = targetSnippet.length > LIMIT;
  const targetVisible =
    expanded || !targetIsLong
      ? targetSnippet
      : targetSnippet.slice(0, LIMIT).trimEnd() + "…";

  return (
    <li className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg p-4">
      <div className="flex items-start gap-3">
        {row.actor?.avatar ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={row.actor.avatar}
            alt=""
            className={`w-10 h-10 ${
              row.actor.profileType === "company" ? "rounded" : "rounded-full"
            } shrink-0`}
          />
        ) : (
          <div
            className={`w-10 h-10 ${
              row.actor?.profileType === "company" ? "rounded" : "rounded-full"
            } bg-[var(--color-bg-2)] shrink-0`}
          />
        )}
        <div className="min-w-0 flex-1">
          <div className="text-sm flex items-center gap-2 flex-wrap">
            {row.actor && (
              <Link
                href={`/profiles/${row.actor.id}`}
                className="font-medium text-white no-underline hover:underline"
              >
                {row.actor.name || row.actor.handle || "Unknown"}
              </Link>
            )}
            {verb}
            {row.postAuthorName &&
              (row.postAuthorUrl ? (
                <a
                  href={row.postAuthorUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-[var(--color-text-muted)] no-underline hover:underline"
                >
                  {row.postAuthorName}
                </a>
              ) : (
                <span className="text-[var(--color-text-muted)]">{row.postAuthorName}</span>
              ))}
            {row.occurredAt && (
              <span className="text-xs text-[var(--color-text-muted)]">
                · {new Date(row.occurredAt).toLocaleString()}
              </span>
            )}
          </div>

          {/* Comment text from the actor themselves */}
          {row.kind === "comment" && row.commentary && (
            <div className="mt-2 text-sm leading-relaxed whitespace-pre-wrap">
              {row.commentary}
            </div>
          )}

          {/* The post that was acted upon */}
          {targetSnippet && (
            <blockquote className="mt-3 text-sm text-[var(--color-text-muted)] border-l-2 border-[var(--color-border)] pl-3 whitespace-pre-wrap">
              {targetVisible}
              {targetIsLong && (
                <button
                  type="button"
                  onClick={() => setExpanded((v) => !v)}
                  className="block mt-1 text-xs text-[var(--color-accent-2)] hover:underline"
                >
                  {expanded ? c.showLess : c.showMore}
                </button>
              )}
            </blockquote>
          )}

          {row.postUrl && (
            <a
              href={row.postUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-block mt-2 text-xs text-[var(--color-text-muted)] hover:text-white"
            >
              {c.openPost}
            </a>
          )}
        </div>
      </div>
    </li>
  );
}
