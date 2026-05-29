import { NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { isAdminEmail } from "@/lib/admin";
import {
  syncDetailsAndPosts,
  syncReactions,
  syncComments,
  syncEmployees,
  type Profile,
} from "@/lib/sync-core";

export const runtime = "nodejs";
// One admin sync-all can hit 10+ profiles × 3-4 actor calls each. Give plenty of time.
export const maxDuration = 600;

type StepResult = {
  profile_id: string;
  profile_url: string;
  profile_type: "person" | "company";
  step: "details_posts" | "reactions" | "comments" | "employees";
  ok: boolean;
  error?: string;
};

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ userId: string }> }
) {
  const { userId } = await params;

  // Caller must be an admin
  const supabase = await createClient();
  const {
    data: { user: caller },
  } = await supabase.auth.getUser();
  if (!caller || !isAdminEmail(caller.email)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const admin = createServiceClient();

  // Fetch all profiles for the target user
  const { data: profiles, error } = await admin
    .from("linkedin_profiles")
    .select("id, profile_url, profile_type")
    .eq("user_id", userId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const results: StepResult[] = [];

  for (const profile of (profiles ?? []) as Profile[]) {
    // details + posts (works for both person and company)
    try {
      await syncDetailsAndPosts({ supabase: admin, userId, profile });
      results.push({
        profile_id: profile.id,
        profile_url: profile.profile_url,
        profile_type: profile.profile_type,
        step: "details_posts",
        ok: true,
      });
    } catch (err) {
      results.push({
        profile_id: profile.id,
        profile_url: profile.profile_url,
        profile_type: profile.profile_type,
        step: "details_posts",
        ok: false,
        error: err instanceof Error ? err.message : String(err),
      });
    }

    if (profile.profile_type === "company") {
      try {
        await syncEmployees({ supabase: admin, userId, profile });
        results.push({
          profile_id: profile.id,
          profile_url: profile.profile_url,
          profile_type: profile.profile_type,
          step: "employees",
          ok: true,
        });
      } catch (err) {
        results.push({
          profile_id: profile.id,
          profile_url: profile.profile_url,
          profile_type: profile.profile_type,
          step: "employees",
          ok: false,
          error: err instanceof Error ? err.message : String(err),
        });
      }
    } else {
      try {
        await syncReactions({ supabase: admin, userId, profile });
        results.push({
          profile_id: profile.id,
          profile_url: profile.profile_url,
          profile_type: profile.profile_type,
          step: "reactions",
          ok: true,
        });
      } catch (err) {
        results.push({
          profile_id: profile.id,
          profile_url: profile.profile_url,
          profile_type: profile.profile_type,
          step: "reactions",
          ok: false,
          error: err instanceof Error ? err.message : String(err),
        });
      }

      try {
        await syncComments({ supabase: admin, userId, profile });
        results.push({
          profile_id: profile.id,
          profile_url: profile.profile_url,
          profile_type: profile.profile_type,
          step: "comments",
          ok: true,
        });
      } catch (err) {
        results.push({
          profile_id: profile.id,
          profile_url: profile.profile_url,
          profile_type: profile.profile_type,
          step: "comments",
          ok: false,
          error: err instanceof Error ? err.message : String(err),
        });
      }
    }
  }

  const ok = results.filter((r) => r.ok).length;
  const failed = results.filter((r) => !r.ok).length;

  return NextResponse.json({
    profiles: profiles?.length ?? 0,
    steps: results.length,
    ok,
    failed,
    results,
  });
}
