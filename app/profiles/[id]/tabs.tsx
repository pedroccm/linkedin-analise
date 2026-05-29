import Link from "next/link";

export type Tab =
  | "posts"
  | "feed"
  | "timeline"
  | "reactions"
  | "comments"
  | "employees";

const PERSON_OPTIONS: Array<{ key: Tab; label: string }> = [
  { key: "posts", label: "Posts" },
  { key: "reactions", label: "Reactions" },
  { key: "comments", label: "Comments" },
];

const COMPANY_OPTIONS: Array<{ key: Tab; label: string }> = [
  { key: "feed", label: "Feed" },
  { key: "timeline", label: "Timeline" },
  { key: "posts", label: "Posts" },
  { key: "employees", label: "Employees" },
];

export function Tabs({
  profileId,
  profileType,
  active,
  counts,
}: {
  profileId: string;
  profileType: "person" | "company";
  active: Tab;
  counts: Partial<Record<Tab, number>>;
}) {
  const options = profileType === "company" ? COMPANY_OPTIONS : PERSON_OPTIONS;
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
            <span className="text-xs ml-2 opacity-70">{counts[o.key] ?? 0}</span>
          </Link>
        );
      })}
    </div>
  );
}
