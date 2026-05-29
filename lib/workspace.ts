import type { SupabaseClient } from "@supabase/supabase-js";

// The user_id whose data the current user reads/writes. If the user belongs to
// an organization, that's the org owner's id (shared workspace); otherwise it's
// the user themselves. Keeps solo users fully isolated and unchanged.
export async function workspaceOwnerId(
  supabase: SupabaseClient,
  userId: string
): Promise<string> {
  const { data } = await supabase
    .from("org_members")
    .select("org:organizations(owner_id)")
    .eq("user_id", userId)
    .limit(1)
    .maybeSingle();

  const org = (data as { org: { owner_id: string } | { owner_id: string }[] | null } | null)?.org;
  const owner = Array.isArray(org) ? org[0]?.owner_id : org?.owner_id;
  return owner ?? userId;
}
