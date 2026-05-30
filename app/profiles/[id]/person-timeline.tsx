"use client";

import { useMemo, useState } from "react";
import { useDict } from "@/lib/i18n/client";
import type { TimelineRow, TimelineKind } from "@/app/timeline/timeline-item";

const SNIPPET = 160;

function clean(text: string | null | undefined): string {
  return (text ?? "").replace(/\s+/g, " ").trim();
}

// Compact, day-grouped activity timeline for a single person.
// Filters by kind client-side; the date shows once per day, each event just has
// its time + verb + a snippet of the relevant post.
export function PersonTimeline({ rows }: { rows: TimelineRow[] }) {
  const dict = useDict();
  const tl = dict.timeline;
  const tp = dict.profile;

  const [show, setShow] = useState<Record<TimelineKind, boolean>>({
    post: true,
    reaction: true,
    comment: true,
  });

  const filtered = useMemo(() => rows.filter((r) => show[r.kind]), [rows, show]);

  const groups = useMemo(() => {
    const map = new Map<string, { label: string; rows: TimelineRow[] }>();
    for (const r of filtered) {
      const d = r.occurredAt ? new Date(r.occurredAt) : null;
      const key = d
        ? `${d.getFullYear()}-${String(d.getMonth()).padStart(2, "0")}-${String(
            d.getDate()
          ).padStart(2, "0")}`
        : "0000-z-none";
      const label = d
        ? d.toLocaleDateString(undefined, {
            weekday: "short",
            day: "numeric",
            month: "short",
            year: "numeric",
          })
        : "—";
      if (!map.has(key)) map.set(key, { label, rows: [] });
      map.get(key)!.rows.push(r);
    }
    return [...map.entries()]
      .sort((a, b) => (a[0] < b[0] ? 1 : a[0] > b[0] ? -1 : 0))
      .map(([, v]) => v);
  }, [filtered]);

  const filters: Array<{ k: TimelineKind; label: string }> = [
    { k: "post", label: tp.tabPosts },
    { k: "reaction", label: tp.tabReactions },
    { k: "comment", label: tp.tabComments },
  ];

  return (
    <div className="space-y-5">
      {/* Filters */}
      <div className="flex gap-2 flex-wrap">
        {filters.map(({ k, label }) => (
          <button
            key={k}
            type="button"
            onClick={() => setShow((s) => ({ ...s, [k]: !s[k] }))}
            className={
              "text-sm px-3 py-1.5 rounded-full border transition-colors " +
              (show[k]
                ? "bg-[var(--color-accent)] border-[var(--color-accent)] text-white"
                : "border-[var(--color-border)] text-[var(--color-text-muted)] hover:text-white")
            }
          >
            <span className="mr-1">{show[k] ? "✓" : "+"}</span>
            {label}
          </button>
        ))}
      </div>

      {filtered.length === 0 && (
        <p className="text-[var(--color-text-muted)] text-sm">
          {tp.timelinePersonEmpty}
        </p>
      )}

      {/* Day groups */}
      {groups.map((g) => (
        <div key={g.label} className="space-y-1.5">
          <div className="text-xs font-semibold uppercase tracking-wide text-[var(--color-text-muted)] pb-1 border-b border-[var(--color-border)]">
            {g.label}
          </div>
          <ul>
            {g.rows.map((r) => (
              <Row key={r.key} row={r} tl={tl} />
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}

function Row({ row, tl }: { row: TimelineRow; tl: ReturnType<typeof useDict>["timeline"] }) {
  const time = row.occurredAt
    ? new Date(row.occurredAt).toLocaleTimeString(undefined, {
        hour: "2-digit",
        minute: "2-digit",
      })
    : "";

  const verb =
    row.kind === "reaction"
      ? { icon: "❤", text: tl.liked, cls: "text-[var(--color-danger)]" }
      : row.kind === "comment"
      ? { icon: "💬", text: tl.commentedOn, cls: "text-[var(--color-accent-2)]" }
      : { icon: "📝", text: tl.posted, cls: "text-[var(--color-success)]" };

  const raw =
    row.kind === "post"
      ? row.postText
      : row.kind === "comment"
      ? row.postContent || row.commentary
      : row.postContent;
  const full = clean(raw);
  const snippet = full.length > SNIPPET ? full.slice(0, SNIPPET).trimEnd() + "…" : full;

  return (
    <li className="flex gap-3 py-1.5 border-b border-[var(--color-border)] last:border-0">
      <span className="text-xs text-[var(--color-text-muted)] tabular-nums shrink-0 w-12 pt-0.5">
        {time}
      </span>
      <div className="min-w-0 text-sm leading-snug">
        <span className={`font-medium ${verb.cls}`}>
          {verb.icon} {verb.text}
        </span>
        {snippet && (
          <>
            {" "}
            {row.postUrl ? (
              <a
                href={row.postUrl}
                target="_blank"
                rel="noreferrer"
                className="text-[var(--color-text-muted)] no-underline hover:text-white"
              >
                {snippet}
              </a>
            ) : (
              <span className="text-[var(--color-text-muted)]">{snippet}</span>
            )}
          </>
        )}
      </div>
    </li>
  );
}
