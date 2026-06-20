"use client";

import Link from "next/link";
import { ArrowLeft, ChevronLeft, ChevronRight, Inbox, Landmark, SlidersHorizontal } from "lucide-react";
import { useTranslations } from "next-intl";
import { INDIAN_STATES, SCHEME_CATEGORIES, type Scheme } from "@/lib/schemes";
import SchemeCard from "@/components/SchemeCard";

export interface SchemesPageViewProps {
  state: string;
  category: string;
  page: number;
  totalPages: number;
  schemes: Scheme[];
  verdicts: Record<string, string>;
  hasError: boolean;
}

export default function SchemesPageView({
  state,
  category,
  page,
  totalPages,
  schemes,
  verdicts,
  hasError,
}: SchemesPageViewProps) {
  const t = useTranslations();

  return (
    <div className="mx-auto max-w-4xl px-4 py-6 sm:px-6 sm:py-8">
      <Link
        href="/"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-primary-700 hover:underline"
      >
        <ArrowLeft className="h-4 w-4" strokeWidth={1.75} />
        {t("schemes.backToMap")}
      </Link>

      <div className="mt-3 flex items-center gap-2">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary text-white">
          <Landmark className="h-4.5 w-4.5" strokeWidth={2} />
        </span>
        <h1 className="text-2xl font-semibold text-foreground">{t("common.governmentSchemes")}</h1>
      </div>
      <p className="mt-1 text-sm text-foreground/60">{t("schemes.description")}</p>

      <form
        className="mt-6 flex flex-col gap-3 rounded-xl border border-primary-100 bg-gray-50 p-4 sm:flex-row sm:flex-wrap sm:items-end"
        method="GET"
      >
        <label className="flex flex-1 flex-col gap-1 text-xs font-medium text-foreground/60 sm:min-w-[10rem]">
          {t("schemes.state")}
          <select
            name="state"
            defaultValue={state}
            className="rounded-md border border-primary-100 bg-white px-3 py-2 text-sm text-foreground"
          >
            {INDIAN_STATES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-1 flex-col gap-1 text-xs font-medium text-foreground/60 sm:min-w-[12rem]">
          {t("schemes.categoryLabel")}
          <select
            name="category"
            defaultValue={category}
            className="rounded-md border border-primary-100 bg-white px-3 py-2 text-sm text-foreground"
          >
            {SCHEME_CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </label>
        <button
          type="submit"
          className="flex items-center justify-center gap-1.5 rounded-md bg-primary px-4 py-2 text-sm font-medium text-white transition hover:bg-primary-600"
        >
          <SlidersHorizontal className="h-3.5 w-3.5" strokeWidth={2} />
          {t("schemes.filter")}
        </button>
      </form>

      {hasError && <p className="mt-6 text-sm text-red-600">{t("schemes.loadError")}</p>}

      {!hasError && schemes.length === 0 && (
        <p className="mt-6 flex items-center gap-2 text-sm text-foreground/60">
          <Inbox className="h-4 w-4" strokeWidth={1.75} />
          {t("schemes.noResults")}
        </p>
      )}

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        {schemes.map((scheme) => (
          <SchemeCard
            key={scheme.slug}
            name={scheme.name}
            ministry={scheme.ministry}
            eligibilitySummary={scheme.eligibilitySummary}
            eligibilityVerdict={verdicts[scheme.slug]}
            applyUrl={scheme.applyUrl}
            categories={scheme.categories}
          />
        ))}
      </div>

      {totalPages > 1 && (
        <div className="mt-8 flex items-center justify-between text-sm">
          <a
            className={`flex items-center gap-1 rounded-md border border-primary-100 px-3 py-1.5 text-foreground ${
              page <= 0 ? "pointer-events-none opacity-40" : "hover:bg-primary-50"
            }`}
            href={`/schemes?state=${encodeURIComponent(state)}&category=${encodeURIComponent(category)}&page=${page - 1}`}
          >
            <ChevronLeft className="h-4 w-4" strokeWidth={1.75} />
            <span className="hidden sm:inline">{t("schemes.previous")}</span>
          </a>
          <span className="text-foreground/60">
            {t("schemes.pageOf", { page: page + 1, total: totalPages })}
          </span>
          <a
            className={`flex items-center gap-1 rounded-md border border-primary-100 px-3 py-1.5 text-foreground ${
              page + 1 >= totalPages ? "pointer-events-none opacity-40" : "hover:bg-primary-50"
            }`}
            href={`/schemes?state=${encodeURIComponent(state)}&category=${encodeURIComponent(category)}&page=${page + 1}`}
          >
            <span className="hidden sm:inline">{t("schemes.next")}</span>
            <ChevronRight className="h-4 w-4" strokeWidth={1.75} />
          </a>
        </div>
      )}
    </div>
  );
}
