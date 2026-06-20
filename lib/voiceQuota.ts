import { supabaseAdmin } from "./supabase";

function todayKey(): string {
  return new Date().toISOString().slice(0, 10); // YYYY-MM-DD, UTC
}

/**
 * Atomically-ish checks and consumes one unit of the shared daily voice
 * quota. This is a global counter (not per-IP — see lib/rateLimit.ts for
 * that) because the actual bottleneck is Gemini's per-project daily cap,
 * shared across every user of the deployed app, not individual abuse.
 *
 * The read-then-write isn't truly atomic, so concurrent requests could
 * theoretically both read the same count and both write count+1 — a minor
 * undercount risk that's acceptable at this volume (tens of requests/day),
 * not worth a Postgres function call for.
 */
export async function tryConsumeVoiceQuota(dailyLimit: number): Promise<boolean> {
  const date = todayKey();

  try {
    const { data, error } = await supabaseAdmin
      .from("voice_usage")
      .select("count")
      .eq("usage_date", date)
      .maybeSingle();

    if (error) {
      console.error("voice_usage read failed, allowing request through", error);
      return true; // fail open — a DB hiccup shouldn't take down voice entirely
    }

    const currentCount = data?.count ?? 0;
    if (currentCount >= dailyLimit) return false;

    const { error: writeError } = await supabaseAdmin
      .from("voice_usage")
      .upsert({ usage_date: date, count: currentCount + 1 });
    if (writeError) console.error("voice_usage write failed", writeError);

    return true;
  } catch (error) {
    console.error("voice_usage threw, allowing request through", error);
    return true;
  }
}
