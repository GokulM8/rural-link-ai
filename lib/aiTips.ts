import type { ServiceCategory } from "./overpass";
import { callBatchWithFallback } from "./aiProviders";

export interface TipInput {
  name: string;
  category: ServiceCategory;
  isOpen: boolean | null;
}

interface TipsResult {
  tips: (string | null)[];
  model: string;
}

function buildTipsListDescription(inputs: TipInput[]): string {
  const list = inputs
    .map((input, i) => {
      const status = input.isOpen === null ? "unknown" : input.isOpen ? "open" : "closed";
      return `${i + 1}. "${input.name}" (category: ${input.category}, currently: ${status})`;
    })
    .join("\n");

  return [
    "You are a helpful local guide giving practical advice for visiting places.",
    `For each of these ${inputs.length} places, give one short practical visit tip (under 20 words) — e.g. likely busy times, what to bring, or accessibility. Do not just restate the name or status.`,
    list,
  ].join("\n\n");
}

export async function generateServiceTips(inputs: TipInput[]): Promise<TipsResult> {
  if (inputs.length === 0) return { tips: [], model: "none" };

  const { values, model } = await callBatchWithFallback(buildTipsListDescription(inputs), inputs.length);
  return { tips: values, model };
}
