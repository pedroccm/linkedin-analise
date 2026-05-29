"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";

export type GlobalSortKey = "recent" | "likes" | "comments" | "reposts";

const OPTIONS: Array<{ key: GlobalSortKey; label: string }> = [
  { key: "recent", label: "Recent" },
  { key: "likes", label: "Most likes" },
  { key: "comments", label: "Most comments" },
  { key: "reposts", label: "Most reposts" },
];

export function SortPills({
  basePath,
  currentSort,
}: {
  basePath: string;
  currentSort: GlobalSortKey;
}) {
  const searchParams = useSearchParams();

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
