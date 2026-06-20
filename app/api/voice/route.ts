import { NextRequest, NextResponse } from "next/server";
import { recognizeVoiceIntent, getConfiguredVoiceKeyCount } from "@/lib/voiceAssistant";
import { tryConsumeVoiceQuota } from "@/lib/voiceQuota";
import { checkRateLimit, getClientIp } from "@/lib/rateLimit";

// Never let Next.js cache and replay a stale voice response.
export const dynamic = "force-dynamic";

// Recording + uploading takes a few seconds per turn, so this only guards
// against actual abuse — the real ceiling is the global daily quota below.
const RATE_LIMIT_PER_IP = 6;
const RATE_LIMIT_WINDOW_MS = 60 * 1000;
const DAILY_LIMIT_PER_KEY = 20;

export async function POST(request: NextRequest) {
  const rateLimit = checkRateLimit(getClientIp(request), RATE_LIMIT_PER_IP, RATE_LIMIT_WINDOW_MS);
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: "rate_limited" },
      { status: 429, headers: { "Retry-After": String(rateLimit.retryAfterSeconds) } }
    );
  }

  const keyCount = getConfiguredVoiceKeyCount();
  if (keyCount === 0) {
    return NextResponse.json({ error: "not_configured" }, { status: 503 });
  }

  const withinDailyBudget = await tryConsumeVoiceQuota(DAILY_LIMIT_PER_KEY * keyCount);
  if (!withinDailyBudget) {
    return NextResponse.json({ error: "daily_limit_reached" }, { status: 503 });
  }

  let body: { audio?: string; mimeType?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }

  if (!body.audio || !body.mimeType) {
    return NextResponse.json({ error: "missing_audio" }, { status: 400 });
  }

  const result = await recognizeVoiceIntent(body.audio, body.mimeType);
  if (!result) {
    return NextResponse.json({ error: "recognition_failed" }, { status: 502 });
  }

  return NextResponse.json(result);
}
