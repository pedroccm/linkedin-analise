import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { fetchTimeline } from "@/lib/timeline";
import { TimelineItem } from "./timeline-item";
import { CompanyFilter } from "../feed/company-filter";
import { TagFilter } from "../feed/tag-filter";
import { FilterBar } from "../feed/filter-bar";
import { getServerI18n } from "@/lib/i18n/server";

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
  searchParams: Promise<{ range?: string; q?: string; company?: string; tag?: string }>;
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
  const tagId = typeof sp.tag === "string" ? sp.tag : "";
  const t = (await getServerI18n()).dict.timeline;

  const [{ data: companies }, { data: tags }] = await Promise.all([
    supabase
      .from("linkedin_profiles")
      .select("id, full_name, handle")
      .eq("profile_type", "company")
      .order("full_name"),
    supabase.from("linkedin_tags").select("id, name").order("name"),
  ]);

  // Restrict actors by company and/or tag (intersection when both set).
  const filters: string[][] = [];
  if (companyId) {
    const { data: linked } = await supabase
      .from("linkedin_profiles")
      .select("id")
      .eq("company_profile_id", companyId);
    filters.push(linked?.map((p) => p.id) ?? []);
  }
  if (tagId) {
    const { data: tagged } = await supabase
      .from("linkedin_profile_tags")
      .select("profile_id")
      .eq("tag_id", tagId);
    filters.push((tagged ?? []).map((r) => r.profile_id));
  }
  let actorIds: string[] | undefined;
  if (filters.length === 1) actorIds = filters[0];
  else if (filters.length > 1) {
    const sets = filters.map((f) => new Set(f));
    actorIds = [...sets[0]].filter((id) => sets.every((s) => s.has(id)));
  }

  const rows = await fetchTimeline({
    actorIds,
    since: rangeStartISO(range),
    query,
  });

  return (
    <div className="space-y-6">
      <section>
        <h1 className="text-2xl font-semibold mb-1">{t.title}</h1>
        <p className="text-[var(--color-text-muted)] text-sm">{t.subtitle}</p>
      </section>

      <section className="flex flex-wrap items-center gap-3">
        <CompanyFilter
          companies={companies ?? []}
          currentCompanyId={companyId}
          basePath="/timeline"
        />
        <TagFilter tags={tags ?? []} currentTagId={tagId} basePath="/timeline" />
      </section>

      <FilterBar basePath="/timeline" currentRange={range} currentQuery={query} />

      <p className="text-xs text-[var(--color-text-muted)]">
        {rows.length} {t.activities}
      </p>

      {rows.length === 0 && (
        <p className="text-[var(--color-text-muted)] text-sm">{t.empty}</p>
      )}

      <ul className="grid gap-3">
        {rows.map((row) => (
          <TimelineItem key={row.key} row={row} />
        ))}
      </ul>
    </div>
  );
}
