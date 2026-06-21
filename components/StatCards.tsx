export interface StatCardsProps {
  totalLabel: string;
  total: number;
  eligibleLabel: string;
  eligible: number;
}

export default function StatCards({ totalLabel, total, eligibleLabel, eligible }: StatCardsProps) {
  return (
    <div className="grid grid-cols-2 gap-1.5">
      <div className="rounded-[10px] border border-[var(--border-subtle)] bg-[var(--surface-1)]/95 px-3 py-2.5">
        <div className="text-lg font-medium leading-none text-[var(--text-1)]">{total}</div>
        <div className="mt-1.5 text-[10px] text-[var(--text-4)]">{totalLabel}</div>
      </div>
      <div className="rounded-[10px] border border-[var(--border-subtle)] bg-[var(--surface-1)]/95 px-3 py-2.5">
        <div className="text-lg font-medium leading-none text-[#1D9E75]">{eligible}</div>
        <div className="mt-1.5 text-[10px] text-[var(--text-4)]">{eligibleLabel}</div>
      </div>
    </div>
  );
}
