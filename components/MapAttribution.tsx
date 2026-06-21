/** Mapbox's default attribution UI is disabled in MapView so it can match
 * the floating-panel look — the required notices/links still have to stay
 * present per Mapbox's terms, just styled as our own compact bar. */
export default function MapAttribution() {
  return (
    <div className="absolute inset-x-0 bottom-0 z-10 flex items-center gap-1.5 bg-black/60 px-2 py-[3px] text-[10px] text-[#444]">
      <a
        href="https://www.mapbox.com/about/maps/"
        target="_blank"
        rel="noopener noreferrer"
        className="hover:text-[#888] hover:underline"
      >
        © Mapbox
      </a>
      <a
        href="https://www.openstreetmap.org/copyright"
        target="_blank"
        rel="noopener noreferrer"
        className="hover:text-[#888] hover:underline"
      >
        © OpenStreetMap
      </a>
    </div>
  );
}
