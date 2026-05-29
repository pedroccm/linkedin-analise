import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { fetchTimeline } from "@/lib/timeline";
import { TimelineItem } from "./timeline-item";
import { CompanyFilter } from "../feed/company-filter";
import { FilterBar } from "../feed/filter-bar";

export const dynamic = "force-dynamic";

function rangeStartISO(range: string): string | null {
  const now = new Date();
  const d = new Date(now);
  switch (range) {
    case "30d": d.setDate(now.getDate() - 30); break;
    case "90d": d.setDate(now.getDate() - 90); break;
    case "6m":  d.setMonth(now.getMonth() - 6); break;
    case "1y":  d.setFullYear(now.getFullYear() - 1); break;
    default: return null;
  }
  return d.toISOString();
}

export default async function TimelinePage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string; q?: string; company?: string }>;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const sp = await searchParams;
  const range = typeof sp.range === "string" ? sp.range : "";
  const query = typeof sp.q === "string" ? sp.q : "";
  const companyId = typeof sp.company === "string" ? sp.company : "";

  const { data: companies } = await supabase
    .from("linkedin_profiles")
    .select("id, full_name, handle")
    .eq("profile_type", "company")
    .order("full_name");

  // Restrict to people linked to a company if filtered
  let actorIds: string[] | undefined;
  if (companyId) {
    const { data: linked } = await supabase
      .from("linkedin_profiles")
      .select("id")
      .eq("company_profile_id", companyId);
    actorIds = linked?.map((p) => p.id) ?? [];
    // Companies don't react/comment, so we don't include the company itself
  }

  const rows = await fetchTimeline({
    actorIds,
    since: rangeStartISO(range),
    query,
  });

  return (
    <div className="space-y-6">
      <section>
        <h1 className="text-2xl font-semibold mb-1">Timeline</h1>
        <p className="text-[var(--color-text-muted)] text-sm">
          Likes and comments made by the people you track. Filter by company below.
        </p>
      </section>

      <section className="flex flex-wrap items-center justify-between gap-3">
        <CompanyFilter
          companies={companies ?? []}
          currentCompanyId={companyId}
          basePath="/timeline"
        />
      </section>

      <FilterBar basePath="/timeline" currentRange={range} currentQuery={query} />

      <p className="text-xs text-[var(--color-text-muted)]">
        {rows.length} {rows.length === 1 ? "activity" : "activities"}
      </p>

      {rows.length === 0 && (
        <p className="text-[var(--color-text-muted)] text-sm">
          No activity yet. Sync reactions and comments from your tracked people.
        </p>
      )}

      <ul className="grid gap-3">
        {rows.map((row) => (
          <TimelineItem key={row.key} row={row} />
        ))}
      </ul>
    </div>
  );
}
