import { GoogleGenerativeAI } from "@google/generative-ai";
import type { ServiceCategory } from "./overpass";

const MODEL_NAME = "gemini-2.5-flash";

const LANGUAGE_NAMES: Record<string, string> = {
  en: "English",
  hi: "Hindi",
  te: "Telugu",
  ta: "Tamil",
  kn: "Kannada",
  mr: "Marathi",
  bn: "Bengali",
  or: "Odia",
};

let client: GoogleGenerativeAI | null = null;

function getClient(): GoogleGenerativeAI {
  if (!client) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) throw new Error("GEMINI_API_KEY is not set");
    client = new GoogleGenerativeAI(apiKey);
  }
  return client;
}

export interface ServiceTipService {
  name: string;
  type: ServiceCategory;
  /** Address or state, used to localize document requirements. */
  location?: string;
  isOpen?: boolean | null;
}

function buildPrompt(service: ServiceTipService, language: string): string {
  const languageName = LANGUAGE_NAMES[language] ?? "English";
  const status =
    service.isOpen === null || service.isOpen === undefined
      ? "unknown"
      : service.isOpen
        ? "open"
        : "closed";

  return [
    `You are a helpful local guide. Respond in ${languageName} only.`,
    `Place: "${service.name}" (type: ${service.type})${service.location ? `, location: ${service.location}` : ""}`,
    `Currently: ${status}`,
    "Give a short, contextual tip in exactly 2 lines:",
    "Line 1: what documents or items to bring for this type of place (skip if not applicable).",
    "Line 2: today's availability/open status, or another practical note if status is unknown.",
    "No preamble, no extra commentary — just the 2 lines.",
  ].join("\n");
}

/** Streams a 2-line contextual tip for a single service in the given language code (en/te/hi/...). */
export async function* streamServiceTip(
  service: ServiceTipService,
  language: string
): AsyncGenerator<string> {
  const model = getClient().getGenerativeModel({ model: MODEL_NAME });
  const result = await model.generateContentStream(buildPrompt(service, language));

  for await (const chunk of result.stream) {
    const text = chunk.text();
    if (text) yield text;
  }
}
