"use client";

import { LocateFixed, Minus, Plus } from "lucide-react";
import { useTranslations } from "next-intl";

export interface MapControlsProps {
  onZoomIn: () => void;
  onZoomOut: () => void;
  onRecenter: () => void;
}

/** Desktop only — replaces Mapbox's default zoom/geolocate UI, which is
 * disabled in MapView so these custom buttons match the floating-panel look. */
export default function MapControls({ onZoomIn, onZoomOut, onRecenter }: MapControlsProps) {
  const t = useTranslations("mapView");

  return (
    <div className="absolute bottom-4 left-4 z-10 hidden flex-col gap-1.5 md:flex">
      <div className="overflow-hidden rounded-[10px] border border-[var(--border-subtle)] bg-[var(--surface-1)]/90 backdrop-blur-xl">
        <button
          type="button"
          onClick={onZoomIn}
          aria-label={t("zoomIn")}
          className="flex h-9 w-9 items-center justify-center text-[var(--text-4)] transition hover:bg-[var(--surface-3)] hover:text-[var(--text-3)]"
        >
          <Plus className="h-4 w-4" strokeWidth={1.75} />
        </button>
        <div className="h-px bg-[var(--border-subtle)]" />
        <button
          type="button"
          onClick={onZoomOut}
          aria-label={t("zoomOut")}
          className="flex h-9 w-9 items-center justify-center text-[var(--text-4)] transition hover:bg-[var(--surface-3)] hover:text-[var(--text-3)]"
        >
          <Minus className="h-4 w-4" strokeWidth={1.75} />
        </button>
      </div>
      <button
        type="button"
        onClick={onRecenter}
        aria-label={t("myLocation")}
        className="flex h-9 w-9 items-center justify-center rounded-[10px] border border-[var(--border-subtle)] bg-[var(--surface-1)]/90 text-[#1D9E75] backdrop-blur-xl transition hover:bg-[var(--surface-3)]"
      >
        <LocateFixed className="h-4 w-4" strokeWidth={1.75} />
      </button>
    </div>
  );
}
