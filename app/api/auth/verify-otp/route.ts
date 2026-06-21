import { NextRequest, NextResponse } from "next/server";
import { normalizeIndianPhone } from "@/lib/auth/phone";
import { hashOtp, MAX_VERIFY_ATTEMPTS } from "@/lib/auth/otp";
import { signSession, SESSION_COOKIE_NAME, SESSION_MAX_AGE_SECONDS } from "@/lib/auth/session";
import { supabaseAdmin } from "@/lib/supabase";
import { checkRateLimit, getClientIp } from "@/lib/rateLimit";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  let body: { phone?: string; code?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }

  const phone = body.phone ? normalizeIndianPhone(body.phone) : null;
  if (!phone || !body.code) return NextResponse.json({ error: "invalid_phone" }, { status: 400 });

  const ipLimit = checkRateLimit(`otp-verify:ip:${getClientIp(request)}`, 15, 10 * 60 * 1000);
  if (!ipLimit.allowed) return NextResponse.json({ error: "rate_limited" }, { status: 429 });

  const { data: otpRow, error: fetchError } = await supabaseAdmin
    .from("otp_codes")
    .select("id, code_hash, expires_at, attempts, consumed")
    .eq("phone", phone)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (fetchError) {
    console.error("Failed to read OTP", fetchError);
    return NextResponse.json({ error: "generic" }, { status: 500 });
  }
  if (!otpRow || otpRow.consumed) {
    return NextResponse.json({ error: "not_requested" }, { status: 400 });
  }
  if (new Date(otpRow.expires_at).getTime() < Date.now()) {
    return NextResponse.json({ error: "expired" }, { status: 400 });
  }
  if (otpRow.attempts >= MAX_VERIFY_ATTEMPTS) {
    return NextResponse.json({ error: "too_many_attempts" }, { status: 400 });
  }

  if (hashOtp(body.code) !== otpRow.code_hash) {
    await supabaseAdmin
      .from("otp_codes")
      .update({ attempts: otpRow.attempts + 1 })
      .eq("id", otpRow.id);
    return NextResponse.json({ error: "invalid_code" }, { status: 400 });
  }

  await supabaseAdmin.from("otp_codes").update({ consumed: true }).eq("id", otpRow.id);

  // Only `phone` is in the upsert payload, so an existing user's email is
  // never touched here — this only ever creates the row on first login or
  // no-ops the update on every login after that.
  const { data: user, error: userError } = await supabaseAdmin
    .from("users")
    .upsert({ phone }, { onConflict: "phone" })
    .select("id, phone, email")
    .single();

  if (userError || !user) {
    console.error("Failed to upsert user", userError);
    return NextResponse.json({ error: "generic" }, { status: 500 });
  }

  const token = signSession(user.id, user.phone);
  const response = NextResponse.json({ success: true, user: { phone: user.phone, email: user.email } });
  response.cookies.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE_SECONDS,
  });
  return response;
}
