import Link from "next/link";
import Image from "next/image";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { addProfile } from "../../actions";
import { DeleteProfileButton } from "./delete-profile-button";
import { SyncButton } from "./sync-button";
import { SortTabs, type SortKey } from "./sort-tabs";
import { PostItem } from "./post-item";
import { ReactionItem } from "./reaction-item";
import { CommentItem } from "./comment-item";
import { EmployeeItem } from "./employee-item";
import { FeedPostItem } from "./feed-post-item";
import { TimelineItem } from "@/app/timeline/timeline-item";
import { fetchTimeline } from "@/lib/timeline";
import { Tabs, type Tab } from "./tabs";
import { BackgroundSync } from "./background-sync";
import { StatsCard } from "./stats-card";
import { CadenceChart } from "./cadence-chart";
import { TopEngagedAuthors } from "./top-engaged";
import { PostsFilter } from "./posts-filter";
import { AutoSync } from "./auto-sync";
import { getServerI18n } from "@/lib/i18n/server";
import type { Dict } from "@/lib/i18n/dictionaries";
import { SubmitButton } from "../../submit-button";

export const dynamic = "force-dynamic";

type ProfileT = Dict["profile"];
type CommonT = Dict["common"];

const SORT_CONFIG: Record<SortKey, { column: string; ascending: boolean }> = {
  recent: { column: "posted_at", ascending: false },
  likes: { column: "reactions_count", ascending: false },
  comments: { column: "comments_count", ascending: false },
  reposts: { column: "reposts_count", ascending: false },
};

function parseSort(raw: string | string[] | undefined): SortKey {
  const v = Array.isArray(raw) ? raw[0] : raw;
  if (v === "likes" || v === "comments" || v === "reposts") return v;
  return "recent";
}

function parseTab(
  raw: string | string[] | undefined,
  profileType: "person" | "company"
): Tab {
  const v = Array.isArray(raw) ? raw[0] : raw;
  if (profileType === "company") {
    if (v === "employees") return "employees";
    if (v === "posts") return "posts";
    if (v === "timeline") return "timeline";
    return "feed"; // default for companies
  }
  if (v === "reactions" || v === "comments") return v;
  return "posts";
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

function formatEmployeeRange(raw: unknown): string | null {
  if (raw == null) return null;
  // Range may have been stored as a JSON-stringified {start, end} object
  if (typeof raw === "string") {
    if (raw.includes("{") && raw.includes("start")) {
      try {
        const obj = JSON.parse(raw);
        if (obj && typeof obj === "object" && obj.start != null) {
          return obj.end != null ? `${obj.start}-${obj.end}` : `${obj.start}+`;
        }
      } catch {
        // fall through
      }
    }
    return raw;
  }
  if (typeof raw === "object" && raw !== null && "start" in raw) {
    const o = raw as { start?: number; end?: number };
    if (o.start != null) {
      return o.end != null ? `${o.start}-${o.end}` : `${o.start}+`;
    }
  }
  return null;
}

function ProfileChip({
  active,
  label,
  tone = "neutral",
}: {
  active: boolean;
  label: string;
  tone?: "neutral" | "good" | "warn";
}) {
  if (!active) return null;
  const tones: Record<string, string> = {
    neutral: "bg-[var(--color-bg-2)] text-[var(--color-text-muted)] border-[var(--color-border)]",
    good: "bg-[#0f3a1f] text-[#7ee2a5] border-[#1f5a36]",
    warn: "bg-[#3a2e0f] text-[#f5c563] border-[#5a4a1f]",
  };
  return (
    <span className={`text-[10px] uppercase tracking-wide px-2 py-0.5 rounded border ${tones[tone]}`}>
      {label}
    </span>
  );
}

export default async function ProfilePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ sort?: string; tab?: string; range?: string; q?: string; autosync?: string; tracked?: string }>;
}) {
  const [{ id }, sp] = await Promise.all([params, searchParams]);
  const sort = parseSort(sp.sort);
  const range = typeof sp.range === "string" ? sp.range : "";
  const query = typeof sp.q === "string" ? sp.q : "";
  const autosync = sp.autosync === "1";

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const { dict } = await getServerI18n();
  const t = dict.profile;
  const common = dict.common;

  const { data: profile } = await supabase
    .from("linkedin_profiles")
    .select("*")
    .eq("id", id)
    .single();

  if (!profile) notFound();

  // If the person has a company association, fetch the company so we can render a chip
  let company: { id: string; full_name: string | null; handle: string | null } | null = null;
  if (profile.company_profile_id) {
    const { data: c } = await supabase
      .from("linkedin_profiles")
      .select("id, full_name, handle")
      .eq("id", profile.company_profile_id)
      .single();
    company = c;
  }

  const profileType: "person" | "company" =
    profile.profile_type === "company" ? "company" : "person";
  const tab = parseTab(sp.tab, profileType);
  const isCompany = profileType === "company";

  // For companies, compute feed + timeline counts + collect linked people pending an initial sync
  let feedCount = 0;
  let timelineCount = 0;
  let companyLinkedPersonIds: string[] = [];
  let pendingSync: { id: string; name: string }[] = [];
  if (isCompany) {
    const { data: linkedPeople } = await supabase
      .from("linkedin_profiles")
      .select("id, full_name, handle, last_synced_at")
      .eq("company_profile_id", profile.id);
    companyLinkedPersonIds = linkedPeople?.map((p) => p.id) ?? [];
    pendingSync =
      linkedPeople
        ?.filter((p) => p.last_synced_at === null)
        .map((p) => ({ id: p.id, name: p.full_name || p.handle || t.unknown })) ?? [];
    const feedIds = [profile.id, ...companyLinkedPersonIds];

    const [{ count: feedC }, { count: rxC }, { count: cmC }] = await Promise.all([
      supabase.from("linkedin_posts").select("id", { count: "exact", head: true }).in("profile_id", feedIds),
      companyLinkedPersonIds.length > 0
        ? supabase
            .from("linkedin_profile_reactions")
            .select("id", { count: "exact", head: true })
            .in("profile_id", companyLinkedPersonIds)
        : Promise.resolve({ count: 0 } as { count: number }),
      companyLinkedPersonIds.length > 0
        ? supabase
            .from("linkedin_profile_comments")
            .select("id", { count: "exact", head: true })
            .in("profile_id", companyLinkedPersonIds)
        : Promise.resolve({ count: 0 } as { count: number }),
    ]);
    feedCount = feedC ?? 0;
    timelineCount = (rxC ?? 0) + (cmC ?? 0);
  }

  const counts: Partial<Record<Tab, number>> = isCompany
    ? {
        feed: feedCount,
        timeline: timelineCount,
        posts: profile.posts_count ?? 0,
        employees: profile.employees_count_total ?? 0,
      }
    : {
        posts: profile.posts_count ?? 0,
        reactions: profile.reactions_count_total ?? 0,
        comments: profile.comments_count_total ?? 0,
      };

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/"
          className="text-sm text-[var(--color-text-muted)] no-underline hover:text-white"
        >
          {common.back}
        </Link>
      </div>

      {/* Profile card. Cover image intentionally omitted: LinkedIn media URLs
          expire and block hotlinking, which left an empty gray bar. */}
      <section className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg overflow-hidden">
        <div className="p-6">
          <div className="flex items-start gap-5 flex-wrap">
            {profile.avatar_url ? (
              <Image
                src={profile.avatar_url}
                alt=""
                width={88}
                height={88}
                className={`${isCompany ? "rounded-lg" : "rounded-full"} border-2 border-[var(--color-bg)] shrink-0`}
                unoptimized
              />
            ) : (
              <div className={`w-[88px] h-[88px] ${isCompany ? "rounded-lg" : "rounded-full"} bg-[var(--color-bg-2)] border-2 border-[var(--color-bg)] shrink-0`} />
            )}
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[10px] uppercase tracking-wide px-2 py-0.5 rounded border bg-[var(--color-bg-2)] text-[var(--color-text-muted)] border-[var(--color-border)]">
                  {isCompany ? dict.home.company : dict.home.person}
                </span>
                <h1 className="text-2xl font-semibold">
                  {profile.full_name || profile.handle || t.untitled}
                </h1>
                {!isCompany && (
                  <>
                    <ProfileChip active={!!profile.verified} label={t.verified} tone="good" />
                    <ProfileChip active={!!profile.creator} label={t.creator} tone="good" />
                    <ProfileChip active={!!profile.influencer} label={t.influencer} tone="good" />
                    <ProfileChip active={!!profile.premium} label={t.premium} />
                    <ProfileChip active={!!profile.open_to_work} label={t.openToWork} tone="warn" />
                    <ProfileChip active={!!profile.hiring} label={t.hiring} tone="warn" />
                  </>
                )}
              </div>
              {(profile.tagline || profile.headline) && (
                <p className="text-[var(--color-text-muted)] mt-1">
                  {profile.tagline || profile.headline}
                </p>
              )}
              {!isCompany && company && (
                <div className="mt-2 text-sm">
                  <span className="text-[var(--color-text-muted)]">{t.worksAt} </span>
                  <Link
                    href={`/profiles/${company.id}`}
                    className="text-[var(--color-accent-2)] hover:underline"
                  >
                    {company.full_name || company.handle}
                  </Link>
                </div>
              )}
              <div className="flex gap-x-5 gap-y-1 mt-3 text-sm text-[var(--color-text-muted)] flex-wrap">
                {isCompany ? (
                  <>
                    {profile.industry && <span>{profile.industry}</span>}
                    {(() => {
                      const range = formatEmployeeRange(profile.employee_count_range);
                      const value =
                        range ?? profile.employee_count?.toLocaleString();
                      if (!value) return null;
                      return (
                        <span>
                          <span className="text-white font-medium">{value}</span>{" "}
                          {t.employees}
                        </span>
                      );
                    })()}
                    {profile.founded_year && <span>{t.founded} {profile.founded_year}</span>}
                    {profile.website && (
                      <a href={profile.website} target="_blank" rel="noreferrer">
                        {profile.website.replace(/^https?:\/\//, "")}
                      </a>
                    )}
                    {typeof profile.followers_count === "number" && (
                      <span>
                        <span className="text-white font-medium">
                          {profile.followers_count.toLocaleString()}
                        </span>{" "}
                        {t.followers}
                      </span>
                    )}
                  </>
                ) : (
                  <>
                    {profile.location_text && <span>{profile.location_text}</span>}
                    {typeof profile.connections_count === "number" && (
                      <span>
                        <span className="text-white font-medium">
                          {profile.connections_count.toLocaleString()}
                        </span>{" "}
                        {t.connections}
                      </span>
                    )}
                    {typeof profile.followers_count === "number" && (
                      <span>
                        <span className="text-white font-medium">
                          {profile.followers_count.toLocaleString()}
                        </span>{" "}
                        {t.followers}
                      </span>
                    )}
                  </>
                )}
              </div>
              <a
                href={profile.profile_url}
                target="_blank"
                rel="noreferrer"
                className="text-xs block mt-2 break-all"
              >
                {profile.profile_url}
              </a>
            </div>
            <div className="flex gap-2 shrink-0">
              <SyncButton
                endpoint={`/api/profiles/${profile.id}/sync`}
                label={isCompany ? t.syncCompanyPosts : t.syncDetailsPosts}
              />
              <DeleteProfileButton
                profileId={profile.id}
                profileName={profile.full_name || profile.handle || profile.profile_url}
                profileType={profileType}
              />
            </div>
          </div>

          {profile.about && (
            <details className="mt-5">
              <summary className="cursor-pointer text-sm text-[var(--color-accent-2)] hover:underline">
                {t.about}
              </summary>
              <p className="mt-2 text-sm whitespace-pre-wrap text-[var(--color-text-muted)]">
                {profile.about}
              </p>
            </details>
          )}
        </div>
      </section>

      {autosync && (
        <AutoSync profileId={profile.id} profileType={profileType} />
      )}

      {isCompany && <BackgroundSync pending={pendingSync} />}

      <Tabs profileId={profile.id} profileType={profileType} active={tab} counts={counts} t={t} />

      {tab === "posts" && (
        <PostsSection
          profileId={profile.id}
          profileType={profileType}
          sort={sort}
          range={range}
          query={query}
          t={t}
          common={common}
        />
      )}
      {tab === "reactions" && !isCompany && (
        <ReactionsSection profileId={profile.id} t={t} />
      )}
      {tab === "comments" && !isCompany && (
        <CommentsSection profileId={profile.id} t={t} />
      )}
      {tab === "feed" && isCompany && (
        <FeedSection
          companyId={profile.id}
          sort={sort}
          range={range}
          query={query}
          t={t}
          common={common}
        />
      )}
      {tab === "timeline" && isCompany && (
        <CompanyTimelineSection
          personIds={companyLinkedPersonIds}
          range={range}
          query={query}
          t={t}
        />
      )}
      {tab === "employees" && isCompany && (
        <EmployeesSection profileId={profile.id} highlightId={sp.tracked} t={t} />
      )}
    </div>
  );
}

async function PostsSection({
  profileId,
  profileType,
  sort,
  range,
  query,
  t,
  common,
}: {
  profileId: string;
  profileType: "person" | "company";
  sort: SortKey;
  range: string;
  query: string;
  t: ProfileT;
  common: CommonT;
}) {
  const supabase = await createClient();
  const { column, ascending } = SORT_CONFIG[sort];

  let q = supabase
    .from("linkedin_posts")
    .select(
      "id, post_url, posted_at, text_content, post_type, reactions_count, comments_count, reposts_count"
    )
    .eq("profile_id", profileId);

  const since = rangeStartISO(range);
  if (since) q = q.gte("posted_at", since);
  if (query.trim()) q = q.ilike("text_content", `%${query.trim()}%`);

  const { data: posts } = await q.order(column, { ascending, nullsFirst: false });

  return (
    <div className="space-y-6">
      <StatsCard profileId={profileId} t={t} />
      <CadenceChart profileId={profileId} t={t} />
      {profileType === "person" && <TopEngagedAuthors profileId={profileId} t={t} />}

      <section className="space-y-3">
        <div className="flex flex-wrap gap-3 items-center justify-between">
          <h3 className="text-sm font-semibold text-[var(--color-text-muted)] uppercase tracking-wide">
            {t.allPosts}
          </h3>
          <SortTabs
            profileId={profileId}
            active={sort}
            range={range}
            query={query}
            tab={profileType === "company" ? "posts" : ""}
            common={common}
          />
        </div>
        <PostsFilter
          profileId={profileId}
          currentSort={sort}
          currentRange={range}
          currentQuery={query}
        />
        <p className="text-xs text-[var(--color-text-muted)]">
          {posts?.length ?? 0} {t.postsMatch}
        </p>
        {(!posts || posts.length === 0) && (
          <p className="text-[var(--color-text-muted)] text-sm">{t.noPostsFilter}</p>
        )}
        <ul className="grid gap-3">
          {posts?.map((p) => (
            <PostItem key={p.id} post={p} />
          ))}
        </ul>
      </section>
    </div>
  );
}

async function ReactionsSection({ profileId, t }: { profileId: string; t: ProfileT }) {
  const supabase = await createClient();
  const { data: reactions } = await supabase
    .from("linkedin_profile_reactions")
    .select(
      "id, reaction_url, action_text, reacted_at, post_url, post_content, post_author_name, post_author_url, post_posted_at, post_likes, post_comments, post_shares"
    )
    .eq("profile_id", profileId)
    .order("reacted_at", { ascending: false, nullsFirst: false });

  return (
    <section className="space-y-3">
      <div className="flex justify-between items-center">
        <p className="text-sm text-[var(--color-text-muted)]">{t.reactionsHint}</p>
        <SyncButton
          endpoint={`/api/profiles/${profileId}/sync-reactions`}
          label={t.syncReactions}
          variant="secondary"
        />
      </div>
      {(!reactions || reactions.length === 0) && (
        <p className="text-[var(--color-text-muted)] text-sm">{t.noReactions}</p>
      )}
      <ul className="grid gap-3">
        {reactions?.map((r) => (
          <ReactionItem key={r.id} reaction={r} />
        ))}
      </ul>
    </section>
  );
}

async function CommentsSection({ profileId, t }: { profileId: string; t: ProfileT }) {
  const supabase = await createClient();
  const { data: comments } = await supabase
    .from("linkedin_profile_comments")
    .select(
      "id, comment_url, commentary, commented_at, likes, replies, parent_post_url, parent_post_content, parent_post_author_name, parent_post_author_url"
    )
    .eq("profile_id", profileId)
    .order("commented_at", { ascending: false, nullsFirst: false });

  return (
    <section className="space-y-3">
      <div className="flex justify-between items-center">
        <p className="text-sm text-[var(--color-text-muted)]">{t.commentsHint}</p>
        <SyncButton
          endpoint={`/api/profiles/${profileId}/sync-comments`}
          label={t.syncComments}
          variant="secondary"
        />
      </div>
      {(!comments || comments.length === 0) && (
        <p className="text-[var(--color-text-muted)] text-sm">{t.noComments}</p>
      )}
      <ul className="grid gap-3">
        {comments?.map((c) => (
          <CommentItem key={c.id} comment={c} />
        ))}
      </ul>
    </section>
  );
}

async function FeedSection({
  companyId,
  sort,
  range,
  query,
  t,
  common,
}: {
  companyId: string;
  sort: SortKey;
  range: string;
  query: string;
  t: ProfileT;
  common: CommonT;
}) {
  const supabase = await createClient();

  // 1) Find all tracked people linked to this company
  const { data: linkedPeople } = await supabase
    .from("linkedin_profiles")
    .select("id")
    .eq("company_profile_id", companyId);
  const authorIds = [companyId, ...(linkedPeople?.map((p) => p.id) ?? [])];

  // 2) Fetch posts from this company + linked people, joined with author info
  const { column, ascending } = SORT_CONFIG[sort];
  let postsQuery = supabase
    .from("linkedin_posts")
    .select(
      `id, post_url, posted_at, text_content, post_type, reactions_count, comments_count, reposts_count, profile_id,
       author:linkedin_profiles!inner(id, full_name, handle, avatar_url, profile_type)`
    )
    .in("profile_id", authorIds);

  const since = rangeStartISO(range);
  if (since) postsQuery = postsQuery.gte("posted_at", since);
  if (query.trim()) postsQuery = postsQuery.ilike("text_content", `%${query.trim()}%`);

  const { data: rawPosts } = await postsQuery.order(column, {
    ascending,
    nullsFirst: false,
  });

  // Supabase returns `author` as an array when relation is not constrained;
  // flatten to a single object since profile_id is the FK.
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
    author:
      | { id: string; full_name: string | null; handle: string | null; avatar_url: string | null; profile_type: "person" | "company" }
      | Array<{ id: string; full_name: string | null; handle: string | null; avatar_url: string | null; profile_type: "person" | "company" }>
      | null;
  };

  const posts =
    (rawPosts as RawPost[] | null)?.map((p) => ({
      ...p,
      author: Array.isArray(p.author) ? p.author[0] ?? null : p.author,
    })) ?? [];

  const trackedCount = linkedPeople?.length ?? 0;

  return (
    <div className="space-y-3">
      <p className="text-sm text-[var(--color-text-muted)]">
        {t.feedDesc} <span className="text-white">{trackedCount}</span> {t.feedPeople}
      </p>
      <div className="flex flex-wrap gap-3 items-center justify-between">
        <h3 className="text-sm font-semibold text-[var(--color-text-muted)] uppercase tracking-wide">
          {t.tabFeed}
        </h3>
        <SortTabs profileId={companyId} active={sort} range={range} query={query} tab="feed" common={common} />
      </div>
      <PostsFilter
        profileId={companyId}
        currentSort={sort}
        currentRange={range}
        currentQuery={query}
      />
      <p className="text-xs text-[var(--color-text-muted)]">
        {posts.length} {t.postsMatch}
      </p>
      {posts.length === 0 && (
        <p className="text-[var(--color-text-muted)] text-sm">{t.feedEmpty}</p>
      )}
      <ul className="grid gap-3">
        {posts.map((p) => (
          <FeedPostItem key={p.id} post={p} />
        ))}
      </ul>
    </div>
  );
}

async function CompanyTimelineSection({
  personIds,
  range,
  query,
  t,
}: {
  personIds: string[];
  range: string;
  query: string;
  t: ProfileT;
}) {
  if (personIds.length === 0) {
    return (
      <section className="space-y-3">
        <p className="text-sm text-[var(--color-text-muted)]">{t.timelineNoPeople}</p>
      </section>
    );
  }

  const rows = await fetchTimeline({
    actorIds: personIds,
    since: rangeStartISO(range),
    query,
    limit: 200,
  });

  return (
    <div className="space-y-3">
      <p className="text-sm text-[var(--color-text-muted)]">
        {t.timelineDesc} <span className="text-white">{personIds.length}</span>{" "}
        {t.timelinePeople}
      </p>
      <p className="text-xs text-[var(--color-text-muted)]">
        {rows.length} {t.tabTimeline.toLowerCase()}
      </p>
      {rows.length === 0 && (
        <p className="text-[var(--color-text-muted)] text-sm">{t.timelineEmpty}</p>
      )}
      <ul className="grid gap-3">
        {rows.map((row) => (
          <TimelineItem key={row.key} row={row} />
        ))}
      </ul>
    </div>
  );
}

async function EmployeesSection({
  profileId,
  highlightId,
  t,
}: {
  profileId: string;
  highlightId?: string;
  t: ProfileT;
}) {
  const supabase = await createClient();

  // Sync'd employee rows + which ones are already being tracked as separate person profiles
  const [{ data: employees }, { data: trackedPeople }] = await Promise.all([
    supabase
      .from("linkedin_company_employees")
      .select(
        "id, linkedin_url, full_name, headline, position_title, location_text, picture_url, tracked_profile_id"
      )
      .eq("profile_id", profileId)
      .order("full_name", { ascending: true }),
    supabase
      .from("linkedin_profiles")
      .select("id, full_name, handle, headline, avatar_url, posts_count, last_synced_at")
      .eq("company_profile_id", profileId)
      .order("created_at", { ascending: false }),
  ]);

  // Untracked employees come first, then tracked
  const sortedEmployees = [...(employees ?? [])].sort((a, b) => {
    const at = a.tracked_profile_id ? 1 : 0;
    const bt = b.tracked_profile_id ? 1 : 0;
    if (at !== bt) return at - bt;
    return (a.full_name ?? "").localeCompare(b.full_name ?? "");
  });

  return (
    <div className="space-y-6">
      {/* People already tracked at this company */}
      {trackedPeople && trackedPeople.length > 0 && (
        <section className="space-y-3">
          <h3 className="text-sm font-semibold text-[var(--color-text-muted)] uppercase tracking-wide">
            {t.trackedTitle} ({trackedPeople.length})
          </h3>
          <ul className="grid gap-2">
            {trackedPeople.map((p) => (
              <li
                key={p.id}
                className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg p-3 flex items-center gap-3 hover:border-[var(--color-accent-2)] transition-colors"
              >
                {p.avatar_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={p.avatar_url}
                    alt=""
                    className="w-9 h-9 rounded-full shrink-0"
                  />
                ) : (
                  <div className="w-9 h-9 rounded-full bg-[var(--color-bg-2)] shrink-0" />
                )}
                <Link
                  href={`/profiles/${p.id}`}
                  className="flex-1 min-w-0 no-underline text-white"
                >
                  <div className="text-sm font-medium truncate">
                    {p.full_name || p.handle || t.unknown}
                  </div>
                  {p.headline && (
                    <div className="text-xs text-[var(--color-text-muted)] truncate">
                      {p.headline}
                    </div>
                  )}
                </Link>
                <span className="text-xs text-[var(--color-text-muted)] shrink-0">
                  {p.posts_count ?? 0} posts
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Add a person URL manually, pre-linked to this company */}
      <section className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg p-4">
        <h3 className="text-sm font-semibold mb-2">{t.addPersonTitle}</h3>
        <form action={addProfile} className="flex flex-col sm:flex-row gap-2">
          <input type="hidden" name="company_profile_id" value={profileId} />
          <input
            name="profile_url"
            type="text"
            required
            placeholder={t.addPersonPlaceholder}
            className="flex-1 bg-[var(--color-bg)] border border-[var(--color-border)] rounded px-3 py-2 text-sm outline-none focus:border-[var(--color-accent-2)]"
          />
          <SubmitButton
            idle={t.add}
            pending={t.adding}
            className="bg-[var(--color-accent)] hover:bg-[var(--color-accent-2)] text-white font-medium px-4 py-2 rounded text-sm transition-colors"
          />
        </form>
        <p className="text-xs text-[var(--color-text-muted)] mt-2">{t.addPersonHint}</p>
      </section>

      {/* Scraped employees list */}
      <section className="space-y-3">
        <div className="flex justify-between items-center">
          <p className="text-sm text-[var(--color-text-muted)]">{t.employeesHint}</p>
          <SyncButton
            endpoint={`/api/profiles/${profileId}/sync-employees`}
            label={t.syncEmployees}
            variant="secondary"
          />
        </div>
        {(!employees || employees.length === 0) && (
          <p className="text-[var(--color-text-muted)] text-sm">{t.noEmployees}</p>
        )}
        <ul className="grid gap-3">
          {sortedEmployees.map((e) => (
            <EmployeeItem
              key={e.id}
              employee={e}
              highlight={highlightId !== undefined && e.tracked_profile_id === highlightId}
            />
          ))}
        </ul>
      </section>
    </div>
  );
}
