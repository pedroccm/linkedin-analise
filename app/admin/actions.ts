"use server";

import { revalidatePath } from "next/cache";
import { notFound } from "next/navigation";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { isAdminEmail } from "@/lib/admin";
import type { PlanTier } from "@/lib/plans";

async function requireAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || !isAdminEmail(user.email)) notFound();
}

const DAY_MS = 24 * 60 * 60 * 1000;

export async function extendSubscription(formData: FormData) {
  await requireAdmin();
  const userId = String(formData.get("user_id") ?? "");
  const days = Number(formData.get("days") ?? 30);
  if (!userId || !Number.isFinite(days) || days <= 0) {
    throw new Error("Invalid input");
  }

  const admin = createServiceClient();
  const { data: meta } = await admin
    .from("linkedin_users_meta")
    .select("subscription_until, plan_tier")
    .eq("user_id", userId)
    .single();

  const base =
    meta?.subscription_until && new Date(meta.subscription_until) > new Date()
      ? new Date(meta.subscription_until)
      : new Date();
  const newUntil = new Date(base.getTime() + days * DAY_MS);

  // If currently free, default to starter when extending — admin can override after
  const tier = meta?.plan_tier && meta.plan_tier !== "free" ? meta.plan_tier : "starter";

  await admin
    .from("linkedin_users_meta")
    .update({
      plan_tier: tier,
      subscription_until: newUntil.toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", userId);

  revalidatePath(`/admin/users/${userId}`);
  revalidatePath("/admin/users");
  revalidatePath("/admin");
}

export async function setPlanTier(formData: FormData) {
  await requireAdmin();
  const userId = String(formData.get("user_id") ?? "");
  const tier = String(formData.get("tier") ?? "") as PlanTier;
  if (!userId || !["free", "starter", "pro"].includes(tier)) {
    throw new Error("Invalid input");
  }

  const admin = createServiceClient();
  await admin
    .from("linkedin_users_meta")
    .update({
      plan_tier: tier,
      updated_at: new Date().toISOString(),
      // If demoting to free, also clear the expiry
      ...(tier === "free" ? { subscription_until: null } : {}),
    })
    .eq("user_id", userId);

  revalidatePath(`/admin/users/${userId}`);
  revalidatePath("/admin/users");
  revalidatePath("/admin");
}
