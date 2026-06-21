// Deliberately no import of lib/supabase.ts (or anything that imports it) in
// this file — it's imported by the Client Component SchemesPageView for
// plain constants/types, and supabaseAdmin's service-role client is
// constructed at module load time, so pulling it in here would ship that
// construction code (and a "supabaseKey is required" crash) to the browser.
// The Supabase-backed facets cache lives in lib/schemeFacetsCache.ts instead,
// imported only from the Server Component app/schemes/page.tsx.

export const SEARCH_ENDPOINT = "https://api.myscheme.gov.in/search/v6/schemes";
const DETAIL_ENDPOINT = "https://api.myscheme.gov.in/schemes/v6/public/schemes";

// Public key embedded in MyScheme's own frontend bundle (not a secret credential) —
// the API gates on Origin/Referer presence rather than this key's secrecy.
const PUBLIC_API_KEY = "tYTy5eEhlu9rFjyxuCr7ra7ACp4dv1RH8gWuHTDc";

export const REQUEST_HEADERS = {
  "x-api-key": PUBLIC_API_KEY,
  Origin: "https://www.myscheme.gov.in",
  Referer: "https://www.myscheme.gov.in/search",
  "User-Agent": "RuralLink/1.0 (+https://github.com/; contact: gokulmallabathula@gmail.com)",
};

export const INDIAN_STATES = [
  "Andhra Pradesh",
  "Arunachal Pradesh",
  "Assam",
  "Bihar",
  "Chhattisgarh",
  "Delhi",
  "Goa",
  "Gujarat",
  "Haryana",
  "Himachal Pradesh",
  "Jharkhand",
  "Karnataka",
  "Kerala",
  "Madhya Pradesh",
  "Maharashtra",
  "Manipur",
  "Meghalaya",
  "Mizoram",
  "Nagaland",
  "Odisha",
  "Punjab",
  "Rajasthan",
  "Sikkim",
  "Tamil Nadu",
  "Telangana",
  "Tripura",
  "Uttar Pradesh",
  "Uttarakhand",
  "West Bengal",
];

export const SCHEME_CATEGORIES = [
  "Agriculture,Rural & Environment",
  "Banking,Financial Services and Insurance",
  "Business & Entrepreneurship",
  "Education & Learning",
  "Health & Wellness",
  "Housing & Shelter",
  "Public Safety,Law & Justice",
  "Science, IT & Communications",
  "Skills & Employment",
  "Social welfare & Empowerment",
  "Sports & Culture",
  "Transport & Infrastructure",
  "Travel & Tourism",
  "Utility & Sanitation",
  "Women and Child",
];

export type SchemeCategory = (typeof SCHEME_CATEGORIES)[number];

export interface Scheme {
  slug: string;
  name: string;
  ministry: string;
  categories: string[];
  briefDescription: string;
  eligibilitySummary: string;
  closeDate: string | null;
  /** Always the official MyScheme page — the authoritative source, since many
   * schemes have no single online application portal (offline-only schemes). */
  applyUrl: string;
}

export interface FetchSchemesParams {
  state?: string;
  category?: string;
  occupation?: string;
  keyword?: string;
  from?: number;
  size?: number;
}

export interface FetchSchemesResult {
  schemes: Scheme[];
  total: number;
}

export interface SchemeFacets {
  /** Every category in SCHEME_CATEGORIES, defaulting to 0 if MyScheme has none for this state. */
  categoryCounts: Record<string, number>;
  /** Real occupation/beneficiary values from MyScheme's own "occupation" facet, e.g. "Farmer". */
  occupations: string[];
  total: number;
}

interface SearchHitFields {
  slug: string;
  schemeName: string;
  nodalMinistryName?: string;
  schemeCategory?: string[];
  briefDescription?: string;
  schemeCloseDate?: string | null;
}

export interface SearchFacetEntry {
  label: string;
  count: number;
}

export interface SearchFacet {
  identifier: string;
  entries?: SearchFacetEntry[];
}

export interface SearchResponse {
  data: {
    summary: { total: number };
    hits: { items: { fields: SearchHitFields }[] };
    facets?: SearchFacet[];
  };
}

interface DetailResponse {
  data: {
    en: {
      eligibilityCriteria?: { eligibilityDescription_md?: string };
    };
  };
}

export function buildFilterQuery(state?: string, category?: string, occupation?: string): string {
  const filters: { identifier: string; value: string }[] = [];
  if (state) filters.push({ identifier: "beneficiaryState", value: state });
  if (category) filters.push({ identifier: "schemeCategory", value: category });
  if (occupation) filters.push({ identifier: "occupation", value: occupation });
  return JSON.stringify(filters);
}

/** Strips the lightweight markdown MyScheme uses and collapses whitespace for card display. */
export function stripMarkdown(markdown: string, maxLength = 180): string {
  const plain = markdown
    .replace(/<[^>]+>/g, " ") // MyScheme's markdown sometimes embeds raw HTML tags like <br>
    .replace(/^>\s?/gm, "")
    .replace(/[#*_`]/g, "")
    .replace(/\s+/g, " ")
    .trim();
  return plain.length > maxLength ? `${plain.slice(0, maxLength - 1)}…` : plain;
}

async function fetchEligibilitySummary(slug: string): Promise<string> {
  try {
    const response = await fetch(
      `${DETAIL_ENDPOINT}?slug=${encodeURIComponent(slug)}&lang=en`,
      { headers: REQUEST_HEADERS, cache: "no-store" }
    );
    if (!response.ok) return "Eligibility details unavailable.";

    const data: DetailResponse = await response.json();
    const markdown = data.data?.en?.eligibilityCriteria?.eligibilityDescription_md;
    return markdown ? stripMarkdown(markdown) : "Eligibility details unavailable.";
  } catch (error) {
    console.error(`Failed to fetch eligibility for scheme ${slug}`, error);
    return "Eligibility details unavailable.";
  }
}

export async function fetchSchemes({
  state,
  category,
  occupation,
  keyword = "",
  from = 0,
  size = 10,
}: FetchSchemesParams): Promise<FetchSchemesResult> {
  const params = new URLSearchParams({
    lang: "en",
    q: buildFilterQuery(state, category, occupation),
    keyword,
    sort: "",
    from: String(from),
    size: String(size),
  });

  const response = await fetch(`${SEARCH_ENDPOINT}?${params.toString()}`, {
    headers: REQUEST_HEADERS,
    cache: "no-store",
  });
  if (!response.ok) {
    throw new Error(`MyScheme search request failed with status ${response.status}`);
  }

  const data: SearchResponse = await response.json();
  const items = data.data.hits.items;

  const schemes = await Promise.all(
    items.map(async (item): Promise<Scheme> => {
      const fields = item.fields;
      return {
        slug: fields.slug,
        name: fields.schemeName,
        ministry: fields.nodalMinistryName ?? "Unknown ministry",
        categories: fields.schemeCategory ?? [],
        briefDescription: fields.briefDescription ?? "",
        eligibilitySummary: await fetchEligibilitySummary(fields.slug),
        closeDate: fields.schemeCloseDate ?? null,
        applyUrl: `https://www.myscheme.gov.in/schemes/${fields.slug}`,
      };
    })
  );

  return { schemes, total: data.data.summary.total };
}
