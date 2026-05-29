import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import type { Dict } from "@/lib/i18n/dictionaries";
import { addProfile } from "../../actions";
import { SubmitButton } from "../../submit-button";

type Agg = {
  name: string;
  url: string | null;
  reactions: number;
  comments: number;
};

// Canonicalize a LinkedIn URL to https://www.linkedin.com/in/<handle> (lowercased),
// matching what addProfile stores, so we can tell which authors are already tracked.
function canonUrl(u: string | null | undefined): string | null {
  if (!u) return null;
  try {
    const url = new URL(u);
    if (!url.hostname.includes("linkedin.com")) return null;
    const parts = url.pathname.split("/").filter(Boolean);
    if (parts.length < 2) return null;
    return `https://www.linkedin.com/${parts.slice(0, 2).join("/")}`.toLowerCase();
  } catch {
    return null;
  }
}

export async function TopEngagedAuthors({ profileId, t }: { profileId: string; t: Dict["profile"] }) {
  const supabase = await createClient();

  const [{ data: profile }, { data: reactions }, { data: comments }, { data: tracked }] =
    await Promise.all([
      supabase
        .from("linkedin_profiles")
        .select("profile_url, full_name, handle")
        .eq("id", profileId)
        .single(),
      supabase
        .from("linkedin_profile_reactions")
        .select("post_author_name, post_author_url")
        .eq("profile_id", profileId),
      supabase
        .from("linkedin_profile_comments")
        .select("parent_post_author_name, parent_post_author_url")
        .eq("profile_id", profileId),
      supabase
        .from("linkedin_profiles")
        .select("id, profile_url")
        .eq("profile_type", "person"),
    ]);

  // Map canonical URL -> tracked profile id (so we can link / mark as tracked)
  const trackedByUrl = new Map<string, string>();
  for (const p of tracked ?? []) {
    const cu = canonUrl(p.profile_url);
    if (cu) trackedByUrl.set(cu, p.id);
  }

  if ((!reactions || reactions.length === 0) && (!comments || comments.length === 0)) {
    return null;
  }

  const ownHandle = profile?.handle?.toLowerCase() ?? "";
  const ownName = profile?.full_name?.toLowerCase() ?? "";

  function isSelf(name: string | null | undefined, url: string | null | undefined): boolean {
    if (ownHandle && url?.toLowerCase().includes(`/in/${ownHandle}`)) return true;
    if (ownName && name?.toLowerCase() === ownName) return true;
    return false;
  }

  const map = new Map<string, Agg>();

  for (const r of reactions ?? []) {
    const name = r.post_author_name?.trim();
    if (!name) continue;
    if (isSelf(name, r.post_author_url)) continue;
    const key = name.toLowerCase();
    const cur = map.get(key) ?? { name, url: r.post_author_url ?? null, reactions: 0, comments: 0 };
    cur.reactions += 1;
    cur.url ??= r.post_author_url ?? null;
    map.set(key, cur);
  }

  for (const c of comments ?? []) {
    const name = c.parent_post_author_name?.trim();
    if (!name) continue;
    if (isSelf(name, c.parent_post_author_url)) continue;
    const key = name.toLowerCase();
    const cur = map.get(key) ?? { name, url: c.parent_post_author_url ?? null, reactions: 0, comments: 0 };
    cur.comments += 1;
    cur.url ??= c.parent_post_author_url ?? null;
    map.set(key, cur);
  }

  const top = [...map.values()]
    .sort((a, b) => b.reactions + b.comments - (a.reactions + a.comments))
    .slice(0, 10);

  if (top.length === 0) return null;

  return (
    <section className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg p-5">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-[var(--color-text-muted)] uppercase tracking-wide">
          {t.topEngaged.title}
        </h3>
        <span className="text-xs text-[var(--color-text-muted)]">
          {map.size} {t.topEngaged.uniqueAuthors}
        </span>
      </div>
      <ul className="grid gap-1">
        {top.map((a, i) => {
          const total = a.reactions + a.comments;
          const cu = canonUrl(a.url);
          const trackedId = cu ? trackedByUrl.get(cu) : undefined;
          return (
            <li
              key={a.name}
              className="flex items-center gap-3 py-2 px-3 rounded hover:bg-[var(--color-bg-2)] transition-colors"
            >
              <span className="text-xs text-[var(--color-text-muted)] w-5 text-right">
                {i + 1}
              </span>
              <div className="flex-1 min-w-0">
                {a.url ? (
                  <a
                    href={a.url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-sm text-white no-underline hover:underline"
                  >
                    {a.name}
                  </a>
                ) : (
                  <span className="text-sm">{a.name}</span>
                )}
              </div>
              <div className="flex items-center gap-3 text-xs text-[var(--color-text-muted)] shrink-0">
                {a.reactions > 0 && <span>❤ {a.reactions}</span>}
                {a.comments > 0 && <span>💬 {a.comments}</span>}
                <span className="text-white font-medium w-8 text-right">{total}</span>
                {a.url &&
                  (trackedId ? (
                    <Link
                      href={`/profiles/${trackedId}`}
                      className="text-[10px] px-2 py-1 rounded border border-[var(--color-success)] text-[var(--color-success)] no-underline hover:bg-[#0f3a1f] transition-colors whitespace-nowrap"
                    >
                      {t.tracked}
                    </Link>
                  ) : (
                    <form action={addProfile}>
                      <input type="hidden" name="profile_url" value={a.url} />
                      <SubmitButton
                        idle={t.track}
                        pending={t.adding}
                        className="text-[10px] px-2 py-1 rounded border border-[var(--color-border)] hover:border-[var(--color-accent-2)] hover:text-white text-[var(--color-text-muted)] transition-colors whitespace-nowrap"
                      />
                    </form>
                  ))}
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
