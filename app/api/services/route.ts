import { NextRequest, NextResponse } from "next/server";
import { fetchNearbyServices, isOpenNow, type OverpassService } from "@/lib/overpass";
import { generateServiceTips } from "@/lib/aiTips";
import { lookupFacilities, type FacilityLookupInput } from "@/lib/facilityLookup";
import { CATEGORY_HELPLINE, CATEGORY_TYPICAL_HOURS } from "@/lib/serviceDefaults";
import { supabaseAdmin } from "@/lib/supabase";
import { checkRateLimit, getClientIp } from "@/lib/rateLimit";
import type { ServiceCardProps } from "@/components/ServiceCard";

// Next.js caches GET Route Handlers by default. This route's results depend
// on live external state (Overpass, Supabase, AI providers) and must never
// be served stale.
export const dynamic = "force-dynamic";

// Each request can trigger Overpass + Gemini/Groq + several Supabase calls,
// so this is deliberately tighter than a typical public API rate limit.
const RATE_LIMIT = 20;
const RATE_LIMIT_WINDOW_MS = 60 * 1000;

const DEFAULT_RADIUS_KM = 5;
const SERVICE_CACHE_TTL_MS = 24 * 60 * 60 * 1000;
// Bump this whenever OverpassService's shape changes (new fields, renamed
// fields, etc). Cached rows are full JSON snapshots, so without a version
// segment in the key, old rows would silently keep serving the old shape
// (missing new fields) for up to SERVICE_CACHE_TTL_MS after a deploy.
const SERVICE_CACHE_SCHEMA_VERSION = 2;
// Tips for all candidates are generated in a single batched call per
// provider, so this just bounds prompt size/latency, not API quota
// (see lib/aiTips.ts, which falls through Gemini -> Groq on failure).
const AI_TIP_LIMIT = 10;
const FACILITY_LOOKUP_LIMIT = 10;

function buildCacheKey(lat: number, lng: number, radiusKm: number): string {
  const round = (value: number) => Math.round(value * 100) / 100;
  return `v${SERVICE_CACHE_SCHEMA_VERSION}:${round(lat)}:${round(lng)}:${radiusKm}`;
}

async function getServices(lat: number, lng: number, radiusKm: number): Promise<OverpassService[]> {
  const cacheKey = buildCacheKey(lat, lng, radiusKm);

  try {
    const { data, error } = await supabaseAdmin
      .from("service_cache")
      .select("services, fetched_at")
      .eq("cache_key", cacheKey)
      .maybeSingle();

    if (error) console.error("service_cache read failed, falling back to live fetch", error);
    else if (data && Date.now() - new Date(data.fetched_at).getTime() < SERVICE_CACHE_TTL_MS) {
      return data.services as OverpassService[];
    }
  } catch (error) {
    console.error("service_cache read threw, falling back to live fetch", error);
  }

  const services = await fetchNearbyServices(lat, lng, radiusKm);

  try {
    const { error } = await supabaseAdmin.from("service_cache").upsert({
      cache_key: cacheKey,
      lat,
      lng,
      radius_km: radiusKm,
      services,
      fetched_at: new Date().toISOString(),
    });
    if (error) console.error("service_cache write failed", error);
  } catch (error) {
    console.error("service_cache write threw", error);
  }

  return services;
}

async function attachAiTips(results: ServiceCardProps[]): Promise<void> {
  const candidates = results.slice(0, AI_TIP_LIMIT);
  if (candidates.length === 0) return;

  const ids = candidates.map((service) => service.id);
  const cachedTips = new Map<number, string>();

  try {
    const { data, error } = await supabaseAdmin
      .from("ai_tips")
      .select("service_id, tip")
      .in("service_id", ids);
    if (error) console.error("ai_tips read failed, will regenerate", error);
    else for (const row of data ?? []) cachedTips.set(row.service_id, row.tip);
  } catch (error) {
    console.error("ai_tips read threw, will regenerate", error);
  }

  const missing = candidates.filter((service) => !cachedTips.has(service.id));
  const { tips: generatedTips, model } = await generateServiceTips(
    missing.map((service) => ({
      name: service.name,
      category: service.category,
      isOpen: service.isOpen,
    }))
  );

  const newTips: { service_id: number; tip: string; model: string }[] = [];
  missing.forEach((service, i) => {
    const tip = generatedTips[i];
    if (tip) {
      cachedTips.set(service.id, tip);
      newTips.push({ service_id: service.id, tip, model });
    }
  });

  if (newTips.length > 0) {
    try {
      const { error } = await supabaseAdmin.from("ai_tips").upsert(newTips);
      if (error) console.error("ai_tips write failed", error);
    } catch (error) {
      console.error("ai_tips write threw", error);
    }
  }

  for (const service of candidates) {
    const tip = cachedTips.get(service.id);
    if (tip) service.aiTip = tip;
  }
}

interface CachedFacilityRow {
  service_id: number;
  phone: string | null;
  alt_name: string | null;
  alt_phone: string | null;
}

async function attachFacilityLookup(results: ServiceCardProps[]): Promise<void> {
  // Helpline + typical hours are static facts (lib/serviceDefaults.ts) — no
  // AI call needed, so these apply to every result regardless of the limit
  // below, which only bounds the AI-based specific-facility phone lookup.
  for (const service of results) {
    if (!service.phone) service.helpline = CATEGORY_HELPLINE[service.category];
    if (!service.openingHours) service.typicalHours = CATEGORY_TYPICAL_HOURS[service.category];
  }

  const candidates = results.filter((service) => !service.phone).slice(0, FACILITY_LOOKUP_LIMIT);
  if (candidates.length === 0) return;

  const ids = candidates.map((service) => service.id);
  const cached = new Map<number, CachedFacilityRow>();

  try {
    const { data, error } = await supabaseAdmin
      .from("facility_lookup")
      .select("service_id, phone, alt_name, alt_phone")
      .in("service_id", ids);
    if (error) console.error("facility_lookup read failed, will regenerate", error);
    else for (const row of data ?? []) cached.set(row.service_id, row);
  } catch (error) {
    console.error("facility_lookup read threw, will regenerate", error);
  }

  const missing = candidates.filter((service) => !cached.has(service.id));
  const lookupInputs: FacilityLookupInput[] = missing.map((service) => ({
    name: service.name,
    serviceType: service.category,
    lat: service.lat,
    lng: service.lng,
    locality: service.address,
  }));

  const { results: lookupResults, model } = await lookupFacilities(lookupInputs);

  const newRows: {
    service_id: number;
    phone: string | null;
    confidence: string;
    alt_name: string | null;
    alt_phone: string | null;
    model: string;
  }[] = [];

  missing.forEach((service, i) => {
    const result = lookupResults[i];
    if (!result) return;
    newRows.push({
      service_id: service.id,
      phone: result.phone,
      confidence: result.confidence,
      alt_name: result.alternative?.name ?? null,
      alt_phone: result.alternative?.phone ?? null,
      model,
    });
    cached.set(service.id, {
      service_id: service.id,
      phone: result.phone,
      alt_name: result.alternative?.name ?? null,
      alt_phone: result.alternative?.phone ?? null,
    });
  });

  if (newRows.length > 0) {
    try {
      const { error } = await supabaseAdmin.from("facility_lookup").upsert(newRows);
      if (error) console.error("facility_lookup write failed", error);
    } catch (error) {
      console.error("facility_lookup write threw", error);
    }
  }

  for (const service of candidates) {
    const row = cached.get(service.id);
    if (!row) continue;
    if (row.phone) {
      service.aiPhone = row.phone;
      delete service.helpline; // a real (even if AI-sourced) number beats the generic helpline
    }
    if (row.alt_name && row.alt_phone) {
      service.nearestAlternative = { name: row.alt_name, phone: row.alt_phone };
    }
  }
}

export async function GET(request: NextRequest) {
  const rateLimit = checkRateLimit(getClientIp(request), RATE_LIMIT, RATE_LIMIT_WINDOW_MS);
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: "Too many requests, please slow down." },
      { status: 429, headers: { "Retry-After": String(rateLimit.retryAfterSeconds) } }
    );
  }

  const { searchParams } = new URL(request.url);
  const lat = Number(searchParams.get("lat"));
  const lng = Number(searchParams.get("lng"));
  const radiusParam = searchParams.get("radius");
  const radiusKm = radiusParam ? Number(radiusParam) : DEFAULT_RADIUS_KM;

  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return NextResponse.json(
      { error: "lat and lng query params are required and must be numbers" },
      { status: 400 }
    );
  }
  if (!Number.isFinite(radiusKm) || radiusKm <= 0) {
    return NextResponse.json({ error: "radius must be a positive number" }, { status: 400 });
  }

  try {
    const services = await getServices(lat, lng, radiusKm);

    const results: ServiceCardProps[] = services.map((service) => ({
      id: service.id,
      name: service.name,
      category: service.category,
      lat: service.lat,
      lng: service.lng,
      distanceKm: service.distanceKm,
      isOpen: isOpenNow(service.openingHours),
      address: service.address,
      phone: service.phone,
      openingHours: service.openingHours,
    }));

    await attachAiTips(results);
    await attachFacilityLookup(results);

    return NextResponse.json({ services: results });
  } catch (error) {
    console.error("Failed to fetch nearby services", error);
    return NextResponse.json({ error: "Failed to fetch nearby services" }, { status: 502 });
  }
}
