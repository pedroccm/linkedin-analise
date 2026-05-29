"use client";

import { useState } from "react";
import Link from "next/link";
import { useDict } from "@/lib/i18n/client";

type Row = {
  id: string;
  handle: string | null;
  full_name: string | null;
  headline: string | null;
  tagline: string | null;
  posts_count: number | null;
  last_synced_at: string | null;
  profile_type: string | null;
  avatar_url: string | null;
};

function Avatar({ row, isCompany }: { row: Row; isCompany: boolean }) {
  const [broken, setBroken] = useState(false);
  const shape = isCompany ? "rounded-lg" : "rounded-full";
  if (row.avatar_url && !broken) {
    // eslint-disable-next-line @next/next/no-img-element
    return (
      <img
        src={row.avatar_url}
        alt=""
        onError={() => setBroken(true)}
        className={`w-11 h-11 ${shape} object-cover shrink-0 bg-[var(--color-bg-2)]`}
      />
    );
  }
  return (
    <div
      className={`w-11 h-11 ${shape} shrink-0 bg-[var(--color-bg-2)] flex items-center justify-center text-base`}
    >
      {isCompany ? "🏢" : "👤"}
    </div>
  );
}

export function ProfileList({ profiles }: { profiles: Row[] }) {
  const t = useDict().home;
  const [filter, setFilter] = useState<"all" | "person" | "company">("all");

  const counts = {
    all: profiles.length,
    person: profiles.filter((p) => p.profile_type !== "company").length,
    company: profiles.filter((p) => p.profile_type === "company").length,
  };

  const shown = profiles.filter((p) =>
    filter === "all"
      ? true
      : filter === "company"
      ? p.profile_type === "company"
      : p.profile_type !== "company"
  );

  const tabs: Array<{ key: typeof filter; label: string; n: number }> = [
    { key: "all", label: t.filterAll, n: counts.all },
    { key: "person", label: t.filterPeople, n: counts.person },
    { key: "company", label: t.filterCompanies, n: counts.company },
  ];

  return (
    <div className="space-y-3">
      <div className="flex gap-1 flex-wrap">
        {tabs.map((tb) => (
          <button
            key={tb.key}
            type="button"
            onClick={() => setFilter(tb.key)}
            className={
              "text-xs px-3 py-1.5 rounded-full border transition-colors " +
              (tb.key === filter
                ? "bg-[var(--color-accent)] border-[var(--color-accent)] text-white"
                : "border-[var(--color-border)] text-[var(--color-text-muted)] hover:text-white hover:border-[var(--color-accent-2)]")
            }
          >
            {tb.label} <span className="opacity-60">{tb.n}</span>
          </button>
        ))}
      </div>

      <ul className="grid gap-2">
        {shown.map((p) => {
          const isCompany = p.profile_type === "company";
          return (
            <li
              key={p.id}
              className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg p-3 hover:border-[var(--color-accent-2)] transition-colors"
            >
              <Link
                href={`/profiles/${p.handle || p.id}`}
                className="no-underline text-white flex items-center gap-3"
              >
                <Avatar row={p} isCompany={isCompany} />
                <div className="min-w-0 flex-1">
                  <div className="font-medium truncate flex items-center gap-1.5">
                    <span className="text-xs opacity-70">{isCompany ? "🏢" : "👤"}</span>
                    {p.full_name || p.handle || "—"}
                  </div>
                  {(p.tagline || p.headline) && (
                    <div className="text-sm text-[var(--color-text-muted)] truncate">
                      {p.tagline || p.headline}
                    </div>
                  )}
                </div>
                <div className="text-right text-xs text-[var(--color-text-muted)] shrink-0">
                  <div>
                    <span className="text-white font-medium">{p.posts_count ?? 0}</span>{" "}
                    {t.posts}
                  </div>
                  {p.last_synced_at && (
                    <div>{t.synced} {new Date(p.last_synced_at).toLocaleDateString()}</div>
                  )}
                </div>
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
