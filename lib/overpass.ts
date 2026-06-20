const OVERPASS_ENDPOINT = "https://overpass-api.de/api/interpreter";

export type ServiceCategory =
  | "hospital"
  | "clinic"
  | "bank"
  | "atm"
  | "school"
  | "government";

const AMENITY_TAGS: Record<ServiceCategory, [key: string, value: string]> = {
  hospital: ["amenity", "hospital"],
  clinic: ["amenity", "clinic"],
  bank: ["amenity", "bank"],
  atm: ["amenity", "atm"],
  school: ["amenity", "school"],
  government: ["office", "government"],
};

export interface OverpassService {
  id: number;
  name: string;
  category: ServiceCategory;
  lat: number;
  lng: number;
  distanceKm: number;
  openingHours?: string;
  address?: string;
  phone?: string;
}

interface OverpassElement {
  type: "node" | "way" | "relation";
  id: number;
  lat?: number;
  lon?: number;
  center?: { lat: number; lon: number };
  tags?: Record<string, string>;
}

interface OverpassResponse {
  elements: OverpassElement[];
}

function toRad(value: number): number {
  return (value * Math.PI) / 180;
}

function haversineDistanceKm(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const earthRadiusKm = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return earthRadiusKm * c;
}

function categoryFromTags(tags: Record<string, string>): ServiceCategory | null {
  if (tags.amenity === "hospital") return "hospital";
  if (tags.amenity === "clinic") return "clinic";
  if (tags.amenity === "bank") return "bank";
  if (tags.amenity === "atm") return "atm";
  if (tags.amenity === "school") return "school";
  if (tags.office === "government") return "government";
  return null;
}

function formatAddress(tags: Record<string, string>): string | undefined {
  const parts = [
    tags["addr:housenumber"],
    tags["addr:street"],
    tags["addr:city"],
  ].filter(Boolean);
  return parts.length > 0 ? parts.join(" ") : undefined;
}

function formatPhone(tags: Record<string, string>): string | undefined {
  return tags.phone ?? tags["contact:phone"];
}

const DAY_CODES: Record<string, number> = {
  Su: 0,
  Mo: 1,
  Tu: 2,
  We: 3,
  Th: 4,
  Fr: 5,
  Sa: 6,
};

function expandDayRange(range: string): number[] {
  const [start, end] = range.split("-");
  const startCode = DAY_CODES[start];
  const endCode = end ? DAY_CODES[end] : undefined;
  if (startCode === undefined) return [];
  if (endCode === undefined) return [startCode];

  const days: number[] = [];
  let current = startCode;
  while (true) {
    days.push(current);
    if (current === endCode) break;
    current = (current + 1) % 7;
  }
  return days;
}

function minutesSinceMidnight(time: string): number | null {
  const match = /^(\d{1,2}):(\d{2})$/.exec(time);
  if (!match) return null;
  return Number(match[1]) * 60 + Number(match[2]);
}

/**
 * Best-effort OSM `opening_hours` evaluator. Supports `24/7` and
 * semicolon-separated rules like `Mo-Fr 08:00-17:00; Sa 09:00-12:00`.
 * Returns null when the format isn't recognized.
 */
export function isOpenNow(openingHours: string | undefined, now = new Date()): boolean | null {
  if (!openingHours) return null;
  const normalized = openingHours.trim();
  if (normalized === "24/7") return true;

  const currentDay = now.getDay();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();

  const rules = normalized.split(";").map((rule) => rule.trim()).filter(Boolean);
  let matchedAnyRule = false;

  for (const rule of rules) {
    const parts = rule.split(/\s+/);
    if (parts.length < 2) continue;
    const [dayPart, ...timeParts] = parts;
    const timePart = timeParts.join(" ");

    const days = dayPart.split(",").flatMap(expandDayRange);
    if (days.length === 0 || !days.includes(currentDay)) continue;

    for (const timeRange of timePart.split(",")) {
      const [start, end] = timeRange.split("-");
      const startMinutes = minutesSinceMidnight(start);
      const endMinutes = minutesSinceMidnight(end);
      if (startMinutes === null || endMinutes === null) continue;

      matchedAnyRule = true;
      if (currentMinutes >= startMinutes && currentMinutes < endMinutes) {
        return true;
      }
    }
  }

  return matchedAnyRule ? false : null;
}

const RETRYABLE_STATUSES = new Set([502, 503, 504]);
const MAX_ATTEMPTS = 3;
const RETRY_DELAY_MS = 1000;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function postOverpassQuery(query: string): Promise<Response> {
  let lastError: unknown;

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      const response = await fetch(OVERPASS_ENDPOINT, {
        method: "POST",
        headers: {
          "Content-Type": "text/plain",
          Accept: "*/*",
          "User-Agent": "RuralLink/1.0",
        },
        body: query,
        cache: "no-store",
      });

      if (response.ok) return response;
      if (!RETRYABLE_STATUSES.has(response.status) || attempt === MAX_ATTEMPTS) {
        throw new Error(`Overpass API request failed with status ${response.status}`);
      }
      lastError = new Error(`Overpass API request failed with status ${response.status}`);
    } catch (error) {
      lastError = error;
      if (attempt === MAX_ATTEMPTS) throw lastError;
    }

    await sleep(RETRY_DELAY_MS * attempt);
  }

  throw lastError;
}

export async function fetchNearbyServices(
  lat: number,
  lng: number,
  radiusKm: number
): Promise<OverpassService[]> {
  const radiusMeters = Math.round(radiusKm * 1000);
  const filters = (Object.keys(AMENITY_TAGS) as ServiceCategory[])
    .map((category) => {
      const [key, value] = AMENITY_TAGS[category];
      return `
        node[${key}=${value}](around:${radiusMeters},${lat},${lng});
        way[${key}=${value}](around:${radiusMeters},${lat},${lng});
      `;
    })
    .join("\n");

  const query = `
    [out:json][timeout:25];
    (
      ${filters}
    );
    out center tags;
  `;

  const response = await postOverpassQuery(query);
  const data: OverpassResponse = await response.json();

  const services: OverpassService[] = [];
  for (const element of data.elements) {
    if (!element.tags) continue;
    const category = categoryFromTags(element.tags);
    if (!category) continue;

    const elementLat = element.lat ?? element.center?.lat;
    const elementLng = element.lon ?? element.center?.lon;
    if (elementLat === undefined || elementLng === undefined) continue;

    services.push({
      id: element.id,
      name: element.tags.name ?? "Unnamed",
      category,
      lat: elementLat,
      lng: elementLng,
      distanceKm: haversineDistanceKm(lat, lng, elementLat, elementLng),
      openingHours: element.tags.opening_hours,
      address: formatAddress(element.tags),
      phone: formatPhone(element.tags),
    });
  }

  return services.sort((a, b) => a.distanceKm - b.distanceKm);
}
