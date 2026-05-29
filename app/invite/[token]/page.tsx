import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { acceptInvite } from "@/app/account/org-actions";

export const dynamic = "force-dynamic";

export default async function InvitePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect(`/auth/login?next=/invite/${token}`);
  }

  const admin = createServiceClient();
  const { data: inv } = await admin
    .from("org_invites")
    .select("id, status, organizations(name)")
    .eq("token", token)
    .maybeSingle();

  const org = (inv as { organizations?: { name?: string } | { name?: string }[] } | null)
    ?.organizations;
  const orgName = (Array.isArray(org) ? org[0]?.name : org?.name) ?? "—";
  const valid = inv && inv.status === "pending";

  return (
    <div className="max-w-md mx-auto mt-16">
      <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg p-8 text-center space-y-4">
        {valid ? (
          <>
            <h1 className="text-xl font-semibold">{orgName}</h1>
            <p className="text-sm text-[var(--color-text-muted)]">
              Você foi convidado para entrar nesta organização e compartilhar os
              perfis, tags e feed dela.
            </p>
            <form action={acceptInvite}>
              <input type="hidden" name="token" value={token} />
              <button
                type="submit"
                className="w-full bg-[var(--color-accent)] hover:bg-[var(--color-accent-2)] text-white font-medium py-2.5 rounded text-sm transition-colors"
              >
                Aceitar convite
              </button>
            </form>
          </>
        ) : (
          <>
            <h1 className="text-xl font-semibold">Convite inválido</h1>
            <p className="text-sm text-[var(--color-text-muted)]">
              Este convite não existe mais ou já foi usado.
            </p>
            <Link href="/" className="text-sm text-[var(--color-accent-2)]">
              Ir para o app
            </Link>
          </>
        )}
      </div>
    </div>
  );
}
