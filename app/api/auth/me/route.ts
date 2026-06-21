import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifySession, SESSION_COOKIE_NAME } from "@/lib/auth/session";
import { supabaseAdmin } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export async function GET() {
  const token = cookies().get(SESSION_COOKIE_NAME)?.value;
  const session = verifySession(token);
  if (!session) return NextResponse.json({ user: null });

  const { data: user, error } = await supabaseAdmin
    .from("users")
    .select("phone, email")
    .eq("id", session.userId)
    .maybeSingle();

  if (error || !user) return NextResponse.json({ user: null });
  return NextResponse.json({ user });
}
