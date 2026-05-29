"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getSubscriptionStatus } from "@/lib/subscription";
import { workspaceOwnerId } from "@/lib/workspace";

function normalizeProfileUrl(
  input: string
): { url: string; handle: string; type: "person" | "company" } | null {
  const raw = input.trim();
  if (!raw) return null;

  const cleaned = raw
    .replace(/^@/, "")
    .replace(/\/$/, "")
    .replace(/\?.*$/, "");

  let url: URL;
  try {
    if (/^https?:\/\//i.test(cleaned)) {
      url = new URL(cleaned);
    } else if (cleaned.includes("linkedin.com")) {
      url = new URL(`https://${cleaned}`);
    } else {
      // Bare handle defaults to person profile
      url = new URL(`https://www.linkedin.com/in/${cleaned}`);
    }
  } catch {
    return null;
  }

  if (!url.hostname.includes("linkedin.com")) return null;

  const parts = url.pathname.split("/").filter(Boolean);
  if (parts.length < 2) return null;

  const segment = parts[0].toLowerCase();
  let type: "person" | "company";
  if (segment === "company" || segment === "school" || segment === "showcase") {
    type = "company";
  } else if (segment === "in") {
    type = "person";
  } else {
    return null; // unknown LinkedIn URL shape
  }

  const handle = parts[1] ?? "";
  const normalized = `https://www.linkedin.com/${parts.slice(0, 2).join("/")}`;
  return { url: normalized, handle, type };
}

export async function addProfile(formData: FormData) {
  const input = String(formData.get("profile_url") ?? "");
  const companyId = String(formData.get("company_profile_id") ?? "") || null;
  const parsed = normalizeProfileUrl(input);
  if (!parsed) {
    throw new Error("Invalid LinkedIn URL");
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const status = await getSubscriptionStatus(user.id);
  if (!status.canAddProfile) {
    redirect("/billing?reason=limit");
  }

  const ownerId = await workspaceOwnerId(supabase, user.id);

  // Company association only makes sense when adding a person
  const linkCompanyId = parsed.type === "person" ? companyId : null;

  const { data, error } = await supabase
    .from("linkedin_profiles")
    .upsert(
      {
        user_id: ownerId,
        profile_url: parsed.url,
        handle: parsed.handle,
        profile_type: parsed.type,
        company_profile_id: linkCompanyId,
      },
      { onConflict: "user_id,profile_url" }
    )
    .select("id")
    .single();

  if (error) throw new Error(error.message);

  revalidatePath("/");
  if (linkCompanyId) {
    revalidatePath(`/profiles/${linkCompanyId}`);
    // Stay on the company page; the BackgroundSync component picks up
    // any linked person with last_synced_at IS NULL and syncs them silently.
    redirect(`/profiles/${linkCompanyId}?tab=employees`);
  }
  redirect(`/profiles/${data.id}?autosync=1`);
}

export async function trackEmployee(formData: FormData) {
  const employeeId = String(formData.get("employee_id") ?? "");
  if (!employeeId) throw new Error("employee_id required");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const status = await getSubscriptionStatus(user.id);
  if (!status.canAddProfile) {
    redirect("/billing?reason=limit");
  }

  // Fetch employee row (RLS scopes to this user)
  const { data: emp, error: empError } = await supabase
    .from("linkedin_company_employees")
    .select(
      "id, profile_id, linkedin_url, public_identifier, full_name, first_name, last_name, headline, position_title, location_text, picture_url"
    )
    .eq("id", employeeId)
    .single();

  if (empError || !emp || !emp.linkedin_url) {
    throw new Error("Employee not found or missing LinkedIn URL");
  }

  // Normalize the URL so it matches the unique constraint
  const parsed = normalizeProfileUrl(emp.linkedin_url);
  if (!parsed || parsed.type !== "person") {
    throw new Error("Employee URL is not a valid LinkedIn person profile");
  }

  const ownerId = await workspaceOwnerId(supabase, user.id);

  const { data: tracked, error: upsertError } = await supabase
    .from("linkedin_profiles")
    .upsert(
      {
        user_id: ownerId,
        profile_url: parsed.url,
        handle: parsed.handle || emp.public_identifier,
        profile_type: "person",
        company_profile_id: emp.profile_id,
        full_name: emp.full_name,
        first_name: emp.first_name,
        last_name: emp.last_name,
        headline: emp.headline ?? emp.position_title,
        avatar_url: emp.picture_url,
        location_text: emp.location_text,
      },
      { onConflict: "user_id,profile_url" }
    )
    .select("id")
    .single();

  if (upsertError) throw new Error(upsertError.message);

  // Back-link the employee row
  await supabase
    .from("linkedin_company_employees")
    .update({ tracked_profile_id: tracked.id })
    .eq("id", emp.id);

  revalidatePath(`/profiles/${emp.profile_id}`);
  revalidatePath("/");
  // Stay on the company page; the BackgroundSync component will pick up the
  // freshly tracked person (last_synced_at IS NULL) and sync silently.
  redirect(`/profiles/${emp.profile_id}?tab=employees`);
}

export async function deleteProfile(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  const supabase = await createClient();
  const { error } = await supabase
    .from("linkedin_profiles")
    .delete()
    .eq("id", id);

  if (error) throw new Error(error.message);

  revalidatePath("/");
  redirect("/");
}
