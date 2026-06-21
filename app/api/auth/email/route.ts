import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifySession, SESSION_COOKIE_NAME } from "@/lib/auth/session";
import { supabaseAdmin } from "@/lib/supabase";

export const dynamic = "force-dynamic";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(request: NextRequest) {
  const token = cookies().get(SESSION_COOKIE_NAME)?.value;
  const session = verifySession(token);
  if (!session) return NextResponse.json({ error: "not_authenticated" }, { status: 401 });

  let body: { email?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }

  const email = body.email?.trim();
  if (!email || !EMAIL_REGEX.test(email)) {
    return NextResponse.json({ error: "invalid_email" }, { status: 400 });
  }

  const { error } = await supabaseAdmin.from("users").update({ email }).eq("id", session.userId);
  if (error) {
    console.error("Failed to update email", error);
    return NextResponse.json({ error: "generic" }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
