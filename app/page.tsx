import { createClient } from "@/lib/supabase/server";
import { addProfile } from "./actions";
import { SyncAllButton } from "./sync-all-button";
import { Landing } from "./landing";
import { getServerI18n } from "@/lib/i18n/server";
import { SubmitButton } from "./submit-button";
import { pickSuggestions } from "@/lib/suggested-profiles";
import { ProfileList } from "./profile-list";

export const dynamic = "force-dynamic";

export default async function Home() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { dict } = await getServerI18n();
  if (!user) return <Landing dict={dict} />;
  const t = dict.home;

  const { data: profiles, error } = await supabase
    .from("linkedin_profiles")
    .select(
      "id, profile_url, handle, full_name, headline, tagline, posts_count, last_synced_at, created_at, profile_type, avatar_url"
    )
    .order("created_at", { ascending: false });

  const syncRefs = (profiles ?? []).map((p) => ({
    id: p.id,
    label: p.full_name || p.handle || p.profile_url,
  }));

  const trackedUrls = new Set(
    (profiles ?? []).map((p) => (p.profile_url ?? "").toLowerCase())
  );
  const suggestions = pickSuggestions(5, trackedUrls);

  return (
    <div className="space-y-8">
      <section className="flex items-start justify-between gap-4 flex-wrap">
        <div className="max-w-2xl">
          <h1 className="text-2xl font-semibold mb-1">{t.heading}</h1>
          <p className="text-[var(--color-text-muted)] text-sm">{t.subtitle}</p>
        </div>
        {profiles && profiles.length > 0 && <SyncAllButton profiles={syncRefs} />}
      </section>

      <section className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg p-5">
        <form action={addProfile} className="flex flex-col sm:flex-row gap-3">
          <input
            name="profile_url"
            type="text"
            required
            placeholder={t.placeholder}
            className="flex-1 bg-[var(--color-bg)] border border-[var(--color-border)] rounded px-4 py-2 text-sm outline-none focus:border-[var(--color-accent-2)]"
          />
          <SubmitButton
            idle={t.add}
            pending={t.adding}
            className="bg-[var(--color-accent)] hover:bg-[var(--color-accent-2)] text-white font-medium px-5 py-2 rounded text-sm transition-colors"
          />
        </form>
        <p className="text-xs text-[var(--color-text-muted)] mt-2">{t.companyHint}</p>

        {suggestions.length > 0 && (profiles?.length ?? 0) < 2 && (
          <div className="mt-4 pt-4 border-t border-[var(--color-border)]">
            <div className="text-xs uppercase tracking-wide text-[var(--color-text-muted)] mb-2">
              {t.suggestions}
            </div>
            <div className="flex flex-wrap gap-2">
              {suggestions.map((s) => (
                <form key={s.url} action={addProfile}>
                  <input type="hidden" name="profile_url" value={s.url} />
                  <SubmitButton
                    idle={`+ ${s.name}`}
                    pending={t.adding}
                    className="text-xs px-3 py-1.5 rounded-full border border-[var(--color-border)] hover:border-[var(--color-accent-2)] hover:text-white text-[var(--color-text-muted)] transition-colors"
                  />
                </form>
              ))}
            </div>
          </div>
        )}
      </section>

      <section>
        {error && (
          <p className="text-[var(--color-danger)] text-sm">{error.message}</p>
        )}
        {!error && profiles && profiles.length === 0 && (
          <p className="text-[var(--color-text-muted)] text-sm">{t.empty}</p>
        )}
        {profiles && profiles.length > 0 && <ProfileList profiles={profiles} />}
      </section>
    </div>
  );
}
