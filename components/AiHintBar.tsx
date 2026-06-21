export interface AiHintBarProps {
  name: string;
  tip: string;
}

/** Desktop only — surfaces the selected (or nearest) service's existing AI
 * tip in the gap between the zoom controls and the services panel, rather
 * than inventing separate hint logic for what's already shown on the card. */
export default function AiHintBar({ name, tip }: AiHintBarProps) {
  return (
    <div className="absolute bottom-4 left-16 right-[308px] z-10 hidden md:block">
      <div className="flex items-center gap-2 rounded-[10px] border border-[var(--border-subtle)] bg-[var(--surface-1)]/90 px-3 py-2.5 backdrop-blur-xl">
        <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[#1D9E75]" />
        <p className="truncate text-[11px] leading-relaxed text-[var(--text-4)]">
          <strong className="font-medium text-[var(--text-3)]">{name}</strong> — {tip}
        </p>
      </div>
    </div>
  );
}
