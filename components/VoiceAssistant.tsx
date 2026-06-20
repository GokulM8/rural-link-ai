"use client";

import { useCallback, useRef, useState } from "react";
import { Loader2, Mic, Square } from "lucide-react";
import { useTranslations } from "next-intl";
import type { ServiceCategory } from "@/lib/overpass";

export interface VoiceAssistantProps {
  onIntent: (category: ServiceCategory | "unknown") => void;
}

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

export default function VoiceAssistant({ onIntent }: VoiceAssistantProps) {
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
            body: JSON.stringify({ audio: base64, mimeType: blob.type }),
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
  }, [handleResponse, t]);

  const stopRecording = useCallback(() => {
    mediaRecorderRef.current?.stop();
  }, []);

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        onClick={state === "recording" ? stopRecording : startRecording}
        disabled={state === "processing"}
        aria-label={state === "recording" ? t("stop") : t("speak")}
        className={`flex h-9 w-9 items-center justify-center rounded-full transition disabled:opacity-50 ${
          state === "recording"
            ? "animate-pulse bg-red-500 text-white"
            : "bg-primary text-white hover:bg-primary-600"
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
      {statusMessage && <p className="max-w-[220px] text-right text-xs text-foreground/60">{statusMessage}</p>}
    </div>
  );
}
