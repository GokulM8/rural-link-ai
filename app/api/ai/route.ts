import { NextRequest } from "next/server";
import { streamServiceTip, type ServiceTipService } from "@/lib/gemini";
import type { ServiceCategory } from "@/lib/overpass";
import { checkRateLimit, getClientIp } from "@/lib/rateLimit";

const VALID_CATEGORIES: ServiceCategory[] = [
  "hospital",
  "clinic",
  "bank",
  "atm",
  "school",
  "government",
];

// Never let Next.js cache and replay a stale (or failed/empty) AI response.
export const dynamic = "force-dynamic";

// Fires once per card as the user scrolls (IntersectionObserver-gated), so
// normal browsing can legitimately trigger many of these — higher than the
// /api/services limit, but still capped well below anything abusive.
const RATE_LIMIT = 40;
const RATE_LIMIT_WINDOW_MS = 60 * 1000;

export async function GET(request: NextRequest) {
  const rateLimit = checkRateLimit(getClientIp(request), RATE_LIMIT, RATE_LIMIT_WINDOW_MS);
  if (!rateLimit.allowed) {
    return new Response("Too many requests, please slow down.", {
      status: 429,
      headers: { "Retry-After": String(rateLimit.retryAfterSeconds) },
    });
  }

  const { searchParams } = new URL(request.url);
  const name = searchParams.get("name");
  const type = searchParams.get("type");
  const location = searchParams.get("location") ?? undefined;
  const language = searchParams.get("language") ?? "en";
  const isOpenParam = searchParams.get("isOpen");
  const isOpen = isOpenParam === "true" ? true : isOpenParam === "false" ? false : null;

  if (!name || !type || !VALID_CATEGORIES.includes(type as ServiceCategory)) {
    return new Response("name and a valid type query param are required", { status: 400 });
  }

  const service: ServiceTipService = { name, type: type as ServiceCategory, location, isOpen };

  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        for await (const chunk of streamServiceTip(service, language)) {
          controller.enqueue(encoder.encode(chunk));
        }
      } catch (error) {
        console.error("AI tip stream failed", error);
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}
