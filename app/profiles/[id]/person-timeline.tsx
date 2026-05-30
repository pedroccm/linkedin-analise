"use client";

import { useMemo, useState } from "react";
import { useDict, useLocale } from "@/lib/i18n/client";
import { fmtDay } from "@/lib/format";
import { activityVerb } from "@/app/timeline/timeline-item";
import type { TimelineRow, TimelineKind } from "@/app/timeline/timeline-item";

const LIMIT = 400;

function clean(text: string | null | undefined): string {
  return (text ?? "").replace(/[ \t]+/g, " ").replace(/\n{3,}/g, "\n\n").trim();
}

// Day-grouped activity timeline for a single person. Real checkboxes filter by
// kind (client-side); each event is a readable card: time + verb + the post text.
export function PersonTimeline({ rows }: { rows: TimelineRow[] }) {
  const dict = useDict();
  const tl = dict.timeline;
  const tp = dict.profile;

  const [show, setShow] = useState<Record<TimelineKind, boolean>>({
    post: true,
    reaction: true,
    comment: true,
  });

  const locale = useLocale();
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
      if (!map.has(key))
        map.set(key, { label: fmtDay(r.occurredAt, locale), rows: [] });
      map.get(key)!.rows.push(r);
    }
    return [...map.entries()]
      .sort((a, b) => (a[0] < b[0] ? 1 : a[0] > b[0] ? -1 : 0))
      .map(([, v]) => v);
  }, [filtered, locale]);

  const filters: Array<{ k: TimelineKind; label: string }> = [
    { k: "post", label: tp.tabPosts },
    { k: "reaction", label: tp.tabReactions },
    { k: "comment", label: tp.tabComments },
  ];

  return (
    <div className="space-y-5">
      {/* Filters */}
      <div className="flex gap-5 flex-wrap pb-3 border-b border-[var(--color-border)]">
        {filters.map(({ k, label }) => (
          <label
            key={k}
            className="flex items-center gap-2 text-sm cursor-pointer select-none"
          >
            <input
              type="checkbox"
              checked={show[k]}
              onChange={() => setShow((s) => ({ ...s, [k]: !s[k] }))}
              className="w-4 h-4 accent-[var(--color-accent)]"
            />
            {label}
          </label>
        ))}
      </div>

      {filtered.length === 0 && (
        <p className="text-[var(--color-text-muted)] text-sm">
          {tp.timelinePersonEmpty}
        </p>
      )}

      {/* Day groups */}
      {groups.map((g) => (
        <div key={g.label} className="space-y-2">
          <div className="text-xs font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">
            {g.label}
          </div>
          <ul className="grid gap-2">
            {g.rows.map((r) => (
              <Row key={r.key} row={r} tl={tl} more={dict.common.showMore} less={dict.common.showLess} />
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}

function Row({
  row,
  tl,
  more,
  less,
}: {
  row: TimelineRow;
  tl: ReturnType<typeof useDict>["timeline"];
  more: string;
  less: string;
}) {
  const [expanded, setExpanded] = useState(false);

  const time = row.occurredAt
    ? new Date(row.occurredAt).toLocaleTimeString(undefined, {
        hour: "2-digit",
        minute: "2-digit",
      })
    : "";

  const verb =
    row.kind === "post"
      ? { icon: "📝", text: tl.posted, cls: "text-[var(--color-success)]" }
      : activityVerb(tl, !!row.didLike, !!row.didComment);

  const full = clean(
    row.kind === "post" ? row.postText : row.postContent || row.commentary
  );
  const isLong = full.length > LIMIT;
  const visible = expanded || !isLong ? full : full.slice(0, LIMIT).trimEnd() + "…";

  return (
    <li className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg p-4">
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-xs text-[var(--color-text-muted)] tabular-nums">
          {time}
        </span>
        <span className={`text-sm font-medium ${verb.cls}`}>
          {verb.icon} {verb.text}
        </span>
        {row.kind !== "post" &&
          row.postAuthorName &&
          (row.postAuthorUrl ? (
            <a
              href={row.postAuthorUrl}
              target="_blank"
              rel="noreferrer"
              className="text-sm text-white no-underline hover:underline"
            >
              {row.postAuthorName}
            </a>
          ) : (
            <span className="text-sm text-white">{row.postAuthorName}</span>
          ))}
        {row.kind === "post" && (row.likes || row.comments || row.reposts) ? (
          <span className="ml-auto text-xs text-[var(--color-text-muted)] flex gap-3">
            <span>❤ {row.likes ?? 0}</span>
            <span>💬 {row.comments ?? 0}</span>
            <span>🔁 {row.reposts ?? 0}</span>
          </span>
        ) : (
          row.postUrl && (
            <a
              href={row.postUrl}
              target="_blank"
              rel="noreferrer"
              className="ml-auto text-xs text-[var(--color-text-muted)] hover:text-white no-underline shrink-0"
            >
              abrir ↗
            </a>
          )
        )}
      </div>

      {full && (
        <div className="mt-2 text-sm leading-relaxed whitespace-pre-wrap">
          {visible}
          {isLong && (
            <button
              type="button"
              onClick={() => setExpanded((v) => !v)}
              className="block mt-1 text-xs text-[var(--color-accent-2)] hover:underline"
            >
              {expanded ? less : more}
            </button>
          )}
        </div>
      )}

      {/* For posts, the open link goes below since the header shows counts */}
      {row.kind === "post" && row.postUrl && (
        <a
          href={row.postUrl}
          target="_blank"
          rel="noreferrer"
          className="inline-block mt-2 text-xs text-[var(--color-text-muted)] hover:text-white no-underline"
        >
          abrir ↗
        </a>
      )}
    </li>
  );
}
