"use client";

import Link from "next/link";
import { Leaf, type LucideIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import LanguagePicker from "@/components/LanguagePicker";
import ThemeToggle from "@/components/ThemeToggle";
import AuthControl from "@/components/AuthControl";
import VoiceAssistant from "@/components/VoiceAssistant";
import type { VoiceDomain } from "@/lib/voiceAssistant";

export interface FloatingTopBarProps {
  voiceDomain: VoiceDomain;
  onVoiceIntent: (category: string) => void;
  languageCoords: { lat: number; lng: number } | null;
  ctaHref: string;
  ctaLabel: string;
  ctaIcon: LucideIcon;
}

/** Desktop only — mobile keeps its own hamburger top bar (MobileTopBar). */
export default function FloatingTopBar({
  voiceDomain,
  onVoiceIntent,
  languageCoords,
  ctaHref,
  ctaLabel,
  ctaIcon: CtaIcon,
}: FloatingTopBarProps) {
  const tCommon = useTranslations("common");

  return (
    <div className="absolute inset-x-4 top-4 z-20 hidden items-center gap-2 md:flex">
      <Link
        href="/"
        className="flex items-center gap-2 rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-1)]/90 px-3.5 py-2 backdrop-blur-xl"
      >
        <span className="flex h-[22px] w-[22px] items-center justify-center rounded-[6px] bg-[#1D9E75]">
          <Leaf className="h-3.5 w-3.5 text-white" strokeWidth={2} />
        </span>
        <span className="text-sm font-medium text-[var(--text-1)]">{tCommon("appName")}</span>
      </Link>

      <div className="flex-1" />

      <div className="flex items-center gap-1 rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-1)]/90 p-1.5 backdrop-blur-xl">
        <LanguagePicker coords={languageCoords} />
        <div className="h-4 w-px bg-[var(--border-subtle)]" />
        <ThemeToggle />
        <div className="h-4 w-px bg-[var(--border-subtle)]" />
        <AuthControl />
      </div>

      <VoiceAssistant domain={voiceDomain} onIntent={onVoiceIntent} variant="topbar" />

      <Link href={ctaHref} className="btn-primary rounded-[10px]">
        <CtaIcon className="h-3.5 w-3.5" strokeWidth={1.75} />
        {ctaLabel}
      </Link>
    </div>
  );
}
