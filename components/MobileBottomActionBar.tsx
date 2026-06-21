"use client";

import { useState, type FormEvent } from "react";
import { ArrowRight, Search } from "lucide-react";
import { useTranslations } from "next-intl";
import VoiceAssistant from "@/components/VoiceAssistant";
import type { VoiceDomain } from "@/lib/voiceAssistant";

export interface MobileBottomActionBarProps {
  voiceDomain: VoiceDomain;
  onVoiceIntent: (category: string) => void;
  onSearch: (query: string) => void;
}

/** Floats over the map specifically (absolute within its relative container),
 * matching the mockup's scope — it scrolls away with the map once the user
 * scrolls down to the services list, rather than pinning over the whole page. */
export default function MobileBottomActionBar({ voiceDomain, onVoiceIntent, onSearch }: MobileBottomActionBarProps) {
  const t = useTranslations("hero");
  const [query, setQuery] = useState("");

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    onSearch(query);
  };

  return (
    <div className="absolute inset-x-3 bottom-3 z-10 flex flex-col gap-2 md:hidden">
      <VoiceAssistant domain={voiceDomain} onIntent={onVoiceIntent} variant="bar" />

      <form
        onSubmit={handleSubmit}
        className="flex items-center gap-2 rounded-full border border-[var(--border-subtle)] bg-[var(--surface-1)]/95 px-4 py-2.5 shadow-lg backdrop-blur-xl"
      >
        <Search className="h-4 w-4 shrink-0 text-[var(--text-4)]" strokeWidth={1.75} />
        <input
          type="text"
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            onSearch(event.target.value);
          }}
          placeholder={t("searchPlaceholder")}
          className="flex-1 bg-transparent text-sm text-[var(--text-1)] outline-none placeholder:text-[var(--text-4)]"
        />
        <button
          type="submit"
          aria-label={t("searchPlaceholder")}
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#1D9E75] text-white transition active:scale-95"
        >
          <ArrowRight className="h-3.5 w-3.5" strokeWidth={2} />
        </button>
      </form>
    </div>
  );
}
