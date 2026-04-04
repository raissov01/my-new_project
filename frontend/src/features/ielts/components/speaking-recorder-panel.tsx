"use client";

import { Mic, PauseCircle, PlayCircle, RotateCcw, Volume2, WandSparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSpeakingRecorder } from "@/features/ielts/use-speaking-recorder";

type SpeakingRecorderPanelProps = {
  onUseTranscript?: (transcript: string) => void;
  compact?: boolean;
};

export function SpeakingRecorderPanel({
  onUseTranscript,
  compact = false,
}: SpeakingRecorderPanelProps) {
  const {
    audioUrl,
    clearRecording,
    detectedTranscript,
    error,
    isRecording,
    isStarting,
    startRecording,
    stopRecording,
    supportsRecording,
    supportsSpeechRecognition,
  } = useSpeakingRecorder();

  if (!supportsRecording) {
    return null;
  }

  return (
    <div
      className={`rounded-2xl border border-[var(--border)] bg-[var(--bg-surface)] ${
        compact ? "p-4" : "p-5"
      }`}
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="flex items-center gap-2 text-sm font-semibold text-[var(--text-primary)]">
            <Mic className="h-4 w-4 text-violet-400" />
            Record your answer
          </h3>
          <p className="mt-1 text-sm text-[var(--text-secondary)]">
            Record your speaking response, replay it, and use live transcript when the browser supports it.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {isRecording ? (
            <Button size="sm" onClick={stopRecording}>
              <PauseCircle className="h-4 w-4" />
              Stop recording
            </Button>
          ) : (
            <Button size="sm" onClick={startRecording} disabled={isStarting}>
              <Mic className="h-4 w-4" />
              {isStarting ? "Starting..." : "Start recording"}
            </Button>
          )}
          {audioUrl ? (
            <Button size="sm" variant="secondary" onClick={clearRecording}>
              <RotateCcw className="h-4 w-4" />
              Clear
            </Button>
          ) : null}
        </div>
      </div>

      {isRecording ? (
        <div className="mt-4 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm font-medium text-red-300">
          Recording is live. Speak naturally like the real IELTS interview.
        </div>
      ) : null}

      {audioUrl ? (
        <div className="mt-4 space-y-3">
          <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-elevated)] p-4">
            <div className="mb-3 flex items-center gap-2 text-xs font-medium uppercase tracking-[0.16em] text-[var(--text-muted)]">
              <PlayCircle className="h-4 w-4" />
              Recorded audio
            </div>
            <audio controls src={audioUrl} className="w-full">
              <track kind="captions" />
            </audio>
          </div>

          {detectedTranscript ? (
            <div className="rounded-xl border border-violet-500/20 bg-violet-500/5 p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2 text-sm font-semibold text-violet-300">
                  <WandSparkles className="h-4 w-4" />
                  Detected transcript
                </div>
                {onUseTranscript ? (
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => onUseTranscript(detectedTranscript)}
                  >
                    Use transcript
                  </Button>
                ) : null}
              </div>
              <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-[var(--text-secondary)]">
                {detectedTranscript}
              </p>
            </div>
          ) : (
            <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-elevated)] px-4 py-3 text-sm text-[var(--text-secondary)]">
              {supportsSpeechRecognition
                ? "Transcript will appear after speech is detected."
                : "This browser can record audio, but live transcript is not available here. You can replay the audio and type the answer manually."}
            </div>
          )}
        </div>
      ) : (
        <div className="mt-4 rounded-xl border border-[var(--border)] bg-[var(--bg-elevated)] px-4 py-3 text-sm text-[var(--text-secondary)]">
          <div className="flex items-center gap-2">
            <Volume2 className="h-4 w-4 text-[var(--text-muted)]" />
            {supportsSpeechRecognition
              ? "Audio recording and browser transcript are both available."
              : "Audio recording is available. After recording, replay the answer and paste or type the transcript for AI scoring."}
          </div>
        </div>
      )}

      {error ? (
        <div className="mt-4 rounded-xl border border-red-500/20 bg-red-500/8 px-4 py-3 text-sm text-red-300">
          {error}
        </div>
      ) : null}
    </div>
  );
}
