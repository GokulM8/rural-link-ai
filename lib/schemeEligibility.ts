import { callBatchWithFallback } from "./aiProviders";

export interface EligibilityInput {
  slug: string;
  name: string;
  eligibilitySummary: string;
}

interface VerdictsResult {
  verdicts: (string | null)[];
  model: string;
}

function buildVerdictsListDescription(inputs: EligibilityInput[]): string {
  const list = inputs
    .map((input, i) => `${i + 1}. "${input.name}" — eligibility rules: ${input.eligibilitySummary}`)
    .join("\n");

  return [
    "You are a benefits counselor assessing Indian government schemes for a specific persona:",
    "a typical rural farmer in Andhra Pradesh, India — owns a small landholding, modest income, no special category status (not specifically SC/ST/disabled/minority) unless the scheme is general-purpose.",
    `For each of these ${inputs.length} schemes, write one short line (under 20 words) saying whether this persona would likely qualify — start with "Likely yes", "Likely no", or "Maybe", then a brief reason.`,
    list,
  ].join("\n\n");
}

export async function generateEligibilityVerdicts(inputs: EligibilityInput[]): Promise<VerdictsResult> {
  if (inputs.length === 0) return { verdicts: [], model: "none" };

  const { values, model } = await callBatchWithFallback(buildVerdictsListDescription(inputs), inputs.length);
  return { verdicts: values, model };
}
