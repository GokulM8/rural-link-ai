"use client";

import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Leaf, Loader2 } from "lucide-react";
import { maskPhone, normalizeIndianPhone } from "@/lib/auth/phone";

type Step = "phone" | "otp";

const RESEND_SECONDS = 60;
const OTP_LENGTH = 6;

const ERROR_MESSAGES: Record<string, string> = {
  invalid_phone: "Enter a valid 10-digit mobile number.",
  rate_limited: "Too many attempts. Please wait a moment.",
  not_requested: "Request a new OTP first.",
  expired: "OTP expired, request a new one.",
  too_many_attempts: "Too many incorrect attempts. Request a new OTP.",
  invalid_code: "Invalid OTP, check your message.",
  send_failed: "Failed to send OTP, try again.",
  unauthorized: "This number is not authorized for admin access.",
  generic: "Something went wrong. Please try again.",
};

function errorMessageFor(code: string | null | undefined): string {
  if (!code) return ERROR_MESSAGES.generic;
  return ERROR_MESSAGES[code] ?? ERROR_MESSAGES.generic;
}

export default function AdminLoginPage() {
  return (
    <Suspense fallback={null}>
      <AdminLoginForm />
    </Suspense>
  );
}

function AdminLoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [step, setStep] = useState<Step>("phone");
  const [phone, setPhone] = useState("");
  const [digits, setDigits] = useState<string[]>(Array(OTP_LENGTH).fill(""));
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [devCode, setDevCode] = useState<string | null>(null);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(() => {
    const queryError = searchParams.get("error");
    return queryError ? errorMessageFor(queryError) : null;
  });
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setInterval(() => setResendCooldown((seconds) => Math.max(0, seconds - 1)), 1000);
    return () => clearInterval(timer);
  }, [resendCooldown]);

  // Runs after the OTP boxes have actually committed to the DOM — a
  // setTimeout fired from the click handler raced the unmount of the phone
  // form (whose "Send OTP" button had focus), and the browser's automatic
  // focus-to-body on that unmount was winning the race.
  useEffect(() => {
    if (step === "otp") inputRefs.current[0]?.focus();
  }, [step]);

  const requestOtp = useCallback(async () => {
    const fullPhone = normalizeIndianPhone(phone);
    if (!fullPhone) {
      setErrorMessage(ERROR_MESSAGES.invalid_phone);
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);
    try {
      const response = await fetch("/api/auth/request-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: fullPhone }),
      });
      const data = await response.json();
      if (!response.ok) {
        setErrorMessage(errorMessageFor(data.error));
        return;
      }
      setDevCode(data.devCode ?? null);
      setDigits(Array(OTP_LENGTH).fill(""));
      setResendCooldown(RESEND_SECONDS);
      setStep("otp");
    } catch {
      setErrorMessage(ERROR_MESSAGES.send_failed);
    } finally {
      setIsSubmitting(false);
    }
  }, [phone]);

  const verifyOtp = useCallback(async () => {
    const fullPhone = normalizeIndianPhone(phone);
    const code = digits.join("");
    if (!fullPhone || code.length !== OTP_LENGTH) return;

    setIsSubmitting(true);
    setErrorMessage(null);
    try {
      const verifyResponse = await fetch("/api/auth/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: fullPhone, code }),
      });
      const verifyData = await verifyResponse.json();
      if (!verifyResponse.ok) {
        setErrorMessage(errorMessageFor(verifyData.error));
        return;
      }

      // OTP being valid only proves who they are — "admin" is a separate,
      // server-only check against ADMIN_PHONES, never shipped to the client.
      const checkResponse = await fetch("/api/admin/check");
      const checkData = await checkResponse.json();
      if (!checkResponse.ok || !checkData.authorized) {
        setErrorMessage(ERROR_MESSAGES.unauthorized);
        return;
      }

      router.push("/admin");
    } catch {
      setErrorMessage(ERROR_MESSAGES.generic);
    } finally {
      setIsSubmitting(false);
    }
  }, [phone, digits, router]);

  const handleDigitChange = useCallback((index: number, rawValue: string) => {
    const digit = rawValue.replace(/\D/g, "").slice(-1);
    setDigits((prev) => {
      const next = [...prev];
      next[index] = digit;
      return next;
    });
    if (digit && index < OTP_LENGTH - 1) inputRefs.current[index + 1]?.focus();
  }, []);

  const handleKeyDown = useCallback(
    (index: number, event: React.KeyboardEvent<HTMLInputElement>) => {
      if (event.key === "Backspace" && !digits[index] && index > 0) {
        inputRefs.current[index - 1]?.focus();
      }
    },
    [digits]
  );

  const handlePaste = useCallback((event: React.ClipboardEvent<HTMLInputElement>) => {
    const pasted = event.clipboardData.getData("text").replace(/\D/g, "").slice(0, OTP_LENGTH);
    if (!pasted) return;
    event.preventDefault();
    const next = Array(OTP_LENGTH).fill("");
    for (let i = 0; i < pasted.length; i++) next[i] = pasted[i];
    setDigits(next);
    inputRefs.current[Math.min(pasted.length, OTP_LENGTH - 1)]?.focus();
  }, []);

  const normalizedPhone = normalizeIndianPhone(phone);

  return (
    <div className="flex min-h-screen items-center justify-center bg-neutral-950 px-4">
      <div className="w-full max-w-sm rounded-2xl border border-white/10 bg-neutral-900 p-8 shadow-xl">
        <div className="flex flex-col items-center gap-2 text-center">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#1D9E75] text-white">
            <Leaf className="h-5.5 w-5.5" strokeWidth={2} />
          </span>
          <div>
            <p className="text-lg font-semibold text-white">RuralLink</p>
            <p className="text-xs uppercase tracking-wide text-neutral-400">Admin Portal</p>
          </div>
        </div>

        {errorMessage && (
          <p className="mt-5 rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-400">
            {errorMessage}
          </p>
        )}

        {step === "phone" && (
          <form
            className="mt-6 flex flex-col gap-4"
            onSubmit={(event) => {
              event.preventDefault();
              requestOtp();
            }}
          >
            <label className="flex flex-col gap-1.5 text-xs font-medium text-neutral-400">
              Mobile number
              <div className="flex items-center gap-2">
                <span className="flex items-center rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm text-neutral-300">
                  +91
                </span>
                <input
                  type="tel"
                  inputMode="numeric"
                  autoFocus
                  required
                  value={phone}
                  onChange={(event) => setPhone(event.target.value)}
                  placeholder="98765 43210"
                  className="flex-1 rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none transition focus:border-[#1D9E75] focus:ring-2 focus:ring-[#1D9E75]/40"
                />
              </div>
            </label>
            <button
              type="submit"
              disabled={isSubmitting || !normalizedPhone}
              className="flex items-center justify-center gap-2 rounded-md bg-[#1D9E75] px-4 py-2.5 text-sm font-medium text-white transition hover:bg-[#178a64] disabled:pointer-events-none disabled:opacity-50"
            >
              {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
              Send OTP
            </button>
          </form>
        )}

        {step === "otp" && (
          <form
            className="mt-6 flex flex-col gap-4"
            onSubmit={(event) => {
              event.preventDefault();
              verifyOtp();
            }}
          >
            <p className="text-sm text-neutral-400">
              Enter the code sent to {normalizedPhone ? maskPhone(normalizedPhone) : ""}
            </p>

            {devCode && (
              <p className="rounded-md border border-dashed border-[#1D9E75]/40 bg-[#1D9E75]/10 px-2 py-1 text-xs text-[#5dcaa5]">
                Dev code: {devCode}
              </p>
            )}

            <div className="flex justify-between gap-2">
              {digits.map((digit, index) => (
                <input
                  key={index}
                  ref={(el) => {
                    inputRefs.current[index] = el;
                  }}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={digit}
                  onChange={(event) => handleDigitChange(index, event.target.value)}
                  onKeyDown={(event) => handleKeyDown(index, event)}
                  onPaste={index === 0 ? handlePaste : undefined}
                  className="h-12 w-11 rounded-md border border-white/10 bg-white/5 text-center text-lg font-medium text-white outline-none transition focus:border-[#1D9E75] focus:ring-2 focus:ring-[#1D9E75]/40"
                />
              ))}
            </div>

            <button
              type="submit"
              disabled={isSubmitting || digits.join("").length !== OTP_LENGTH}
              className="flex items-center justify-center gap-2 rounded-md bg-[#1D9E75] px-4 py-2.5 text-sm font-medium text-white transition hover:bg-[#178a64] disabled:pointer-events-none disabled:opacity-50"
            >
              {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
              Verify
            </button>

            <div className="flex items-center justify-between text-xs">
              <button
                type="button"
                onClick={() => {
                  setStep("phone");
                  setErrorMessage(null);
                }}
                className="text-[#5dcaa5] hover:underline"
              >
                Change number
              </button>
              <button
                type="button"
                onClick={requestOtp}
                disabled={resendCooldown > 0 || isSubmitting}
                className="text-[#5dcaa5] hover:underline disabled:pointer-events-none disabled:text-neutral-500"
              >
                Resend OTP {resendCooldown > 0 ? `(${resendCooldown}s)` : ""}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
