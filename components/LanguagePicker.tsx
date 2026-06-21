"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useLocale, useTranslations } from "next-intl";
import { Globe, X } from "lucide-react";
import { useLocaleSwitcher, LOCALE_STORAGE_KEY } from "@/components/IntlProvider";
import { LOCALES, suggestLocaleFromState, type LocaleCode } from "@/lib/locale";

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_API_KEY;

export interface LanguagePickerProps {
  /** Reused from the dashboard's existing geolocation call, to avoid asking twice. */
  coords: { lat: number; lng: number } | null;
}

async function reverseGeocodeState(lat: number, lng: number): Promise<string | null> {
  if (!MAPBOX_TOKEN) return null;
  try {
    const response = await fetch(
      `https://api.mapbox.com/geocoding/v5/mapbox.places/${lng},${lat}.json?types=region&access_token=${MAPBOX_TOKEN}`
    );
    if (!response.ok) return null;
    const data = await response.json();
    return data?.features?.[0]?.text ?? null;
  } catch (error) {
    console.error("Reverse geocoding for language suggestion failed", error);
    return null;
  }
}

export default function LanguagePicker({ coords }: LanguagePickerProps) {
  const t = useTranslations("languagePicker");
  const locale = useLocale();
  const { setLocale } = useLocaleSwitcher();
  const [isOpen, setIsOpen] = useState(false);
  const [suggested, setSuggested] = useState<LocaleCode | null>(null);
  const hasAttemptedSuggestion = useRef(false);

  useEffect(() => {
    if (!coords || hasAttemptedSuggestion.current) return;
    if (window.localStorage.getItem(LOCALE_STORAGE_KEY)) {
      hasAttemptedSuggestion.current = true;
      return;
    }

    hasAttemptedSuggestion.current = true;
    reverseGeocodeState(coords.lat, coords.lng).then((stateName) => {
      const match = suggestLocaleFromState(stateName);
      if (match) {
        setSuggested(match);
        setLocale(match);
      }
    });
  }, [coords, setLocale]);

  const currentLabel = LOCALES.find((option) => option.code === locale)?.label ?? "English";

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-[5px] rounded-lg px-2.5 py-1 text-xs text-[var(--text-3)] transition hover:bg-[var(--surface-3)] hover:text-[var(--text-2)]"
      >
        <Globe className="h-3.5 w-3.5" strokeWidth={1.75} />
        <span className="hidden text-[var(--text-2)] sm:inline">{currentLabel}</span>
      </button>

      {isOpen &&
        createPortal(
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4"
            onClick={() => setIsOpen(false)}
          >
            <div
              className="w-full max-w-sm rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-2)] p-5 shadow-2xl"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="flex items-center justify-between">
                <h2 className="text-base font-medium text-[var(--text-1)]">{t("title")}</h2>
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  aria-label={t("close")}
                  className="rounded-md p-1 text-[var(--text-4)] transition hover:bg-[var(--hover-overlay)] hover:text-[var(--text-3)] active:scale-95"
                >
                  <X className="h-5 w-5" strokeWidth={1.75} />
                </button>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-2">
                {LOCALES.map((option) => (
                  <button
                    key={option.code}
                    type="button"
                    onClick={() => {
                      setLocale(option.code);
                      setIsOpen(false);
                    }}
                    className={`rounded-lg border px-3 py-2 text-left text-sm transition active:scale-[0.98] ${
                      option.code === locale
                        ? "border-[#1D9E75]/40 bg-[#1D9E75]/10 text-[#1D9E75]"
                        : "border-[var(--border-subtle)] text-[var(--text-3)] hover:bg-[var(--hover-overlay)]"
                    }`}
                  >
                    <div>{option.label}</div>
                    {option.code === suggested && (
                      <div className="text-xs text-[#1D9E75]/70">{t("suggested")}</div>
                    )}
                  </button>
                ))}
              </div>
            </div>
          </div>,
          document.body
        )}
    </>
  );
}
