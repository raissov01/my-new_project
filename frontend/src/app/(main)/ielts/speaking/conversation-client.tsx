"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  Loader2,
  MessageSquare,
  Mic,
  RotateCcw,
  Send,
  Square,
  Volume2,
  VolumeX,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSpeakingRecorder } from "@/features/ielts/use-speaking-recorder";
import { conversationTurn, type ConvMessage } from "./actions";
import { PaywallModal } from "@/components/billing/paywall-modal";
import type { PaywallInfo } from "@/lib/billing/paywall";

type Mode = "general" | "ielts";
type Part = "part1" | "part2" | "part3";

interface Message {
  id: string;
  role: "examiner" | "candidate";
  text: string;
}

const IELTS_OPENERS: Record<Part, string> = {
  part1:
    "Good morning. My name is Emma. Before we start, could you tell me your full name, please?",
  part2:
    "Now I'm going to give you a topic and I'd like you to talk about it for one to two minutes. Before you talk you'll have one minute to think about what you're going to say. Please go ahead when you're ready.",
  part3:
    "We've been talking about a topic related to daily life. I'd like to discuss some wider issues now. Do you think people today communicate differently than they did in the past?",
};

const GENERAL_OPENER =
  "Hi! I'm your English conversation partner. What would you like to talk about today?";

export function ConversationModeClient() {
  const [mode, setMode] = useState<Mode | null>(null);
  const [part, setPart] = useState<Part>("part1");
  const [messages, setMessages] = useState<Message[]>([]);
  const [pendingTranscript, setPendingTranscript] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [ttsEnabled, setTtsEnabled] = useState(true);
  const [paywall, setPaywall] = useState<PaywallInfo | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [transcribing, setTranscribing] = useState(false);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const prevAudioUrl = useRef<string | null>(null);

  const {
    audioUrl,
    clearRecording,
    detectedTranscript,
    isRecording,
    isStarting,
    startRecording,
    stopRecording,
    supportsRecording,
  } = useSpeakingRecorder();

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // When a new audio recording is ready, transcribe it via Whisper
  useEffect(() => {
    if (!audioUrl || audioUrl === prevAudioUrl.current) return;
    prevAudioUrl.current = audioUrl;

    if (detectedTranscript.trim()) {
      setPendingTranscript(detectedTranscript.trim());
      return;
    }

    void whisperTranscribe(audioUrl);
  }, [audioUrl, detectedTranscript]);

  async function whisperTranscribe(url: string) {
    setTranscribing(true);
    try {
      const resp = await fetch(url);
      const blob = await resp.blob();
      const form = new FormData();
      form.append("file", blob, "audio.webm");
      const res = await fetch("/api/whisper", { method: "POST", body: form });
      if (!res.ok) throw new Error("transcription failed");
      const data = (await res.json()) as { text: string };
      setPendingTranscript(data.text.trim());
    } catch {
      setError("Could not transcribe audio. Type your response below or try again.");
    } finally {
      setTranscribing(false);
    }
  }

  const playTTS = useCallback(async (text: string) => {
    if (!ttsEnabled) return;
    try {
      setIsSpeaking(true);
      const res = await fetch("/api/speech/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      if (!res.ok) return;

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);

      if (audioRef.current) {
        audioRef.current.pause();
      }

      const audio = new Audio(url);
      audioRef.current = audio;
      audio.onended = () => {
        setIsSpeaking(false);
        URL.revokeObjectURL(url);
      };
      audio.onerror = () => setIsSpeaking(false);
      await audio.play().catch(() => setIsSpeaking(false));
    } catch {
      setIsSpeaking(false);
    }
  }, [ttsEnabled]);

  function stopTTS() {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    setIsSpeaking(false);
  }

  function addMessage(role: "examiner" | "candidate", text: string) {
    const msg: Message = { id: `${Date.now()}-${role}`, role, text };
    setMessages((prev) => [...prev, msg]);
    return msg;
  }

  async function startMode(selectedMode: Mode, selectedPart: Part) {
    stopTTS();
    setMode(selectedMode);
    setPart(selectedPart);
    setMessages([]);
    setError(null);
    setPendingTranscript("");
    clearRecording();
    prevAudioUrl.current = null;

    const opener =
      selectedMode === "ielts" ? IELTS_OPENERS[selectedPart] : GENERAL_OPENER;
    addMessage("examiner", opener);
    await playTTS(opener);
  }

  async function sendMessage() {
    const text = pendingTranscript.trim();
    if (!text || !mode || isProcessing) return;

    setError(null);
    const snapshot = pendingTranscript;
    setPendingTranscript("");
    clearRecording();
    prevAudioUrl.current = null;

    const candidateMsg: Message = {
      id: `${Date.now()}-candidate`,
      role: "candidate",
      text,
    };
    const updatedMessages = [...messages, candidateMsg];
    setMessages(updatedMessages);
    setIsProcessing(true);

    try {
      const history: ConvMessage[] = messages.map((m) => ({
        role: m.role,
        text: m.text,
      }));

      const result = await conversationTurn(mode, part, history, text);

      if ("paywall" in result) {
        setPaywall(result.paywall);
        return;
      }
      if ("error" in result) {
        setError(result.error);
        setPendingTranscript(snapshot);
        return;
      }

      addMessage("examiner", result.reply);
      await playTTS(result.reply);
    } catch {
      setError("Failed to get a response. Please try again.");
      setPendingTranscript(snapshot);
    } finally {
      setIsProcessing(false);
    }
  }

  function handleReset() {
    stopTTS();
    setMode(null);
    setMessages([]);
    setPendingTranscript("");
    setError(null);
    clearRecording();
    prevAudioUrl.current = null;
  }

  // ── Mode selection screen ───────────────────────────────────────────────

  if (!mode) {
    return (
      <div className="space-y-6">
        <div className="grid gap-4 sm:grid-cols-2">
          <ModeCard
            title="General English"
            description="Free conversation with an AI partner on any topic. Build fluency, expand vocabulary, and gain confidence."
            badge="Any topic"
            badgeColor="bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
            onClick={() => startMode("general", "part1")}
          />
          <ModeCard
            title="IELTS Speaking"
            description="Official IELTS examiner format. Practice Part 1, 2, or 3 with realistic questions and examiner style."
            badge="Band-focused"
            badgeColor="bg-violet-500/10 text-violet-400 border-violet-500/20"
            onClick={null}
            extra={
              <div className="mt-4 space-y-3">
                <p className="text-xs font-medium uppercase tracking-wider text-[var(--text-muted)]">
                  Choose part
                </p>
                <div className="grid grid-cols-3 gap-2">
                  {(["part1", "part2", "part3"] as Part[]).map((p) => (
                    <button
                      key={p}
                      onClick={() => startMode("ielts", p)}
                      className="rounded-xl border border-[var(--border)] bg-[var(--bg-elevated)] py-2.5 text-sm font-medium text-[var(--text-primary)] transition-all hover:border-violet-500/40 hover:bg-violet-500/5"
                    >
                      {p === "part1" ? "Part 1" : p === "part2" ? "Part 2" : "Part 3"}
                    </button>
                  ))}
                </div>
              </div>
            }
          />
        </div>
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-surface)] px-5 py-4 text-sm text-[var(--text-secondary)]">
          <span className="font-medium text-[var(--text-primary)]">How it works:</span> speak or
          type your response, the AI replies and speaks back. Use Whisper transcription for accurate
          speech-to-text in any browser.
        </div>
      </div>
    );
  }

  // ── Active conversation ─────────────────────────────────────────────────

  const modeLabel =
    mode === "general"
      ? "General English"
      : `IELTS Speaking — ${part === "part1" ? "Part 1" : part === "part2" ? "Part 2" : "Part 3"}`;

  return (
    <div className="flex flex-col gap-4">
      {/* Header bar */}
      <div className="flex items-center justify-between rounded-2xl border border-[var(--border)] bg-[var(--bg-surface)] px-4 py-3">
        <div className="flex items-center gap-2">
          <MessageSquare className="h-4 w-4 text-violet-400" />
          <span className="text-sm font-semibold text-[var(--text-primary)]">{modeLabel}</span>
          {isSpeaking && (
            <span className="flex items-center gap-1.5 rounded-full border border-violet-500/20 bg-violet-500/10 px-2.5 py-1 text-[11px] font-medium text-violet-400">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-violet-400" />
              Speaking
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              setTtsEnabled((v) => !v);
              if (isSpeaking) stopTTS();
            }}
            className="rounded-lg p-1.5 text-[var(--text-muted)] transition-colors hover:text-[var(--text-primary)]"
            title={ttsEnabled ? "Mute AI voice" : "Unmute AI voice"}
          >
            {ttsEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
          </button>
          <Button size="sm" variant="outline" onClick={handleReset}>
            <RotateCcw className="h-3.5 w-3.5" />
            New chat
          </Button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex min-h-[320px] flex-col gap-3 rounded-2xl border border-[var(--border)] bg-[var(--bg-elevated)] p-4">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex ${msg.role === "candidate" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-6 ${
                msg.role === "examiner"
                  ? "rounded-tl-sm border border-violet-500/20 bg-violet-500/8 text-[var(--text-primary)]"
                  : "rounded-tr-sm border border-[var(--border)] bg-[var(--bg-surface)] text-[var(--text-primary)]"
              }`}
            >
              <p className="mb-1 text-[10px] font-semibold uppercase tracking-widest text-[var(--text-muted)]">
                {msg.role === "examiner"
                  ? mode === "ielts"
                    ? "Examiner"
                    : "AI Partner"
                  : "You"}
              </p>
              {msg.text}
            </div>
          </div>
        ))}

        {isProcessing && (
          <div className="flex justify-start">
            <div className="flex items-center gap-2 rounded-2xl rounded-tl-sm border border-violet-500/20 bg-violet-500/8 px-4 py-3 text-sm text-violet-400">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              Thinking...
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Error */}
      {error && (
        <div className="rounded-2xl border border-red-500/20 bg-red-500/8 px-4 py-3 text-sm text-red-400">
          {error}
        </div>
      )}

      {/* Input bar */}
      <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-surface)] p-4">
        {/* Transcript preview */}
        {(pendingTranscript || transcribing) && (
          <div className="mb-3 rounded-xl border border-[var(--border)] bg-[var(--bg-elevated)] px-4 py-3">
            <p className="mb-1 text-[10px] font-semibold uppercase tracking-widest text-[var(--text-muted)]">
              Your response
            </p>
            {transcribing ? (
              <div className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Transcribing...
              </div>
            ) : (
              <textarea
                value={pendingTranscript}
                onChange={(e) => setPendingTranscript(e.target.value)}
                rows={3}
                className="w-full resize-none bg-transparent text-sm leading-6 text-[var(--text-primary)] outline-none placeholder:text-[var(--text-muted)]"
                placeholder="Edit your response..."
              />
            )}
          </div>
        )}

        <div className="flex items-center gap-2">
          {supportsRecording && (
            <>
              {isRecording ? (
                <Button size="sm" onClick={stopRecording} className="shrink-0">
                  <Square className="h-3.5 w-3.5" />
                  Stop
                </Button>
              ) : (
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => {
                    setPendingTranscript("");
                    clearRecording();
                    prevAudioUrl.current = null;
                    startRecording();
                  }}
                  disabled={isStarting || isProcessing || transcribing}
                  className="shrink-0"
                >
                  <Mic className="h-3.5 w-3.5" />
                  {isStarting ? "Starting..." : "Record"}
                </Button>
              )}
            </>
          )}

          {/* Text input when not recording */}
          {!isRecording && !pendingTranscript && (
            <input
              type="text"
              placeholder="Or type your response..."
              className="min-w-0 flex-1 rounded-xl border border-[var(--border)] bg-[var(--bg-elevated)] px-4 py-2.5 text-sm text-[var(--text-primary)] outline-none placeholder:text-[var(--text-muted)] focus:border-violet-400"
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  const val = (e.target as HTMLInputElement).value.trim();
                  if (val) {
                    setPendingTranscript(val);
                    (e.target as HTMLInputElement).value = "";
                  }
                }
              }}
            />
          )}

          <Button
            size="sm"
            onClick={sendMessage}
            disabled={!pendingTranscript.trim() || isProcessing || transcribing}
            className="shrink-0"
          >
            {isProcessing ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Send className="h-3.5 w-3.5" />
            )}
            Send
          </Button>
        </div>

        {isRecording && (
          <div className="mt-3 flex items-center gap-2 text-sm text-red-400">
            <span className="h-2 w-2 animate-pulse rounded-full bg-red-400" />
            Recording — speak clearly, then press Stop
          </div>
        )}
      </div>

      <PaywallModal paywall={paywall} onClose={() => setPaywall(null)} />
    </div>
  );
}

function ModeCard({
  title,
  description,
  badge,
  badgeColor,
  onClick,
  extra,
}: {
  title: string;
  description: string;
  badge: string;
  badgeColor: string;
  onClick: (() => void) | null;
  extra?: React.ReactNode;
}) {
  return (
    <div
      className={`rounded-2xl border border-[var(--border)] bg-[var(--bg-elevated)] p-5 ${
        onClick ? "cursor-pointer transition-all hover:border-violet-500/30 hover:bg-violet-500/5" : ""
      }`}
      onClick={onClick ?? undefined}
    >
      <div className="flex items-start justify-between gap-3">
        <h3 className="text-base font-semibold text-[var(--text-primary)]">{title}</h3>
        <span
          className={`shrink-0 rounded-full border px-2.5 py-1 text-[11px] font-medium ${badgeColor}`}
        >
          {badge}
        </span>
      </div>
      <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">{description}</p>
      {extra}
    </div>
  );
}
