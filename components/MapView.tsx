"use client";

import { createElement, useEffect, useRef, useState, type MutableRefObject } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { useTheme } from "next-themes";
import { useTranslations } from "next-intl";
import { CATEGORY_COLOR, CATEGORY_ICON, type ServiceCardProps } from "@/components/ServiceCard";

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_API_KEY;
const MAP_STYLE_DARK = "mapbox://styles/mapbox/dark-v11";
const MAP_STYLE_LIGHT = "mapbox://styles/mapbox/light-v11";
const MARKER_BORDER_DARK = "#0A0A0A";
const MARKER_BORDER_LIGHT = "#FFFFFF";

export interface MapViewHandle {
  zoomIn: () => void;
  zoomOut: () => void;
  recenter: () => void;
}

export interface MapViewProps {
  userLocation: { lat: number; lng: number };
  services: ServiceCardProps[];
  selectedId: number | null;
  onSelect: (id: number) => void;
  /**
   * A plain prop, not the special JSX `ref` attribute — `next/dynamic`'s
   * LoadableComponent wrapper (see app/page.tsx) is a plain function
   * component, not wrapped in `forwardRef`, so React silently drops a real
   * `ref` passed through it (no warning in production builds, the handle
   * just stays null forever). Passing it as a named prop sidesteps that
   * limitation entirely, since ordinary props pass through untouched.
   */
  handleRef: MutableRefObject<MapViewHandle | null>;
}

/**
 * Mapbox positions a marker by setting `transform` on the element passed to
 * `new Marker({ element })`. Scaling/outlining that same element for the
 * "selected" state would fight Mapbox's own transform, so visual styling
 * lives on an inner `dot` div instead, leaving the wrapper untouched.
 */
function createMarkerElement(
  color: string,
  Icon: (typeof CATEGORY_ICON)[keyof typeof CATEGORY_ICON],
  borderColor: string
): { wrapper: HTMLDivElement; dot: HTMLDivElement } {
  const wrapper = document.createElement("div");
  wrapper.style.cursor = "pointer";

  const dot = document.createElement("div");
  dot.style.width = "26px";
  dot.style.height = "26px";
  dot.style.display = "flex";
  dot.style.alignItems = "center";
  dot.style.justifyContent = "center";
  dot.style.borderRadius = "50%";
  dot.style.background = color;
  dot.style.border = `2px solid ${borderColor}`;
  dot.style.boxShadow = "0 1px 4px rgba(0,0,0,0.5)";
  dot.style.transition = "transform 150ms ease, outline 150ms ease";
  dot.innerHTML = renderToStaticMarkup(
    createElement(Icon, { color: "white", size: 14, strokeWidth: 2.25 })
  );

  wrapper.appendChild(dot);
  return { wrapper, dot };
}

export default function MapView({ userLocation, services, selectedId, onSelect, handleRef }: MapViewProps) {
  const t = useTranslations("mapView");
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  // Defaults to dark until mounted (theme isn't knowable on the server) —
  // matches what every page already rendered before this toggle did anything.
  const isLight = mounted && resolvedTheme === "light";

  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef<Map<number, mapboxgl.Marker>>(new Map());
  const dotsRef = useRef<Map<number, HTMLDivElement>>(new Map());

  useEffect(() => {
    handleRef.current = {
      zoomIn: () => mapRef.current?.zoomIn(),
      zoomOut: () => mapRef.current?.zoomOut(),
      recenter: () =>
        mapRef.current?.flyTo({
          center: [userLocation.lng, userLocation.lat],
          zoom: 14,
          essential: true,
        }),
    };
    return () => {
      handleRef.current = null;
    };
  }, [handleRef, userLocation]);

  useEffect(() => {
    if (!MAPBOX_TOKEN || !containerRef.current || mapRef.current) return;

    mapboxgl.accessToken = MAPBOX_TOKEN;
    const map = new mapboxgl.Map({
      container: containerRef.current,
      style: isLight ? MAP_STYLE_LIGHT : MAP_STYLE_DARK,
      center: [userLocation.lng, userLocation.lat],
      zoom: 14,
      // Required attribution stays — just rendered as our own floating bar
      // (see app/page.tsx) instead of Mapbox's default control styling.
      attributionControl: false,
    });
    mapRef.current = map;

    // The popup text is set once at mount, not reactive to later language
    // changes — rebuilding the whole map instance just to refresh a popup
    // that's only visible if the user clicks their own location pin isn't
    // worth the jarring full-map flicker that would cause.
    new mapboxgl.Marker({ color: "#1D9E75" })
      .setLngLat([userLocation.lng, userLocation.lat])
      .setPopup(new mapboxgl.Popup().setText(t("youAreHere")))
      .addTo(map);

    return () => {
      map.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // The map-creation effect above only runs once, before `mounted` flips
  // true — so the map always starts on the dark style and this effect
  // corrects it once the real resolved theme is known, and again any time
  // the user toggles it afterwards. Mapbox keeps HTML markers across
  // setStyle calls, so existing service/location pins aren't affected.
  useEffect(() => {
    mapRef.current?.setStyle(isLight ? MAP_STYLE_LIGHT : MAP_STYLE_DARK);
  }, [isLight]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    markersRef.current.forEach((marker) => marker.remove());
    markersRef.current.clear();
    dotsRef.current.clear();

    const borderColor = isLight ? MARKER_BORDER_LIGHT : MARKER_BORDER_DARK;
    for (const service of services) {
      const { wrapper, dot } = createMarkerElement(
        CATEGORY_COLOR[service.category],
        CATEGORY_ICON[service.category],
        borderColor
      );
      wrapper.addEventListener("click", () => onSelect(service.id));

      const marker = new mapboxgl.Marker({ element: wrapper })
        .setLngLat([service.lng, service.lat])
        .setPopup(new mapboxgl.Popup({ offset: 12 }).setText(service.name))
        .addTo(map);

      markersRef.current.set(service.id, marker);
      dotsRef.current.set(service.id, dot);
    }
  }, [services, onSelect, isLight]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    dotsRef.current.forEach((dot, id) => {
      dot.style.outline = id === selectedId ? "2px solid #1D9E75" : "none";
      dot.style.transform = id === selectedId ? "scale(1.4)" : "scale(1)";
    });

    if (selectedId === null) return;
    const selected = services.find((service) => service.id === selectedId);
    if (selected) {
      map.flyTo({ center: [selected.lng, selected.lat], zoom: 16, essential: true });
    }
  }, [selectedId, services]);

  if (!MAPBOX_TOKEN) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-[var(--surface-1)] text-[var(--text-4)]">
        {t("unavailable")}: missing NEXT_PUBLIC_MAPBOX_API_KEY
      </div>
    );
  }

  return <div ref={containerRef} className="h-full w-full" />;
}
