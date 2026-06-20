"use client";

import { CircleCheck, CircleHelp, CircleX, ExternalLink, Landmark } from "lucide-react";
import { useTranslations } from "next-intl";

export interface SchemeCardProps {
  name: string;
  ministry: string;
  eligibilitySummary: string;
  eligibilityVerdict?: string | null;
  applyUrl: string;
  categories?: string[];
}

function verdictTone(verdict: string): "positive" | "negative" | "neutral" {
  const lower = verdict.toLowerCase();
  if (lower.startsWith("likely yes")) return "positive";
  if (lower.startsWith("likely no")) return "negative";
  return "neutral";
}

const VERDICT_STYLES: Record<ReturnType<typeof verdictTone>, string> = {
  positive: "border-primary-200 bg-primary-50 text-primary-700",
  negative: "border-red-200 bg-red-50 text-red-600",
  neutral: "border-gray-200 bg-gray-50 text-gray-600",
};

const VERDICT_ICON = {
  positive: CircleCheck,
  negative: CircleX,
  neutral: CircleHelp,
};

export default function SchemeCard({
  name,
  ministry,
  eligibilitySummary,
  eligibilityVerdict,
  applyUrl,
  categories,
}: SchemeCardProps) {
  const t = useTranslations();
  const tone = eligibilityVerdict ? verdictTone(eligibilityVerdict) : null;
  const VerdictIcon = tone ? VERDICT_ICON[tone] : CircleHelp;

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-primary-100 bg-white p-5 shadow-sm transition hover:shadow-md">
      <div className="flex items-start gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary-50 text-primary-700">
          <Landmark className="h-4.5 w-4.5" strokeWidth={1.75} />
        </span>
        <div className="min-w-0">
          <p className="font-semibold text-foreground">{name}</p>
          <p className="text-sm text-primary-700">{ministry}</p>
        </div>
      </div>

      {categories && categories.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {categories.map((category) => (
            <span
              key={category}
              className="rounded-full bg-primary-50 px-2 py-0.5 text-xs text-primary-700"
            >
              {category}
            </span>
          ))}
        </div>
      )}

      <p className="text-sm text-foreground/70">{eligibilitySummary}</p>

      <div
        className={`flex items-start gap-1.5 rounded-lg border p-2 text-xs ${
          tone ? VERDICT_STYLES[tone] : "border-dashed border-primary-200 bg-primary-50/40 text-foreground/50"
        }`}
      >
        <VerdictIcon className="mt-0.5 h-3.5 w-3.5 shrink-0" strokeWidth={1.75} />
        <span>{eligibilityVerdict ?? t("schemes.eligibilityComingSoon")}</span>
      </div>

      <a
        href={applyUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-1 inline-flex items-center justify-center gap-1.5 rounded-md bg-primary px-4 py-2 text-sm font-medium text-white transition hover:bg-primary-600"
      >
        {t("actions.apply")}
        <ExternalLink className="h-3.5 w-3.5" strokeWidth={1.75} />
      </a>
    </div>
  );
}
