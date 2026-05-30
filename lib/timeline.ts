import { createClient } from "@/lib/supabase/server";
import type { TimelineRow } from "@/app/timeline/timeline-item";

type ActorPick = {
  id: string;
  full_name: string | null;
  handle: string | null;
  avatar_url: string | null;
  profile_type: "person" | "company";
};

function pickActor(actor: ActorPick | ActorPick[] | null): TimelineRow["actor"] {
  const a = Array.isArray(actor) ? actor[0] ?? null : actor;
  if (!a) return null;
  return {
    id: a.id,
    name: a.full_name,
    handle: a.handle,
    avatar: a.avatar_url,
    profileType: a.profile_type,
  };
}

export type TimelineQueryOptions = {
  actorIds?: string[]; // restrict actors to this set (e.g. people of a company)
  since?: string | null;
  query?: string;
  limit?: number;
  includePosts?: boolean; // also merge the actors' own posts into the timeline
};

export async function fetchTimeline(
  options: TimelineQueryOptions = {}
): Promise<TimelineRow[]> {
  const supabase = await createClient();
  const limit = options.limit ?? 200;

  // An explicitly empty actor set means "no matching profiles" → no rows.
  if (options.actorIds && options.actorIds.length === 0) return [];

  let reactionsQ = supabase
    .from("linkedin_profile_reactions")
    .select(
      `id, action_text, reacted_at, post_id, post_url, post_content, post_author_name, post_author_url, profile_id,
       actor:linkedin_profiles!inner(id, full_name, handle, avatar_url, profile_type)`
    );

  let commentsQ = supabase
    .from("linkedin_profile_comments")
    .select(
      `id, commentary, commented_at, comment_url, parent_post_id, parent_post_url, parent_post_content, parent_post_author_name, parent_post_author_url, profile_id,
       actor:linkedin_profiles!inner(id, full_name, handle, avatar_url, profile_type)`
    );

  let postsQ = options.includePosts
    ? supabase
        .from("linkedin_posts")
        .select(
          `id, post_url, posted_at, text_content, reactions_count, comments_count, reposts_count, profile_id,
           actor:linkedin_profiles!inner(id, full_name, handle, avatar_url, profile_type)`
        )
    : null;

  if (options.actorIds && options.actorIds.length > 0) {
    reactionsQ = reactionsQ.in("profile_id", options.actorIds);
    commentsQ = commentsQ.in("profile_id", options.actorIds);
    if (postsQ) postsQ = postsQ.in("profile_id", options.actorIds);
  }

  if (options.since) {
    reactionsQ = reactionsQ.gte("reacted_at", options.since);
    commentsQ = commentsQ.gte("commented_at", options.since);
    if (postsQ) postsQ = postsQ.gte("posted_at", options.since);
  }

  if (options.query?.trim()) {
    const q = `%${options.query.trim()}%`;
    reactionsQ = reactionsQ.ilike("post_content", q);
    commentsQ = commentsQ.or(`commentary.ilike.${q},parent_post_content.ilike.${q}`);
    if (postsQ) postsQ = postsQ.ilike("text_content", q);
  }

  const [{ data: rawReactions }, { data: rawComments }, postsResp] =
    await Promise.all([
      reactionsQ.order("reacted_at", { ascending: false, nullsFirst: false }).limit(limit),
      commentsQ.order("commented_at", { ascending: false, nullsFirst: false }).limit(limit),
      postsQ
        ? postsQ.order("posted_at", { ascending: false, nullsFirst: false }).limit(limit)
        : Promise.resolve({ data: null }),
    ]);
  const rawPosts = postsResp.data;

  type RR = {
    id: string;
    action_text: string | null;
    reacted_at: string | null;
    post_id: string | null;
    post_url: string | null;
    post_content: string | null;
    post_author_name: string | null;
    post_author_url: string | null;
    actor: ActorPick | ActorPick[] | null;
  };
  type RC = {
    id: string;
    commentary: string | null;
    commented_at: string | null;
    comment_url: string | null;
    parent_post_id: string | null;
    parent_post_url: string | null;
    parent_post_content: string | null;
    parent_post_author_name: string | null;
    parent_post_author_url: string | null;
    actor: ActorPick | ActorPick[] | null;
  };

  // Merge a person's like + comment on the SAME post into one activity row
  // (e.g. "commented on & liked ..."). The reactions and comments come from
  // different Apify actors that may not share the post id/url, so we match on
  // any of: post id, normalized post url, or a snippet of the post content.
  const later = (a: string | null, b: string | null): string | null => {
    if (!a) return b;
    if (!b) return a;
    return new Date(a).getTime() >= new Date(b).getTime() ? a : b;
  };
  const candidates = (
    actorId: string,
    id: string | null,
    url: string | null,
    content: string | null
  ): string[] => {
    const ks: string[] = [];
    if (id) ks.push(`${actorId}|id:${id}`);
    if (url)
      ks.push(
        `${actorId}|u:${url.split("?")[0].replace(/\/+$/, "").toLowerCase()}`
      );
    if (content) {
      const c = content.replace(/\s+/g, " ").trim().toLowerCase().slice(0, 120);
      if (c.length >= 20) ks.push(`${actorId}|c:${c}`);
    }
    return ks;
  };

  const index = new Map<string, TimelineRow>(); // candidate key -> group row
  const groups: TimelineRow[] = [];
  const loose: TimelineRow[] = [];

  const ingest = (base: TimelineRow, keys: string[]) => {
    let group: TimelineRow | undefined;
    for (const k of keys) {
      const g = index.get(k);
      if (g) {
        group = g;
        break;
      }
    }
    if (!group) {
      groups.push(base);
      group = base;
    } else {
      group.didLike = group.didLike || base.didLike;
      group.didComment = group.didComment || base.didComment;
      group.occurredAt = later(group.occurredAt, base.occurredAt);
      group.kind = group.didComment ? "comment" : "reaction";
      if (base.didComment && base.commentary) {
        group.commentary = group.commentary
          ? `${group.commentary}\n${base.commentary}`.trim()
          : base.commentary;
      }
      group.postUrl = group.postUrl ?? base.postUrl;
      group.postContent = group.postContent ?? base.postContent;
      group.postAuthorName = group.postAuthorName ?? base.postAuthorName;
      group.postAuthorUrl = group.postAuthorUrl ?? base.postAuthorUrl;
    }
    for (const k of keys) if (!index.has(k)) index.set(k, group);
  };

  for (const r of (rawReactions as RR[] | null) ?? []) {
    const actor = pickActor(r.actor);
    const base: TimelineRow = {
      key: `r:${r.id}`,
      kind: "reaction",
      occurredAt: r.reacted_at,
      actor,
      didLike: true,
      actionText: r.action_text,
      postUrl: r.post_url,
      postContent: r.post_content,
      postAuthorName: r.post_author_name,
      postAuthorUrl: r.post_author_url,
    };
    const keys = actor
      ? candidates(actor.id, r.post_id, r.post_url, r.post_content)
      : [];
    if (keys.length === 0) loose.push(base);
    else ingest(base, keys);
  }

  for (const c of (rawComments as RC[] | null) ?? []) {
    const actor = pickActor(c.actor);
    const base: TimelineRow = {
      key: `c:${c.id}`,
      kind: "comment",
      occurredAt: c.commented_at,
      actor,
      didComment: true,
      commentary: c.commentary,
      postUrl: c.parent_post_url ?? c.comment_url,
      postContent: c.parent_post_content,
      postAuthorName: c.parent_post_author_name,
      postAuthorUrl: c.parent_post_author_url,
    };
    const keys = actor
      ? candidates(
          actor.id,
          c.parent_post_id,
          c.parent_post_url,
          c.parent_post_content
        )
      : [];
    if (keys.length === 0) loose.push(base);
    else ingest(base, keys);
  }

  const activityRows: TimelineRow[] = [...groups, ...loose];

  type RP = {
    id: string;
    post_url: string | null;
    posted_at: string | null;
    text_content: string | null;
    reactions_count: number | null;
    comments_count: number | null;
    reposts_count: number | null;
    actor: ActorPick | ActorPick[] | null;
  };

  const postRows: TimelineRow[] =
    (rawPosts as RP[] | null)?.map((p) => ({
      key: `p:${p.id}`,
      kind: "post",
      occurredAt: p.posted_at,
      actor: pickActor(p.actor),
      postText: p.text_content,
      likes: p.reactions_count,
      comments: p.comments_count,
      reposts: p.reposts_count,
      postUrl: p.post_url,
    })) ?? [];

  const merged = [...activityRows, ...postRows].sort((a, b) => {
    const av = a.occurredAt ? new Date(a.occurredAt).getTime() : 0;
    const bv = b.occurredAt ? new Date(b.occurredAt).getTime() : 0;
    return bv - av;
  });

  return merged.slice(0, limit);
}
