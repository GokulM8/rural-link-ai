"use client";

import { useTranslations } from "next-intl";
import { HERO_FEATURES } from "@/components/heroFeatures";

export default function MobileHeroSection() {
  const t = useTranslations("hero");
  const tDashboard = useTranslations("dashboard");

  return (
    <div className="flex flex-col items-center gap-3 bg-[var(--surface-1)] px-4 py-3 text-center md:hidden">
      <div>
        <h2 className="text-xl font-bold text-[var(--text-1)]">{t("greeting")}</h2>
        <p className="mt-0.5 text-xs font-medium text-[var(--text-4)]">{t("question")}</p>
      </div>

      <div className="grid w-full grid-cols-4 gap-2">
        {HERO_FEATURES.map(({ key, icon: Icon }) => (
          <div key={key} className="flex flex-col items-center gap-1">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#1D9E75]/10">
              <Icon className="h-4 w-4 text-[#1D9E75]" strokeWidth={1.75} />
            </span>
            <span className="text-[10px] font-medium leading-tight text-[var(--text-2)]">
              {key === "nearbyServices" ? tDashboard("nearbyServices") : t(`features.${key}`)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
