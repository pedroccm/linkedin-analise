"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

// Toggle daily monitoring for a profile. The toggle lives on the (workspace-shared)
// profile; alerts go to whichever workspace users set a WhatsApp number.
export async function setMonitor(profileId: string, enabled: boolean) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  const update: Record<string, unknown> = { monitor_enabled: enabled };

  // On enable, baseline from the latest post we already have so we don't alert on
  // posts that already existed; only genuinely new ones trigger.
  if (enabled) {
    const { data: latest } = await supabase
      .from("linkedin_posts")
      .select("apify_post_id")
      .eq("profile_id", profileId)
      .order("posted_at", { ascending: false, nullsFirst: false })
      .limit(1)
      .maybeSingle();
    if (latest?.apify_post_id) {
      update.last_monitored_post_id = latest.apify_post_id;
      update.last_monitored_at = new Date().toISOString();
    }
  }

  await supabase.from("linkedin_profiles").update(update).eq("id", profileId);
  revalidatePath(`/profiles/${profileId}`);
}
