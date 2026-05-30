import Link from "next/link";
import type { Dict } from "@/lib/i18n/dictionaries";

export type Tab =
  | "posts"
  | "feed"
  | "timeline"
  | "reactions"
  | "comments"
  | "employees"
  | "stats";

export function Tabs({
  profileId,
  profileType,
  active,
  counts,
  t,
}: {
  profileId: string;
  profileType: "person" | "company";
  active: Tab;
  counts: Partial<Record<Tab, number>>;
  t: Dict["profile"];
}) {
  const personOptions: Array<{ key: Tab; label: string }> = [
    { key: "posts", label: t.tabPosts },
    { key: "reactions", label: t.tabReactions },
    { key: "comments", label: t.tabComments },
    { key: "timeline", label: t.tabTimeline },
    { key: "stats", label: t.tabStats },
  ];
  const companyOptions: Array<{ key: Tab; label: string }> = [
    { key: "feed", label: t.tabFeed },
    { key: "timeline", label: t.tabTimeline },
    { key: "posts", label: t.tabPosts },
    { key: "employees", label: t.tabEmployees },
  ];
  const options = profileType === "company" ? companyOptions : personOptions;
  // For companies the default landing is `feed`; for people it's `posts`
  const defaultTab: Tab = profileType === "company" ? "feed" : "posts";

  return (
    <div className="flex gap-1 border-b border-[var(--color-border)]">
      {options.map((o) => {
        const isActive = o.key === active;
        const href =
          o.key === defaultTab
            ? `/profiles/${profileId}`
            : `/profiles/${profileId}?tab=${o.key}`;
        return (
          <Link
            key={o.key}
            href={href}
            scroll={false}
            className={
              "no-underline text-sm px-4 py-2 border-b-2 transition-colors -mb-[1px] " +
              (isActive
                ? "border-[var(--color-accent)] text-white"
                : "border-transparent text-[var(--color-text-muted)] hover:text-white")
            }
          >
            {o.label}
            {counts[o.key] !== undefined && (
              <span className="text-xs ml-2 opacity-70">{counts[o.key]}</span>
            )}
          </Link>
        );
      })}
    </div>
  );
}
