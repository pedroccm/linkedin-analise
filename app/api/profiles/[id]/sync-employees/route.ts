import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { syncEmployees } from "@/lib/sync-core";

export const runtime = "nodejs";
export const maxDuration = 300;

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const { data: profile, error } = await supabase
    .from("linkedin_profiles")
    .select("id, profile_url, profile_type")
    .eq("id", id)
    .single();

  if (error || !profile) {
    return NextResponse.json(
      { error: error?.message ?? "Profile not found" },
      { status: 404 }
    );
  }

  if (profile.profile_type !== "company") {
    return NextResponse.json(
      { error: "Employees can only be synced for company profiles" },
      { status: 400 }
    );
  }

  try {
    const result = await syncEmployees({ supabase, userId: user.id, profile });
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Sync failed" },
      { status: 502 }
    );
  }
}
