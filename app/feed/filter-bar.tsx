"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, useTransition } from "react";

const DATE_PRESETS = [
  { key: "", label: "All time" },
  { key: "30d", label: "30 days" },
  { key: "90d", label: "90 days" },
  { key: "6m", label: "6 months" },
  { key: "1y", label: "1 year" },
];

export function FilterBar({
  basePath,
  currentRange,
  currentQuery,
}: {
  basePath: string;
  currentRange: string;
  currentQuery: string;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [q, setQ] = useState(currentQuery);

  useEffect(() => {
    if (q === currentQuery) return;
    const t = setTimeout(() => {
      const params = new URLSearchParams(searchParams);
      if (q) params.set("q", q);
      else params.delete("q");
      startTransition(() => {
        router.replace(`${basePath}?${params.toString()}`, { scroll: false });
      });
    }, 300);
    return () => clearTimeout(t);
  }, [q, currentQuery, basePath, router, searchParams]);

  function setRange(range: string) {
    const params = new URLSearchParams(searchParams);
    if (range) params.set("range", range);
    else params.delete("range");
    startTransition(() => {
      router.replace(`${basePath}?${params.toString()}`, { scroll: false });
    });
  }

  return (
    <div className="flex flex-wrap gap-3 items-center">
      <div className="flex-1 min-w-[200px]">
        <input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search…"
          className="w-full bg-[var(--color-bg)] border border-[var(--color-border)] rounded px-3 py-1.5 text-sm outline-none focus:border-[var(--color-accent-2)]"
        />
      </div>
      <div className="flex gap-1 flex-wrap">
        {DATE_PRESETS.map((d) => {
          const isActive = d.key === currentRange;
          return (
            <button
              key={d.key || "all"}
              type="button"
              onClick={() => setRange(d.key)}
              className={
                "text-xs px-3 py-1.5 rounded-full border transition-colors " +
                (isActive
                  ? "bg-[var(--color-accent)] border-[var(--color-accent)] text-white"
                  : "border-[var(--color-border)] text-[var(--color-text-muted)] hover:text-white hover:border-[var(--color-accent-2)]")
              }
            >
              {d.label}
            </button>
          );
        })}
      </div>
      {isPending && (
        <span className="text-xs text-[var(--color-text-muted)]">filtering…</span>
      )}
    </div>
  );
}
