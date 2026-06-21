"use client";

import { useCallback } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, ChevronLeft, ChevronRight, Inbox } from "lucide-react";
import { useTranslations } from "next-intl";
import { SCHEME_CATEGORIES, type Scheme } from "@/lib/schemes";
import SchemeCard from "@/components/SchemeCard";
import FloatingTopBar from "@/components/FloatingTopBar";
import FilterCard from "@/components/FilterCard";
import CategoryListCard from "@/components/CategoryListCard";
import StatCards from "@/components/StatCards";
import ResultsPanel from "@/components/ResultsPanel";
import SchemeAnalytics from "@/components/SchemeAnalytics";

export interface SchemesPageViewProps {
  state: string;
  category: string;
  occupation: string;
  page: number;
  totalPages: number;
  total: number;
  schemes: Scheme[];
  verdicts: Record<string, string>;
  hasError: boolean;
  categoryCounts: Record<string, number>;
  occupations: string[];
  eligibleCount: number;
}

export default function SchemesPageView({
  state,
  category,
  occupation,
  page,
  totalPages,
  total,
  schemes,
  verdicts,
  hasError,
  categoryCounts,
  occupations,
  eligibleCount,
}: SchemesPageViewProps) {
  const t = useTranslations();
  const router = useRouter();

  // Narrows the scheme list to the spoken category by navigating to a new
  // URL — this page is a Server Component keyed off searchParams, so the
  // navigation itself triggers the re-fetch from MyScheme.
  const handleVoiceIntent = useCallback(
    (spokenCategory: string) => {
      if (!(SCHEME_CATEGORIES as string[]).includes(spokenCategory)) return;
      router.push(
        `/schemes?state=${encodeURIComponent(state)}&category=${encodeURIComponent(spokenCategory)}&occupation=${encodeURIComponent(occupation)}&page=0`
      );
    },
    [router, state, occupation]
  );

  const cards = schemes.map((scheme) => (
    <SchemeCard
      key={scheme.slug}
      name={scheme.name}
      ministry={scheme.ministry}
      eligibilitySummary={scheme.eligibilitySummary}
      eligibilityVerdict={verdicts[scheme.slug]}
      applyUrl={scheme.applyUrl}
      categories={scheme.categories}
    />
  ));

  const pagination = totalPages > 1 && (
    <div className="mt-2 flex items-center justify-between text-xs">
      <a
        className={`btn-secondary ${page <= 0 ? "pointer-events-none opacity-40" : ""}`}
        href={`/schemes?state=${encodeURIComponent(state)}&category=${encodeURIComponent(category)}&occupation=${encodeURIComponent(occupation)}&page=${page - 1}`}
      >
        <ChevronLeft className="h-3.5 w-3.5" strokeWidth={1.75} />
        {t("schemes.previous")}
      </a>
      <span className="text-[var(--text-4)]">{t("schemes.pageOf", { page: page + 1, total: totalPages })}</span>
      <a
        className={`btn-secondary ${page + 1 >= totalPages ? "pointer-events-none opacity-40" : ""}`}
        href={`/schemes?state=${encodeURIComponent(state)}&category=${encodeURIComponent(category)}&occupation=${encodeURIComponent(occupation)}&page=${page + 1}`}
      >
        {t("schemes.next")}
        <ChevronRight className="h-3.5 w-3.5" strokeWidth={1.75} />
      </a>
    </div>
  );

  return (
    <div className="relative min-h-screen overflow-hidden bg-[var(--surface-0)] md:h-screen">
      <FloatingTopBar
        voiceDomain="schemes"
        onVoiceIntent={handleVoiceIntent}
        languageCoords={null}
        ctaHref="/"
        ctaLabel={t("schemes.backToMap")}
        ctaIcon={ArrowLeft}
      />
      {/* Mobile keeps a plain top bar — the floating map-background layout
          below is desktop-only (a 260px + flex-1 grid has no room on phones). */}
      <div className="flex items-center justify-between gap-2 border-b border-[var(--border-subtle)] bg-[var(--surface-1)] px-4 py-3 md:hidden">
        <a href="/" className="flex items-center gap-1.5 text-sm font-medium text-[#1D9E75]">
          <ArrowLeft className="h-4 w-4" strokeWidth={1.75} />
          {t("schemes.backToMap")}
        </a>
      </div>

      <div className="grid grid-cols-1 gap-3 p-4 md:absolute md:inset-x-4 md:top-20 md:bottom-4 md:grid-cols-[260px_1fr_320px] md:gap-3 md:p-0">
        <div className="flex flex-col gap-3">
          <FilterCard
            state={state}
            category={category}
            occupation={occupation}
            occupations={occupations}
            stateLabel={t("schemes.state")}
            categoryLabel={t("schemes.categoryLabel")}
            occupationLabel={t("schemes.occupationLabel")}
            allLabel={t("schemes.allOccupations")}
            filterLabel={t("schemes.filter")}
            filtersHeading={t("schemes.filtersHeading")}
          />
          <CategoryListCard
            state={state}
            occupation={occupation}
            activeCategory={category}
            categoryCounts={categoryCounts}
            heading={t("schemes.categoriesHeading")}
          />
          <StatCards
            totalLabel={t("schemes.schemesFound")}
            total={total}
            eligibleLabel={t("schemes.likelyEligible")}
            eligible={eligibleCount}
          />
        </div>

        <div className="flex min-h-0 flex-col gap-2">
          {hasError ? (
            <div className="rounded-[14px] border border-[var(--border-subtle)] bg-[var(--surface-1)]/95 p-6 text-center text-sm text-red-400">
              {t("schemes.loadError")}
            </div>
          ) : schemes.length === 0 ? (
            <div className="flex flex-1 flex-col items-center justify-center gap-2 rounded-[14px] border border-[var(--border-subtle)] bg-[var(--surface-1)]/95 p-6 text-center text-sm text-[var(--text-4)]">
              <Inbox className="h-5 w-5" strokeWidth={1.75} />
              {t("schemes.noResults")}
            </div>
          ) : (
            <ResultsPanel
              title={t("common.governmentSchemes")}
              metaLabel={t("schemes.resultsCount", { count: total })}
              description={t("schemes.description")}
            >
              {cards}
            </ResultsPanel>
          )}
          {pagination}
        </div>

        <div className="min-h-0 overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <SchemeAnalytics />
        </div>
      </div>
    </div>
  );
}
