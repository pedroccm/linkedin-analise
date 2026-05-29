"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useDict } from "@/lib/i18n/client";

export type GlobalSortKey = "recent" | "likes" | "comments" | "reposts";

export function SortPills({
  basePath,
  currentSort,
}: {
  basePath: string;
  currentSort: GlobalSortKey;
}) {
  const searchParams = useSearchParams();
  const c = useDict().common;
  const OPTIONS: Array<{ key: GlobalSortKey; label: string }> = [
    { key: "recent", label: c.sortRecent },
    { key: "likes", label: c.sortLikes },
    { key: "comments", label: c.sortComments },
    { key: "reposts", label: c.sortReposts },
  ];

  function href(key: GlobalSortKey): string {
    const params = new URLSearchParams(searchParams);
    if (key === "recent") params.delete("sort");
    else params.set("sort", key);
    const qs = params.toString();
    return qs ? `${basePath}?${qs}` : basePath;
  }

  return (
    <div className="flex gap-1 flex-wrap">
      {OPTIONS.map((o) => {
        const isActive = o.key === currentSort;
        return (
          <Link
            key={o.key}
            href={href(o.key)}
            scroll={false}
            className={
              "text-xs px-3 py-1.5 rounded-full border no-underline transition-colors " +
              (isActive
                ? "bg-[var(--color-accent)] border-[var(--color-accent)] text-white"
                : "border-[var(--color-border)] text-[var(--color-text-muted)] hover:text-white hover:border-[var(--color-accent-2)]")
            }
          >
            {o.label}
          </Link>
        );
      })}
    </div>
  );
}
