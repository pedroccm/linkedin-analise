import type { SupabaseClient } from "@supabase/supabase-js";

// Lazily provisions the current user as a LIA member on first app load.
// Identity (auth.users) is shared across products; this records that the
// identity actually uses LIA and gives them a free-tier meta row.
// Idempotent — safe to call on every authenticated request.
export async function ensureLiaUser(supabase: SupabaseClient, userId: string) {
  await supabase
    .from("app_users")
    .upsert({ user_id: userId, app: "lia" }, { onConflict: "user_id,app", ignoreDuplicates: true });

  await supabase
    .from("linkedin_users_meta")
    .upsert({ user_id: userId }, { onConflict: "user_id", ignoreDuplicates: true });
}
