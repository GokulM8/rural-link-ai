"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AlertCircle, Inbox, Landmark, Loader2, Navigation, RotateCw } from "lucide-react";
import { useTranslations } from "next-intl";
import ServiceCard, { CATEGORY_ICON, type ServiceCardProps } from "@/components/ServiceCard";
import type { MapViewHandle } from "@/components/MapView";
import FloatingTopBar from "@/components/FloatingTopBar";
import SearchPanel from "@/components/SearchPanel";
import ServicesPanel from "@/components/ServicesPanel";
import MapControls from "@/components/MapControls";
import AiHintBar from "@/components/AiHintBar";
import MapAttribution from "@/components/MapAttribution";
import MobileTopBar from "@/components/MobileTopBar";
import MobileDrawerMenu from "@/components/MobileDrawerMenu";
import MobileHeroSection from "@/components/MobileHeroSection";
import MobileBottomActionBar from "@/components/MobileBottomActionBar";
import type { ServiceCategory } from "@/lib/overpass";

const ALL_CATEGORIES: ServiceCategory[] = ["hospital", "clinic", "bank", "atm", "school", "government"];
const DEFAULT_RADIUS_KM = 5;

// Mobile-only: pulling the services list up gradually shrinks the map
// instead of it sitting at a fixed height the whole time.
const MOBILE_MAP_MAX_VH = 45;
const MOBILE_MAP_MIN_VH = 20;
const MOBILE_MAP_COLLAPSE_RANGE_PX = 200;

const MapView = dynamic(() => import("@/components/MapView"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full w-full items-center justify-center gap-2 bg-[var(--surface-1)] text-[var(--text-4)]">
      <Loader2 className="h-4 w-4 animate-spin" />
      Loading map…
    </div>
  ),
});

type LoadState = "idle" | "locating" | "loading" | "error" | "ready";
type ErrorKey = "geolocationUnsupported" | "locationDenied" | "servicesLoadError";

export default function Home() {
  const t = useTranslations("dashboard");
  const tCommon = useTranslations("common");
  const tCategory = useTranslations("category");
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [radiusKm, setRadiusKm] = useState(DEFAULT_RADIUS_KM);
  const [services, setServices] = useState<ServiceCardProps[]>([]);
  const [state, setState] = useState<LoadState>("idle");
  const [errorKey, setErrorKey] = useState<ErrorKey | null>(null);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [retryToken, setRetryToken] = useState(0);
  const [activeCategories, setActiveCategories] = useState<Set<ServiceCategory>>(
    () => new Set(ALL_CATEGORIES)
  );
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [isMobileViewport, setIsMobileViewport] = useState(false);
  const [mobileMapShrink, setMobileMapShrink] = useState(0);
  const cardRefs = useRef(new Map<number, HTMLDivElement>());
  const mobileRowRef = useRef<HTMLDivElement | null>(null);
  const shrinkRafRef = useRef<number | null>(null);
  const mapHandleRef = useRef<MapViewHandle | null>(null);

  // Tracks the md breakpoint in JS only to decide whether the map's height
  // should be driven by scroll (mobile) or left to the md: Tailwind classes
  // (desktop) — an inline style would otherwise win over md:h-full regardless
  // of viewport, since inline styles always beat class-based rules.
  useEffect(() => {
    const query = window.matchMedia("(max-width: 767px)");
    const update = () => setIsMobileViewport(query.matches);
    update();
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);

  const handleMobileRowScroll = useCallback(() => {
    if (shrinkRafRef.current !== null) return;
    shrinkRafRef.current = requestAnimationFrame(() => {
      shrinkRafRef.current = null;
      const row = mobileRowRef.current;
      if (!row) return;
      const progress = Math.min(1, Math.max(0, row.scrollTop / MOBILE_MAP_COLLAPSE_RANGE_PX));
      setMobileMapShrink(progress);
    });
  }, []);

  useEffect(() => {
    return () => {
      if (shrinkRafRef.current !== null) cancelAnimationFrame(shrinkRafRef.current);
    };
  }, []);

  const mobileMapHeightVh = MOBILE_MAP_MAX_VH - mobileMapShrink * (MOBILE_MAP_MAX_VH - MOBILE_MAP_MIN_VH);

  const toggleCategory = useCallback((category: ServiceCategory) => {
    setActiveCategories((prev) => {
      const next = new Set(prev);
      if (next.has(category)) next.delete(category);
      else next.add(category);
      return next;
    });
  }, []);

  // Filters the list and the map pins together, so switching off a category
  // (or typing a search term, from the mobile bottom bar) hides it
  // everywhere consistently, not just in one place.
  const filteredServices = useMemo(() => {
    const byCategory = services.filter((service) => activeCategories.has(service.category));
    const query = searchQuery.trim().toLowerCase();
    if (!query) return byCategory;
    return byCategory.filter(
      (service) =>
        service.name.toLowerCase().includes(query) ||
        tCategory(service.category).toLowerCase().includes(query)
    );
  }, [services, activeCategories, searchQuery, tCategory]);

  // A single retry button covers both failure points (geolocation and the
  // services fetch) by bumping this token, which both effects depend on.
  const retry = useCallback(() => setRetryToken((token) => token + 1), []);

  useEffect(() => {
    if (!("geolocation" in navigator)) {
      setErrorKey("geolocationUnsupported");
      setState("error");
      return;
    }

    setState("locating");
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setCoords({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        });
      },
      () => {
        setErrorKey("locationDenied");
        setState("error");
      }
    );
  }, [retryToken]);

  useEffect(() => {
    if (!coords) return;

    const controller = new AbortController();
    setState("loading");
    setErrorKey(null);

    fetch(
      `/api/services?lat=${coords.lat}&lng=${coords.lng}&radius=${radiusKm}`,
      { signal: controller.signal }
    )
      .then((response) => {
        if (!response.ok) throw new Error("Request failed");
        return response.json();
      })
      .then((data: { services: ServiceCardProps[] }) => {
        setServices(data.services);
        setState("ready");
      })
      .catch((error) => {
        if (controller.signal.aborted) return;
        console.error(error);
        setErrorKey("servicesLoadError");
        setState("error");
      });

    return () => controller.abort();
  }, [coords, radiusKm, retryToken]);

  const handleSelect = useCallback((id: number) => {
    setSelectedId(id);
    cardRefs.current.get(id)?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, []);

  // Narrows the existing category filter to just what the voice assistant
  // understood — "unknown" leaves the current filter untouched rather than
  // hiding everything.
  const handleVoiceIntent = useCallback((category: string) => {
    if (!(ALL_CATEGORIES as string[]).includes(category)) return;
    setActiveCategories(new Set([category as ServiceCategory]));
  }, []);

  // From the desktop search panel — re-centers around a geocoded place
  // instead of the browser's own geolocation.
  const handleLocationFound = useCallback((next: { lat: number; lng: number }) => {
    setCoords(next);
  }, []);

  const categoryChips = state === "ready" && services.length > 0 && (
    <div className="flex flex-wrap gap-1.5 pb-1">
      {ALL_CATEGORIES.map((category) => {
        const CategoryIcon = CATEGORY_ICON[category];
        const isActive = activeCategories.has(category);
        return (
          <button
            key={category}
            type="button"
            onClick={() => toggleCategory(category)}
            className={`chip ${
              isActive
                ? "border-[#1D9E75] bg-[#1D9E75]/10 text-[#1D9E75]"
                : "border-[var(--border-subtle)] bg-transparent text-[var(--text-4)] hover:text-[var(--text-3)]"
            }`}
          >
            <CategoryIcon className="h-3 w-3" strokeWidth={1.75} />
            {tCategory(category)}
          </button>
        );
      })}
    </div>
  );

  const servicesListBody = (
    <>
      {state === "locating" && (
        <p className="flex items-center gap-2 px-1 text-xs text-[var(--text-4)]">
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
          {t("findingLocation")}
        </p>
      )}
      {state === "loading" && (
        <p className="flex items-center gap-2 px-1 text-xs text-[var(--text-4)]">
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
          {t("loadingServices")}
        </p>
      )}
      {state === "error" && errorKey && (
        <div className="flex flex-col items-start gap-2 px-1">
          <p className="flex items-center gap-2 text-xs text-red-400">
            <AlertCircle className="h-3.5 w-3.5" strokeWidth={1.75} />
            {t(errorKey)}
          </p>
          <button type="button" onClick={retry} className="btn-secondary">
            <RotateCw className="h-3.5 w-3.5" strokeWidth={1.75} />
            {t("retry")}
          </button>
        </div>
      )}
      {state === "ready" && services.length === 0 && (
        <p className="flex items-center gap-2 px-1 text-xs text-[var(--text-4)]">
          <Inbox className="h-3.5 w-3.5" strokeWidth={1.75} />
          {t("noServicesFound", { radius: radiusKm })}
        </p>
      )}
      {state === "ready" && services.length > 0 && filteredServices.length === 0 && (
        <p className="flex items-center gap-2 px-1 text-xs text-[var(--text-4)]">
          <Inbox className="h-3.5 w-3.5" strokeWidth={1.75} />
          {t("noServicesMatchFilter")}
        </p>
      )}

      {filteredServices.map((service) => (
        <ServiceCard
          key={service.id}
          {...service}
          isSelected={service.id === selectedId}
          onSelect={handleSelect}
          cardRef={(el) => {
            if (el) cardRefs.current.set(service.id, el);
            else cardRefs.current.delete(service.id);
          }}
        />
      ))}
    </>
  );

  // The AI hint bar mirrors the AI tip already shown on a card — the
  // selected one if there is one, otherwise the nearest result — rather
  // than inventing separate hint logic. Uses the batched English tip (not
  // the per-card live-streamed translation) to avoid lifting that
  // streaming state up from ServiceCard just for this.
  const hintService =
    filteredServices.find((service) => service.id === selectedId) ?? filteredServices[0];

  return (
    <div className="flex h-screen flex-col bg-[var(--surface-0)]">
      <MobileTopBar languageCoords={coords} onMenuClick={() => setIsDrawerOpen(true)} />
      <MobileDrawerMenu
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        ctaHref="/schemes"
        ctaLabel={tCommon("governmentSchemes")}
        ctaIcon={Landmark}
      />

      <MobileHeroSection />

      {/* Visible only on mobile, where the map's 45vh height would otherwise
          push these below the fold — desktop keeps the copy inside the panel. */}
      {categoryChips && (
        <div className="border-b border-[var(--border-subtle)] bg-[var(--surface-1)] px-4 py-1.5 md:hidden">{categoryChips}</div>
      )}

      <div
        ref={mobileRowRef}
        onScroll={handleMobileRowScroll}
        className="relative flex flex-1 flex-col overflow-y-auto md:overflow-hidden"
      >
        <div
          style={isMobileViewport ? { height: `${mobileMapHeightVh}vh` } : undefined}
          className="relative w-full shrink-0 md:absolute md:inset-0 md:h-full"
        >
          {coords ? (
            <MapView
              handleRef={mapHandleRef}
              userLocation={coords}
              services={filteredServices}
              selectedId={selectedId}
              onSelect={handleSelect}
            />
          ) : (
            <div className="flex h-full w-full flex-col items-center justify-center gap-2 bg-[var(--surface-1)] px-4 text-center text-[var(--text-4)]">
              {state === "error" && errorKey ? (
                <>
                  <AlertCircle className="h-5 w-5" strokeWidth={1.75} />
                  <p>{t(errorKey)}</p>
                  <button type="button" onClick={retry} className="btn-secondary">
                    <RotateCw className="h-3.5 w-3.5" strokeWidth={1.75} />
                    {t("retry")}
                  </button>
                </>
              ) : (
                <>
                  <Navigation className="h-5 w-5 animate-pulse" strokeWidth={1.75} />
                  <p>{t("findingLocation")}</p>
                </>
              )}
            </div>
          )}

          <MapAttribution />
          <MobileBottomActionBar
            voiceDomain="services"
            onVoiceIntent={handleVoiceIntent}
            onSearch={setSearchQuery}
          />

          <FloatingTopBar
            voiceDomain="services"
            onVoiceIntent={handleVoiceIntent}
            languageCoords={coords}
            ctaHref="/schemes"
            ctaLabel={tCommon("governmentSchemes")}
            ctaIcon={Landmark}
          />
          <SearchPanel radiusKm={radiusKm} onRadiusChange={setRadiusKm} onLocationFound={handleLocationFound} />
          <MapControls
            onZoomIn={() => mapHandleRef.current?.zoomIn()}
            onZoomOut={() => mapHandleRef.current?.zoomOut()}
            onRecenter={() => mapHandleRef.current?.recenter()}
          />
          {hintService?.aiTip && <AiHintBar name={hintService.name} tip={hintService.aiTip} />}
          <ServicesPanel
            title={t("nearbyServices")}
            countLabel={t("foundCount", { count: filteredServices.length })}
            chips={categoryChips}
          >
            {servicesListBody}
          </ServicesPanel>
        </div>

        <div className="flex w-full flex-1 flex-col gap-2 bg-[var(--surface-1)] p-3 md:hidden">
          <h2 className="px-1 text-xs font-semibold uppercase tracking-wide text-[var(--text-4)]">
            {t("nearbyServices")}
          </h2>
          {servicesListBody}
        </div>
      </div>
    </div>
  );
}
