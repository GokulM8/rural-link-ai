import type { ReactNode } from "react";

export interface ResultsPanelProps {
  title: string;
  metaLabel: string;
  description: ReactNode;
  children: ReactNode;
}

export default function ResultsPanel({ title, metaLabel, description, children }: ResultsPanelProps) {
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex items-center justify-between gap-3 rounded-t-[14px] border border-b-0 border-[var(--border-subtle)] bg-[var(--surface-1)]/95 px-3.5 py-3">
        <div className="min-w-0">
          <div className="text-[13px] font-medium text-[var(--text-1)]">{title}</div>
          <div className="mt-0.5 truncate text-[11px] text-[var(--text-4)]">{description}</div>
        </div>
        <div className="shrink-0 text-[11px] text-[var(--text-4)]">{metaLabel}</div>
      </div>
      <div className="flex-1 overflow-y-auto rounded-b-[14px] border border-t-0 border-[var(--border-subtle)] bg-[var(--surface-1)]/95 p-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <div className="flex flex-col gap-2">{children}</div>
      </div>
    </div>
  );
}
