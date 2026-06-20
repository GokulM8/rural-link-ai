import type { ServiceCategory } from "./overpass";

const MODEL_NAME = "gemini-2.5-flash";
const ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL_NAME}:generateContent`;
const REQUEST_TIMEOUT_MS = 15000;

const VALID_CATEGORIES = new Set<string>(["hospital", "clinic", "bank", "atm", "school", "government"]);

export interface VoiceIntentResult {
  transcript: string;
  detectedLanguage: string;
  intentCategory: ServiceCategory | "unknown";
  replyToUser: string;
}

function buildPrompt(): string {
  return [
    "This audio is a spoken request from a user of a rural India services app called RuralLink.",
    "The app has these categories: hospital, clinic, bank, atm, school, government.",
    'Listen to the audio and respond with ONLY this JSON: {"transcript": "...", "detectedLanguage": "...", "intentCategory": "hospital|clinic|bank|atm|school|government|unknown", "replyToUser": "a short spoken-style reply in the same language confirming what you understood"}',
  ].join("\n\n");
}

function parseResult(text: string): VoiceIntentResult | null {
  try {
    const parsed = JSON.parse(text);
    if (typeof parsed.transcript !== "string" || typeof parsed.replyToUser !== "string") return null;

    return {
      transcript: parsed.transcript,
      detectedLanguage: typeof parsed.detectedLanguage === "string" ? parsed.detectedLanguage : "unknown",
      intentCategory: VALID_CATEGORIES.has(parsed.intentCategory)
        ? (parsed.intentCategory as ServiceCategory)
        : "unknown",
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
  mimeType: string
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
            parts: [{ text: buildPrompt() }, { inline_data: { mime_type: mimeType, data: audioBase64 } }],
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

    return parseResult(text);
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
 */
export async function recognizeVoiceIntent(
  audioBase64: string,
  mimeType: string
): Promise<VoiceIntentResult | null> {
  for (const key of getVoiceApiKeys()) {
    const result = await callGeminiAudio(key, audioBase64, mimeType);
    if (result) return result;
  }
  return null;
}
