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
      `id, action_text, reacted_at, post_url, post_content, post_author_name, post_author_url, profile_id,
       actor:linkedin_profiles!inner(id, full_name, handle, avatar_url, profile_type)`
    );

  let commentsQ = supabase
    .from("linkedin_profile_comments")
    .select(
      `id, commentary, commented_at, comment_url, parent_post_url, parent_post_content, parent_post_author_name, parent_post_author_url, profile_id,
       actor:linkedin_profiles!inner(id, full_name, handle, avatar_url, profile_type)`
    );

  if (options.actorIds && options.actorIds.length > 0) {
    reactionsQ = reactionsQ.in("profile_id", options.actorIds);
    commentsQ = commentsQ.in("profile_id", options.actorIds);
  }

  if (options.since) {
    reactionsQ = reactionsQ.gte("reacted_at", options.since);
    commentsQ = commentsQ.gte("commented_at", options.since);
  }

  if (options.query?.trim()) {
    const q = `%${options.query.trim()}%`;
    reactionsQ = reactionsQ.ilike("post_content", q);
    commentsQ = commentsQ.or(`commentary.ilike.${q},parent_post_content.ilike.${q}`);
  }

  const [{ data: rawReactions }, { data: rawComments }] = await Promise.all([
    reactionsQ.order("reacted_at", { ascending: false, nullsFirst: false }).limit(limit),
    commentsQ.order("commented_at", { ascending: false, nullsFirst: false }).limit(limit),
  ]);

  type RR = {
    id: string;
    action_text: string | null;
    reacted_at: string | null;
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
    parent_post_url: string | null;
    parent_post_content: string | null;
    parent_post_author_name: string | null;
    parent_post_author_url: string | null;
    actor: ActorPick | ActorPick[] | null;
  };

  const reactionRows: TimelineRow[] =
    (rawReactions as RR[] | null)?.map((r) => ({
      key: `r:${r.id}`,
      kind: "reaction",
      occurredAt: r.reacted_at,
      actor: pickActor(r.actor),
      actionText: r.action_text,
      postUrl: r.post_url,
      postContent: r.post_content,
      postAuthorName: r.post_author_name,
      postAuthorUrl: r.post_author_url,
    })) ?? [];

  const commentRows: TimelineRow[] =
    (rawComments as RC[] | null)?.map((c) => ({
      key: `c:${c.id}`,
      kind: "comment",
      occurredAt: c.commented_at,
      actor: pickActor(c.actor),
      commentary: c.commentary,
      postUrl: c.parent_post_url ?? c.comment_url,
      postContent: c.parent_post_content,
      postAuthorName: c.parent_post_author_name,
      postAuthorUrl: c.parent_post_author_url,
    })) ?? [];

  const merged = [...reactionRows, ...commentRows].sort((a, b) => {
    const av = a.occurredAt ? new Date(a.occurredAt).getTime() : 0;
    const bv = b.occurredAt ? new Date(b.occurredAt).getTime() : 0;
    return bv - av;
  });

  return merged.slice(0, limit);
}
