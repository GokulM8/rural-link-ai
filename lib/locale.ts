export const LOCALES = [
  { code: "en", label: "English" },
  { code: "hi", label: "हिन्दी" },
  { code: "te", label: "తెలుగు" },
  { code: "ta", label: "தமிழ்" },
  { code: "kn", label: "ಕನ್ನಡ" },
  { code: "mr", label: "मराठी" },
  { code: "bn", label: "বাংলা" },
  { code: "or", label: "ଓଡ଼ିଆ" },
] as const;

export type LocaleCode = (typeof LOCALES)[number]["code"];

export const DEFAULT_LOCALE: LocaleCode = "en";

export function isLocaleCode(value: string): value is LocaleCode {
  return LOCALES.some((locale) => locale.code === value);
}

// Best-effort mapping from an Indian state/UT name to one of our supported
// locales, for GPS-based auto-suggestion. States not listed (or whose
// dominant language isn't one of our 8 locales) fall back to English.
const STATE_TO_LOCALE: Record<string, LocaleCode> = {
  "andhra pradesh": "te",
  telangana: "te",
  "tamil nadu": "ta",
  puducherry: "ta",
  karnataka: "kn",
  maharashtra: "mr",
  "west bengal": "bn",
  odisha: "or",
  "uttar pradesh": "hi",
  "madhya pradesh": "hi",
  bihar: "hi",
  rajasthan: "hi",
  haryana: "hi",
  delhi: "hi",
  "nct of delhi": "hi",
  uttarakhand: "hi",
  "himachal pradesh": "hi",
  jharkhand: "hi",
  chhattisgarh: "hi",
  "jammu and kashmir": "hi",
};

export function suggestLocaleFromState(stateName: string | null | undefined): LocaleCode | null {
  if (!stateName) return null;
  return STATE_TO_LOCALE[stateName.trim().toLowerCase()] ?? null;
}
