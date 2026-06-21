"use client";

import { useState } from "react";
import {
  AlertCircle,
  Bookmark,
  Briefcase,
  CircleCheck,
  CircleHelp,
  CircleX,
  Cpu,
  Droplet,
  ExternalLink,
  GraduationCap,
  HeartHandshake,
  HeartPulse,
  Home,
  Info,
  Landmark,
  Plane,
  Shield,
  Sprout,
  Trophy,
  Truck,
  Users,
  Wrench,
  type LucideIcon,
} from "lucide-react";
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
  positive: "bg-[#1D9E75]/10 text-[#1D9E75] border-[#1D9E75]/20",
  negative: "bg-red-500/10 text-red-400 border-red-500/15",
  neutral: "bg-amber-500/10 text-amber-500 border-amber-500/15",
};

const VERDICT_ICON: Record<ReturnType<typeof verdictTone>, LucideIcon> = {
  positive: CircleCheck,
  negative: CircleX,
  neutral: AlertCircle,
};

export interface SchemeStyle {
  icon: LucideIcon;
  bg: string;
  fg: string;
}

// bg is a theme-aware CSS var (dark: near-black wash, light: pale tint),
// fg is the constant full-saturation accent color in both themes.
export const SCHEME_CATEGORY_STYLE: Record<string, SchemeStyle> = {
  "Agriculture,Rural & Environment": { icon: Sprout, bg: "var(--cat-tint-green)", fg: "#1D9E75" },
  "Banking,Financial Services and Insurance": { icon: Landmark, bg: "var(--cat-tint-blue)", fg: "#3B82F6" },
  "Business & Entrepreneurship": { icon: Briefcase, bg: "var(--cat-tint-purple)", fg: "#A855F7" },
  "Education & Learning": { icon: GraduationCap, bg: "var(--cat-tint-blue)", fg: "#3B82F6" },
  "Health & Wellness": { icon: HeartPulse, bg: "var(--cat-tint-red)", fg: "#EF4444" },
  "Housing & Shelter": { icon: Home, bg: "var(--cat-tint-amber)", fg: "#F59E0B" },
  "Public Safety,Law & Justice": { icon: Shield, bg: "var(--cat-tint-slate)", fg: "#94A3B8" },
  "Science, IT & Communications": { icon: Cpu, bg: "var(--cat-tint-indigo)", fg: "#818CF8" },
  "Skills & Employment": { icon: Wrench, bg: "var(--cat-tint-amber)", fg: "#F59E0B" },
  "Social welfare & Empowerment": { icon: HeartHandshake, bg: "var(--cat-tint-green)", fg: "#1D9E75" },
  "Sports & Culture": { icon: Trophy, bg: "var(--cat-tint-purple)", fg: "#A855F7" },
  "Transport & Infrastructure": { icon: Truck, bg: "var(--cat-tint-slate)", fg: "#94A3B8" },
  "Travel & Tourism": { icon: Plane, bg: "var(--cat-tint-blue)", fg: "#3B82F6" },
  "Utility & Sanitation": { icon: Droplet, bg: "var(--cat-tint-teal)", fg: "#14B8A6" },
  "Women and Child": { icon: Users, bg: "var(--cat-tint-red)", fg: "#EF4444" },
};
export const DEFAULT_SCHEME_STYLE: SchemeStyle = { icon: Landmark, bg: "var(--surface-3)", fg: "var(--text-3)" };

export default function SchemeCard({
  name,
  ministry,
  eligibilitySummary,
  eligibilityVerdict,
  applyUrl,
  categories,
}: SchemeCardProps) {
  const t = useTranslations();
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const tone = eligibilityVerdict ? verdictTone(eligibilityVerdict) : null;
  const VerdictIcon = tone ? VERDICT_ICON[tone] : CircleHelp;
  const primaryCategory = categories?.[0];
  const style = (primaryCategory && SCHEME_CATEGORY_STYLE[primaryCategory]) || DEFAULT_SCHEME_STYLE;
  const SchemeIcon = style.icon;

  return (
    <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-2)] p-3.5 transition hover:border-[var(--border-strong)]">
      <div className="mb-2.5 flex items-start gap-2.5">
        <span
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[9px]"
          style={{ background: style.bg, color: style.fg }}
        >
          <SchemeIcon className="h-4.5 w-4.5" strokeWidth={1.75} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[13px] font-medium leading-tight text-[var(--text-1)]">{name}</p>
          <p className="mt-0.5 text-[11px] text-[#1D9E75]">{ministry}</p>
        </div>
        <button
          type="button"
          onClick={(event) => {
            event.preventDefault();
            setIsBookmarked((prev) => !prev);
          }}
          aria-label="Bookmark"
          aria-pressed={isBookmarked}
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-[7px] border border-[var(--border-subtle)] bg-[var(--surface-3)] text-[var(--text-4)] transition hover:text-[var(--text-3)]"
        >
          <Bookmark className="h-3.5 w-3.5" strokeWidth={1.75} fill={isBookmarked ? "#1D9E75" : "none"} color={isBookmarked ? "#1D9E75" : "currentColor"} />
        </button>
      </div>

      <div className="mb-2 flex flex-wrap items-center gap-1.5">
        {primaryCategory && (
          <span className="rounded-full border border-[var(--border-subtle)] bg-[var(--surface-3)] px-2 py-0.5 text-[10px] text-[var(--text-4)]">
            {primaryCategory}
          </span>
        )}
        <span
          className={`flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] ${
            tone ? VERDICT_STYLES[tone] : "border-[var(--border-subtle)] bg-[var(--surface-3)] text-[var(--text-4)]"
          }`}
        >
          <VerdictIcon className="h-2.5 w-2.5" strokeWidth={1.75} />
          {eligibilityVerdict ?? t("schemes.eligibilityComingSoon")}
        </span>
      </div>

      <p className={`mb-2.5 text-[11px] leading-relaxed text-[var(--text-4)] ${isExpanded ? "" : "line-clamp-1"}`}>
        {eligibilitySummary}
      </p>

      <div className="flex items-center gap-1.5">
        <a
          href={applyUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-[#1D9E75] py-2 text-xs font-medium text-white transition hover:bg-[#177F5E]"
        >
          {t("actions.apply")}
          <ExternalLink className="h-3.5 w-3.5" strokeWidth={1.75} />
        </a>
        <button
          type="button"
          onClick={() => setIsExpanded((prev) => !prev)}
          className="flex shrink-0 items-center gap-1.5 rounded-lg border border-[var(--border-subtle)] px-3 py-2 text-xs text-[var(--text-4)] transition hover:bg-[var(--hover-overlay)]"
        >
          <Info className="h-3.5 w-3.5" strokeWidth={1.75} />
          {isExpanded ? t("actions.hideDetails") : t("actions.showDetails")}
        </button>
      </div>
    </div>
  );
}
