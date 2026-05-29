import { createClient, createServiceClient } from "@/lib/supabase/server";
import type { Dict } from "@/lib/i18n/dictionaries";
import {
  createOrganization,
  inviteMember,
  revokeInvite,
  removeMember,
  leaveOrganization,
} from "./org-actions";
import { SubmitButton } from "../submit-button";
import { CopyInvite } from "./copy-invite";

export async function OrgSection({ a }: { a: Dict["account"] }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const admin = createServiceClient();
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "";

  // Org owned by this user?
  const { data: ownedOrg } = await admin
    .from("organizations")
    .select("id, name")
    .eq("owner_id", user.id)
    .maybeSingle();

  // Org this user is a member of (not as owner)?
  const { data: memberships } = await admin
    .from("org_members")
    .select("org_id, role, organizations(id, name, owner_id)")
    .eq("user_id", user.id);
  type Org = { id: string; name: string; owner_id: string };
  const memberOrg = (memberships ?? [])
    .map((m) => {
      const o = (m as { organizations: Org | Org[] | null }).organizations;
      return Array.isArray(o) ? o[0] : o;
    })
    .find((o): o is Org => Boolean(o) && o!.owner_id !== user.id);

  const wrap = (children: React.ReactNode) => (
    <section className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg p-5 space-y-4">
      <h2 className="text-sm font-semibold text-[var(--color-text-muted)] uppercase tracking-wide">
        {a.orgTitle}
      </h2>
      {children}
    </section>
  );

  // Member of someone else's org
  if (memberOrg && !ownedOrg) {
    return wrap(
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="text-sm">
          {a.orgYouBelong} <span className="font-medium text-white">{memberOrg.name}</span>
          <p className="text-xs text-[var(--color-text-muted)] mt-1">{a.orgShared}</p>
        </div>
        <form action={leaveOrganization}>
          <input type="hidden" name="org_id" value={memberOrg.id} />
          <button
            type="submit"
            className="text-sm px-3 py-1.5 rounded border border-[var(--color-border)] text-[var(--color-text-muted)] hover:text-[var(--color-danger)] hover:border-[var(--color-danger)]"
          >
            {a.orgLeave}
          </button>
        </form>
      </div>
    );
  }

  // Owns an org → manage it
  if (ownedOrg) {
    const [{ data: members }, { data: invites }, usersResp] = await Promise.all([
      admin.from("org_members").select("user_id, role").eq("org_id", ownedOrg.id),
      admin
        .from("org_invites")
        .select("id, email, token, status")
        .eq("org_id", ownedOrg.id)
        .eq("status", "pending"),
      admin.auth.admin.listUsers({ perPage: 1000 }),
    ]);
    const emailById = new Map(
      (usersResp.data?.users ?? []).map((u) => [u.id, u.email ?? ""])
    );

    return wrap(
      <div className="space-y-5">
        <div className="text-sm font-medium">{ownedOrg.name}</div>
        <p className="text-xs text-[var(--color-text-muted)]">{a.orgShared}</p>

        {/* Members */}
        <div>
          <div className="text-xs uppercase tracking-wide text-[var(--color-text-muted)] mb-2">
            {a.orgMembers}
          </div>
          <ul className="space-y-1">
            {(members ?? []).map((m) => (
              <li
                key={m.user_id}
                className="flex items-center justify-between gap-3 text-sm py-1"
              >
                <span className="truncate">
                  {emailById.get(m.user_id) ?? m.user_id}
                  {m.user_id === user.id && (
                    <span className="text-xs text-[var(--color-text-muted)] ml-2">
                      ({a.orgOwner})
                    </span>
                  )}
                </span>
                {m.user_id !== user.id && (
                  <form action={removeMember}>
                    <input type="hidden" name="org_id" value={ownedOrg.id} />
                    <input type="hidden" name="user_id" value={m.user_id} />
                    <button
                      type="submit"
                      className="text-xs text-[var(--color-text-muted)] hover:text-[var(--color-danger)]"
                    >
                      {a.orgRemove}
                    </button>
                  </form>
                )}
              </li>
            ))}
          </ul>
        </div>

        {/* Invite */}
        <form action={inviteMember} className="flex flex-col sm:flex-row gap-2 sm:items-end">
          <label className="block flex-1">
            <span className="text-xs text-[var(--color-text-muted)]">{a.orgInvite}</span>
            <input
              type="hidden"
              name="org_id"
              value={ownedOrg.id}
            />
            <input
              name="email"
              type="email"
              required
              placeholder={a.orgInvitePlaceholder}
              className="mt-1 w-full bg-[var(--color-bg)] border border-[var(--color-border)] rounded px-3 py-2 text-sm focus:outline-none focus:border-[var(--color-accent-2)]"
            />
          </label>
          <SubmitButton
            idle={a.orgInviteBtn}
            pending="…"
            className="bg-[var(--color-accent)] hover:bg-[var(--color-accent-2)] text-white font-medium px-4 py-2 rounded text-sm"
          />
        </form>

        {/* Pending invites */}
        {invites && invites.length > 0 && (
          <div>
            <div className="text-xs uppercase tracking-wide text-[var(--color-text-muted)] mb-2">
              {a.orgPending}
            </div>
            <ul className="space-y-1">
              {invites.map((inv) => (
                <li
                  key={inv.id}
                  className="flex items-center justify-between gap-2 text-sm py-1"
                >
                  <span className="truncate">{inv.email}</span>
                  <div className="flex items-center gap-2 shrink-0">
                    <CopyInvite
                      url={`${appUrl}/invite/${inv.token}`}
                      label={a.orgInviteLink}
                    />
                    <form action={revokeInvite}>
                      <input type="hidden" name="invite_id" value={inv.id} />
                      <button
                        type="submit"
                        className="text-xs text-[var(--color-text-muted)] hover:text-[var(--color-danger)]"
                      >
                        {a.orgRevoke}
                      </button>
                    </form>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    );
  }

  // No org → create one
  return wrap(
    <form action={createOrganization} className="flex flex-col sm:flex-row gap-2 sm:items-end">
      <label className="block flex-1">
        <span className="text-xs text-[var(--color-text-muted)]">{a.orgCreate}</span>
        <input
          name="name"
          type="text"
          required
          placeholder={a.orgNamePlaceholder}
          className="mt-1 w-full bg-[var(--color-bg)] border border-[var(--color-border)] rounded px-3 py-2 text-sm focus:outline-none focus:border-[var(--color-accent-2)]"
        />
      </label>
      <SubmitButton
        idle={a.orgCreate}
        pending="…"
        className="bg-[var(--color-accent)] hover:bg-[var(--color-accent-2)] text-white font-medium px-4 py-2 rounded text-sm"
      />
    </form>
  );
}
