import type { Dict } from "@/lib/i18n/dictionaries";

export type TimelineKind = "reaction" | "comment" | "post";

export type TimelineRow = {
  key: string;
  kind: TimelineKind;
  occurredAt: string | null;
  actor: {
    id: string;
    name: string | null;
    handle: string | null;
    avatar: string | null;
    profileType: "person" | "company";
  } | null;
  // Activity flags (a row can be both, when the actor liked AND commented the same post)
  didLike?: boolean;
  didComment?: boolean;
  // Reaction-only
  actionText?: string | null;
  // Comment-only
  commentary?: string | null;
  // Post-only (the actor's own post)
  postText?: string | null;
  likes?: number | null;
  comments?: number | null;
  reposts?: number | null;
  // Target post (reaction / comment)
  postUrl?: string | null;
  postContent?: string | null;
  postAuthorName?: string | null;
  postAuthorUrl?: string | null;
};

// Verb descriptor for an activity row. A row can be a like, a comment, or both.
export function activityVerb(
  tl: Dict["timeline"],
  didLike: boolean,
  didComment: boolean
): { icon: string; text: string; cls: string } {
  if (didLike && didComment)
    return {
      icon: "💬❤",
      text: tl.likedAndCommented,
      cls: "text-[var(--color-accent-2)]",
    };
  if (didComment)
    return { icon: "💬", text: tl.commentedOn, cls: "text-[var(--color-accent-2)]" };
  return { icon: "❤", text: tl.liked, cls: "text-[var(--color-danger)]" };
}
