"use client";

import { createElement, useEffect, useRef } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { useTranslations } from "next-intl";
import { CATEGORY_COLOR, CATEGORY_ICON, type ServiceCardProps } from "@/components/ServiceCard";

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_API_KEY;

export interface MapViewProps {
  userLocation: { lat: number; lng: number };
  services: ServiceCardProps[];
  selectedId: number | null;
  onSelect: (id: number) => void;
}

/**
 * Mapbox positions a marker by setting `transform` on the element passed to
 * `new Marker({ element })`. Scaling/outlining that same element for the
 * "selected" state would fight Mapbox's own transform, so visual styling
 * lives on an inner `dot` div instead, leaving the wrapper untouched.
 */
function createMarkerElement(
  color: string,
  Icon: (typeof CATEGORY_ICON)[keyof typeof CATEGORY_ICON]
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
  dot.style.border = "2px solid white";
  dot.style.boxShadow = "0 1px 3px rgba(0,0,0,0.3)";
  dot.style.transition = "transform 150ms ease, outline 150ms ease";
  dot.innerHTML = renderToStaticMarkup(
    createElement(Icon, { color: "white", size: 14, strokeWidth: 2.25 })
  );

  wrapper.appendChild(dot);
  return { wrapper, dot };
}

export default function MapView({ userLocation, services, selectedId, onSelect }: MapViewProps) {
  const t = useTranslations("mapView");
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef<Map<number, mapboxgl.Marker>>(new Map());
  const dotsRef = useRef<Map<number, HTMLDivElement>>(new Map());

  useEffect(() => {
    if (!MAPBOX_TOKEN || !containerRef.current || mapRef.current) return;

    mapboxgl.accessToken = MAPBOX_TOKEN;
    const map = new mapboxgl.Map({
      container: containerRef.current,
      style: "mapbox://styles/mapbox/streets-v12",
      center: [userLocation.lng, userLocation.lat],
      zoom: 14,
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

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    markersRef.current.forEach((marker) => marker.remove());
    markersRef.current.clear();
    dotsRef.current.clear();

    for (const service of services) {
      const { wrapper, dot } = createMarkerElement(
        CATEGORY_COLOR[service.category],
        CATEGORY_ICON[service.category]
      );
      wrapper.addEventListener("click", () => onSelect(service.id));

      const marker = new mapboxgl.Marker({ element: wrapper })
        .setLngLat([service.lng, service.lat])
        .setPopup(new mapboxgl.Popup({ offset: 12 }).setText(service.name))
        .addTo(map);

      markersRef.current.set(service.id, marker);
      dotsRef.current.set(service.id, dot);
    }
  }, [services, onSelect]);

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
      <div className="flex h-full w-full items-center justify-center bg-primary-50 text-primary-700/60">
        {t("unavailable")}: missing NEXT_PUBLIC_MAPBOX_API_KEY
      </div>
    );
  }

  return <div ref={containerRef} className="h-full w-full" />;
}
