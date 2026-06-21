import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { Leaf, ShieldCheck } from "lucide-react";
import { verifySession, SESSION_COOKIE_NAME } from "@/lib/auth/session";
import { isAdminPhone } from "@/lib/auth/adminPhones";
import { maskPhone } from "@/lib/auth/phone";
import AdminSignOutButton from "@/components/AdminSignOutButton";

// Sits in its own (protected) route group specifically so this guard never
// wraps app/admin/login — that page must stay reachable by a logged-out (or
// not-yet-admin) visitor, or this redirect-on-no-session check would loop.
//
// This check runs here (a Server Component, Node.js runtime) rather than in
// middleware.ts: Next.js Middleware only runs on the Edge Runtime, which
// doesn't support the Node `crypto` APIs lib/auth/session.ts already relies
// on. A layout guard gives the same protection — nothing under it renders
// until this check passes — without rewriting tested session-verification
// code to the Web Crypto API just to satisfy the Edge runtime.
export default function ProtectedAdminLayout({ children }: { children: React.ReactNode }) {
  const token = cookies().get(SESSION_COOKIE_NAME)?.value;
  const session = verifySession(token);

  if (!session || !isAdminPhone(session.phone)) {
    redirect("/admin/login?error=unauthorized");
  }

  return (
    <div className="flex min-h-screen bg-neutral-950 text-neutral-100">
      <aside className="flex w-60 shrink-0 flex-col gap-6 border-r border-white/10 bg-neutral-900 p-4">
        <div className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#1D9E75] text-white">
            <Leaf className="h-4.5 w-4.5" strokeWidth={2} />
          </span>
          <span className="text-base font-semibold">RuralLink</span>
        </div>

        <div className="flex items-center gap-2 rounded-md bg-white/5 px-3 py-2 text-xs text-neutral-400">
          <ShieldCheck className="h-3.5 w-3.5 shrink-0 text-[#1D9E75]" strokeWidth={1.75} />
          <span>Signed in as {maskPhone(session.phone)}</span>
        </div>

        <nav className="flex flex-1 flex-col gap-1 text-sm">
          <span className="rounded-md bg-white/10 px-3 py-2 font-medium text-white">Dashboard</span>
        </nav>

        <AdminSignOutButton />
      </aside>

      <main className="flex-1 p-8">{children}</main>
    </div>
  );
}
