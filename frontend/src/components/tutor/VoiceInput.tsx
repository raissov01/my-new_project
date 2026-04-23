"use client";

import { useState, useRef } from "react";
import { Mic, MicOff, Loader2 } from "lucide-react";

interface Props {
  onTranscript: (text: string) => void;
  disabled?: boolean;
}

type State = "idle" | "recording" | "transcribing";

export function VoiceInput({ onTranscript, disabled }: Props) {
  const [state, setState] = useState<State>("idle");
  const [error, setError] = useState("");
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobEvent["data"][]>([]);

  const startRecording = async () => {
    setError("");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream, { mimeType: "audio/webm" });
      chunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        setState("transcribing");
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        const form = new FormData();
        form.append("file", blob, "audio.webm");
        try {
          const res = await fetch("/api/whisper", { method: "POST", body: form });
          const data = await res.json() as { text?: string; error?: string };
          if (data.text) onTranscript(data.text.trim());
          else setError(data.error ?? "Transcription failed");
        } catch {
          setError("Network error");
        } finally {
          setState("idle");
        }
      };

      recorder.start();
      recorderRef.current = recorder;
      setState("recording");
    } catch {
      setError("Microphone access denied");
      setState("idle");
    }
  };

  const stopRecording = () => {
    recorderRef.current?.stop();
    recorderRef.current = null;
  };

  const handleClick = () => {
    if (state === "idle") startRecording();
    else if (state === "recording") stopRecording();
  };

  return (
    <div className="relative">
      <button
        type="button"
        onClick={handleClick}
        disabled={disabled || state === "transcribing"}
        title={state === "recording" ? "Stop recording" : "Voice input"}
        className={`flex h-9 w-9 items-center justify-center rounded-[var(--radius-md)] transition-colors disabled:opacity-40 ${
          state === "recording"
            ? "bg-red-500 text-white animate-pulse"
            : "border border-[var(--border)] text-[var(--text-secondary)] hover:bg-[var(--bg-soft)]"
        }`}
      >
        {state === "transcribing" ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : state === "recording" ? (
          <MicOff className="h-4 w-4" />
        ) : (
          <Mic className="h-4 w-4" />
        )}
      </button>
      {error && (
        <p className="absolute bottom-full mb-1 left-1/2 -translate-x-1/2 whitespace-nowrap rounded bg-red-500 px-2 py-1 text-[10px] text-white">
          {error}
        </p>
      )}
    </div>
  );
}
