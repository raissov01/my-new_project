"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Loader2, Mic, RotateCcw, Volume2, VolumeX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { conversationTurn, type ConvMessage } from "./actions";
import { PaywallModal } from "@/components/billing/paywall-modal";
import type { PaywallInfo } from "@/lib/billing/paywall";

type Part = "part1" | "part2" | "part3";
type ConvState = "idle" | "recording" | "transcribing" | "thinking" | "speaking";

interface Message {
  id: string;
  role: "examiner" | "candidate";
  text: string;
}

const PARTS: { key: Part; label: string; desc: string }[] = [
  { key: "part1", label: "Part 1", desc: "Introduction & Interview — personal questions" },
  { key: "part2", label: "Part 2", desc: "Long Turn — cue card topic, 1-2 min monologue" },
  { key: "part3", label: "Part 3", desc: "Two-way Discussion — abstract ideas" },
];

const OPENERS: Record<Part, string> = {
  part1: "Good morning. My name is Emma. Before we start, could you tell me your full name, please?",
  part2: "Now I'm going to give you a topic and I'd like you to talk about it for one to two minutes. Before you talk you'll have one minute to think about what you're going to say. Please go ahead when you're ready.",
  part3: "We've been talking about a topic related to everyday life. I'd like to discuss some wider issues now. Do you think the way people communicate has changed significantly over the past few decades?",
};

const STATE_LABEL: Record<ConvState, string> = {
  idle: "Tap to speak",
  recording: "Listening...",
  transcribing: "Processing...",
  thinking: "Thinking...",
  speaking: "Examiner speaking",
};

export function ConversationModeClient() {
  const [part, setPart] = useState<Part | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [convState, setConvState] = useState<ConvState>("idle");
  const [ttsEnabled, setTtsEnabled] = useState(true);
  const [paywall, setPaywall] = useState<PaywallInfo | null>(null);
  const [error, setError] = useState<string | null>(null);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const historyRef = useRef<Message[]>([]);

  // Keep history ref in sync so callbacks always see the latest messages
  useEffect(() => { historyRef.current = messages; }, [messages]);
  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  const addMessage = useCallback((role: "examiner" | "candidate", text: string) => {
    const msg: Message = { id: `${Date.now()}-${role}`, role, text };
    setMessages((prev) => [...prev, msg]);
    return msg;
  }, []);

  const playTTS = useCallback(async (text: string): Promise<void> => {
    if (!ttsEnabled) return;
    return new Promise((resolve) => {
      fetch("/api/speech/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      })
        .then((res) => {
          if (!res.ok) { resolve(); return; }
          return res.blob();
        })
        .then((blob) => {
          if (!blob) { resolve(); return; }
          const url = URL.createObjectURL(blob);
          if (audioRef.current) audioRef.current.pause();
          const audio = new Audio(url);
          audioRef.current = audio;
          audio.onended = () => { URL.revokeObjectURL(url); resolve(); };
          audio.onerror = () => { resolve(); };
          audio.play().catch(() => resolve());
        })
        .catch(() => resolve());
    });
  }, [ttsEnabled]);

  const handleAITurn = useCallback(async (userText: string, currentPart: Part) => {
    setConvState("thinking");
    const history: ConvMessage[] = historyRef.current.map((m) => ({ role: m.role, text: m.text }));

    const result = await conversationTurn("ielts", currentPart, history, userText);

    if ("paywall" in result) { setPaywall(result.paywall); setConvState("idle"); return; }
    if ("error" in result) { setError(result.error); setConvState("idle"); return; }

    addMessage("examiner", result.reply);
    setConvState("speaking");
    await playTTS(result.reply);
    setConvState("idle");
  }, [addMessage, playTTS]);

  const stopRecording = useCallback(() => {
    const recorder = mediaRecorderRef.current;
    if (recorder && recorder.state !== "inactive") recorder.stop();
  }, []);

  const startRecording = useCallback(async (currentPart: Part) => {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioChunksRef.current = [];

      const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
        : MediaRecorder.isTypeSupported("audio/webm") ? "audio/webm" : "";

      const recorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);

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

          addMessage("candidate", text);
          await handleAITurn(text, currentPart);
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
  }, [addMessage, handleAITurn]);

  const handleTap = useCallback((currentPart: Part) => {
    if (convState === "recording") {
      stopRecording();
    } else if (convState === "idle") {
      void startRecording(currentPart);
    }
  }, [convState, startRecording, stopRecording]);

  async function startPart(selectedPart: Part) {
    if (audioRef.current) { audioRef.current.pause(); audioRef.current = null; }
    setPart(selectedPart);
    setMessages([]);
    setError(null);
    setConvState("speaking");

    const opener = OPENERS[selectedPart];
    addMessage("examiner", opener);
    await playTTS(opener);
    setConvState("idle");
  }

  function handleReset() {
    if (audioRef.current) { audioRef.current.pause(); audioRef.current = null; }
    if (mediaRecorderRef.current?.state !== "inactive") mediaRecorderRef.current?.stop();
    setPart(null);
    setMessages([]);
    setError(null);
    setConvState("idle");
  }

  // ── Part selection ──────────────────────────────────────────────────────

  if (!part) {
    return (
      <div className="space-y-4">
        <p className="text-sm text-[var(--text-secondary)]">
          Choose a part. The examiner will speak first, then tap the button to respond — no typing needed.
        </p>
        <div className="grid gap-3 sm:grid-cols-3">
          {PARTS.map((p) => (
            <button
              key={p.key}
              onClick={() => startPart(p.key)}
              className="rounded-2xl border border-[var(--border)] bg-[var(--bg-elevated)] p-5 text-left transition-all hover:border-violet-500/40 hover:bg-violet-500/5"
            >
              <span className="rounded-full border border-violet-500/20 bg-violet-500/10 px-2.5 py-1 text-[11px] font-semibold text-violet-400">
                {p.label}
              </span>
              <p className="mt-3 text-sm font-semibold text-[var(--text-primary)]">{p.label}</p>
              <p className="mt-1 text-sm leading-6 text-[var(--text-secondary)]">{p.desc}</p>
            </button>
          ))}
        </div>
      </div>
    );
  }

  // ── Active conversation ─────────────────────────────────────────────────

  const partLabel = PARTS.find((p) => p.key === part)?.label ?? part;
  const isActive = convState !== "idle";
  const canTap = convState === "idle" || convState === "recording";

  return (
    <div className="flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-center justify-between rounded-2xl border border-[var(--border)] bg-[var(--bg-surface)] px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-[var(--text-primary)]">
            IELTS Speaking — {partLabel}
          </span>
          {isActive && (
            <span className="flex items-center gap-1.5 rounded-full border border-violet-500/20 bg-violet-500/10 px-2.5 py-1 text-[11px] font-medium text-violet-400">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-violet-400" />
              {STATE_LABEL[convState]}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => { setTtsEnabled((v) => !v); if (audioRef.current) { audioRef.current.pause(); } }}
            className="rounded-lg p-1.5 text-[var(--text-muted)] transition-colors hover:text-[var(--text-primary)]"
            title={ttsEnabled ? "Mute examiner" : "Unmute examiner"}
          >
            {ttsEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
          </button>
          <Button size="sm" variant="outline" onClick={handleReset}>
            <RotateCcw className="h-3.5 w-3.5" />
            New
          </Button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex min-h-[260px] flex-col gap-3 rounded-2xl border border-[var(--border)] bg-[var(--bg-elevated)] p-4">
        {messages.map((msg) => (
          <div key={msg.id} className={`flex ${msg.role === "candidate" ? "justify-end" : "justify-start"}`}>
            <div
              className={`max-w-[82%] rounded-2xl px-4 py-3 text-sm leading-6 ${
                msg.role === "examiner"
                  ? "rounded-tl-sm border border-violet-500/20 bg-violet-500/8 text-[var(--text-primary)]"
                  : "rounded-tr-sm border border-[var(--border)] bg-[var(--bg-surface)] text-[var(--text-primary)]"
              }`}
            >
              <p className="mb-1 text-[10px] font-semibold uppercase tracking-widest text-[var(--text-muted)]">
                {msg.role === "examiner" ? "Examiner" : "You"}
              </p>
              {msg.text}
            </div>
          </div>
        ))}

        {(convState === "thinking" || convState === "transcribing") && (
          <div className="flex justify-start">
            <div className="flex items-center gap-2 rounded-2xl rounded-tl-sm border border-violet-500/20 bg-violet-500/8 px-4 py-3 text-sm text-violet-400">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              {STATE_LABEL[convState]}
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {error && (
        <div className="rounded-2xl border border-red-500/20 bg-red-500/8 px-4 py-3 text-sm text-red-400">
          {error}
        </div>
      )}

      {/* Big tap button */}
      <div className="flex flex-col items-center gap-3 py-4">
        <button
          onClick={() => handleTap(part)}
          disabled={!canTap}
          className={`relative flex h-20 w-20 items-center justify-center rounded-full transition-all disabled:opacity-40 ${
            convState === "recording"
              ? "bg-red-500 shadow-[0_0_0_12px_rgba(239,68,68,0.15)]"
              : convState === "speaking"
                ? "bg-violet-500/20 shadow-[0_0_0_12px_rgba(139,92,246,0.1)]"
                : "bg-[var(--bg-elevated)] border-2 border-[var(--border)] hover:border-violet-500/40 hover:bg-violet-500/5"
          }`}
        >
          {convState === "recording" ? (
            <span className="h-5 w-5 rounded-sm bg-white" />
          ) : convState === "speaking" ? (
            <Volume2 className="h-7 w-7 text-violet-400" />
          ) : convState === "thinking" || convState === "transcribing" ? (
            <Loader2 className="h-7 w-7 animate-spin text-[var(--text-muted)]" />
          ) : (
            <Mic className="h-7 w-7 text-[var(--text-secondary)]" />
          )}

          {convState === "recording" && (
            <span className="absolute inset-0 animate-ping rounded-full bg-red-400 opacity-30" />
          )}
        </button>

        <p className="text-sm text-[var(--text-secondary)]">
          {convState === "recording"
            ? "Tap to stop"
            : convState === "idle"
              ? "Tap to speak"
              : STATE_LABEL[convState]}
        </p>
      </div>

      <PaywallModal paywall={paywall} onClose={() => setPaywall(null)} />
    </div>
  );
}
