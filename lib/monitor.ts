import type { SupabaseClient } from "@supabase/supabase-js";
import { createServiceClient } from "@/lib/supabase/server";
import { runApifyActor, pickDate } from "@/lib/apify";
import { canonicalLinkedinUrl } from "@/lib/canonical-url";

// Daily monitor engine. For every profile with monitor_enabled, probe the newest
// post (reusing the global scrape cache so a profile watched by many workspaces
// costs one Apify call), and when it changed, enqueue an alert event per recipient.
// An external system consumes linkedin_monitor_events and sends the WhatsApp.

const CACHE_TTL_MS =
  Number(process.env.SCRAPE_CACHE_TTL_HOURS ?? 24) * 60 * 60 * 1000;

type ApifyPostLite = {
  id?: string;
  entityId?: string;
  urn?: string;
  url?: string;
  linkedinUrl?: string;
  shareLinkedinUrl?: string;
  text?: string;
  content?: string;
  postedAt?: string | { timestamp?: number; date?: string };
  postedAtTimestamp?: number;
};

type MonitoredProfile = {
  id: string;
  profile_url: string;
  profile_type: "person" | "company";
  full_name: string | null;
  handle: string | null;
  user_id: string;
  last_monitored_post_id: string | null;
};

export type MonitorSummary = {
  checked: number;
  newPosts: number;
  events: number;
  errors: string[];
};

function postId(p: ApifyPostLite): string | null {
  return (
    (typeof p.id === "string" && p.id) ||
    (typeof p.entityId === "string" && p.entityId) ||
    (typeof p.urn === "string" && p.urn) ||
    p.linkedinUrl ||
    p.url ||
    null
  );
}

// Returns the newest post: undefined never happens (always a post or null).
// `null` means the profile genuinely has no posts.
async function newestPost(
  admin: SupabaseClient,
  profile: MonitoredProfile
): Promise<ApifyPostLite | null> {
  const canonical = canonicalLinkedinUrl(profile.profile_url);
  const postsType =
    profile.profile_type === "company" ? "company_posts" : "posts";

  // 1) Reuse a fresh cache entry (full posts sync, or a previous monitor probe) for free.
  if (canonical) {
    const { data: hit } = await admin
      .from("linkedin_scrape_cache")
      .select("payload, fetched_at")
      .eq("canonical_url", canonical)
      .in("sync_type", [postsType, "monitor"])
      .order("fetched_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (
      hit &&
      Date.now() - new Date(hit.fetched_at).getTime() < CACHE_TTL_MS
    ) {
      const arr = (hit.payload as ApifyPostLite[]) ?? [];
      return arr[0] ?? null;
    }
  }

  // 2) Cheap probe: just the newest post. Cached under "monitor" so we never
  //    clobber the richer full-posts cache used by the profile view.
  const actor =
    profile.profile_type === "company"
      ? process.env.APIFY_COMPANY_POSTS_ACTOR_ID ??
        "harvestapi~linkedin-company-posts"
      : process.env.APIFY_POSTS_ACTOR_ID ??
        "harvestapi~linkedin-profile-posts";

  const items = await runApifyActor<ApifyPostLite>(actor, {
    targetUrls: [profile.profile_url],
    maxPosts: 1,
  });

  if (canonical) {
    await admin.from("linkedin_scrape_cache").upsert(
      {
        canonical_url: canonical,
        sync_type: "monitor",
        payload: items,
        fetched_at: new Date().toISOString(),
      },
      { onConflict: "canonical_url,sync_type" }
    );
  }

  return items[0] ?? null;
}

// Everyone in a workspace who set a WhatsApp number: the owner plus, if the owner
// runs an organization, its members.
async function recipients(
  admin: SupabaseClient,
  ownerId: string
): Promise<{ user_id: string; whatsapp: string }[]> {
  const ids = new Set<string>([ownerId]);
  const { data: org } = await admin
    .from("organizations")
    .select("id")
    .eq("owner_id", ownerId)
    .maybeSingle();
  if (org) {
    const { data: members } = await admin
      .from("org_members")
      .select("user_id")
      .eq("org_id", org.id);
    (members ?? []).forEach((m: { user_id: string }) => ids.add(m.user_id));
  }

  const { data: metas } = await admin
    .from("linkedin_users_meta")
    .select("user_id, whatsapp")
    .in("user_id", [...ids]);

  return (metas ?? [])
    .filter(
      (m: { whatsapp: string | null }) => m.whatsapp && m.whatsapp.trim()
    )
    .map((m: { user_id: string; whatsapp: string }) => ({
      user_id: m.user_id,
      whatsapp: m.whatsapp.trim(),
    }));
}

export async function runMonitor(): Promise<MonitorSummary> {
  const admin = createServiceClient();
  const summary: MonitorSummary = {
    checked: 0,
    newPosts: 0,
    events: 0,
    errors: [],
  };

  const { data: profiles, error } = await admin
    .from("linkedin_profiles")
    .select(
      "id, profile_url, profile_type, full_name, handle, user_id, last_monitored_post_id"
    )
    .eq("monitor_enabled", true);

  if (error) {
    summary.errors.push(`load profiles: ${error.message}`);
    return summary;
  }

  // Resolve a workspace's recipients once per run.
  const recipientsCache = new Map<string, { user_id: string; whatsapp: string }[]>();

  for (const p of (profiles ?? []) as MonitoredProfile[]) {
    summary.checked++;
    try {
      const post = await newestPost(admin, p);
      if (!post) continue;
      const pid = postId(post);
      if (!pid) continue;

      // First time we see this profile: set a baseline, don't alert.
      if (!p.last_monitored_post_id) {
        await admin
          .from("linkedin_profiles")
          .update({
            last_monitored_post_id: pid,
            last_monitored_at: new Date().toISOString(),
          })
          .eq("id", p.id);
        continue;
      }

      // No change: just touch the timestamp.
      if (pid === p.last_monitored_post_id) {
        await admin
          .from("linkedin_profiles")
          .update({ last_monitored_at: new Date().toISOString() })
          .eq("id", p.id);
        continue;
      }

      // New post detected.
      summary.newPosts++;
      let recips = recipientsCache.get(p.user_id);
      if (!recips) {
        recips = await recipients(admin, p.user_id);
        recipientsCache.set(p.user_id, recips);
      }

      if (recips.length > 0) {
        const excerpt = ((post.content ?? post.text ?? "") as string)
          .replace(/\s+/g, " ")
          .trim()
          .slice(0, 280);
        const postUrl =
          post.linkedinUrl ?? post.shareLinkedinUrl ?? post.url ?? null;
        const name = p.full_name || p.handle || p.profile_url;

        const rows = recips.map((r) => ({
          profile_id: p.id,
          profile_name: name,
          profile_url: p.profile_url,
          apify_post_id: pid,
          post_url: postUrl,
          post_excerpt: excerpt,
          posted_at: pickDate(post.postedAtTimestamp ?? post.postedAt),
          recipient_user_id: r.user_id,
          whatsapp: r.whatsapp,
          status: "pending",
        }));

        const { error: evErr, count } = await admin
          .from("linkedin_monitor_events")
          .upsert(rows, {
            onConflict: "profile_id,apify_post_id,recipient_user_id",
            ignoreDuplicates: true,
            count: "exact",
          });
        if (evErr) summary.errors.push(`events ${p.id}: ${evErr.message}`);
        else summary.events += count ?? rows.length;
      }

      await admin
        .from("linkedin_profiles")
        .update({
          last_monitored_post_id: pid,
          last_monitored_at: new Date().toISOString(),
        })
        .eq("id", p.id);
    } catch (err) {
      summary.errors.push(
        `${p.id}: ${err instanceof Error ? err.message : "error"}`
      );
    }
  }

  return summary;
}
