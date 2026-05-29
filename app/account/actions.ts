"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function updateAccountName(formData: FormData) {
  const fullName = String(formData.get("full_name") ?? "").trim().slice(0, 80);

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  await supabase
    .from("linkedin_users_meta")
    .update({ full_name: fullName || null, updated_at: new Date().toISOString() })
    .eq("user_id", user.id);

  revalidatePath("/account");
}
