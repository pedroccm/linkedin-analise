import { NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { checkPixStatus } from "@/lib/abacatepay";

export const runtime = "nodejs";

const DAYS_30_MS = 30 * 24 * 60 * 60 * 1000;

async function fulfillPayment(paymentId: string) {
  const admin = createServiceClient();
  const { data: payment } = await admin
    .from("linkedin_payments")
    .select("id, user_id, plan_tier, status")
    .eq("id", paymentId)
    .single();

  if (!payment || payment.status !== "pending") return;

  await admin
    .from("linkedin_payments")
    .update({ status: "paid", paid_at: new Date().toISOString() })
    .eq("id", payment.id);

  // Extend subscription: max(now, current_subscription_until) + 30 days
  const { data: meta } = await admin
    .from("linkedin_users_meta")
    .select("subscription_until")
    .eq("user_id", payment.user_id)
    .single();

  const base =
    meta?.subscription_until && new Date(meta.subscription_until) > new Date()
      ? new Date(meta.subscription_until)
      : new Date();
  const newUntil = new Date(base.getTime() + DAYS_30_MS);

  await admin
    .from("linkedin_users_meta")
    .update({
      plan_tier: payment.plan_tier,
      subscription_until: newUntil.toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", payment.user_id);
}

export async function GET(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const url = new URL(request.url);
  const paymentId = url.searchParams.get("paymentId");
  const simulate = url.searchParams.get("simulate");
  if (!paymentId) {
    return NextResponse.json({ error: "paymentId required" }, { status: 400 });
  }

  const { data: payment } = await supabase
    .from("linkedin_payments")
    .select("id, abacate_pix_id, status")
    .eq("id", paymentId)
    .single();

  if (!payment) {
    return NextResponse.json({ error: "Payment not found" }, { status: 404 });
  }

  // Dev-only simulator
  if (simulate === "true" && process.env.NODE_ENV === "development") {
    await fulfillPayment(payment.id);
    return NextResponse.json({ status: "PAID", expiresAt: null });
  }

  if (payment.status === "paid") {
    return NextResponse.json({ status: "PAID", expiresAt: null });
  }

  if (!payment.abacate_pix_id) {
    return NextResponse.json({ status: payment.status.toUpperCase() });
  }

  let statusResp;
  try {
    statusResp = await checkPixStatus(payment.abacate_pix_id);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "AbacatePay error" },
      { status: 502 }
    );
  }

  if (statusResp.error) {
    return NextResponse.json({ error: statusResp.error }, { status: 502 });
  }

  if (statusResp.data.status === "PAID") {
    await fulfillPayment(payment.id);
  } else if (
    statusResp.data.status === "EXPIRED" ||
    statusResp.data.status === "CANCELLED"
  ) {
    const admin = createServiceClient();
    await admin
      .from("linkedin_payments")
      .update({ status: statusResp.data.status.toLowerCase() })
      .eq("id", payment.id);
  }

  return NextResponse.json({
    status: statusResp.data.status,
    expiresAt: statusResp.data.expiresAt,
  });
}
