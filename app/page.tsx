"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AlertCircle, Inbox, Landmark, Leaf, Loader2, Navigation, RotateCw } from "lucide-react";
import { useTranslations } from "next-intl";
import ServiceCard, { CATEGORY_ICON, type ServiceCardProps } from "@/components/ServiceCard";
import LanguagePicker from "@/components/LanguagePicker";
import VoiceAssistant from "@/components/VoiceAssistant";
import type { ServiceCategory } from "@/lib/overpass";

const ALL_CATEGORIES: ServiceCategory[] = ["hospital", "clinic", "bank", "atm", "school", "government"];

const MapView = dynamic(() => import("@/components/MapView"), {
  ssr: false,
  loading: () => (
    // Dynamic import's loading render has no access to hooks/context, so
    // this one placeholder stays English rather than wiring up next-intl
    // for a string shown for a few hundred ms at most.
    <div className="flex h-full w-full items-center justify-center gap-2 bg-primary-50 text-primary-700/60">
      <Loader2 className="h-4 w-4 animate-spin" />
      Loading map…
    </div>
  ),
});

const DEFAULT_RADIUS_KM = 5;

type LoadState = "idle" | "locating" | "loading" | "error" | "ready";
type ErrorKey = "geolocationUnsupported" | "locationDenied" | "servicesLoadError";

export default function Home() {
  const t = useTranslations("dashboard");
  const tCommon = useTranslations("common");
  const tCategory = useTranslations("category");
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [services, setServices] = useState<ServiceCardProps[]>([]);
  const [state, setState] = useState<LoadState>("idle");
  const [errorKey, setErrorKey] = useState<ErrorKey | null>(null);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [retryToken, setRetryToken] = useState(0);
  const [activeCategories, setActiveCategories] = useState<Set<ServiceCategory>>(
    () => new Set(ALL_CATEGORIES)
  );
  const cardRefs = useRef(new Map<number, HTMLDivElement>());

  const toggleCategory = useCallback((category: ServiceCategory) => {
    setActiveCategories((prev) => {
      const next = new Set(prev);
      if (next.has(category)) next.delete(category);
      else next.add(category);
      return next;
    });
  }, []);

  // Filters both the list and the map pins together, so switching off a
  // category hides it everywhere consistently, not just in one place.
  const filteredServices = useMemo(
    () => services.filter((service) => activeCategories.has(service.category)),
    [services, activeCategories]
  );

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
      `/api/services?lat=${coords.lat}&lng=${coords.lng}&radius=${DEFAULT_RADIUS_KM}`,
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
  }, [coords, retryToken]);

  const handleSelect = useCallback((id: number) => {
    setSelectedId(id);
    cardRefs.current.get(id)?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, []);

  // Narrows the existing category filter to just what the voice assistant
  // understood — "unknown" leaves the current filter untouched rather than
  // hiding everything.
  const handleVoiceIntent = useCallback((category: ServiceCategory | "unknown") => {
    if (category === "unknown") return;
    setActiveCategories(new Set([category]));
  }, []);

  return (
    <div className="flex h-screen flex-col">
      <header className="flex flex-wrap items-center gap-3 border-b border-primary-100 bg-white px-4 py-3 sm:px-6 sm:py-4">
        <div className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-white">
            <Leaf className="h-4.5 w-4.5" strokeWidth={2} />
          </span>
          <h1 className="text-lg font-semibold text-foreground">{tCommon("appName")}</h1>
        </div>

        <div className="ml-auto flex items-center gap-3">
          <Link
            href="/schemes"
            className="flex items-center gap-1.5 text-sm font-medium text-primary-700 hover:underline"
          >
            <Landmark className="h-4 w-4" strokeWidth={1.75} />
            <span className="hidden sm:inline">{tCommon("governmentSchemes")}</span>
            <span className="sm:hidden">{tCommon("schemes")}</span>
          </Link>

          <VoiceAssistant onIntent={handleVoiceIntent} />

          <LanguagePicker coords={coords} />
        </div>
      </header>

      <div className="flex flex-1 flex-col overflow-hidden md:flex-row">
        <div className="relative h-[45vh] w-full shrink-0 md:h-full md:flex-1">
          {coords ? (
            <MapView
              userLocation={coords}
              services={filteredServices}
              selectedId={selectedId}
              onSelect={handleSelect}
            />
          ) : (
            <div className="flex h-full w-full flex-col items-center justify-center gap-2 bg-primary-50 px-4 text-center text-primary-700/60">
              {state === "error" && errorKey ? (
                <>
                  <AlertCircle className="h-5 w-5" strokeWidth={1.75} />
                  <p>{t(errorKey)}</p>
                  <button
                    type="button"
                    onClick={retry}
                    className="flex items-center gap-1.5 rounded-md border border-primary-200 bg-white px-3 py-1.5 text-sm font-medium text-primary-700 hover:bg-primary-50"
                  >
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
        </div>

        <aside className="flex w-full flex-1 flex-col gap-3 overflow-y-auto border-t border-primary-100 bg-gray-50 p-4 md:max-w-sm md:flex-none md:border-l md:border-t-0">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-foreground/60">
            {t("nearbyServices")}
          </h2>

          {state === "locating" && (
            <p className="flex items-center gap-2 text-sm text-foreground/60">
              <Loader2 className="h-4 w-4 animate-spin" />
              {t("findingLocation")}
            </p>
          )}
          {state === "loading" && (
            <p className="flex items-center gap-2 text-sm text-foreground/60">
              <Loader2 className="h-4 w-4 animate-spin" />
              {t("loadingServices")}
            </p>
          )}
          {state === "error" && errorKey && (
            <div className="flex flex-col items-start gap-2">
              <p className="flex items-center gap-2 text-sm text-red-600">
                <AlertCircle className="h-4 w-4" strokeWidth={1.75} />
                {t(errorKey)}
              </p>
              <button
                type="button"
                onClick={retry}
                className="flex items-center gap-1.5 rounded-md border border-primary-200 bg-white px-3 py-1.5 text-sm font-medium text-primary-700 hover:bg-primary-50"
              >
                <RotateCw className="h-3.5 w-3.5" strokeWidth={1.75} />
                {t("retry")}
              </button>
            </div>
          )}
          {state === "ready" && services.length > 0 && (
            <div className="flex flex-wrap gap-1.5 pb-1">
              {ALL_CATEGORIES.map((category) => {
                const CategoryIcon = CATEGORY_ICON[category];
                const isActive = activeCategories.has(category);
                return (
                  <button
                    key={category}
                    type="button"
                    onClick={() => toggleCategory(category)}
                    className={`flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-medium transition ${
                      isActive
                        ? "border-primary bg-primary-50 text-primary-700"
                        : "border-gray-200 bg-white text-foreground/40"
                    }`}
                  >
                    <CategoryIcon className="h-3 w-3" strokeWidth={1.75} />
                    {tCategory(category)}
                  </button>
                );
              })}
            </div>
          )}

          {state === "ready" && services.length === 0 && (
            <p className="flex items-center gap-2 text-sm text-foreground/60">
              <Inbox className="h-4 w-4" strokeWidth={1.75} />
              {t("noServicesFound", { radius: DEFAULT_RADIUS_KM })}
            </p>
          )}
          {state === "ready" && services.length > 0 && filteredServices.length === 0 && (
            <p className="flex items-center gap-2 text-sm text-foreground/60">
              <Inbox className="h-4 w-4" strokeWidth={1.75} />
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
        </aside>
      </div>
    </div>
  );
}
