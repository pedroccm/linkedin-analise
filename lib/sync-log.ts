import { createServiceClient } from "@/lib/supabase/server";

// Apify unit costs in USD (1 micro-USD = 0.000001 USD)
const APIFY_COST_PER_ITEM = {
  details_posts: 2_000, // posts cost $0.002 → 2000 micro-USD per post (details extra $0.004 = 4000 added below)
  reactions: 2_000, // $0.002 / reaction
  comments: 2_000, // $0.002 / comment
  company_employees: 4_000, // Short mode $0.004 / employee
} as const;

const DETAILS_FIXED_COST_MICRO_USD = 4_000; // profile-scraper $0.004/profile

type SyncType = "details_posts" | "reactions" | "comments" | "company_employees";

export async function logSync(params: {
  userId: string;
  profileId: string | null;
  syncType: SyncType;
  itemsReturned: number;
}) {
  let cost = APIFY_COST_PER_ITEM[params.syncType] * params.itemsReturned;
  if (params.syncType === "details_posts") cost += DETAILS_FIXED_COST_MICRO_USD;

  const admin = createServiceClient();
  await admin.from("sync_log").insert({
    user_id: params.userId,
    profile_id: params.profileId,
    sync_type: params.syncType,
    items_returned: params.itemsReturned,
    cost_micro_usd: cost,
  });
}

export function formatMicroUsd(micro: number): string {
  return `$${(micro / 1_000_000).toFixed(4)}`;
}

export function microUsdToBrl(micro: number, usdToBrl = 5.0): string {
  const brl = (micro / 1_000_000) * usdToBrl;
  return `R$ ${brl.toFixed(2).replace(".", ",")}`;
}
