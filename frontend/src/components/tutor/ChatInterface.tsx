"use client";

import { useState, useRef, useEffect, useTransition, useCallback } from "react";
import { Loader2, CheckCircle2, Volume2, VolumeX, Mic } from "lucide-react";
import { sendMessage, gradeConversation, startConversation } from "@/features/tutor/api";
import type { AIScenario, ConversationMessage, GradeScores } from "@/features/tutor/api";
import { GradeResults } from "./GradeResults";
import { useLocale } from "@/components/providers/locale-provider";

type ConvState = "idle" | "recording" | "transcribing" | "thinking" | "speaking";

const STATE_LABEL: Record<ConvState, string> = {
  idle: "Tap to speak",
  recording: "Listening...",
  transcribing: "Processing...",
  thinking: "Thinking...",
  speaking: "Speaking...",
};

interface Props {
  scenario: AIScenario;
}

export function ChatInterface({ scenario }: Props) {
  const { t } = useLocale();
  const [convId, setConvId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ConversationMessage[]>([]);
  const [convState, setConvState] = useState<ConvState>("idle");
  const [, startServerTransition] = useTransition();
  const [grading, setGrading] = useState(false);
  const [scores, setScores] = useState<GradeScores | null>(null);
  const [started, setStarted] = useState(false);
  const [gradeError, setGradeError] = useState(false);
  const [ttsEnabled, setTtsEnabled] = useState(true);
  const [error, setError] = useState("");

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const convIdRef = useRef<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => { convIdRef.current = convId; }, [convId]);
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  const playTTS = useCallback(async (text: string): Promise<void> => {
    if (!ttsEnabled) return;
    return new Promise((resolve) => {
      fetch("/api/speech/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      })
        .then((res) => (res.ok ? res.blob() : null))
        .then((blob) => {
          if (!blob) { resolve(); return; }
          const url = URL.createObjectURL(blob);
          if (audioRef.current) audioRef.current.pause();
          const audio = new Audio(url);
          audioRef.current = audio;
          audio.onended = () => { URL.revokeObjectURL(url); resolve(); };
          audio.onerror = () => resolve();
          audio.play().catch(() => resolve());
        })
        .catch(() => resolve());
    });
  }, [ttsEnabled]);

  const handleAIReply = useCallback(async (userText: string) => {
    const cid = convIdRef.current;
    if (!cid) return;

    setConvState("thinking");
    setMessages((prev) => [...prev, { role: "user", content: userText }]);

    return new Promise<void>((resolve) => {
      startServerTransition(async () => {
        const reply = await sendMessage(cid, userText);
        if (reply) {
          setMessages((prev) => [...prev, { role: "assistant", content: reply }]);
          setConvState("speaking");
          await playTTS(reply);
        }
        setConvState("idle");
        resolve();
      });
    });
  }, [playTTS, startServerTransition]);

  const stopRecording = useCallback(() => {
    const rec = mediaRecorderRef.current;
    if (rec && rec.state !== "inactive") rec.stop();
  }, []);

  const startRecording = useCallback(async () => {
    setError("");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioChunksRef.current = [];

      const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
        : MediaRecorder.isTypeSupported("audio/webm") ? "audio/webm" : "";

      const recorder = mimeType
        ? new MediaRecorder(stream, { mimeType })
        : new MediaRecorder(stream);

      recorder.ondataavailable = (e) => { if (e.data.size > 0) audioChunksRef.current.push(e.data); };

      recorder.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(audioChunksRef.current, { type: recorder.mimeType || "audio/webm" });
        audioChunksRef.current = [];
        mediaRecorderRef.current = null;

        if (blob.size < 1000) { setConvState("idle"); return; }

        setConvState("transcribing");
        const form = new FormData();
        form.append("file", blob, "audio.webm");

        try {
          const res = await fetch("/api/whisper", { method: "POST", body: form });
          const data = (await res.json()) as { text?: string; error?: string };
          const text = data.text?.trim() ?? "";
          if (!text) { setError("Could not hear you. Please try again."); setConvState("idle"); return; }
          await handleAIReply(text);
        } catch {
          setError("Transcription failed. Please try again.");
          setConvState("idle");
        }
      };

      mediaRecorderRef.current = recorder;
      recorder.start();
      setConvState("recording");
    } catch {
      setError("Microphone access denied.");
      setConvState("idle");
    }
  }, [handleAIReply]);

  const handleTap = useCallback(() => {
    if (convState === "recording") stopRecording();
    else if (convState === "idle") void startRecording();
  }, [convState, startRecording, stopRecording]);

  const handleStart = () => {
    startServerTransition(async () => {
      const conv = await startConversation(scenario.id);
      if (!conv) return;
      setConvId(conv.id);
      convIdRef.current = conv.id;
      setStarted(true);
      const greeting = `Hello! I'm ${scenario.personaName ?? "your conversation partner"}. ${scenario.description} Ready when you are.`;
      setMessages([{ role: "assistant", content: greeting }]);
      setConvState("speaking");
      await playTTS(greeting);
      setConvState("idle");
    });
  };

  const handleGrade = async () => {
    const cid = convIdRef.current;
    if (!cid) return;
    setGrading(true);
    setGradeError(false);
    const result = await gradeConversation(cid);
    if (result) setScores(result);
    else setGradeError(true);
    setGrading(false);
  };

  const userMsgCount = messages.filter((m) => m.role === "user").length;
  const canTap = convState === "idle" || convState === "recording";
  const isActive = convState !== "idle";

  if (scores) return <GradeResults scores={scores} scenarioSlug={scenario.slug} />;

  if (!started) {
    return (
      <div className="rounded-[var(--radius-xl)] border border-[var(--border)] bg-[var(--bg-surface)] p-8 space-y-6 text-center">
        <span className="text-5xl" role="img">{scenario.icon ?? "💬"}</span>
        <div className="space-y-1">
          <h2 className="text-xl font-bold">{scenario.title}</h2>
          {scenario.personaName && (
            <p className="text-sm text-[var(--text-secondary)]">
              {t("tutor.withPerson", { name: scenario.personaName })}
            </p>
          )}
        </div>
        <div className="rounded-[var(--radius-md)] bg-[var(--bg-soft)] p-4 text-left text-sm space-y-2">
          <p className="font-semibold">{t("tutor.yourGoal")}</p>
          <p className="text-[var(--text-secondary)]">{scenario.studentGoal}</p>
          {scenario.vocabFocus && scenario.vocabFocus.length > 0 && (
            <div className="flex flex-wrap gap-1.5 pt-1">
              {scenario.vocabFocus.map((w) => (
                <span key={w} className="rounded-full bg-[var(--primary-soft)] px-2 py-0.5 text-xs text-[var(--primary)]">{w}</span>
              ))}
            </div>
          )}
        </div>
        <button
          onClick={handleStart}
          disabled={convState === "speaking"}
          className="w-full rounded-[var(--radius-md)] bg-[var(--primary)] py-3 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50 transition-opacity"
        >
          {convState === "speaking"
            ? <Loader2 className="mx-auto h-4 w-4 animate-spin" />
            : t("tutor.startConversation")}
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[75vh] rounded-[var(--radius-xl)] border border-[var(--border)] bg-[var(--bg-surface)] overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[var(--border)] px-4 py-3 shrink-0">
        <div className="flex items-center gap-2">
          <p className="font-semibold text-sm">{scenario.personaName ?? scenario.title}</p>
          {isActive && (
            <span className="flex items-center gap-1.5 rounded-full bg-[var(--bg-soft)] px-2.5 py-1 text-[11px] text-[var(--text-secondary)]">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[var(--primary)]" />
              {STATE_LABEL[convState]}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => { setTtsEnabled((v) => !v); audioRef.current?.pause(); }}
            className="rounded-[var(--radius-md)] border border-[var(--border)] p-1.5 text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
          >
            {ttsEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
          </button>
          {userMsgCount >= 3 && (
            <button
              onClick={handleGrade}
              disabled={grading || isActive}
              className="flex items-center gap-1.5 rounded-[var(--radius-md)] border border-[var(--primary)] px-3 py-1.5 text-xs font-medium text-[var(--primary)] hover:bg-[var(--primary-soft)] disabled:opacity-50 transition-colors"
            >
              {grading ? <Loader2 className="h-3 w-3 animate-spin" /> : <CheckCircle2 className="h-3 w-3" />}
              {t("tutor.finishGrade")}
            </button>
          )}
          {gradeError && <p className="text-xs text-red-500">{t("tutor.gradingFailed")}</p>}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
            <div className={`max-w-[80%] rounded-[var(--radius-lg)] px-3 py-2 text-sm ${
              msg.role === "user"
                ? "bg-[var(--primary)] text-white"
                : "bg-[var(--bg-soft)] text-[var(--text-primary)]"
            }`}>
              {msg.role !== "user" && (
                <p className="mb-1 text-[10px] font-semibold uppercase tracking-widest opacity-40">
                  {scenario.personaName ?? "AI"}
                </p>
              )}
              {msg.content}
            </div>
          </div>
        ))}
        {(convState === "thinking" || convState === "transcribing") && (
          <div className="flex justify-start">
            <div className="rounded-[var(--radius-lg)] bg-[var(--bg-soft)] px-3 py-2">
              <Loader2 className="h-4 w-4 animate-spin text-[var(--text-secondary)]" />
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Big tap button */}
      <div className="shrink-0 border-t border-[var(--border)] flex flex-col items-center gap-2 py-5">
        {error && <p className="text-xs text-red-500 mb-1">{error}</p>}

        <button
          onClick={handleTap}
          disabled={!canTap}
          className={`relative flex h-16 w-16 items-center justify-center rounded-full transition-all disabled:opacity-40 ${
            convState === "recording"
              ? "bg-red-500 shadow-[0_0_0_10px_rgba(239,68,68,0.15)]"
              : "border-2 border-[var(--border)] bg-[var(--bg-elevated)] hover:border-[var(--primary)] hover:bg-[var(--primary-soft)]"
          }`}
        >
          {convState === "recording" ? (
            <span className="h-4 w-4 rounded-sm bg-white" />
          ) : convState === "thinking" || convState === "transcribing" ? (
            <Loader2 className="h-6 w-6 animate-spin text-[var(--text-muted)]" />
          ) : (
            <Mic className="h-6 w-6 text-[var(--text-secondary)]" />
          )}
          {convState === "recording" && (
            <span className="absolute inset-0 animate-ping rounded-full bg-red-400 opacity-25" />
          )}
        </button>

        <p className="text-xs text-[var(--text-muted)]">
          {convState === "recording" ? "Tap to stop" : convState === "idle" ? "Tap to speak" : STATE_LABEL[convState]}
        </p>
        {userMsgCount >= 15 && <p className="text-xs text-amber-600">{t("tutor.maxExchanges")}</p>}
      </div>
    </div>
  );
}
