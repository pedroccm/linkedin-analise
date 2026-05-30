"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { useDict } from "@/lib/i18n/client";

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
  const c = useDict().common;
  const DATE_PRESETS = [
    { key: "", label: c.allTime },
    { key: "30d", label: c.d30 },
    { key: "90d", label: c.d90 },
    { key: "6m", label: c.m6 },
    { key: "1y", label: c.y1 },
  ];

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
    <>
      <input
        type="search"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder={c.searchPlaceholder}
        className="flex-1 min-w-[180px] bg-[var(--color-bg)] border border-[var(--color-border)] rounded px-3 py-1.5 text-sm outline-none focus:border-[var(--color-accent-2)]"
      />
      <select
        value={currentRange}
        onChange={(e) => setRange(e.target.value)}
        className="bg-[var(--color-bg)] border border-[var(--color-border)] rounded px-3 py-1.5 text-sm focus:outline-none focus:border-[var(--color-accent-2)]"
      >
        {DATE_PRESETS.map((d) => (
          <option key={d.key || "all"} value={d.key}>
            {d.label}
          </option>
        ))}
      </select>
      {isPending && (
        <span className="text-xs text-[var(--color-text-muted)]">{c.filtering}</span>
      )}
    </>
  );
}
