import type { ServiceCategory } from "./overpass";
import { SCHEME_CATEGORIES, type SchemeCategory } from "./schemes";

const MODEL_NAME = "gemini-2.5-flash";
const ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL_NAME}:generateContent`;
const REQUEST_TIMEOUT_MS = 15000;

export type VoiceDomain = "services" | "schemes";

const VALID_SERVICE_CATEGORIES = new Set<string>(["hospital", "clinic", "bank", "atm", "school", "government"]);

function normalize(value: string): string {
  return value.toLowerCase().replace(/\s+/g, " ").trim();
}

// Scheme category names contain commas/spacing that a model may reproduce
// slightly differently (e.g. extra space after a comma), so match on a
// normalized form rather than requiring an exact string.
const SCHEME_CATEGORY_BY_NORMALIZED = new Map<string, SchemeCategory>(
  SCHEME_CATEGORIES.map((category) => [normalize(category), category])
);

export interface VoiceIntentResult {
  transcript: string;
  detectedLanguage: string;
  intentCategory: ServiceCategory | SchemeCategory | "unknown";
  replyToUser: string;
}

function buildPrompt(domain: VoiceDomain): string {
  if (domain === "schemes") {
    const categoryList = SCHEME_CATEGORIES.map((category) => `"${category}"`).join(", ");
    return [
      "This audio is a spoken request from a user of a rural India government-schemes app called RuralLink.",
      `The app lists schemes under these exact categories: ${categoryList}`,
      "Listen to the audio and decide which ONE category best matches what kind of schemes the user wants (for example, a request about farming, crops, or land maps to the Agriculture category; a request about hospitals, medicines, or treatment maps to Health & Wellness).",
      'Respond with ONLY this JSON: {"transcript": "...", "detectedLanguage": "...", "intentCategory": "<one of the exact category strings above, or \\"unknown\\" if nothing fits>", "replyToUser": "a short spoken-style reply in the same language naming the kind of schemes you will show"}',
    ].join("\n\n");
  }

  return [
    "This audio is a spoken request from a user of a rural India services app called RuralLink.",
    "The app has these categories: hospital, clinic, bank, atm, school, government.",
    'Listen to the audio and respond with ONLY this JSON: {"transcript": "...", "detectedLanguage": "...", "intentCategory": "hospital|clinic|bank|atm|school|government|unknown", "replyToUser": "a short spoken-style reply in the same language confirming what you understood"}',
  ].join("\n\n");
}

function resolveCategory(value: unknown, domain: VoiceDomain): VoiceIntentResult["intentCategory"] {
  if (typeof value !== "string") return "unknown";
  if (domain === "services") {
    return VALID_SERVICE_CATEGORIES.has(value) ? (value as ServiceCategory) : "unknown";
  }
  return SCHEME_CATEGORY_BY_NORMALIZED.get(normalize(value)) ?? "unknown";
}

function parseResult(text: string, domain: VoiceDomain): VoiceIntentResult | null {
  try {
    const parsed = JSON.parse(text);
    if (typeof parsed.transcript !== "string" || typeof parsed.replyToUser !== "string") return null;

    return {
      transcript: parsed.transcript,
      detectedLanguage: typeof parsed.detectedLanguage === "string" ? parsed.detectedLanguage : "unknown",
      intentCategory: resolveCategory(parsed.intentCategory, domain),
      replyToUser: parsed.replyToUser,
    };
  } catch {
    return null;
  }
}

/** Returns null on any failure so the caller can fall through to the next voice-dedicated key. */
async function callGeminiAudio(
  apiKey: string,
  audioBase64: string,
  mimeType: string,
  domain: VoiceDomain
): Promise<VoiceIntentResult | null> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(`${ENDPOINT}?key=${apiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [
          {
            parts: [{ text: buildPrompt(domain) }, { inline_data: { mime_type: mimeType, data: audioBase64 } }],
          },
        ],
        generationConfig: { responseMimeType: "application/json", temperature: 0.2 },
      }),
      signal: controller.signal,
      cache: "no-store",
    });

    if (!response.ok) {
      console.error(`Gemini voice request failed with status ${response.status}`);
      return null;
    }

    const data = await response.json();
    const text: string | undefined = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) return null;

    return parseResult(text, domain);
  } catch (error) {
    console.error("Gemini voice request threw", error);
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

function getVoiceApiKeys(): string[] {
  return [process.env.GEMINI_VOICE_API_KEY, process.env.GEMINI_VOICE_API_KEY_2].filter(
    (key): key is string => Boolean(key)
  );
}

export function getConfiguredVoiceKeyCount(): number {
  return getVoiceApiKeys().length;
}

/**
 * Tries each voice-dedicated Gemini project in turn (separate from the
 * GEMINI_API_KEY used for tips/eligibility — see lib/aiProviders.ts), so
 * voice has its own quota pool that doesn't compete with those features.
 * `domain` picks which category vocabulary the model should classify
 * against — the nearby-services dashboard or the government schemes list.
 */
export async function recognizeVoiceIntent(
  audioBase64: string,
  mimeType: string,
  domain: VoiceDomain = "services"
): Promise<VoiceIntentResult | null> {
  for (const key of getVoiceApiKeys()) {
    const result = await callGeminiAudio(key, audioBase64, mimeType, domain);
    if (result) return result;
  }
  return null;
}
