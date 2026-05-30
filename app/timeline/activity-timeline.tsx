"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useDict, useLocale } from "@/lib/i18n/client";
import { fmtDay, fmtTime } from "@/lib/format";
import { activityVerb, type TimelineRow, type TimelineKind } from "./timeline-item";

const LIMIT = 400;

function clean(text: string | null | undefined): string {
  return (text ?? "").replace(/[ \t]+/g, " ").replace(/\n{3,}/g, "\n\n").trim();
}

// One activity timeline used everywhere: global, company and person.
// Grouped by day (date header once, time per event), with kind checkboxes.
// `showActor` adds the actor (avatar + name) per card for multi-person views.
export function ActivityTimeline({
  rows,
  showActor = false,
}: {
  rows: TimelineRow[];
  showActor?: boolean;
}) {
  const dict = useDict();
  const tl = dict.timeline;
  const tp = dict.profile;
  const common = dict.common;
  const locale = useLocale();

  const available = useMemo(() => {
    const s = new Set<TimelineKind>();
    for (const r of rows) s.add(r.kind);
    return s;
  }, [rows]);

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
      if (!map.has(key)) map.set(key, { label: fmtDay(r.occurredAt, locale), rows: [] });
      map.get(key)!.rows.push(r);
    }
    return [...map.entries()]
      .sort((a, b) => (a[0] < b[0] ? 1 : a[0] > b[0] ? -1 : 0))
      .map(([, v]) => v);
  }, [filtered, locale]);

  const filterDefs = (
    [
      { k: "post" as TimelineKind, label: tp.tabPosts },
      { k: "reaction" as TimelineKind, label: tp.tabReactions },
      { k: "comment" as TimelineKind, label: tp.tabComments },
    ]
  ).filter((f) => available.has(f.k));

  return (
    <div className="space-y-5">
      {filterDefs.length > 1 && (
        <div className="flex gap-5 flex-wrap pb-3 border-b border-[var(--color-border)]">
          {filterDefs.map(({ k, label }) => (
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
      )}

      {filtered.length === 0 && (
        <p className="text-[var(--color-text-muted)] text-sm">{tl.empty}</p>
      )}

      {groups.map((g) => (
        <div key={g.label} className="space-y-2">
          <div className="text-xs font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">
            {g.label}
          </div>
          <ul className="grid gap-2">
            {g.rows.map((r) => (
              <Row
                key={r.key}
                row={r}
                showActor={showActor}
                tl={tl}
                common={common}
                locale={locale}
              />
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}

function Row({
  row,
  showActor,
  tl,
  common,
  locale,
}: {
  row: TimelineRow;
  showActor: boolean;
  tl: ReturnType<typeof useDict>["timeline"];
  common: ReturnType<typeof useDict>["common"];
  locale: string;
}) {
  const [expanded, setExpanded] = useState(false);
  const time = fmtTime(row.occurredAt, locale);

  const verb =
    row.kind === "post"
      ? { icon: "📝", text: tl.posted, cls: "text-[var(--color-success)]" }
      : activityVerb(tl, !!row.didLike, !!row.didComment);

  const full = clean(
    row.kind === "post" ? row.postText : row.postContent || row.commentary
  );
  const isLong = full.length > LIMIT;
  const visible = expanded || !isLong ? full : full.slice(0, LIMIT).trimEnd() + "…";

  const author =
    row.kind !== "post" && row.postAuthorName ? (
      row.postAuthorUrl ? (
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
      )
    ) : null;

  return (
    <li className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg p-4">
      <div className="flex items-center gap-2 flex-wrap">
        {showActor && row.actor && (
          <>
            {row.actor.avatar ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={row.actor.avatar}
                alt=""
                className={`w-8 h-8 ${
                  row.actor.profileType === "company" ? "rounded" : "rounded-full"
                } shrink-0`}
              />
            ) : (
              <div
                className={`w-8 h-8 ${
                  row.actor.profileType === "company" ? "rounded" : "rounded-full"
                } bg-[var(--color-bg-2)] shrink-0`}
              />
            )}
            <Link
              href={`/profiles/${row.actor.handle || row.actor.id}`}
              className="text-sm font-medium text-white no-underline hover:underline"
            >
              {row.actor.name || row.actor.handle || "—"}
            </Link>
          </>
        )}
        {!showActor && (
          <span className="text-xs text-[var(--color-text-muted)] tabular-nums">
            {time}
          </span>
        )}
        <span className={`text-sm font-medium ${verb.cls}`}>
          {verb.icon} {verb.text}
        </span>
        {author}
        {showActor && time && (
          <span className="text-xs text-[var(--color-text-muted)]">· {time}</span>
        )}
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
              {common.open}
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
              {expanded ? common.showLess : common.showMore}
            </button>
          )}
        </div>
      )}

      {row.kind === "post" && row.postUrl && (
        <a
          href={row.postUrl}
          target="_blank"
          rel="noreferrer"
          className="inline-block mt-2 text-xs text-[var(--color-text-muted)] hover:text-white no-underline"
        >
          {common.open}
        </a>
      )}
    </li>
  );
}
