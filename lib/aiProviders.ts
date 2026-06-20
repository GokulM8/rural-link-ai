const REQUEST_TIMEOUT_MS = 12000;

export interface BatchResult {
  values: (string | null)[];
  model: string;
}

/**
 * Accepts a bare JSON array, `{ values: [...] }`, or `{ tips: [...] }` —
 * providers differ in root shape. Each item is normalized to a string: if a
 * model returns nested objects directly (common even when asked for
 * stringified JSON — that's a more natural shape for them to produce), it's
 * re-stringified rather than dropped, so callers that expect a JSON string
 * per item (e.g. structured per-item results) still get one either way.
 */
export function parseJsonArray(text: string, count: number): (string | null)[] | null {
  try {
    const parsed = JSON.parse(text);
    const arr = Array.isArray(parsed)
      ? parsed
      : Array.isArray(parsed?.values)
        ? parsed.values
        : Array.isArray(parsed?.tips)
          ? parsed.tips
          : null;
    if (!arr) return null;
    return Array.from({ length: count }, (_, i) => {
      const item = arr[i];
      if (typeof item === "string") return item.trim();
      if (item && typeof item === "object") return JSON.stringify(item);
      return null;
    });
  } catch {
    return null;
  }
}

const GEMINI_MODEL = "gemini-2.5-flash";
const GEMINI_ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

/** Returns null on any failure so the caller can fall through to the next provider. */
export async function callGeminiBatch(
  listDescription: string,
  count: number,
  maxOutputTokensPerItem = 40
): Promise<BatchResult | null> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;

  const prompt = `${listDescription}\n\nRespond with ONLY a JSON array of exactly ${count} strings, in the same order as the list above.`;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(`${GEMINI_ENDPOINT}?key=${apiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          maxOutputTokens: maxOutputTokensPerItem * count,
          temperature: 0.4,
          responseMimeType: "application/json",
        },
      }),
      signal: controller.signal,
      cache: "no-store",
    });

    if (!response.ok) {
      console.error(`Gemini batch request failed with status ${response.status}`);
      return null;
    }

    const data = await response.json();
    const text: string | undefined = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) return null;

    const values = parseJsonArray(text, count);
    return values ? { values, model: GEMINI_MODEL } : null;
  } catch (error) {
    console.error("Gemini batch request threw", error);
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

// Verify this model id is still current in the Groq console before relying
// on it — Groq's lineup of hosted open models changes over time.
const GROQ_MODEL = "llama-3.3-70b-versatile";
const GROQ_ENDPOINT = "https://api.groq.com/openai/v1/chat/completions";

export async function callGroqBatch(
  listDescription: string,
  count: number,
  maxOutputTokensPerItem = 40
): Promise<BatchResult | null> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) return null;

  const prompt = `${listDescription}\n\nRespond with ONLY a JSON object of the form {"values": [...]}, containing exactly ${count} strings, in the same order as the list above.`;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(GROQ_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: GROQ_MODEL,
        messages: [{ role: "user", content: prompt }],
        response_format: { type: "json_object" },
        temperature: 0.4,
        max_tokens: maxOutputTokensPerItem * count,
      }),
      signal: controller.signal,
      cache: "no-store",
    });

    if (!response.ok) {
      console.error(`Groq batch request failed with status ${response.status}`);
      return null;
    }

    const data = await response.json();
    const text: string | undefined = data?.choices?.[0]?.message?.content;
    if (!text) return null;

    const values = parseJsonArray(text, count);
    return values ? { values, model: `groq/${GROQ_MODEL}` } : null;
  } catch (error) {
    console.error("Groq batch request threw", error);
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

const PROVIDERS = [callGeminiBatch, callGroqBatch];

/**
 * Tries each provider in order, falling through to the next on any failure
 * (missing key, rate limit, network error, bad response shape). This is how
 * we ride out Gemini's free-tier daily cap without a feature going dark.
 */
export async function callBatchWithFallback(
  listDescription: string,
  count: number,
  maxOutputTokensPerItem = 40
): Promise<BatchResult> {
  if (count === 0) return { values: [], model: "none" };

  for (const provider of PROVIDERS) {
    const result = await provider(listDescription, count, maxOutputTokensPerItem);
    if (result) return result;
  }

  return { values: Array(count).fill(null), model: "none" };
}
