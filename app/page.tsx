import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { addProfile } from "./actions";
import { SyncAllButton } from "./sync-all-button";
import { Landing } from "./landing";
import { getServerI18n } from "@/lib/i18n/server";

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
          <button
            type="submit"
            className="bg-[var(--color-accent)] hover:bg-[var(--color-accent-2)] text-white font-medium px-5 py-2 rounded text-sm transition-colors"
          >
            {t.add}
          </button>
        </form>
        <p className="text-xs text-[var(--color-text-muted)] mt-2">{t.companyHint}</p>
      </section>

      <section>
        {error && (
          <p className="text-[var(--color-danger)] text-sm">
            {error.message}
          </p>
        )}
        {!error && profiles && profiles.length === 0 && (
          <p className="text-[var(--color-text-muted)] text-sm">{t.empty}</p>
        )}
        <ul className="grid gap-3">
          {profiles?.map((p) => (
            <li
              key={p.id}
              className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg p-4 hover:border-[var(--color-accent-2)] transition-colors"
            >
              <Link href={`/profiles/${p.id}`} className="no-underline text-white">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3 min-w-0">
                    <span
                      className={`text-[10px] uppercase tracking-wide px-2 py-0.5 rounded border shrink-0 ${
                        p.profile_type === "company"
                          ? "bg-[#0f1f3a] text-[#7ea5e2] border-[#1f365a]"
                          : "bg-[var(--color-bg-2)] text-[var(--color-text-muted)] border-[var(--color-border)]"
                      }`}
                    >
                      {p.profile_type === "company" ? t.company : t.person}
                    </span>
                    <div className="min-w-0">
                      <div className="font-medium truncate">
                        {p.full_name || p.handle || p.profile_url}
                      </div>
                      {(p.tagline || p.headline) && (
                        <div className="text-sm text-[var(--color-text-muted)] truncate">
                          {p.tagline || p.headline}
                        </div>
                      )}
                      <div className="text-xs text-[var(--color-text-muted)] mt-1 truncate">
                        {p.profile_url}
                      </div>
                    </div>
                  </div>
                  <div className="text-right text-xs text-[var(--color-text-muted)] shrink-0">
                    <div>
                      <span className="text-white font-medium">{p.posts_count ?? 0}</span> {t.posts}
                    </div>
                    {p.last_synced_at && (
                      <div>{t.synced} {new Date(p.last_synced_at).toLocaleString()}</div>
                    )}
                  </div>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
