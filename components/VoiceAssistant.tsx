"use client";

import { useCallback, useRef, useState } from "react";
import { Loader2, Mic, Square } from "lucide-react";
import { useTranslations } from "next-intl";
import type { VoiceDomain } from "@/lib/voiceAssistant";

type RecorderState = "idle" | "recording" | "processing" | "error";

// next-intl locale codes -> BCP-47 tags speechSynthesis expects.
const TTS_LANG_MAP: Record<string, string> = {
  en: "en-IN",
  hi: "hi-IN",
  te: "te-IN",
  ta: "ta-IN",
  kn: "kn-IN",
  mr: "mr-IN",
  bn: "bn-IN",
  or: "or-IN",
};

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result as string;
      resolve(result.split(",")[1] ?? "");
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

function speak(text: string, detectedLanguage: string) {
  if (!("speechSynthesis" in window)) return;
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = TTS_LANG_MAP[detectedLanguage] ?? detectedLanguage;
  window.speechSynthesis.speak(utterance);
}

/** Shared recording/upload mechanics — the only thing that differs between
 * the circular default button and the bottom-bar variant is presentation. */
function useVoiceRecorder(domain: VoiceDomain, onIntent: (category: string) => void) {
  const t = useTranslations("voice");
  const [state, setState] = useState<RecorderState>("idle");
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const handleResponse = useCallback(
    async (response: Response) => {
      if (!response.ok) {
        const data = await response.json().catch(() => null);
        const code: string = data?.error ?? "recognition_failed";
        const knownCodes = [
          "rate_limited",
          "not_configured",
          "daily_limit_reached",
          "invalid_body",
          "missing_audio",
          "recognition_failed",
        ];
        setStatusMessage(t(`errors.${knownCodes.includes(code) ? code : "recognition_failed"}`));
        setState("error");
        return;
      }

      const result = await response.json();
      setStatusMessage(result.replyToUser);
      onIntent(result.intentCategory);
      speak(result.replyToUser, result.detectedLanguage);
      setState("idle");
    },
    [onIntent, t]
  );

  const startRecording = useCallback(async () => {
    setStatusMessage(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = MediaRecorder.isTypeSupported("audio/webm") ? "audio/webm" : "";
      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      chunksRef.current = [];

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunksRef.current.push(event.data);
      };

      recorder.onstop = async () => {
        stream.getTracks().forEach((track) => track.stop());
        setState("processing");

        try {
          const blob = new Blob(chunksRef.current, { type: recorder.mimeType || "audio/webm" });
          const base64 = await blobToBase64(blob);

          const response = await fetch("/api/voice", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ audio: base64, mimeType: blob.type, domain }),
          });

          await handleResponse(response);
        } catch (error) {
          console.error("Voice request failed", error);
          setStatusMessage(t("errors.recognition_failed"));
          setState("error");
        }
      };

      mediaRecorderRef.current = recorder;
      recorder.start();
      setState("recording");
    } catch (error) {
      console.error("Microphone access failed", error);
      setStatusMessage(t("errors.mic_denied"));
      setState("error");
    }
  }, [domain, handleResponse, t]);

  const stopRecording = useCallback(() => {
    mediaRecorderRef.current?.stop();
  }, []);

  return { state, statusMessage, startRecording, stopRecording, t };
}

export interface VoiceAssistantProps {
  /** Which category vocabulary the backend should classify speech against. */
  domain?: VoiceDomain;
  onIntent: (category: string) => void;
  /** "bar" is the full-width floating prompt used in the mobile bottom action bar;
   * "topbar" is the small flat square mic button used in the floating topbar. */
  variant?: "topbar" | "bar";
}

export default function VoiceAssistant({ domain = "services", onIntent, variant = "topbar" }: VoiceAssistantProps) {
  const { state, statusMessage, startRecording, stopRecording, t } = useVoiceRecorder(domain, onIntent);

  if (variant === "bar") {
    return (
      <div className="flex flex-col gap-1.5">
        <button
          type="button"
          onClick={state === "recording" ? stopRecording : startRecording}
          disabled={state === "processing"}
          aria-label={state === "recording" ? t("stop") : t("speak")}
          className="flex w-full items-center gap-3 rounded-full bg-gradient-to-r from-[#136349] to-[#1D9E75] px-4 py-3 text-left text-white shadow-lg transition active:scale-[0.99] disabled:opacity-70"
        >
          <span className="flex shrink-0 items-end gap-0.5" aria-hidden="true">
            {[6, 13, 9, 16, 7].map((height, index) => (
              <span
                key={index}
                className={`w-1 rounded-full bg-white/70 ${state === "recording" ? "animate-pulse" : ""}`}
                style={{ height }}
              />
            ))}
          </span>
          <span className="flex-1 text-sm leading-tight">
            <span className="block font-medium">{t("bar.title")}</span>
            <span className="block text-white/80">{t("bar.subtitle")}</span>
          </span>
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white text-[#1D9E75]">
            {state === "processing" ? (
              <Loader2 className="h-5 w-5 animate-spin" strokeWidth={1.75} />
            ) : state === "recording" ? (
              <Square className="h-5 w-5" strokeWidth={1.75} />
            ) : (
              <Mic className="h-5 w-5" strokeWidth={1.75} />
            )}
          </span>
        </button>
        {statusMessage && <p className="px-2 text-center text-xs text-[var(--text-secondary)]">{statusMessage}</p>}
      </div>
    );
  }

  return (
    <div className="relative flex items-center">
      <button
        type="button"
        onClick={state === "recording" ? stopRecording : startRecording}
        disabled={state === "processing"}
        aria-label={state === "recording" ? t("stop") : t("speak")}
        className={`flex h-9 w-9 items-center justify-center rounded-[10px] text-white transition active:scale-95 disabled:pointer-events-none disabled:opacity-50 ${
          state === "recording" ? "animate-pulse bg-red-500" : "bg-[#1D9E75] hover:bg-[#177F5E]"
        }`}
      >
        {state === "processing" ? (
          <Loader2 className="h-4 w-4 animate-spin" strokeWidth={1.75} />
        ) : state === "recording" ? (
          <Square className="h-4 w-4" strokeWidth={1.75} />
        ) : (
          <Mic className="h-4 w-4" strokeWidth={1.75} />
        )}
      </button>
      {statusMessage && (
        <p className="absolute right-0 top-11 z-20 w-56 rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-1)]/95 p-2 text-right text-xs text-[var(--text-3)] shadow-lg">
          {statusMessage}
        </p>
      )}
    </div>
  );
}
