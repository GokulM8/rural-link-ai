import type { ReactNode } from "react";

export interface ServicesPanelProps {
  title: string;
  countLabel: string;
  chips: ReactNode;
  children: ReactNode;
}

/** Desktop only — mobile keeps the services list in the normal scroll flow. */
export default function ServicesPanel({ title, countLabel, chips, children }: ServicesPanelProps) {
  return (
    <div className="absolute bottom-4 right-4 top-20 z-10 hidden w-[280px] flex-col md:flex">
      <div className="rounded-t-[14px] border border-b-0 border-[var(--border-subtle)] bg-[var(--surface-1)]/95 p-3.5 pb-2.5 backdrop-blur-xl">
        <div className="mb-2.5 flex items-center justify-between">
          <span className="text-[13px] font-medium text-[var(--text-1)]">{title}</span>
          <span className="rounded-full border border-[var(--border-subtle)] bg-[var(--surface-3)] px-2 py-0.5 text-[11px] text-[var(--text-4)]">
            {countLabel}
          </span>
        </div>
        <div className="flex gap-1.5 overflow-x-auto pb-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {chips}
        </div>
      </div>
      <div className="flex-1 overflow-y-auto rounded-b-[14px] border border-t-0 border-[var(--border-subtle)] bg-[var(--surface-1)]/95 p-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <div className="flex flex-col gap-1.5">{children}</div>
      </div>
    </div>
  );
}
