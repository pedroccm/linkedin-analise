"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";
import { useDict } from "@/lib/i18n/client";

export type GlobalSortKey = "recent" | "likes" | "comments" | "reposts";

export function SortSelect({
  basePath,
  currentSort,
}: {
  basePath: string;
  currentSort: GlobalSortKey;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const c = useDict().common;

  const OPTIONS: Array<{ key: GlobalSortKey; label: string }> = [
    { key: "recent", label: c.sortRecent },
    { key: "likes", label: c.sortLikes },
    { key: "comments", label: c.sortComments },
    { key: "reposts", label: c.sortReposts },
  ];

  function setSort(value: string) {
    const params = new URLSearchParams(searchParams);
    if (value === "recent") params.delete("sort");
    else params.set("sort", value);
    const qs = params.toString();
    startTransition(() => {
      router.replace(qs ? `${basePath}?${qs}` : basePath, { scroll: false });
    });
  }

  return (
    <div className="flex items-center gap-1">
      <select
        value={currentSort}
        onChange={(e) => setSort(e.target.value)}
        className="bg-[var(--color-bg)] border border-[var(--color-border)] rounded px-3 py-1.5 text-sm focus:outline-none focus:border-[var(--color-accent-2)]"
      >
        {OPTIONS.map((o) => (
          <option key={o.key} value={o.key}>
            {o.label}
          </option>
        ))}
      </select>
      {isPending && <span className="text-xs text-[var(--color-text-muted)]">…</span>}
    </div>
  );
}
