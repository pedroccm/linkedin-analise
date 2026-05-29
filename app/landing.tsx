import Link from "next/link";
import { PLANS, formatPrice, type PlanTier } from "@/lib/plans";

export function Landing() {
  return (
    <div className="space-y-16 max-w-5xl mx-auto py-6">
      {/* Hero */}
      <section className="text-center space-y-5 pt-8">
        <h1 className="text-4xl md:text-5xl font-bold leading-tight">
          Analyze any LinkedIn profile.
          <br />
          <span className="text-[var(--color-accent-2)]">Without the noise.</span>
        </h1>
        <p className="text-lg text-[var(--color-text-muted)] max-w-2xl mx-auto">
          Track posts, reactions, and comments from any public LinkedIn profile.
          See engagement trends, content cadence, and who they actually engage with.
        </p>
        <div className="flex gap-3 justify-center flex-wrap pt-2">
          <Link
            href="/auth/login"
            className="bg-[var(--color-accent)] hover:bg-[var(--color-accent-2)] text-white font-semibold px-6 py-3 rounded-md no-underline transition-colors"
          >
            Start free
          </Link>
          <a
            href="#pricing"
            className="border border-[var(--color-border)] hover:border-[var(--color-accent-2)] text-white font-medium px-6 py-3 rounded-md no-underline transition-colors"
          >
            See pricing
          </a>
        </div>
      </section>

      {/* Features */}
      <section className="grid md:grid-cols-3 gap-5">
        {[
          {
            title: "Posts + analytics",
            body: "Up to 100 posts per profile, with likes, comments, reposts. Sort by date or engagement. Full-text search.",
          },
          {
            title: "Behavioral footprint",
            body: "See what they react to and comment on. Discover the top 10 authors they engage with most.",
          },
          {
            title: "Cadence & trends",
            body: "Posts per week chart, average engagement, best post, content vs reshare ratio. All updated on demand.",
          },
        ].map((f) => (
          <div
            key={f.title}
            className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg p-5"
          >
            <h3 className="font-semibold mb-2">{f.title}</h3>
            <p className="text-sm text-[var(--color-text-muted)]">{f.body}</p>
          </div>
        ))}
      </section>

      {/* Pricing */}
      <section id="pricing" className="space-y-6">
        <div className="text-center">
          <h2 className="text-3xl font-semibold">Simple pricing</h2>
          <p className="text-[var(--color-text-muted)] mt-2">
            Pay via PIX. 30 days of access per payment. Cancel anytime by not renewing.
          </p>
        </div>
        <div className="grid md:grid-cols-3 gap-4">
          {(["free", "starter", "pro"] as PlanTier[]).map((tier) => {
            const plan = PLANS[tier];
            const highlighted = tier === "starter";
            return (
              <div
                key={tier}
                className={
                  "bg-[var(--color-surface)] border rounded-lg p-6 flex flex-col " +
                  (highlighted
                    ? "border-[var(--color-accent)]"
                    : "border-[var(--color-border)]")
                }
              >
                <div className="flex items-baseline justify-between mb-1">
                  <h3 className="text-lg font-semibold">{plan.name}</h3>
                  {highlighted && (
                    <span className="text-[10px] uppercase tracking-wide bg-[var(--color-accent)] text-white px-2 py-0.5 rounded">
                      Popular
                    </span>
                  )}
                </div>
                <p className="text-sm text-[var(--color-text-muted)] mb-4">
                  {plan.description}
                </p>
                <div className="text-3xl font-semibold mb-1">
                  {plan.priceCents === 0 ? "Free" : formatPrice(plan.priceCents)}
                </div>
                <div className="text-xs text-[var(--color-text-muted)] mb-5">
                  {plan.priceCents === 0
                    ? "forever"
                    : "for 30 days · pay via PIX"}
                </div>
                <ul className="space-y-2 mb-6 text-sm flex-1">
                  {plan.features.map((f) => (
                    <li key={f} className="flex gap-2">
                      <span className="text-[var(--color-success)] shrink-0">✓</span>
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
                <Link
                  href="/auth/login"
                  className={
                    "text-center font-medium py-2.5 rounded text-sm transition-colors no-underline " +
                    (highlighted
                      ? "bg-[var(--color-accent)] hover:bg-[var(--color-accent-2)] text-white"
                      : "border border-[var(--color-border)] hover:border-[var(--color-accent-2)] text-white")
                  }
                >
                  {plan.priceCents === 0 ? "Start free" : "Sign up"}
                </Link>
              </div>
            );
          })}
        </div>
      </section>

      {/* FAQ */}
      <section className="space-y-3 max-w-2xl mx-auto">
        <h2 className="text-2xl font-semibold text-center mb-6">FAQ</h2>
        {[
          {
            q: "Where does the data come from?",
            a: "We use Apify's LinkedIn scrapers under the hood. No LinkedIn cookies or login required from you.",
          },
          {
            q: "Do you charge per sync?",
            a: "No. All your plan's syncs are unlimited. You only pay the flat monthly fee.",
          },
          {
            q: "Can I upgrade from Free?",
            a: "Yes, anytime. Your existing data stays, your profile limit just goes up.",
          },
          {
            q: "Is this allowed by LinkedIn?",
            a: "We scrape only public profile data — same as a human visiting the page. We don't log into anyone's account.",
          },
        ].map((item) => (
          <details
            key={item.q}
            className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg p-4"
          >
            <summary className="cursor-pointer font-medium">{item.q}</summary>
            <p className="mt-2 text-sm text-[var(--color-text-muted)]">{item.a}</p>
          </details>
        ))}
      </section>

      <section className="text-center py-8">
        <Link
          href="/auth/login"
          className="bg-[var(--color-accent)] hover:bg-[var(--color-accent-2)] text-white font-semibold px-6 py-3 rounded-md no-underline transition-colors"
        >
          Start free now
        </Link>
      </section>
    </div>
  );
}
