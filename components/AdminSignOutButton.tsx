"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";

export default function AdminSignOutButton() {
  const router = useRouter();
  const [isSigningOut, setIsSigningOut] = useState(false);

  const signOut = useCallback(async () => {
    setIsSigningOut(true);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } finally {
      router.push("/admin/login");
      router.refresh();
    }
  }, [router]);

  return (
    <button
      type="button"
      onClick={signOut}
      disabled={isSigningOut}
      className="flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-neutral-300 transition hover:bg-white/10 hover:text-white disabled:opacity-50"
    >
      <LogOut className="h-4 w-4" strokeWidth={1.75} />
      Sign out
    </button>
  );
}
