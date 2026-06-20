import { createClient } from "@supabase/supabase-js";

/**
 * Server-only client using the service_role key (bypasses RLS).
 * Never import this from a "use client" component.
 *
 * Next.js patches the global `fetch` and caches GET requests made during
 * Server Component rendering by default — including ones supabase-js makes
 * internally. Without forcing `cache: "no-store"` here, a query's first-ever
 * result (e.g. empty, before a table had rows) gets served forever on every
 * later request, regardless of what's actually in the database.
 */
export const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!,
  {
    auth: { persistSession: false },
    global: {
      fetch: (url, options) => fetch(url, { ...options, cache: "no-store" }),
    },
  }
);
