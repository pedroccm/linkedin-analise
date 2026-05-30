import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { CompanyFilter } from "./company-filter";
import { TagFilter } from "./tag-filter";
import { FilterBar } from "./filter-bar";
import { SortSelect, type GlobalSortKey } from "./sort-pills";
import { FeedList } from "./feed-list";
import { getServerI18n } from "@/lib/i18n/server";

export const dynamic = "force-dynamic";

function parseSort(raw: string | string[] | undefined): GlobalSortKey {
  const v = Array.isArray(raw) ? raw[0] : raw;
  if (v === "likes" || v === "comments" || v === "reposts") return v;
  return "recent";
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
  searchParams: Promise<{ sort?: string; range?: string; q?: string; company?: string; tag?: string }>;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const sp = await searchParams;
  const sort = parseSort(sp.sort);
  const query = typeof sp.q === "string" ? sp.q : "";
  const companyId = typeof sp.company === "string" ? sp.company : "";
  const tagId = typeof sp.tag === "string" ? sp.tag : "";
  const t = (await getServerI18n()).dict.feed;

  const [{ data: companies }, { data: tags }] = await Promise.all([
    supabase
      .from("linkedin_profiles")
      .select("id, full_name, handle")
      .eq("profile_type", "company")
      .order("full_name"),
    supabase.from("linkedin_tags").select("id, name").order("name"),
  ]);

  // Build the author filter from company and/or tag (intersection when both set).
  const filters: string[][] = [];
  if (companyId) {
    const { data: linked } = await supabase
      .from("linkedin_profiles")
      .select("id")
      .eq("company_profile_id", companyId);
    filters.push([companyId, ...(linked?.map((p) => p.id) ?? [])]);
  }
  if (tagId) {
    const { data: tagged } = await supabase
      .from("linkedin_profile_tags")
      .select("profile_id")
      .eq("tag_id", tagId);
    filters.push((tagged ?? []).map((r) => r.profile_id));
  }
  let authorFilter: string[] | null = null;
  if (filters.length === 1) authorFilter = filters[0];
  else if (filters.length > 1) {
    const sets = filters.map((f) => new Set(f));
    authorFilter = [...sets[0]].filter((id) => sets.every((s) => s.has(id)));
  }

  let postsQuery = supabase
    .from("linkedin_posts")
    .select(
      `id, post_url, posted_at, text_content, post_type, reactions_count, comments_count, reposts_count, profile_id,
       author:linkedin_profiles!inner(id, full_name, handle, avatar_url, profile_type)`
    );

  if (authorFilter) postsQuery = postsQuery.in("profile_id", authorFilter);
  if (query.trim()) postsQuery = postsQuery.ilike("text_content", `%${query.trim()}%`);

  // Always fetch newest-first; FeedList groups by day and applies the sort within each day.
  const { data: rawPosts } = await postsQuery.order("posted_at", {
    ascending: false,
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

      <section className="flex flex-wrap items-center gap-2">
        <FilterBar basePath="/feed" currentQuery={query} showRange={false} />
        <CompanyFilter
          companies={companies ?? []}
          currentCompanyId={companyId}
          basePath="/feed"
        />
        <TagFilter tags={tags ?? []} currentTagId={tagId} basePath="/feed" />
        <SortSelect basePath="/feed" currentSort={sort} />
      </section>

      <p className="text-xs text-[var(--color-text-muted)]">
        {posts.length} {t.postsCount}
      </p>

      {posts.length === 0 && (
        <p className="text-[var(--color-text-muted)] text-sm">{t.empty}</p>
      )}

      <FeedList posts={posts} sort={sort} />
    </div>
  );
}
