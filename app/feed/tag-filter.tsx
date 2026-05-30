"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";
import { useDict } from "@/lib/i18n/client";

type Tag = { id: string; name: string };

export function TagFilter({
  tags,
  currentTagId,
  basePath,
}: {
  tags: Tag[];
  currentTagId: string;
  basePath: string;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const t = useDict().feed;

  if (tags.length === 0) return null;

  function setTag(value: string) {
    const params = new URLSearchParams(searchParams);
    if (value) params.set("tag", value);
    else params.delete("tag");
    const qs = params.toString();
    startTransition(() => {
      router.replace(qs ? `${basePath}?${qs}` : basePath, { scroll: false });
    });
  }

  return (
    <div className="flex items-center gap-1">
      <select
        value={currentTagId}
        onChange={(e) => setTag(e.target.value)}
        className="max-w-[160px] bg-[var(--color-bg)] border border-[var(--color-border)] rounded px-3 py-1.5 text-sm focus:outline-none focus:border-[var(--color-accent-2)]"
      >
        <option value="">{t.allTags}</option>
        {tags.map((tg) => (
          <option key={tg.id} value={tg.id}>
            {tg.name}
          </option>
        ))}
      </select>
      {isPending && <span className="text-xs text-[var(--color-text-muted)]">…</span>}
    </div>
  );
}
