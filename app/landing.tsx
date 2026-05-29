import Link from "next/link";
import { PLANS, formatPrice, type PlanTier } from "@/lib/plans";
import type { Dict } from "@/lib/i18n/dictionaries";

export function Landing({ dict }: { dict: Dict }) {
  const t = dict.landing;
  return (
    <div className="space-y-16 max-w-5xl mx-auto py-6">
      {/* Hero */}
      <section className="text-center space-y-5 pt-8">
        <h1 className="text-4xl md:text-5xl font-bold leading-tight">
          {t.heroLine1}
          <br />
          <span className="text-[var(--color-accent-2)]">{t.heroLine2}</span>
        </h1>
        <p className="text-lg text-[var(--color-text-muted)] max-w-2xl mx-auto">
          {t.subtitle}
        </p>
        <div className="flex gap-3 justify-center flex-wrap pt-2">
          <Link
            href="/auth/login"
            className="bg-[var(--color-accent)] hover:bg-[var(--color-accent-2)] text-white font-semibold px-6 py-3 rounded-md no-underline transition-colors"
          >
            {t.startFree}
          </Link>
          <a
            href="#pricing"
            className="border border-[var(--color-border)] hover:border-[var(--color-accent-2)] text-white font-medium px-6 py-3 rounded-md no-underline transition-colors"
          >
            {t.seePricing}
          </a>
        </div>
      </section>

      {/* Features */}
      <section className="grid md:grid-cols-3 gap-5">
        {[
          { title: t.f1Title, body: t.f1Body },
          { title: t.f2Title, body: t.f2Body },
          { title: t.f3Title, body: t.f3Body },
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
          <h2 className="text-3xl font-semibold">{t.pricingTitle}</h2>
          <p className="text-[var(--color-text-muted)] mt-2">{t.pricingSub}</p>
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
                      {t.popular}
                    </span>
                  )}
                </div>
                <div className="text-3xl font-semibold mb-1">
                  {plan.priceCents === 0 ? formatPrice(0).replace("0,00", "0") : formatPrice(plan.priceCents)}
                </div>
                <div className="text-xs text-[var(--color-text-muted)] mb-5">
                  {plan.priceCents === 0 ? t.forever : t.per30}
                </div>
                <Link
                  href="/auth/login"
                  className={
                    "text-center font-medium py-2.5 rounded text-sm transition-colors no-underline " +
                    (highlighted
                      ? "bg-[var(--color-accent)] hover:bg-[var(--color-accent-2)] text-white"
                      : "border border-[var(--color-border)] hover:border-[var(--color-accent-2)] text-white")
                  }
                >
                  {plan.priceCents === 0 ? t.ctaStartFree : t.ctaSignup}
                </Link>
              </div>
            );
          })}
        </div>
      </section>

      {/* FAQ */}
      <section className="space-y-3 max-w-2xl mx-auto">
        <h2 className="text-2xl font-semibold text-center mb-6">{t.faqTitle}</h2>
        {[
          { q: t.faq1Q, a: t.faq1A },
          { q: t.faq2Q, a: t.faq2A },
          { q: t.faq3Q, a: t.faq3A },
          { q: t.faq4Q, a: t.faq4A },
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
          {t.finalCta}
        </Link>
      </section>
    </div>
  );
}
