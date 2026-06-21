import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifySession, SESSION_COOKIE_NAME } from "@/lib/auth/session";
import { isAdminPhone } from "@/lib/auth/adminPhones";

export const dynamic = "force-dynamic";

// Called right after a successful OTP verify on the admin login page — a
// regular user's OTP login is valid (their session cookie is real), but
// "admin" is a separate, server-only check against ADMIN_PHONES on top of
// that. If the phone isn't on the list, the session is cleared immediately
// rather than leaving a logged-in-but-unauthorized cookie lying around.
export async function GET() {
  const token = cookies().get(SESSION_COOKIE_NAME)?.value;
  const session = verifySession(token);

  if (!session || !isAdminPhone(session.phone)) {
    const response = NextResponse.json({ authorized: false }, { status: 403 });
    response.cookies.set(SESSION_COOKIE_NAME, "", { path: "/", maxAge: 0 });
    return response;
  }

  return NextResponse.json({ authorized: true, phone: session.phone });
}
