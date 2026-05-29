import { PLANS, type PlanTier } from "@/lib/plans";
import { createClient } from "@/lib/supabase/server";

export type SubscriptionStatus = {
  tier: PlanTier;
  activeTier: PlanTier;
  subscriptionUntil: string | null;
  daysLeft: number | null;
  isActive: boolean;
  profilesUsed: number;
  profileLimit: number;
  canAddProfile: boolean;
};

export async function getSubscriptionStatus(
  userId: string
): Promise<SubscriptionStatus> {
  const supabase = await createClient();

  const [{ data: meta }, { count }] = await Promise.all([
    supabase
      .from("linkedin_users_meta")
      .select("plan_tier, subscription_until")
      .eq("user_id", userId)
      .maybeSingle(),
    supabase
      .from("linkedin_profiles")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId),
  ]);

  const tier: PlanTier = (meta?.plan_tier as PlanTier) ?? "free";
  const until = meta?.subscription_until ?? null;
  const isActive = until ? new Date(until) > new Date() : tier === "free";
  const activeTier: PlanTier = isActive ? tier : "free";

  const daysLeft = until
    ? Math.max(
        0,
        Math.ceil(
          (new Date(until).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
        )
      )
    : null;

  const profilesUsed = count ?? 0;
  const profileLimit = PLANS[activeTier].profileLimit;

  return {
    tier,
    activeTier,
    subscriptionUntil: until,
    daysLeft,
    isActive,
    profilesUsed,
    profileLimit,
    canAddProfile: profilesUsed < profileLimit,
  };
}
