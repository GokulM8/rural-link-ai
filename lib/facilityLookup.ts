import { callBatchWithFallback } from "./aiProviders";
import type { ServiceCategory } from "./overpass";

export interface FacilityLookupInput {
  name: string;
  serviceType: ServiceCategory;
  lat: number;
  lng: number;
  /** City/district hint from whatever address fragment OSM has, if any. */
  locality?: string;
}

export interface FacilityLookupResult {
  /** Only ever non-null when confidence is "high" — see prompt below for why. */
  phone: string | null;
  confidence: "high" | "medium" | "low";
  /** A different, real nearby facility of the same type — shown separately,
   * never substituted in as if it were the requested place's own number. */
  alternative: { name: string; phone: string } | null;
}

interface RawLookupItem {
  found?: boolean;
  phone?: string | null;
  confidence?: string;
  altName?: string | null;
  altPhone?: string | null;
}

function buildListDescription(inputs: FacilityLookupInput[]): string {
  const list = inputs
    .map((input, i) => {
      const where = input.locality ? `${input.locality}, AP` : `AP (coordinates ${input.lat}, ${input.lng})`;
      return `${i + 1}. "${input.name}" (type: ${input.serviceType}) near ${where}`;
    })
    .join("\n");

  return [
    "You are a directory assistant with knowledge of real facilities in Andhra Pradesh, India.",
    `For each of these ${inputs.length} places, try to recall its REAL phone number from genuine knowledge — e.g. it's a well-known chain or notable local institution you actually have information about.`,
    "Rules, strictly:",
    "- Only report a phone number with confidence \"high\" if you have specific, genuine knowledge of that exact named place. Do not guess or invent a plausible-looking number.",
    "- If you don't have specific knowledge of that exact place, set found=false, phone=null, confidence=\"low\".",
    "- Separately, if you know a different REAL nearby facility of the same type in that area (using the given location), name it as an alternative — but only from genuine knowledge, never invented. Otherwise leave it null.",
    "- A null phone number is always better than a wrong or fabricated one.",
    list,
    `Respond with ONLY a JSON array of exactly ${inputs.length} STRINGS, in the same order as the list — each string itself being a compact JSON object with this exact shape: {"found":true|false,"phone":"..."|null,"confidence":"high"|"medium"|"low","altName":"..."|null,"altPhone":"..."|null}`,
  ].join("\n\n");
}

export function parseLookupItem(raw: string | null): FacilityLookupResult {
  const fallback: FacilityLookupResult = { phone: null, confidence: "low", alternative: null };
  if (!raw) return fallback;

  let parsed: RawLookupItem;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return fallback;
  }

  const confidence: FacilityLookupResult["confidence"] =
    parsed.confidence === "high" || parsed.confidence === "medium" ? parsed.confidence : "low";

  // The phone field is only trusted at confidence "high" — this is the one
  // hard line: medium/low confidence gets treated the same as "not found"
  // for the purposes of ever showing a number on the card.
  const phone = parsed.found && confidence === "high" && parsed.phone ? parsed.phone : null;

  const alternative =
    parsed.altName && parsed.altPhone ? { name: parsed.altName, phone: parsed.altPhone } : null;

  return { phone, confidence, alternative };
}

export async function lookupFacilities(
  inputs: FacilityLookupInput[]
): Promise<{ results: FacilityLookupResult[]; model: string }> {
  if (inputs.length === 0) return { results: [], model: "none" };

  const { values, model } = await callBatchWithFallback(buildListDescription(inputs), inputs.length, 60);
  return { results: values.map(parseLookupItem), model };
}
