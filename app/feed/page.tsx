import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { FeedPostItem } from "../profiles/[id]/feed-post-item";
import { CompanyFilter } from "./company-filter";
import { FilterBar } from "./filter-bar";
import { SortPills, type GlobalSortKey } from "./sort-pills";
import { getServerI18n } from "@/lib/i18n/server";

export const dynamic = "force-dynamic";

const SORT_CONFIG: Record<GlobalSortKey, { column: string; ascending: boolean }> = {
  recent: { column: "posted_at", ascending: false },
  likes: { column: "reactions_count", ascending: false },
  comments: { column: "comments_count", ascending: false },
  reposts: { column: "reposts_count", ascending: false },
};

function parseSort(raw: string | string[] | undefined): GlobalSortKey {
  const v = Array.isArray(raw) ? raw[0] : raw;
  if (v === "likes" || v === "comments" || v === "reposts") return v;
  return "recent";
}

function rangeStartISO(range: string): string | null {
  const now = new Date();
  const d = new Date(now);
  switch (range) {
    case "30d": d.setDate(now.getDate() - 30); break;
    case "90d": d.setDate(now.getDate() - 90); break;
    case "6m":  d.setMonth(now.getMonth() - 6); break;
    case "1y":  d.setFullYear(now.getFullYear() - 1); break;
    default: return null;
  }
  return d.toISOString();
}

type RawAuthor = {
  id: string;
  full_name: string | null;
  handle: string | null;
  avatar_url: string | null;
  profile_type: "person" | "company";
};

type RawPost = {
  id: string;
  post_url: string | null;
  posted_at: string | null;
  text_content: string | null;
  post_type: string | null;
  reactions_count: number | null;
  comments_count: number | null;
  reposts_count: number | null;
  profile_id: string;
  author: RawAuthor | RawAuthor[] | null;
};

export default async function FeedPage({
  searchParams,
}: {
  searchParams: Promise<{ sort?: string; range?: string; q?: string; company?: string }>;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const sp = await searchParams;
  const sort = parseSort(sp.sort);
  const range = typeof sp.range === "string" ? sp.range : "";
  const query = typeof sp.q === "string" ? sp.q : "";
  const companyId = typeof sp.company === "string" ? sp.company : "";
  const t = (await getServerI18n()).dict.feed;

  const { data: companies } = await supabase
    .from("linkedin_profiles")
    .select("id, full_name, handle")
    .eq("profile_type", "company")
    .order("full_name");

  let authorFilter: string[] | null = null;
  if (companyId) {
    const { data: linked } = await supabase
      .from("linkedin_profiles")
      .select("id")
      .eq("company_profile_id", companyId);
    authorFilter = [companyId, ...(linked?.map((p) => p.id) ?? [])];
  }

  const { column, ascending } = SORT_CONFIG[sort];
  let postsQuery = supabase
    .from("linkedin_posts")
    .select(
      `id, post_url, posted_at, text_content, post_type, reactions_count, comments_count, reposts_count, profile_id,
       author:linkedin_profiles!inner(id, full_name, handle, avatar_url, profile_type)`
    );

  if (authorFilter) postsQuery = postsQuery.in("profile_id", authorFilter);
  const since = rangeStartISO(range);
  if (since) postsQuery = postsQuery.gte("posted_at", since);
  if (query.trim()) postsQuery = postsQuery.ilike("text_content", `%${query.trim()}%`);

  const { data: rawPosts } = await postsQuery.order(column, {
    ascending,
    nullsFirst: false,
  });

  const posts =
    (rawPosts as RawPost[] | null)?.map((p) => ({
      ...p,
      author: Array.isArray(p.author) ? p.author[0] ?? null : p.author,
    })) ?? [];

  return (
    <div className="space-y-6">
      <section>
        <h1 className="text-2xl font-semibold mb-1">{t.title}</h1>
        <p className="text-[var(--color-text-muted)] text-sm">{t.subtitle}</p>
      </section>

      <section className="flex flex-wrap items-center justify-between gap-3">
        <CompanyFilter
          companies={companies ?? []}
          currentCompanyId={companyId}
          basePath="/feed"
        />
        <SortPills basePath="/feed" currentSort={sort} />
      </section>

      <FilterBar basePath="/feed" currentRange={range} currentQuery={query} />

      <p className="text-xs text-[var(--color-text-muted)]">
        {posts.length} {t.postsCount}
      </p>

      {posts.length === 0 && (
        <p className="text-[var(--color-text-muted)] text-sm">{t.empty}</p>
      )}

      <ul className="grid gap-3">
        {posts.map((p) => (
          <FeedPostItem key={p.id} post={p} />
        ))}
      </ul>
    </div>
  );
}
