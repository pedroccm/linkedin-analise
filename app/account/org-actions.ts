"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { getSubscriptionStatus } from "@/lib/subscription";

async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");
  return { supabase, user };
}

export async function createOrganization(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim().slice(0, 80);
  if (!name) return;
  const { user } = await requireUser();

  // Only an active Corporate plan can create an organization.
  const status = await getSubscriptionStatus(user.id);
  if (status.activeTier !== "corporate") {
    redirect("/billing?reason=corporate");
  }

  const admin = createServiceClient();

  // One org per owner for v1
  const { data: existing } = await admin
    .from("organizations")
    .select("id")
    .eq("owner_id", user.id)
    .limit(1)
    .maybeSingle();
  if (existing) {
    revalidatePath("/account");
    return;
  }

  const { data: org, error } = await admin
    .from("organizations")
    .insert({ owner_id: user.id, name })
    .select("id")
    .single();
  if (error || !org) throw new Error(error?.message ?? "Org create failed");

  await admin
    .from("org_members")
    .upsert(
      { org_id: org.id, user_id: user.id, role: "admin" },
      { onConflict: "org_id,user_id", ignoreDuplicates: true }
    );

  revalidatePath("/account");
}

export async function inviteMember(formData: FormData) {
  const orgId = String(formData.get("org_id") ?? "");
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  if (!orgId || !email) return;
  const { user } = await requireUser();
  const admin = createServiceClient();

  // Caller must own the org
  const { data: org } = await admin
    .from("organizations")
    .select("id")
    .eq("id", orgId)
    .eq("owner_id", user.id)
    .maybeSingle();
  if (!org) throw new Error("Not allowed");

  const token = crypto.randomUUID().replace(/-/g, "");
  await admin.from("org_invites").insert({
    org_id: orgId,
    email,
    token,
    role: "member",
    status: "pending",
  });

  revalidatePath("/account");
}

export async function revokeInvite(formData: FormData) {
  const inviteId = String(formData.get("invite_id") ?? "");
  if (!inviteId) return;
  const { user } = await requireUser();
  const admin = createServiceClient();
  // Only the org owner can revoke (join check)
  const { data: inv } = await admin
    .from("org_invites")
    .select("id, org_id, organizations!inner(owner_id)")
    .eq("id", inviteId)
    .maybeSingle();
  const ownerId = (inv as { organizations?: { owner_id?: string } } | null)?.organizations
    ?.owner_id;
  if (!inv || ownerId !== user.id) throw new Error("Not allowed");

  await admin.from("org_invites").update({ status: "revoked" }).eq("id", inviteId);
  revalidatePath("/account");
}

export async function removeMember(formData: FormData) {
  const orgId = String(formData.get("org_id") ?? "");
  const memberId = String(formData.get("user_id") ?? "");
  if (!orgId || !memberId) return;
  const { user } = await requireUser();
  const admin = createServiceClient();

  const { data: org } = await admin
    .from("organizations")
    .select("id, owner_id")
    .eq("id", orgId)
    .maybeSingle();
  if (!org || org.owner_id !== user.id) throw new Error("Not allowed");
  if (memberId === org.owner_id) return; // can't remove owner

  await admin
    .from("org_members")
    .delete()
    .eq("org_id", orgId)
    .eq("user_id", memberId);
  revalidatePath("/account");
}

export async function acceptInvite(formData: FormData) {
  const token = String(formData.get("token") ?? "");
  if (!token) return;
  const { user } = await requireUser();
  const admin = createServiceClient();

  const { data: inv } = await admin
    .from("org_invites")
    .select("id, org_id, status")
    .eq("token", token)
    .maybeSingle();
  if (!inv || inv.status !== "pending") {
    redirect("/account?invite=invalid");
  }

  await admin
    .from("org_members")
    .upsert(
      { org_id: inv.org_id, user_id: user.id, role: "member" },
      { onConflict: "org_id,user_id", ignoreDuplicates: true }
    );
  await admin.from("org_invites").update({ status: "accepted" }).eq("id", inv.id);

  redirect("/?joined=1");
}

export async function leaveOrganization(formData: FormData) {
  const orgId = String(formData.get("org_id") ?? "");
  if (!orgId) return;
  const { user } = await requireUser();
  const admin = createServiceClient();
  await admin
    .from("org_members")
    .delete()
    .eq("org_id", orgId)
    .eq("user_id", user.id);
  revalidatePath("/account");
}
