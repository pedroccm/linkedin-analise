"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

// Normalize a WhatsApp number to "+<digits>" (keeps a single leading +), or null.
function normalizeWhatsapp(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const digits = trimmed.replace(/[^\d]/g, "");
  if (!digits) return null;
  return `+${digits}`;
}

export async function updateAccountName(formData: FormData) {
  const fullName = String(formData.get("full_name") ?? "").trim().slice(0, 80);
  const whatsapp = normalizeWhatsapp(String(formData.get("whatsapp") ?? ""));

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  await supabase
    .from("linkedin_users_meta")
    .update({
      full_name: fullName || null,
      whatsapp,
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", user.id);

  revalidatePath("/account");
}
