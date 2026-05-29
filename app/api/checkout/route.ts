import { NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { createPixQrCode } from "@/lib/abacatepay";
import { PLANS, type PlanTier } from "@/lib/plans";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { plan } = (await req.json().catch(() => ({}))) as { plan?: PlanTier };
  if (plan !== "starter" && plan !== "pro") {
    return NextResponse.json({ error: "Invalid plan" }, { status: 400 });
  }

  const planConfig = PLANS[plan];
  const description = `LinkedIn Analysis · ${planConfig.name} (30 days)`.slice(0, 37);

  let pix;
  try {
    pix = await createPixQrCode({
      amount: planConfig.priceCents,
      description,
      expiresIn: 1800,
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "AbacatePay call failed" },
      { status: 502 }
    );
  }

  if (pix.error) {
    return NextResponse.json({ error: pix.error }, { status: 502 });
  }

  const admin = createServiceClient();
  const { data: payment, error: insertError } = await admin
    .from("payments")
    .insert({
      user_id: user.id,
      plan_tier: plan,
      amount_cents: planConfig.priceCents,
      status: "pending",
      abacate_pix_id: pix.data.id,
      abacate_br_code: pix.data.brCode,
      abacate_br_code_base64: pix.data.brCodeBase64,
      pix_expires_at: pix.data.expiresAt,
    })
    .select("id")
    .single();

  if (insertError) {
    return NextResponse.json({ error: insertError.message }, { status: 500 });
  }

  return NextResponse.json({
    paymentId: payment.id,
    pixId: pix.data.id,
    brCode: pix.data.brCode,
    brCodeBase64: pix.data.brCodeBase64,
    amount: pix.data.amount,
    expiresAt: pix.data.expiresAt,
  });
}
