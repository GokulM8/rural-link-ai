"use client";

import { useEffect, useRef, useState } from "react";
import {
  Building2,
  ChevronDown,
  ChevronUp,
  Clock,
  CreditCard,
  ExternalLink,
  GraduationCap,
  Hospital,
  Landmark,
  MapPin,
  Phone,
  Sparkles,
  Stethoscope,
  type LucideIcon,
} from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import type { ServiceCategory } from "@/lib/overpass";

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_API_KEY;

export interface ServiceCardProps {
  id: number;
  name: string;
  category: ServiceCategory;
  lat: number;
  lng: number;
  distanceKm: number;
  isOpen: boolean | null;
  address?: string;
  phone?: string;
  openingHours?: string;
  aiTip?: string;
  /** Only ever set when the AI lookup had "high" confidence — see lib/facilityLookup.ts. */
  aiPhone?: string;
  /** Static per-category fact (e.g. "108 ambulance") shown when no real phone exists. */
  helpline?: string;
  /** Static per-category estimate (e.g. "typically 9AM-4PM") shown when no real hours exist. */
  typicalHours?: string;
  /** A different, real nearby place of the same type — never substituted as if it were this one. */
  nearestAlternative?: { name: string; phone: string };
}

interface ServiceCardComponentProps extends ServiceCardProps {
  isSelected?: boolean;
  onSelect?: (id: number) => void;
  cardRef?: (el: HTMLDivElement | null) => void;
}

export const CATEGORY_ICON: Record<ServiceCategory, LucideIcon> = {
  hospital: Hospital,
  clinic: Stethoscope,
  bank: Landmark,
  atm: CreditCard,
  school: GraduationCap,
  government: Building2,
};

export const CATEGORY_COLOR: Record<ServiceCategory, string> = {
  hospital: "#EF4444",
  clinic: "#F59E0B",
  bank: "#3B82F6",
  atm: "#6366F1",
  school: "#A855F7",
  government: "#6B7280",
};

export default function ServiceCard({
  id,
  name,
  category,
  lat,
  lng,
  distanceKm,
  isOpen,
  address,
  phone,
  openingHours,
  aiTip,
  aiPhone,
  helpline,
  typicalHours,
  nearestAlternative,
  isSelected,
  onSelect,
  cardRef,
}: ServiceCardComponentProps) {
  const t = useTranslations();
  const locale = useLocale();
  const rootRef = useRef<HTMLDivElement | null>(null);
  const [hasEnteredView, setHasEnteredView] = useState(false);
  const [liveTip, setLiveTip] = useState("");
  const [streamFailed, setStreamFailed] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  // Only start streaming once the card actually scrolls into view — with
  // hundreds of cards possible per page, streaming on mount for all of them
  // would fire hundreds of concurrent Gemini requests at once.
  useEffect(() => {
    const el = rootRef.current;
    if (!el || hasEnteredView) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) setHasEnteredView(true);
      },
      { rootMargin: "100px" }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [hasEnteredView]);

  useEffect(() => {
    if (!hasEnteredView) return;

    const controller = new AbortController();
    setLiveTip("");
    setStreamFailed(false);

    (async () => {
      try {
        const params = new URLSearchParams({ name, type: category, language: locale });
        if (address) params.set("location", address);
        if (isOpen !== null) params.set("isOpen", String(isOpen));

        const response = await fetch(`/api/ai?${params.toString()}`, {
          signal: controller.signal,
        });
        if (!response.ok || !response.body) throw new Error(`stream request failed`);

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let text = "";
        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          text += decoder.decode(value, { stream: true });
          setLiveTip(text);
        }

        // The route closes the stream with an empty body (rather than an
        // HTTP error) when the model call fails server-side, so an empty
        // result here is also a failure, not a successful empty tip.
        if (!text) throw new Error("stream returned no content");
      } catch (error) {
        if (!controller.signal.aborted) {
          console.error("AI tip stream failed", error);
          setStreamFailed(true);
        }
      }
    })();

    return () => controller.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasEnteredView, id, name, category, address, isOpen, locale]);

  // aiTip is always English (batched server-side generation), so it's only a
  // safe fallback when English is selected — showing it for other languages
  // would silently look like a translation that was never actually produced.
  const englishFallback = locale === "en" ? aiTip : undefined;
  const displayedTip = liveTip || englishFallback;
  const isGenerating = !displayedTip && !streamFailed;
  const CategoryIcon = CATEGORY_ICON[category];

  const distanceLabel =
    distanceKm < 1
      ? t("distance.meters", { value: Math.round(distanceKm * 1000) })
      : t("distance.kilometers", { value: distanceKm.toFixed(1) });

  // Google's own Maps product has far richer business data (phone, hours,
  // reviews) than we can get from OSM or any places API we tried — linking
  // out is more reliable than trying to source/display that data ourselves.
  //
  // The lat/lng MUST go in the /@lat,lng,zoom URL segment, not jammed into
  // the free-text query — Google's text search treats embedded coordinates
  // as noise rather than a location bias, so it can match a same-named
  // place far away instead of the actual one (confirmed: "Sita Hospital
  // 17.12,81.29" matched an unrelated "Sita Sri Hospital" ~78km away).
  const mapsSearchText = address ? `${name}, ${address}` : name;
  const mapsUrl = `https://www.google.com/maps/search/${encodeURIComponent(mapsSearchText)}/@${lat},${lng},17z`;

  // Static preview image only loads once expanded — with hundreds of cards
  // possible per page, loading a map image for every card up front would be
  // hundreds of wasted Mapbox requests for cards no one ever looks at twice.
  const staticMapUrl = MAPBOX_TOKEN
    ? `https://api.mapbox.com/styles/v1/mapbox/streets-v12/static/pin-s+1D9E75(${lng},${lat})/${lng},${lat},15,0/600x300@2x?access_token=${MAPBOX_TOKEN}`
    : null;

  return (
    <div
      ref={(el) => {
        rootRef.current = el;
        cardRef?.(el);
      }}
      onClick={() => onSelect?.(id)}
      className={`flex flex-col gap-3 rounded-xl border bg-white p-4 shadow-sm transition hover:shadow-md ${
        onSelect ? "cursor-pointer" : ""
      } ${isSelected ? "border-primary ring-2 ring-primary/40" : "border-primary-100"}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary-50 text-primary-700">
            <CategoryIcon className="h-5 w-5" strokeWidth={1.75} />
          </span>
          <div className="min-w-0">
            <p className="truncate font-semibold text-foreground">{name}</p>
            <p className="text-sm text-primary-700">{t(`category.${category}`)}</p>
          </div>
        </div>
        <span className="whitespace-nowrap text-sm font-medium text-foreground/70">
          {distanceLabel}
        </span>
      </div>

      <div className="flex items-center gap-2">
        {isOpen === null ? (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-500">
            <Clock className="h-3 w-3" strokeWidth={2} />
            {t("status.hoursUnknown")}
          </span>
        ) : isOpen ? (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-primary-50 px-2.5 py-1 text-xs font-medium text-primary-700">
            <span className="h-1.5 w-1.5 rounded-full bg-primary-500" />
            {t("status.openNow")}
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-red-50 px-2.5 py-1 text-xs font-medium text-red-600">
            <span className="h-1.5 w-1.5 rounded-full bg-red-500" />
            {t("status.closed")}
          </span>
        )}
      </div>

      <div className="flex items-start gap-1.5 whitespace-pre-line rounded-lg border border-dashed border-primary-200 bg-primary-50/40 p-2 text-xs text-foreground/60">
        <Sparkles
          className={`mt-0.5 h-3.5 w-3.5 shrink-0 text-primary-500 ${isGenerating ? "animate-pulse" : ""}`}
          strokeWidth={1.75}
        />
        <span>{displayedTip ?? (streamFailed ? t("aiTip.comingSoon") : t("aiTip.generating"))}</span>
      </div>

      <button
        type="button"
        onClick={(event) => {
          event.stopPropagation();
          setIsExpanded((prev) => !prev);
        }}
        className="flex items-center justify-center gap-1 text-xs font-medium text-primary-700 hover:underline"
      >
        {isExpanded ? (
          <>
            {t("actions.hideDetails")}
            <ChevronUp className="h-3.5 w-3.5" strokeWidth={1.75} />
          </>
        ) : (
          <>
            {t("actions.showDetails")}
            <ChevronDown className="h-3.5 w-3.5" strokeWidth={1.75} />
          </>
        )}
      </button>

      {isExpanded && (
        <div className="flex flex-col gap-3 border-t border-primary-100 pt-3">
          {staticMapUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={staticMapUrl}
              alt={name}
              className="h-32 w-full rounded-lg object-cover"
              loading="lazy"
            />
          )}

          {address && (
            <p className="flex items-start gap-1.5 text-sm text-foreground/60">
              <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0" strokeWidth={1.75} />
              <span>{address}</span>
            </p>
          )}

          {phone || aiPhone ? (
            <div className="flex flex-col gap-0.5">
              <a
                href={`tel:${phone ?? aiPhone}`}
                onClick={(event) => event.stopPropagation()}
                aria-label={t("actions.call")}
                className="flex items-center gap-1.5 text-sm text-primary-700 hover:underline"
              >
                <Phone className="h-3.5 w-3.5 shrink-0" strokeWidth={1.75} />
                <span>{phone ?? aiPhone}</span>
              </a>
              {!phone && aiPhone && (
                <span className="pl-5 text-xs text-foreground/40">{t("actions.aiSuggested")}</span>
              )}
            </div>
          ) : helpline ? (
            <p className="flex items-start gap-1.5 text-sm text-foreground/60">
              <Phone className="mt-0.5 h-3.5 w-3.5 shrink-0" strokeWidth={1.75} />
              <span>{t("status.helpline", { number: helpline })}</span>
            </p>
          ) : null}

          {nearestAlternative && (
            <p className="flex items-start gap-1.5 text-sm text-foreground/60">
              <Phone className="mt-0.5 h-3.5 w-3.5 shrink-0" strokeWidth={1.75} />
              <span>
                {t("status.nearestAlternative", {
                  name: nearestAlternative.name,
                  phone: nearestAlternative.phone,
                })}
              </span>
            </p>
          )}

          {openingHours ? (
            <p className="flex items-start gap-1.5 text-xs text-foreground/60">
              <Clock className="mt-0.5 h-3.5 w-3.5 shrink-0" strokeWidth={1.75} />
              <span>{t("status.schedule", { hours: openingHours })}</span>
            </p>
          ) : typicalHours ? (
            <p className="flex items-start gap-1.5 text-xs text-foreground/60">
              <Clock className="mt-0.5 h-3.5 w-3.5 shrink-0" strokeWidth={1.75} />
              <span>{t("status.typicalHours", { hours: typicalHours })}</span>
            </p>
          ) : null}

          <a
            href={mapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(event) => event.stopPropagation()}
            className="flex items-center gap-1.5 text-sm text-primary-700 hover:underline"
          >
            <ExternalLink className="h-3.5 w-3.5 shrink-0" strokeWidth={1.75} />
            <span>{t("actions.viewOnMaps")}</span>
          </a>
        </div>
      )}
    </div>
  );
}
