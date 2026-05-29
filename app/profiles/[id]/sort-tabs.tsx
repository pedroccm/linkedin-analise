import Link from "next/link";

export type SortKey = "recent" | "likes" | "comments" | "reposts";

const OPTIONS: Array<{ key: SortKey; label: string }> = [
  { key: "recent", label: "Recent" },
  { key: "likes", label: "Most likes" },
  { key: "comments", label: "Most comments" },
  { key: "reposts", label: "Most reposts" },
];

export function SortTabs({
  profileId,
  active,
  range = "",
  query = "",
  tab = "",
}: {
  profileId: string;
  active: SortKey;
  range?: string;
  query?: string;
  tab?: string;
}) {
  function hrefFor(key: SortKey): string {
    const params = new URLSearchParams();
    if (tab) params.set("tab", tab);
    if (key !== "recent") params.set("sort", key);
    if (range) params.set("range", range);
    if (query) params.set("q", query);
    const qs = params.toString();
    return qs ? `/profiles/${profileId}?${qs}` : `/profiles/${profileId}`;
  }

  return (
    <div className="flex gap-1 flex-wrap">
      {OPTIONS.map((o) => {
        const isActive = o.key === active;
        return (
          <Link
            key={o.key}
            href={hrefFor(o.key)}
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
