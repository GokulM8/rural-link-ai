"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { LogOut, Mail, User as UserIcon, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { maskPhone } from "@/lib/auth/phone";

interface AuthUser {
  phone: string;
  email: string | null;
}

type Step = "phone" | "otp" | "email";

const RESEND_COOLDOWN_SECONDS = 30;
const KNOWN_ERROR_KEYS = new Set([
  "invalid_phone",
  "rate_limited",
  "not_requested",
  "expired",
  "too_many_attempts",
  "invalid_code",
  "invalid_email",
  "send_failed",
]);

interface AuthModalProps {
  step: Step;
  phone: string;
  code: string;
  email: string;
  errorKey: string | null;
  isSubmitting: boolean;
  devCode: string | null;
  resendCooldown: number;
  onPhoneChange: (value: string) => void;
  onCodeChange: (value: string) => void;
  onEmailChange: (value: string) => void;
  onRequestOtp: () => void;
  onVerifyOtp: () => void;
  onSaveEmail: () => void;
  onSkipEmail: () => void;
  onChangeNumber: () => void;
  onClose: () => void;
}

function AuthModal({
  step,
  phone,
  code,
  email,
  errorKey,
  isSubmitting,
  devCode,
  resendCooldown,
  onPhoneChange,
  onCodeChange,
  onEmailChange,
  onRequestOtp,
  onVerifyOtp,
  onSaveEmail,
  onSkipEmail,
  onChangeNumber,
  onClose,
}: AuthModalProps) {
  const t = useTranslations("auth");

  // Portaled to <body> — this modal is rendered from inside FloatingTopBar's
  // backdrop-blur pill, and `backdrop-filter` on an ancestor creates a new
  // containing block for `position: fixed`, which would otherwise anchor
  // this "full-screen" overlay to that small pill instead of the viewport.
  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4" onClick={onClose}>
      <div className="w-full max-w-sm rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-2)] p-5 shadow-2xl" onClick={(event) => event.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h2 className="text-base font-medium text-[var(--text-1)]">{step === "email" ? t("addEmail") : t("login")}</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1 text-[var(--text-4)] transition hover:bg-[var(--hover-overlay)] hover:text-[var(--text-3)] active:scale-95"
          >
            <X className="h-5 w-5" strokeWidth={1.75} />
          </button>
        </div>

        {errorKey && (
          <p className="mt-3 text-sm text-red-400">{t(`errors.${KNOWN_ERROR_KEYS.has(errorKey) ? errorKey : "generic"}`)}</p>
        )}

        {step === "phone" && (
          <form
            className="mt-4 flex flex-col gap-3"
            onSubmit={(event) => {
              event.preventDefault();
              onRequestOtp();
            }}
          >
            <label className="flex flex-col gap-1 text-xs font-medium text-[var(--text-4)]">
              {t("phoneLabel")}
              <div className="flex items-center gap-2">
                <span className="flex items-center rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-3)] px-3 py-2 text-sm text-[var(--text-4)]">
                  +91
                </span>
                <input
                  type="tel"
                  inputMode="numeric"
                  autoFocus
                  required
                  value={phone}
                  onChange={(event) => onPhoneChange(event.target.value)}
                  placeholder={t("phonePlaceholder")}
                  className="input-field flex-1"
                />
              </div>
            </label>
            <button type="submit" disabled={isSubmitting} className="btn-primary">
              {t("sendOtp")}
            </button>
          </form>
        )}

        {step === "otp" && (
          <form
            className="mt-4 flex flex-col gap-3"
            onSubmit={(event) => {
              event.preventDefault();
              onVerifyOtp();
            }}
          >
            <p className="text-sm text-[var(--text-4)]">{t("enterOtp", { phone: `+91 ${phone}` })}</p>
            {devCode && (
              <p className="rounded-md border border-dashed border-[var(--card-border)] bg-[var(--accent-light)] px-2 py-1 text-xs text-[var(--accent)]">
                Dev code: {devCode}
              </p>
            )}
            <input
              type="text"
              inputMode="numeric"
              autoFocus
              required
              maxLength={6}
              value={code}
              onChange={(event) => onCodeChange(event.target.value)}
              className="input-field text-center text-lg tracking-widest"
            />
            <button type="submit" disabled={isSubmitting} className="btn-primary">
              {t("verify")}
            </button>
            <div className="flex items-center justify-between text-xs">
              <button type="button" onClick={onChangeNumber} className="link-action text-[var(--accent)]">
                {t("changeNumber")}
              </button>
              <button
                type="button"
                onClick={onRequestOtp}
                disabled={resendCooldown > 0 || isSubmitting}
                className="link-action text-[var(--accent)] disabled:pointer-events-none disabled:opacity-40"
              >
                {t("resendOtp")} {resendCooldown > 0 ? `(${resendCooldown}s)` : ""}
              </button>
            </div>
          </form>
        )}

        {step === "email" && (
          <form
            className="mt-4 flex flex-col gap-3"
            onSubmit={(event) => {
              event.preventDefault();
              onSaveEmail();
            }}
          >
            <label className="flex flex-col gap-1 text-xs font-medium text-[var(--text-4)]">
              {t("emailLabel")}
              <input
                type="email"
                autoFocus
                value={email}
                onChange={(event) => onEmailChange(event.target.value)}
                placeholder={t("emailPlaceholder")}
                className="input-field"
              />
            </label>
            <div className="flex gap-2">
              <button type="submit" disabled={isSubmitting} className="btn-primary flex-1">
                {t("save")}
              </button>
              <button type="button" onClick={onSkipEmail} className="btn-secondary flex-1">
                {t("skip")}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>,
    document.body
  );
}

export default function AuthControl() {
  const t = useTranslations("auth");
  const [user, setUser] = useState<AuthUser | null>(null);
  const [hasLoadedUser, setHasLoadedUser] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isAccountMenuOpen, setIsAccountMenuOpen] = useState(false);
  const [step, setStep] = useState<Step>("phone");
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [email, setEmail] = useState("");
  const [errorKey, setErrorKey] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [devCode, setDevCode] = useState<string | null>(null);
  const [resendCooldown, setResendCooldown] = useState(0);
  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((response) => response.json())
      .then((data: { user: AuthUser | null }) => setUser(data.user))
      .catch(() => setUser(null))
      .finally(() => setHasLoadedUser(true));
  }, []);

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setInterval(() => setResendCooldown((seconds) => Math.max(0, seconds - 1)), 1000);
    return () => clearInterval(timer);
  }, [resendCooldown]);

  useEffect(() => {
    if (!isAccountMenuOpen) return;
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsAccountMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isAccountMenuOpen]);

  const resetModal = useCallback(() => {
    setStep("phone");
    setPhone("");
    setCode("");
    setEmail("");
    setErrorKey(null);
    setDevCode(null);
    setResendCooldown(0);
  }, []);

  const openLoginModal = useCallback(() => {
    resetModal();
    setIsModalOpen(true);
  }, [resetModal]);

  const openAddEmailModal = useCallback(() => {
    resetModal();
    setIsAccountMenuOpen(false);
    setStep("email");
    setIsModalOpen(true);
  }, [resetModal]);

  const closeModal = useCallback(() => {
    setIsModalOpen(false);
    resetModal();
  }, [resetModal]);

  const requestOtp = useCallback(async () => {
    setIsSubmitting(true);
    setErrorKey(null);
    try {
      const response = await fetch("/api/auth/request-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: `+91${phone}` }),
      });
      const data = await response.json();
      if (!response.ok) {
        setErrorKey(data.error ?? "send_failed");
        return;
      }
      setDevCode(data.devCode ?? null);
      setResendCooldown(RESEND_COOLDOWN_SECONDS);
      setStep("otp");
    } catch {
      setErrorKey("send_failed");
    } finally {
      setIsSubmitting(false);
    }
  }, [phone]);

  const verifyOtp = useCallback(async () => {
    setIsSubmitting(true);
    setErrorKey(null);
    try {
      const response = await fetch("/api/auth/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: `+91${phone}`, code }),
      });
      const data = await response.json();
      if (!response.ok) {
        setErrorKey(data.error ?? "generic");
        return;
      }
      setUser(data.user);
      if (!data.user.email) {
        setStep("email");
      } else {
        closeModal();
      }
    } catch {
      setErrorKey("generic");
    } finally {
      setIsSubmitting(false);
    }
  }, [phone, code, closeModal]);

  const saveEmail = useCallback(async () => {
    setIsSubmitting(true);
    setErrorKey(null);
    try {
      const response = await fetch("/api/auth/email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await response.json();
      if (!response.ok) {
        setErrorKey(data.error ?? "invalid_email");
        return;
      }
      setUser((prev) => (prev ? { ...prev, email } : prev));
      closeModal();
    } catch {
      setErrorKey("invalid_email");
    } finally {
      setIsSubmitting(false);
    }
  }, [email, closeModal]);

  const logout = useCallback(async () => {
    await fetch("/api/auth/logout", { method: "POST" }).catch(() => null);
    setUser(null);
    setIsAccountMenuOpen(false);
  }, []);

  if (!hasLoadedUser) return null;

  if (user) {
    return (
      <div className="relative" ref={menuRef}>
        <button
          type="button"
          onClick={() => setIsAccountMenuOpen((open) => !open)}
          className="flex items-center gap-[5px] rounded-lg px-2.5 py-1 text-xs text-[var(--text-3)] transition hover:bg-[var(--surface-3)] hover:text-[var(--text-2)]"
        >
          <UserIcon className="h-3.5 w-3.5" strokeWidth={1.75} />
          <span className="text-[var(--text-2)]">{maskPhone(user.phone)}</span>
        </button>

        {isAccountMenuOpen && (
          <div className="absolute right-0 z-50 mt-2 w-56 rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-2)] p-2 shadow-2xl">
            {!user.email && (
              <button
                type="button"
                onClick={openAddEmailModal}
                className="flex w-full items-center gap-2 rounded-md px-2 py-2 text-left text-sm text-[var(--text-2)] transition hover:bg-[var(--hover-overlay)]"
              >
                <Mail className="h-4 w-4 text-[#1D9E75]" strokeWidth={1.75} />
                {t("addEmail")}
              </button>
            )}
            <button
              type="button"
              onClick={logout}
              className="flex w-full items-center gap-2 rounded-md px-2 py-2 text-left text-sm text-red-400 transition hover:bg-red-500/10"
            >
              <LogOut className="h-4 w-4" strokeWidth={1.75} />
              {t("logout")}
            </button>
          </div>
        )}

        {isModalOpen && (
          <AuthModal
            step={step}
            phone={phone}
            code={code}
            email={email}
            errorKey={errorKey}
            isSubmitting={isSubmitting}
            devCode={devCode}
            resendCooldown={resendCooldown}
            onPhoneChange={setPhone}
            onCodeChange={setCode}
            onEmailChange={setEmail}
            onRequestOtp={requestOtp}
            onVerifyOtp={verifyOtp}
            onSaveEmail={saveEmail}
            onSkipEmail={closeModal}
            onChangeNumber={() => setStep("phone")}
            onClose={closeModal}
          />
        )}
      </div>
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={openLoginModal}
        className="flex items-center gap-[5px] rounded-lg px-2.5 py-1 text-xs text-[var(--text-3)] transition hover:bg-[var(--surface-3)] hover:text-[var(--text-2)]"
      >
        {t("login")}
      </button>

      {isModalOpen && (
        <AuthModal
          step={step}
          phone={phone}
          code={code}
          email={email}
          errorKey={errorKey}
          isSubmitting={isSubmitting}
          devCode={devCode}
          resendCooldown={resendCooldown}
          onPhoneChange={setPhone}
          onCodeChange={setCode}
          onEmailChange={setEmail}
          onRequestOtp={requestOtp}
          onVerifyOtp={verifyOtp}
          onSaveEmail={saveEmail}
          onSkipEmail={closeModal}
          onChangeNumber={() => setStep("phone")}
          onClose={closeModal}
        />
      )}
    </>
  );
}
