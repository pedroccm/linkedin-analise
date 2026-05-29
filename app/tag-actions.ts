"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

// Find-or-create a tag by name (per user), then attach it to a profile.
export async function addTagToProfile(formData: FormData) {
  const profileId = String(formData.get("profile_id") ?? "");
  const rawName = String(formData.get("tag_name") ?? "").trim();
  if (!profileId || !rawName) return;

  const name = rawName.slice(0, 40);

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  // Upsert the tag (unique per user,name) and get its id
  const { data: tag, error: tagError } = await supabase
    .from("linkedin_tags")
    .upsert({ name, user_id: user.id }, { onConflict: "user_id,name" })
    .select("id")
    .single();
  if (tagError || !tag) throw new Error(tagError?.message ?? "Tag upsert failed");

  await supabase
    .from("linkedin_profile_tags")
    .upsert(
      { profile_id: profileId, tag_id: tag.id, user_id: user.id },
      { onConflict: "profile_id,tag_id", ignoreDuplicates: true }
    );

  revalidatePath(`/profiles/${profileId}`);
  revalidatePath("/");
}

export async function removeTagFromProfile(formData: FormData) {
  const profileId = String(formData.get("profile_id") ?? "");
  const tagId = String(formData.get("tag_id") ?? "");
  if (!profileId || !tagId) return;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  await supabase
    .from("linkedin_profile_tags")
    .delete()
    .eq("profile_id", profileId)
    .eq("tag_id", tagId);

  revalidatePath(`/profiles/${profileId}`);
}
