"use client";

import { Leaf, Menu } from "lucide-react";
import { useTranslations } from "next-intl";
import LanguagePicker from "@/components/LanguagePicker";

export interface MobileTopBarProps {
  languageCoords: { lat: number; lng: number } | null;
  onMenuClick: () => void;
}

export default function MobileTopBar({ languageCoords, onMenuClick }: MobileTopBarProps) {
  const tCommon = useTranslations("common");

  return (
    <header className="flex items-center justify-between gap-2 border-b border-[var(--border-subtle)] bg-[var(--surface-1)] px-4 py-3 md:hidden">
      <button
        type="button"
        onClick={onMenuClick}
        aria-label={tCommon("menu")}
        className="rounded-md p-1.5 text-[var(--text-2)] transition hover:bg-[var(--hover-overlay)] active:scale-95"
      >
        <Menu className="h-5 w-5" strokeWidth={1.75} />
      </button>

      <div className="flex items-center gap-2">
        <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#1D9E75] text-white">
          <Leaf className="h-4 w-4" strokeWidth={2} />
        </span>
        <span className="text-base font-semibold text-[var(--text-1)]">{tCommon("appName")}</span>
      </div>

      <LanguagePicker coords={languageCoords} />
    </header>
  );
}
