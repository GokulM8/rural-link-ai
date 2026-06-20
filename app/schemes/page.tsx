import { fetchSchemes, type Scheme } from "@/lib/schemes";
import { generateEligibilityVerdicts } from "@/lib/schemeEligibility";
import { supabaseAdmin } from "@/lib/supabase";
import SchemesPageView from "@/components/SchemesPageView";

// Belt-and-suspenders alongside the no-store fetches in lib/* — this page's
// data depends on live external state and must always re-render per request.
export const dynamic = "force-dynamic";

const PAGE_SIZE = 10;

async function getVerdicts(schemes: Scheme[]): Promise<Record<string, string>> {
  const verdictMap = new Map<string, string>();
  if (schemes.length === 0) return {};

  try {
    const { data, error } = await supabaseAdmin
      .from("scheme_eligibility")
      .select("slug, verdict")
      .in("slug", schemes.map((scheme) => scheme.slug));
    if (error) console.error("scheme_eligibility read failed, will regenerate", error);
    else for (const row of data ?? []) verdictMap.set(row.slug, row.verdict);
  } catch (error) {
    console.error("scheme_eligibility read threw, will regenerate", error);
  }

  const missing = schemes.filter((scheme) => !verdictMap.has(scheme.slug));
  if (missing.length === 0) return Object.fromEntries(verdictMap);

  const { verdicts, model } = await generateEligibilityVerdicts(
    missing.map((scheme) => ({
      slug: scheme.slug,
      name: scheme.name,
      eligibilitySummary: scheme.eligibilitySummary,
    }))
  );

  const newRows: { slug: string; verdict: string; model: string }[] = [];
  missing.forEach((scheme, i) => {
    const verdict = verdicts[i];
    if (verdict) {
      verdictMap.set(scheme.slug, verdict);
      newRows.push({ slug: scheme.slug, verdict, model });
    }
  });

  if (newRows.length > 0) {
    try {
      const { error } = await supabaseAdmin.from("scheme_eligibility").upsert(newRows);
      if (error) console.error("scheme_eligibility write failed", error);
    } catch (error) {
      console.error("scheme_eligibility write threw", error);
    }
  }

  return Object.fromEntries(verdictMap);
}

export default async function SchemesPage({
  searchParams,
}: {
  searchParams: { state?: string; category?: string; page?: string };
}) {
  const state = searchParams.state ?? "Andhra Pradesh";
  const category = searchParams.category ?? "Agriculture,Rural & Environment";
  const page = Math.max(0, Number(searchParams.page ?? "0") || 0);

  let schemes: Scheme[] = [];
  let total = 0;
  let hasError = false;

  try {
    const result = await fetchSchemes({ state, category, from: page * PAGE_SIZE, size: PAGE_SIZE });
    schemes = result.schemes;
    total = result.total;
  } catch (error) {
    console.error("Failed to fetch schemes", error);
    hasError = true;
  }

  const verdicts = await getVerdicts(schemes);
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <SchemesPageView
      state={state}
      category={category}
      page={page}
      totalPages={totalPages}
      schemes={schemes}
      verdicts={verdicts}
      hasError={hasError}
    />
  );
}
