import type { SupabaseClient } from "@supabase/supabase-js";
import { pickDate, pickNumber, runApifyActor } from "@/lib/apify";
import { logSync } from "@/lib/sync-log";
import { mirrorImage } from "@/lib/avatar-storage";

// ===== Shared types =====

type ApifyPost = Record<string, unknown> & {
  id?: string;
  urn?: string;
  entityId?: string;
  url?: string;
  linkedinUrl?: string;
  shareLinkedinUrl?: string;
  postedAt?: string | { timestamp?: number; date?: string };
  postedAtTimestamp?: number;
  text?: string;
  content?: string;
  type?: string;
  engagement?: { likes?: number; comments?: number; shares?: number };
  postImages?: Array<{ url?: string } | string>;
  postVideos?: Array<{ url?: string } | string>;
  author?: {
    name?: string;
    info?: string;
    headline?: string;
    avatar?: string;
    linkedinUrl?: string;
    publicIdentifier?: string;
  };
};

type ApifyPerson = Record<string, unknown> & {
  firstName?: string;
  lastName?: string;
  publicIdentifier?: string;
  headline?: string;
  about?: string;
  profilePicture?: string | { url?: string };
  photo?: string | { url?: string };
  coverPicture?: { url?: string };
  connectionsCount?: number;
  followerCount?: number;
  location?: {
    linkedinText?: string;
    countryCode?: string;
    parsed?: { city?: string; country?: string; countryCode?: string };
  };
  openToWork?: boolean;
  hiring?: boolean;
  premium?: boolean;
  influencer?: boolean;
  creator?: boolean;
  verified?: boolean;
};

type ApifyCompany = Record<string, unknown> & {
  name?: string;
  universalName?: string;
  publicIdentifier?: string;
  tagline?: string;
  description?: string;
  about?: string;
  industry?: string | { name?: string };
  industries?: Array<string | { name?: string }>;
  followerCount?: number;
  followers?: number;
  employeeCount?: number;
  employeeCountRange?: string | { start?: number; end?: number };
  staffCount?: number;
  staffCountRange?: string | { start?: number; end?: number };
  foundedOn?: { year?: number } | number | string;
  founded?: { year?: number } | number | string;
  website?: string;
  websiteUrl?: string;
  logo?: string | { url?: string };
  logoUrl?: string;
  coverImage?: string | { url?: string };
  coverImageUrl?: string;
};

type ApifyReaction = Record<string, unknown> & {
  id?: string;
  linkedinUrl?: string;
  action?: string;
  createdAt?: string;
  createdAtTimestamp?: number;
  postId?: string;
  post?: {
    id?: string;
    linkedinUrl?: string;
    content?: string;
    text?: string;
    postedAt?: string | { timestamp?: number; date?: string };
    postedAtTimestamp?: number;
    engagement?: { likes?: number; comments?: number; shares?: number };
    author?: {
      name?: string;
      linkedinUrl?: string;
      avatar?: string;
      pictureUrl?: string;
    };
  };
};

type ApifyComment = Record<string, unknown> & {
  id?: string;
  linkedinUrl?: string;
  commentary?: string;
  text?: string;
  createdAt?: string;
  createdAtTimestamp?: number;
  postId?: string;
  engagement?: { likes?: number; comments?: number; shares?: number };
  post?: {
    id?: string;
    linkedinUrl?: string;
    content?: string;
    text?: string;
    author?: { name?: string; linkedinUrl?: string };
  };
};

type ApifyEmployee = Record<string, unknown> & {
  id?: string;
  publicIdentifier?: string;
  linkedinUrl?: string;
  firstName?: string;
  lastName?: string;
  name?: string;
  headline?: string;
  position?: string;
  positionTitle?: string;
  currentPosition?: { title?: string };
  currentPositions?: Array<{ title?: string; companyName?: string }>;
  location?: string | { linkedinText?: string };
  profilePicture?: string | { url?: string };
  picture?: string | { url?: string };
  pictureUrl?: string;
  photo?: string | { url?: string };
};

// ===== Helpers =====

function pickMediaUrls(post: ApifyPost): string[] {
  const all = [post.postImages, post.postVideos].flatMap((arr) =>
    Array.isArray(arr) ? arr : []
  );
  return all
    .map((m) => (typeof m === "string" ? m : m?.url))
    .filter((u): u is string => Boolean(u));
}

function pickPicture(value: unknown): string | null {
  if (typeof value === "string") return value;
  if (value && typeof value === "object" && "url" in value) {
    const u = (value as { url?: unknown }).url;
    if (typeof u === "string") return u;
  }
  return null;
}

function pickLocation(value: unknown): string | null {
  if (typeof value === "string") return value;
  if (value && typeof value === "object" && "linkedinText" in value) {
    const t = (value as { linkedinText?: unknown }).linkedinText;
    if (typeof t === "string") return t;
  }
  return null;
}

function pickPositionTitle(e: ApifyEmployee): string | null {
  return (
    e.positionTitle ??
    e.position ??
    e.currentPosition?.title ??
    e.currentPositions?.[0]?.title ??
    null
  );
}

function pickIndustry(c: ApifyCompany): string | null {
  if (typeof c.industry === "string") return c.industry;
  if (c.industry && typeof c.industry === "object" && "name" in c.industry) {
    const n = (c.industry as { name?: unknown }).name;
    if (typeof n === "string") return n;
  }
  if (Array.isArray(c.industries) && c.industries.length > 0) {
    const first = c.industries[0];
    if (typeof first === "string") return first;
    if (first && typeof first === "object" && "name" in first) {
      const n = (first as { name?: unknown }).name;
      if (typeof n === "string") return n;
    }
  }
  return null;
}

function pickFoundedYear(c: ApifyCompany): number | null {
  for (const field of [c.foundedOn, c.founded]) {
    if (typeof field === "number" && field > 1800) return field;
    if (typeof field === "string") {
      const n = parseInt(field, 10);
      if (!Number.isNaN(n) && n > 1800) return n;
    }
    if (field && typeof field === "object" && "year" in field) {
      const y = (field as { year?: unknown }).year;
      if (typeof y === "number") return y;
    }
  }
  return null;
}

function pickEmployeeRange(c: ApifyCompany): string | null {
  const v = c.employeeCountRange ?? c.staffCountRange;
  if (v == null) return null;
  if (typeof v === "string") return v;
  if (typeof v === "object" && v !== null) {
    const o = v as { start?: number; end?: number };
    if (o.start != null) return o.end != null ? `${o.start}-${o.end}` : `${o.start}+`;
  }
  return null;
}

// ===== Sync functions =====

// The Supabase client can be either an RLS-scoped user client (typical route) or
// a service-role client (admin bulk operations). We don't care — the functions just
// do their work against whatever's passed in.
export type Profile = {
  id: string;
  profile_url: string;
  profile_type: "person" | "company";
};

export type SyncResult = {
  inserted: number;
  total: number;
  detailsLoaded?: boolean;
  errors?: string[];
};

// ---- details + posts (works for both person and company) ----
export async function syncDetailsAndPosts(opts: {
  supabase: SupabaseClient;
  userId: string;
  profile: Profile;
}): Promise<SyncResult> {
  const { supabase, userId, profile } = opts;
  const isCompany = profile.profile_type === "company";
  const maxPosts = Number(process.env.APIFY_MAX_POSTS ?? 100);

  const postsActor = isCompany
    ? process.env.APIFY_COMPANY_POSTS_ACTOR_ID ?? "harvestapi~linkedin-company-posts"
    : process.env.APIFY_POSTS_ACTOR_ID ?? "harvestapi~linkedin-profile-posts";

  const detailsActor = isCompany
    ? process.env.APIFY_COMPANY_ACTOR_ID ?? "harvestapi~linkedin-company"
    : process.env.APIFY_PROFILE_ACTOR_ID ?? "harvestapi~linkedin-profile-scraper";

  let posts: ApifyPost[] = [];
  let details: ApifyPerson | ApifyCompany | null = null;
  const errors: string[] = [];

  const postsInput = { targetUrls: [profile.profile_url], maxPosts };
  const detailsInput = isCompany
    ? { companies: [profile.profile_url] }
    : {
        profileScraperMode: "Profile details no email ($4 per 1k)",
        queries: [profile.profile_url],
      };

  await Promise.all([
    runApifyActor<ApifyPost>(postsActor, postsInput)
      .then((items) => {
        posts = items;
      })
      .catch((err) => errors.push(`posts: ${err.message}`)),
    runApifyActor<ApifyPerson | ApifyCompany>(detailsActor, detailsInput)
      .then((items) => {
        details = items[0] ?? null;
      })
      .catch((err) => errors.push(`details: ${err.message}`)),
  ]);

  if (details) {
    if (isCompany) {
      const c = details as ApifyCompany;
      const rawLogo = pickPicture(c.logo) ?? c.logoUrl ?? null;
      const logoUrl = (await mirrorImage(rawLogo, `${profile.id}.jpg`)) ?? rawLogo;
      await supabase
        .from("linkedin_profiles")
        .update({
          full_name: c.name ?? null,
          handle: c.publicIdentifier ?? c.universalName ?? undefined,
          headline: c.tagline ?? null,
          tagline: c.tagline ?? null,
          about: c.description ?? c.about ?? null,
          avatar_url: logoUrl,
          cover_url: pickPicture(c.coverImage) ?? c.coverImageUrl ?? null,
          industry: pickIndustry(c),
          employee_count: c.employeeCount ?? c.staffCount ?? null,
          employee_count_range: pickEmployeeRange(c),
          followers_count: c.followerCount ?? c.followers ?? null,
          founded_year: pickFoundedYear(c),
          website: c.website ?? c.websiteUrl ?? null,
          raw_profile: c,
          details_synced_at: new Date().toISOString(),
        })
        .eq("id", profile.id);
    } else {
      const d = details as ApifyPerson;
      const fullName = [d.firstName, d.lastName].filter(Boolean).join(" ").trim() || null;
      const rawAvatar = pickPicture(d.profilePicture) ?? pickPicture(d.photo) ?? null;
      const avatarUrl = (await mirrorImage(rawAvatar, `${profile.id}.jpg`)) ?? rawAvatar;
      await supabase
        .from("linkedin_profiles")
        .update({
          first_name: d.firstName ?? null,
          last_name: d.lastName ?? null,
          full_name: fullName,
          handle: d.publicIdentifier ?? undefined,
          headline: d.headline ?? null,
          about: d.about ?? null,
          avatar_url: avatarUrl,
          cover_url: pickPicture(d.coverPicture),
          connections_count: d.connectionsCount ?? null,
          followers_count: d.followerCount ?? null,
          location_text: d.location?.linkedinText ?? null,
          location_city: d.location?.parsed?.city ?? null,
          location_country: d.location?.parsed?.country ?? null,
          location_country_code:
            d.location?.parsed?.countryCode ?? d.location?.countryCode ?? null,
          open_to_work: d.openToWork ?? null,
          hiring: d.hiring ?? null,
          premium: d.premium ?? null,
          influencer: d.influencer ?? null,
          creator: d.creator ?? null,
          verified: d.verified ?? null,
          raw_profile: d,
          details_synced_at: new Date().toISOString(),
        })
        .eq("id", profile.id);
    }
  }

  let inserted = 0;
  if (posts.length > 0) {
    const rows = posts.map((post) => ({
      profile_id: profile.id,
      user_id: userId,
      apify_post_id:
        (typeof post.id === "string" && post.id) ||
        (typeof post.entityId === "string" && post.entityId) ||
        (typeof post.urn === "string" && post.urn) ||
        post.linkedinUrl ||
        post.url ||
        null,
      post_url: post.linkedinUrl ?? post.shareLinkedinUrl ?? post.url ?? null,
      posted_at: pickDate(post.postedAtTimestamp ?? post.postedAt),
      text_content: post.content ?? post.text ?? null,
      post_type: post.type ?? null,
      reactions_count: pickNumber(post.engagement?.likes),
      comments_count: pickNumber(post.engagement?.comments),
      reposts_count: pickNumber(post.engagement?.shares),
      media_urls: pickMediaUrls(post),
      raw: post,
    }));

    const { error: upsertError, count } = await supabase
      .from("linkedin_posts")
      .upsert(rows, { onConflict: "profile_id,apify_post_id", count: "exact" });
    if (upsertError) errors.push(`posts upsert: ${upsertError.message}`);
    inserted = count ?? rows.length;
  }

  const { count: totalPosts } = await supabase
    .from("linkedin_posts")
    .select("id", { count: "exact", head: true })
    .eq("profile_id", profile.id);

  await supabase
    .from("linkedin_profiles")
    .update({
      last_synced_at: new Date().toISOString(),
      posts_count: totalPosts ?? 0,
    })
    .eq("id", profile.id);

  await logSync({
    userId,
    profileId: profile.id,
    syncType: "details_posts",
    itemsReturned: posts.length,
  });

  return {
    inserted,
    total: totalPosts ?? 0,
    detailsLoaded: Boolean(details),
    errors: errors.length > 0 ? errors : undefined,
  };
}

// ---- reactions ----
export async function syncReactions(opts: {
  supabase: SupabaseClient;
  userId: string;
  profile: Profile;
}): Promise<SyncResult> {
  const { supabase, userId, profile } = opts;
  const actorId =
    process.env.APIFY_REACTIONS_ACTOR_ID ?? "harvestapi~linkedin-profile-reactions";
  const maxItems = Number(process.env.APIFY_MAX_REACTIONS ?? 50);

  const items = await runApifyActor<ApifyReaction>(actorId, {
    profiles: [profile.profile_url],
    maxItems,
  });

  const rows = items.map((r) => ({
    profile_id: profile.id,
    user_id: userId,
    apify_reaction_id:
      (typeof r.id === "string" && r.id) || r.linkedinUrl || r.postId || null,
    reaction_url: r.linkedinUrl ?? null,
    action_text: r.action ?? null,
    reacted_at: pickDate(r.createdAtTimestamp ?? r.createdAt ?? null),
    post_id: r.postId ?? r.post?.id ?? null,
    post_url: r.post?.linkedinUrl ?? null,
    post_content: r.post?.content ?? r.post?.text ?? null,
    post_author_name: r.post?.author?.name ?? null,
    post_author_url: r.post?.author?.linkedinUrl ?? null,
    post_author_avatar:
      r.post?.author?.avatar ?? r.post?.author?.pictureUrl ?? null,
    post_posted_at: pickDate(r.post?.postedAtTimestamp ?? r.post?.postedAt ?? null),
    post_likes: pickNumber(r.post?.engagement?.likes),
    post_comments: pickNumber(r.post?.engagement?.comments),
    post_shares: pickNumber(r.post?.engagement?.shares),
    raw: r,
  }));

  let inserted = 0;
  if (rows.length > 0) {
    const { count } = await supabase
      .from("linkedin_profile_reactions")
      .upsert(rows, { onConflict: "profile_id,apify_reaction_id", count: "exact" });
    inserted = count ?? rows.length;
  }

  const { count: total } = await supabase
    .from("linkedin_profile_reactions")
    .select("id", { count: "exact", head: true })
    .eq("profile_id", profile.id);

  await supabase
    .from("linkedin_profiles")
    .update({
      reactions_synced_at: new Date().toISOString(),
      reactions_count_total: total ?? 0,
    })
    .eq("id", profile.id);

  await logSync({
    userId,
    profileId: profile.id,
    syncType: "reactions",
    itemsReturned: items.length,
  });

  return { inserted, total: total ?? 0 };
}

// ---- comments ----
export async function syncComments(opts: {
  supabase: SupabaseClient;
  userId: string;
  profile: Profile;
}): Promise<SyncResult> {
  const { supabase, userId, profile } = opts;
  const actorId =
    process.env.APIFY_COMMENTS_ACTOR_ID ?? "harvestapi~linkedin-profile-comments";
  const maxItems = Number(process.env.APIFY_MAX_COMMENTS ?? 50);

  const items = await runApifyActor<ApifyComment>(actorId, {
    profiles: [profile.profile_url],
    maxItems,
  });

  const rows = items.map((c) => ({
    profile_id: profile.id,
    user_id: userId,
    apify_comment_id: (typeof c.id === "string" && c.id) || c.linkedinUrl || null,
    comment_url: c.linkedinUrl ?? null,
    commentary: c.commentary ?? c.text ?? null,
    commented_at: pickDate(c.createdAtTimestamp ?? c.createdAt ?? null),
    likes: pickNumber(c.engagement?.likes),
    replies: pickNumber(c.engagement?.comments),
    parent_post_id: c.postId ?? c.post?.id ?? null,
    parent_post_url: c.post?.linkedinUrl ?? null,
    parent_post_content: c.post?.content ?? c.post?.text ?? null,
    parent_post_author_name: c.post?.author?.name ?? null,
    parent_post_author_url: c.post?.author?.linkedinUrl ?? null,
    raw: c,
  }));

  let inserted = 0;
  if (rows.length > 0) {
    const { count } = await supabase
      .from("linkedin_profile_comments")
      .upsert(rows, { onConflict: "profile_id,apify_comment_id", count: "exact" });
    inserted = count ?? rows.length;
  }

  const { count: total } = await supabase
    .from("linkedin_profile_comments")
    .select("id", { count: "exact", head: true })
    .eq("profile_id", profile.id);

  await supabase
    .from("linkedin_profiles")
    .update({
      comments_synced_at: new Date().toISOString(),
      comments_count_total: total ?? 0,
    })
    .eq("id", profile.id);

  await logSync({
    userId,
    profileId: profile.id,
    syncType: "comments",
    itemsReturned: items.length,
  });

  return { inserted, total: total ?? 0 };
}

// ---- employees (company only) ----
export async function syncEmployees(opts: {
  supabase: SupabaseClient;
  userId: string;
  profile: Profile;
}): Promise<SyncResult> {
  const { supabase, userId, profile } = opts;
  if (profile.profile_type !== "company") {
    throw new Error("Employees sync only applies to companies");
  }
  const actorId =
    process.env.APIFY_COMPANY_EMPLOYEES_ACTOR_ID ?? "harvestapi~linkedin-company-employees";
  const maxItems = Number(process.env.APIFY_MAX_EMPLOYEES ?? 100);
  const takePages = Math.max(1, Math.ceil(maxItems / 25));

  const items = await runApifyActor<ApifyEmployee>(actorId, {
    companies: [profile.profile_url],
    profileScraperMode: "Short ($4 per 1k)",
    maxItems,
    takePages,
  });

  const rows = items.map((e) => {
    const fullName =
      e.name ?? ([e.firstName, e.lastName].filter(Boolean).join(" ").trim() || null);
    return {
      profile_id: profile.id,
      user_id: userId,
      apify_employee_id:
        (typeof e.id === "string" && e.id) ||
        e.publicIdentifier ||
        e.linkedinUrl ||
        null,
      linkedin_url: e.linkedinUrl ?? null,
      public_identifier: e.publicIdentifier ?? null,
      first_name: e.firstName ?? null,
      last_name: e.lastName ?? null,
      full_name: fullName,
      headline: e.headline ?? null,
      position_title: pickPositionTitle(e),
      location_text: pickLocation(e.location),
      picture_url:
        e.pictureUrl ??
        pickPicture(e.profilePicture) ??
        pickPicture(e.picture) ??
        pickPicture(e.photo),
      raw: e,
    };
  });

  let inserted = 0;
  if (rows.length > 0) {
    const { count } = await supabase
      .from("linkedin_company_employees")
      .upsert(rows, {
        onConflict: "profile_id,apify_employee_id",
        count: "exact",
      });
    inserted = count ?? rows.length;
  }

  const { count: total } = await supabase
    .from("linkedin_company_employees")
    .select("id", { count: "exact", head: true })
    .eq("profile_id", profile.id);

  await supabase
    .from("linkedin_profiles")
    .update({
      employees_synced_at: new Date().toISOString(),
      employees_count_total: total ?? 0,
    })
    .eq("id", profile.id);

  await logSync({
    userId,
    profileId: profile.id,
    syncType: "company_employees",
    itemsReturned: items.length,
  });

  return { inserted, total: total ?? 0 };
}
