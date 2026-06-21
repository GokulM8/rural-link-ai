"use client";

import { useEffect, useState } from "react";
import { Monitor, Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { useTranslations } from "next-intl";

type ThemeMode = "system" | "light" | "dark";

const NEXT_MODE: Record<ThemeMode, ThemeMode> = {
  system: "light",
  light: "dark",
  dark: "system",
};

const MODE_ICON: Record<ThemeMode, typeof Monitor> = {
  system: Monitor,
  light: Sun,
  dark: Moon,
};

export default function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const t = useTranslations("theme");
  const [mounted, setMounted] = useState(false);

  // The real theme isn't knowable on the server, so render a neutral
  // placeholder until mounted rather than guessing — avoids a hydration
  // mismatch warning without needing to suppress it on this component too.
  useEffect(() => setMounted(true), []);

  const current: ThemeMode = mounted ? (theme as ThemeMode) ?? "system" : "system";
  const Icon = MODE_ICON[current];

  return (
    <button
      type="button"
      onClick={() => setTheme(NEXT_MODE[current])}
      aria-label={t("toggle")}
      className="flex items-center gap-[5px] whitespace-nowrap rounded-lg px-2.5 py-1 text-xs text-[var(--text-3)] transition hover:bg-[var(--surface-3)] hover:text-[var(--text-2)]"
    >
      <Icon key={current} className="theme-icon-enter h-3.5 w-3.5" strokeWidth={1.75} />
      <span className="text-[var(--text-2)]">{t(current)}</span>
    </button>
  );
}
