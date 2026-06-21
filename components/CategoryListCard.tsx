import Link from "next/link";
import { SCHEME_CATEGORIES } from "@/lib/schemes";
import { DEFAULT_SCHEME_STYLE, SCHEME_CATEGORY_STYLE } from "@/components/SchemeCard";

export interface CategoryListCardProps {
  state: string;
  occupation: string;
  activeCategory: string;
  categoryCounts: Record<string, number>;
  heading: string;
}

export default function CategoryListCard({
  state,
  occupation,
  activeCategory,
  categoryCounts,
  heading,
}: CategoryListCardProps) {
  return (
    <div className="rounded-[14px] border border-[var(--border-subtle)] bg-[var(--surface-1)]/95 p-3.5">
      <div className="mb-2.5 text-[11px] font-medium uppercase tracking-wide text-[var(--text-4)]">{heading}</div>
      <div className="flex flex-col gap-0.5">
        {SCHEME_CATEGORIES.map((category) => {
          const isActive = category === activeCategory;
          const style = SCHEME_CATEGORY_STYLE[category] ?? DEFAULT_SCHEME_STYLE;
          const count = categoryCounts[category] ?? 0;
          return (
            <Link
              key={category}
              href={`/schemes?state=${encodeURIComponent(state)}&category=${encodeURIComponent(category)}&occupation=${encodeURIComponent(occupation)}&page=0`}
              className={`flex items-center gap-2 rounded-lg px-2 py-[7px] text-xs transition ${
                isActive ? "bg-[#1D9E75]/10" : "hover:bg-[var(--hover-overlay)]"
              }`}
            >
              <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: style.fg }} />
              <span className={`flex-1 truncate ${isActive ? "text-[#1D9E75]" : "text-[var(--text-4)]"}`}>{category}</span>
              <span
                className={`shrink-0 rounded-full px-1.5 py-0.5 text-[10px] ${
                  isActive ? "bg-[#1D9E75]/10 text-[#1D9E75]" : "bg-[var(--surface-3)] text-[var(--text-4)]"
                }`}
              >
                {count}
              </span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
