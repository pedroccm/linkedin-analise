export type PlanTier = "free" | "starter" | "pro";

export type Plan = {
  tier: PlanTier;
  name: string;
  priceCents: number;
  profileLimit: number;
  description: string;
  features: string[];
};

export const PLANS: Record<PlanTier, Plan> = {
  free: {
    tier: "free",
    name: "Free",
    priceCents: 0,
    profileLimit: 1,
    description: "Try the product",
    features: [
      "1 LinkedIn profile",
      "Unlimited syncs (posts, reactions, comments)",
      "Full analytics",
    ],
  },
  starter: {
    tier: "starter",
    name: "Starter",
    priceCents: 2900,
    profileLimit: 5,
    description: "For individual creators and researchers",
    features: [
      "Up to 5 LinkedIn profiles",
      "Unlimited syncs",
      "Full analytics + filters",
      "30 days of access per PIX payment",
    ],
  },
  pro: {
    tier: "pro",
    name: "Pro",
    priceCents: 9000,
    profileLimit: 20,
    description: "For agencies and serious analysts",
    features: [
      "Up to 20 LinkedIn profiles",
      "Unlimited syncs",
      "Full analytics + filters",
      "30 days of access per PIX payment",
      "Priority support",
    ],
  },
};

export function formatPrice(cents: number): string {
  return `R$ ${(cents / 100).toFixed(2).replace(".", ",")}`;
}
