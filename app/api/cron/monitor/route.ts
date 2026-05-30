import { NextResponse } from "next/server";
import { runMonitor } from "@/lib/monitor";

// Protected cron endpoint. Trigger it from anywhere (n8n, Netlify scheduled
// function, manual) once a day with the shared secret:
//   POST /api/cron/monitor      header: Authorization: Bearer <CRON_SECRET>
//   GET  /api/cron/monitor?secret=<CRON_SECRET>
export const runtime = "nodejs";
export const maxDuration = 300;
export const dynamic = "force-dynamic";

function authorized(req: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const auth = req.headers.get("authorization") ?? "";
  const qs = new URL(req.url).searchParams.get("secret") ?? "";
  return auth === `Bearer ${secret}` || qs === secret;
}

async function handle(req: Request) {
  if (!process.env.CRON_SECRET) {
    return NextResponse.json(
      { error: "CRON_SECRET not configured" },
      { status: 500 }
    );
  }
  if (!authorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const summary = await runMonitor();
  return NextResponse.json({ ok: true, ...summary });
}

export const GET = handle;
export const POST = handle;
