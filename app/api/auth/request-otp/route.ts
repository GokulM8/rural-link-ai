import { NextRequest, NextResponse } from "next/server";
import { normalizeIndianPhone } from "@/lib/auth/phone";
import { generateOtp, hashOtp, OTP_EXPIRY_MS } from "@/lib/auth/otp";
import { sendOtpSms } from "@/lib/sms";
import { supabaseAdmin } from "@/lib/supabase";
import { checkRateLimit, getClientIp } from "@/lib/rateLimit";

export const dynamic = "force-dynamic";

const PHONE_LIMIT = 3;
const PHONE_WINDOW_MS = 10 * 60 * 1000;
const IP_LIMIT = 10;
const IP_WINDOW_MS = 10 * 60 * 1000;

export async function POST(request: NextRequest) {
  let body: { phone?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }

  const phone = body.phone ? normalizeIndianPhone(body.phone) : null;
  if (!phone) return NextResponse.json({ error: "invalid_phone" }, { status: 400 });

  // Limit by phone (stop one number being SMS-bombed) and by IP (stop one
  // client spraying requests across many numbers) independently.
  const phoneLimit = checkRateLimit(`otp:phone:${phone}`, PHONE_LIMIT, PHONE_WINDOW_MS);
  const ipLimit = checkRateLimit(`otp:ip:${getClientIp(request)}`, IP_LIMIT, IP_WINDOW_MS);
  if (!phoneLimit.allowed || !ipLimit.allowed) {
    return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  }

  const code = generateOtp();
  const { error: insertError } = await supabaseAdmin.from("otp_codes").insert({
    phone,
    code_hash: hashOtp(code),
    expires_at: new Date(Date.now() + OTP_EXPIRY_MS).toISOString(),
  });
  if (insertError) {
    console.error("Failed to store OTP", insertError);
    return NextResponse.json({ error: "send_failed" }, { status: 500 });
  }

  try {
    await sendOtpSms(phone, code);
  } catch (error) {
    console.error("Failed to send OTP SMS", error);
    return NextResponse.json({ error: "send_failed" }, { status: 500 });
  }

  return NextResponse.json({
    success: true,
    // Only present outside production, and only because lib/sms.ts is a
    // stub with nowhere else to see the code — drop this once a real
    // provider is wired up there.
    ...(process.env.NODE_ENV !== "production" ? { devCode: code } : {}),
  });
}
