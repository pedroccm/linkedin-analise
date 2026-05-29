"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { useLocale } from "@/lib/i18n/client";
import type { Locale } from "@/lib/i18n/config";

const OPTIONS: Array<{ key: Locale; label: string }> = [
  { key: "pt", label: "PT" },
  { key: "en", label: "EN" },
];

export function LocaleSwitcher() {
  const current = useLocale();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function pick(locale: Locale) {
    if (locale === current) return;
    fetch("/api/locale", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ locale }),
    }).then(() => startTransition(() => router.refresh()));
  }

  return (
    <div className="flex items-center gap-0.5 text-xs" aria-busy={isPending}>
      {OPTIONS.map((o, i) => (
        <span key={o.key} className="flex items-center">
          {i > 0 && <span className="text-[var(--color-border)] mx-1">|</span>}
          <button
            type="button"
            onClick={() => pick(o.key)}
            className={
              "transition-colors " +
              (o.key === current
                ? "text-white font-medium"
                : "text-[var(--color-text-muted)] hover:text-white")
            }
          >
            {o.label}
          </button>
        </span>
      ))}
    </div>
  );
}
