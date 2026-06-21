import { SlidersHorizontal } from "lucide-react";
import { INDIAN_STATES, SCHEME_CATEGORIES } from "@/lib/schemes";

export interface FilterCardProps {
  state: string;
  category: string;
  occupation: string;
  occupations: string[];
  stateLabel: string;
  categoryLabel: string;
  occupationLabel: string;
  allLabel: string;
  filterLabel: string;
  filtersHeading: string;
}

export default function FilterCard({
  state,
  category,
  occupation,
  occupations,
  stateLabel,
  categoryLabel,
  occupationLabel,
  allLabel,
  filterLabel,
  filtersHeading,
}: FilterCardProps) {
  return (
    <form method="GET" className="rounded-[14px] border border-[var(--border-subtle)] bg-[var(--surface-1)]/95 p-3.5">
      <div className="mb-3 text-[11px] font-medium uppercase tracking-wide text-[var(--text-4)]">{filtersHeading}</div>

      <label className="mb-2.5 block">
        <div className="mb-1 text-[11px] text-[var(--text-4)]">{stateLabel}</div>
        <select name="state" key={state} defaultValue={state} className="input-field w-full text-xs">
          {INDIAN_STATES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </label>

      <label className="mb-2.5 block">
        <div className="mb-1 text-[11px] text-[var(--text-4)]">{categoryLabel}</div>
        <select name="category" key={category} defaultValue={category} className="input-field w-full text-xs">
          {SCHEME_CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </label>

      <label className="mb-3 block">
        <div className="mb-1 text-[11px] text-[var(--text-4)]">{occupationLabel}</div>
        <select name="occupation" key={occupation} defaultValue={occupation} className="input-field w-full text-xs">
          <option value="">{allLabel}</option>
          {occupations.map((o) => (
            <option key={o} value={o}>
              {o}
            </option>
          ))}
        </select>
      </label>

      <input type="hidden" name="page" value="0" />
      <button type="submit" className="btn-primary w-full">
        <SlidersHorizontal className="h-3.5 w-3.5" strokeWidth={2} />
        {filterLabel}
      </button>
    </form>
  );
}
