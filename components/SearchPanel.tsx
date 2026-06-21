"use client";

import { useCallback, useState } from "react";
import { CircleDashed, LocateFixed, Loader2, Search } from "lucide-react";
import { useTranslations } from "next-intl";

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_API_KEY;
export const RADIUS_OPTIONS_KM = [2, 5, 10, 20];

export interface SearchPanelProps {
  radiusKm: number;
  onRadiusChange: (km: number) => void;
  onLocationFound: (coords: { lat: number; lng: number }) => void;
}

/** Desktop only — geocodes free-text via Mapbox and re-centers the search,
 * since there's no manual location entry anywhere else in the app. */
export default function SearchPanel({ radiusKm, onRadiusChange, onLocationFound }: SearchPanelProps) {
  const t = useTranslations("search");
  const [query, setQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [searchFailed, setSearchFailed] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const [locationFailed, setLocationFailed] = useState(false);

  const handleSearch = useCallback(async () => {
    const trimmed = query.trim();
    if (!trimmed || !MAPBOX_TOKEN) return;

    setIsSearching(true);
    setSearchFailed(false);
    try {
      const response = await fetch(
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(trimmed)}.json?country=IN&limit=1&access_token=${MAPBOX_TOKEN}`
      );
      if (!response.ok) throw new Error("geocode request failed");
      const data = await response.json();
      const feature = data?.features?.[0];
      if (!feature) {
        setSearchFailed(true);
        return;
      }
      const [lng, lat] = feature.center;
      onLocationFound({ lat, lng });
    } catch (error) {
      console.error("Location search failed", error);
      setSearchFailed(true);
    } finally {
      setIsSearching(false);
    }
  }, [query, onLocationFound]);

  // Re-detects the device's GPS location on demand — distinct from
  // MapControls' "My location" button, which just re-centers on whatever
  // coords were already found at page load (no new browser prompt/lookup).
  const handleUseCurrentLocation = useCallback(() => {
    if (!("geolocation" in navigator)) {
      setLocationFailed(true);
      return;
    }

    setIsLocating(true);
    setLocationFailed(false);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setIsLocating(false);
        setQuery("");
        setSearchFailed(false);
        onLocationFound({ lat: position.coords.latitude, lng: position.coords.longitude });
      },
      () => {
        setIsLocating(false);
        setLocationFailed(true);
      }
    );
  }, [onLocationFound]);

  const cycleRadius = useCallback(() => {
    const currentIndex = RADIUS_OPTIONS_KM.indexOf(radiusKm);
    const next = RADIUS_OPTIONS_KM[(currentIndex + 1) % RADIUS_OPTIONS_KM.length];
    onRadiusChange(next);
  }, [radiusKm, onRadiusChange]);

  return (
    <div className="absolute left-4 top-20 z-10 hidden w-[260px] md:block">
      <form
        onSubmit={(event) => {
          event.preventDefault();
          handleSearch();
        }}
        className="flex items-center gap-2 rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-1)]/90 px-3 py-2.5 backdrop-blur-xl"
      >
        {isSearching ? (
          <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin text-[var(--text-4)]" strokeWidth={1.75} />
        ) : (
          <Search className="h-3.5 w-3.5 shrink-0 text-[var(--text-4)]" strokeWidth={1.75} />
        )}
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={t("placeholder")}
          className="min-w-0 flex-1 bg-transparent text-[13px] text-[var(--text-2)] placeholder:text-[var(--text-4)] focus:outline-none"
        />
        <div className="h-3.5 w-px shrink-0 bg-[var(--border-subtle)]" />
        <button
          type="button"
          onClick={handleUseCurrentLocation}
          disabled={isLocating}
          aria-label={t("useCurrentLocation")}
          title={t("useCurrentLocation")}
          className="shrink-0 text-[#1D9E75] transition hover:text-[#177F5E] disabled:pointer-events-none disabled:opacity-50"
        >
          {isLocating ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" strokeWidth={1.75} />
          ) : (
            <LocateFixed className="h-3.5 w-3.5" strokeWidth={1.75} />
          )}
        </button>
      </form>
      {searchFailed && <p className="mt-1 px-1 text-[11px] text-red-400">{t("notFound")}</p>}
      {locationFailed && <p className="mt-1 px-1 text-[11px] text-red-400">{t("locationError")}</p>}

      <button
        type="button"
        onClick={cycleRadius}
        className="mt-2 inline-flex items-center gap-1.5 rounded-full border border-[var(--border-subtle)] bg-[var(--surface-1)]/85 px-3 py-1 text-[11px] text-[var(--text-4)] backdrop-blur-sm transition hover:text-[var(--text-3)]"
      >
        <CircleDashed className="h-3 w-3 text-[#1D9E75]" strokeWidth={1.75} />
        {t("radius")} <span className="text-[var(--text-3)]">{radiusKm} km</span>
      </button>
    </div>
  );
}
