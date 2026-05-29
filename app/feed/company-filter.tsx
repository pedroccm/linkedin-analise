"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";
import { useDict } from "@/lib/i18n/client";

type Company = {
  id: string;
  full_name: string | null;
  handle: string | null;
};

export function CompanyFilter({
  companies,
  currentCompanyId,
  basePath,
}: {
  companies: Company[];
  currentCompanyId: string;
  basePath: string;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const t = useDict().feed;

  function setCompany(value: string) {
    const params = new URLSearchParams(searchParams);
    if (value) params.set("company", value);
    else params.delete("company");
    const qs = params.toString();
    startTransition(() => {
      router.replace(qs ? `${basePath}?${qs}` : basePath, { scroll: false });
    });
  }

  return (
    <div className="flex items-center gap-2">
      <label className="text-xs text-[var(--color-text-muted)] uppercase tracking-wide">
        {t.company}
      </label>
      <select
        value={currentCompanyId}
        onChange={(e) => setCompany(e.target.value)}
        className="bg-[var(--color-bg)] border border-[var(--color-border)] rounded px-3 py-1.5 text-sm focus:outline-none focus:border-[var(--color-accent-2)]"
      >
        <option value="">{t.allCompanies}</option>
        {companies.map((c) => (
          <option key={c.id} value={c.id}>
            {c.full_name || c.handle}
          </option>
        ))}
      </select>
      {isPending && (
        <span className="text-xs text-[var(--color-text-muted)]">…</span>
      )}
    </div>
  );
}
