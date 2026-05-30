import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { fetchTimeline } from "@/lib/timeline";
import { ActivityTimeline } from "./activity-timeline";
import { CompanyFilter } from "../feed/company-filter";
import { TagFilter } from "../feed/tag-filter";
import { FilterBar } from "../feed/filter-bar";
import { getServerI18n } from "@/lib/i18n/server";

export const dynamic = "force-dynamic";

export default async function TimelinePage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; company?: string; tag?: string }>;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const sp = await searchParams;
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

  const rows = await fetchTimeline({ actorIds, query });

  return (
    <div className="space-y-6">
      <section>
        <h1 className="text-2xl font-semibold mb-1">{t.title}</h1>
        <p className="text-[var(--color-text-muted)] text-sm">{t.subtitle}</p>
      </section>

      <section className="flex flex-wrap items-center gap-2">
        <FilterBar basePath="/timeline" currentQuery={query} showRange={false} />
        <CompanyFilter
          companies={companies ?? []}
          currentCompanyId={companyId}
          basePath="/timeline"
        />
        <TagFilter tags={tags ?? []} currentTagId={tagId} basePath="/timeline" />
      </section>

      <p className="text-xs text-[var(--color-text-muted)]">
        {rows.length} {t.activities}
      </p>

      <ActivityTimeline rows={rows} showActor />
    </div>
  );
}
