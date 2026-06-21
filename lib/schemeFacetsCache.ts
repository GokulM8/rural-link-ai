import {
  buildFilterQuery,
  REQUEST_HEADERS,
  SCHEME_CATEGORIES,
  SEARCH_ENDPOINT,
  type SchemeFacets,
  type SearchResponse,
} from "./schemes";
import { supabaseAdmin } from "./supabase";

// Split out from lib/schemes.ts specifically so importing it (for
// supabaseAdmin) never happens from a module the client bundle also pulls
// in — see the comment at the top of lib/schemes.ts for what broke before
// this split. Only ever import this file from a Server Component.

async function fetchSchemeFacetsLive(state: string): Promise<SchemeFacets> {
  const params = new URLSearchParams({
    lang: "en",
    q: buildFilterQuery(state),
    keyword: "",
    sort: "",
    from: "0",
    size: "1",
  });

  const response = await fetch(`${SEARCH_ENDPOINT}?${params.toString()}`, {
    headers: REQUEST_HEADERS,
    cache: "no-store",
  });
  if (!response.ok) {
    throw new Error(`MyScheme facets request failed with status ${response.status}`);
  }

  const data: SearchResponse = await response.json();
  const facets = data.data.facets ?? [];

  const categoryCounts: Record<string, number> = {};
  for (const category of SCHEME_CATEGORIES) categoryCounts[category] = 0;
  const categoryFacet = facets.find((facet) => facet.identifier === "schemeCategory");
  for (const entry of categoryFacet?.entries ?? []) {
    if (entry.label in categoryCounts) categoryCounts[entry.label] = entry.count;
  }

  const occupationFacet = facets.find((facet) => facet.identifier === "occupation");
  const occupations = (occupationFacet?.entries ?? [])
    .map((entry) => entry.label)
    .filter((label) => label !== "All");

  return { categoryCounts, occupations, total: data.data.summary.total };
}

/**
 * One cheap request (size=1, only the facet breakdown matters) instead of
 * firing one request per category — MyScheme's own facets already return
 * per-category and per-occupation counts scoped to the given state. Cached
 * in Supabase since this only changes when MyScheme's own data changes.
 */
export async function fetchSchemeFacets(state: string): Promise<SchemeFacets> {
  try {
    const { data, error } = await supabaseAdmin
      .from("scheme_facets_cache")
      .select("category_counts, occupations, total")
      .eq("state", state)
      .maybeSingle();
    if (error) console.error("scheme_facets_cache read failed, will fetch live", error);
    else if (data) {
      return {
        categoryCounts: data.category_counts as Record<string, number>,
        occupations: data.occupations as string[],
        total: data.total,
      };
    }
  } catch (error) {
    console.error("scheme_facets_cache read threw, will fetch live", error);
  }

  const facets = await fetchSchemeFacetsLive(state);

  try {
    const { error } = await supabaseAdmin.from("scheme_facets_cache").upsert({
      state,
      category_counts: facets.categoryCounts,
      occupations: facets.occupations,
      total: facets.total,
    });
    if (error) console.error("scheme_facets_cache write failed", error);
  } catch (error) {
    console.error("scheme_facets_cache write threw", error);
  }

  return facets;
}
