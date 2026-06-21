"use client";

import Link from "next/link";
import { X, type LucideIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import AuthControl from "@/components/AuthControl";
import ThemeToggle from "@/components/ThemeToggle";

export interface MobileDrawerMenuProps {
  isOpen: boolean;
  onClose: () => void;
  ctaHref: string;
  ctaLabel: string;
  ctaIcon: LucideIcon;
}

export default function MobileDrawerMenu({ isOpen, onClose, ctaHref, ctaLabel, ctaIcon: CtaIcon }: MobileDrawerMenuProps) {
  const t = useTranslations();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 md:hidden" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div
        className="absolute left-0 top-0 flex h-full w-72 flex-col gap-4 border-r border-[var(--border-subtle)] bg-[var(--surface-1)] p-5 shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <span className="text-sm font-semibold uppercase tracking-wide text-[var(--text-4)]">
            {t("common.menu")}
          </span>
          <button
            type="button"
            onClick={onClose}
            aria-label={t("languagePicker.close")}
            className="rounded-md p-1 text-[var(--text-4)] transition hover:bg-[var(--hover-overlay)] hover:text-[var(--text-3)] active:scale-95"
          >
            <X className="h-5 w-5" strokeWidth={1.75} />
          </button>
        </div>

        <Link href={ctaHref} onClick={onClose} className="btn-primary justify-start rounded-full">
          <CtaIcon className="h-4 w-4" strokeWidth={1.75} />
          {ctaLabel}
        </Link>

        <div className="flex items-center justify-between rounded-xl border border-[var(--border-subtle)] p-3">
          <span className="text-sm font-medium text-[var(--text-2)]">{t("theme.label")}</span>
          <ThemeToggle />
        </div>

        <div className="rounded-xl border border-[var(--border-subtle)] p-3">
          <AuthControl />
        </div>
      </div>
    </div>
  );
}
