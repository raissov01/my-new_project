"use client";

import { useState, useRef, useEffect, useTransition, useCallback } from "react";
import { Send, Loader2, CheckCircle2, Volume2, VolumeX } from "lucide-react";
import { sendMessage, gradeConversation, startConversation } from "@/features/tutor/api";
import type { AIScenario, ConversationMessage, GradeScores } from "@/features/tutor/api";
import { GradeResults } from "./GradeResults";
import { VoiceInput } from "./VoiceInput";
import { useLocale } from "@/components/providers/locale-provider";

interface Props {
  scenario: AIScenario;
}

export function ChatInterface({ scenario }: Props) {
  const { t } = useLocale();
  const [convId, setConvId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ConversationMessage[]>([]);
  const [input, setInput] = useState("");
  const [isPending, startTransition] = useTransition();
  const [grading, setGrading] = useState(false);
  const [scores, setScores] = useState<GradeScores | null>(null);
  const [started, setStarted] = useState(false);
  const [gradeError, setGradeError] = useState(false);
  const [ttsEnabled, setTtsEnabled] = useState(true);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

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
      if (audioRef.current) audioRef.current.pause();
      const audio = new Audio(url);
      audioRef.current = audio;
      audio.onended = () => { setIsSpeaking(false); URL.revokeObjectURL(url); };
      audio.onerror = () => setIsSpeaking(false);
      await audio.play().catch(() => setIsSpeaking(false));
    } catch {
      setIsSpeaking(false);
    }
  }, [ttsEnabled]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleStart = () => {
    startTransition(async () => {
      const conv = await startConversation(scenario.id);
      if (!conv) return;
      setConvId(conv.id);
      setStarted(true);
      const greeting = `Hello! I'm ${scenario.personaName ?? "your conversation partner"}. ${scenario.description} Ready when you are.`;
      setMessages([{ role: "assistant", content: greeting }]);
      void playTTS(greeting);
    });
  };

  const handleSend = () => {
    if (!input.trim() || !convId || isPending) return;
    const text = input.trim();
    setInput("");
    setMessages((prev) => [...prev, { role: "user", content: text }]);

    startTransition(async () => {
      const reply = await sendMessage(convId, text);
      if (reply) {
        setMessages((prev) => [...prev, { role: "assistant", content: reply }]);
        void playTTS(reply);
      }
    });
  };

  const handleGrade = async () => {
    if (!convId) return;
    setGrading(true);
    setGradeError(false);
    const result = await gradeConversation(convId);
    if (result) {
      setScores(result);
    } else {
      setGradeError(true);
    }
    setGrading(false);
  };

  const userMsgCount = messages.filter((m) => m.role === "user").length;

  if (scores) return <GradeResults scores={scores} scenarioSlug={scenario.slug} />;

  if (!started) {
    return (
      <div className="rounded-[var(--radius-xl)] border border-[var(--border)] bg-[var(--bg-surface)] p-8 space-y-6 text-center">
        <span className="text-5xl" role="img">{scenario.icon ?? "💬"}</span>
        <div className="space-y-1">
          <h2 className="text-xl font-bold">{scenario.title}</h2>
          {scenario.personaName && (
            <p className="text-sm text-[var(--text-secondary)]">{t("tutor.withPerson", { name: scenario.personaName })}</p>
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
          disabled={isPending}
          className="w-full rounded-[var(--radius-md)] bg-[var(--primary)] py-3 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50 transition-opacity"
        >
          {isPending ? <Loader2 className="mx-auto h-4 w-4 animate-spin" /> : t("tutor.startConversation")}
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[70vh] rounded-[var(--radius-xl)] border border-[var(--border)] bg-[var(--bg-surface)] overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[var(--border)] px-4 py-3">
        <div>
          <p className="font-semibold text-sm flex items-center gap-2">
            {scenario.personaName ?? scenario.title}
            {isSpeaking && <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[var(--primary)]" />}
          </p>
          <p className="text-xs text-[var(--text-secondary)]">{t("tutor.exchanges", { n: userMsgCount })}</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => { setTtsEnabled((v) => !v); if (isSpeaking) { audioRef.current?.pause(); setIsSpeaking(false); } }}
            className="rounded-[var(--radius-md)] border border-[var(--border)] p-1.5 text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
            title={ttsEnabled ? "Mute AI voice" : "Unmute AI voice"}
          >
            {ttsEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
          </button>
        {userMsgCount >= 3 && (
          <div className="flex flex-col items-end gap-1">
            <button
              onClick={handleGrade}
              disabled={grading}
              className="flex items-center gap-1.5 rounded-[var(--radius-md)] border border-[var(--primary)] px-3 py-1.5 text-xs font-medium text-[var(--primary)] hover:bg-[var(--primary-soft)] disabled:opacity-50 transition-colors"
            >
              {grading ? <Loader2 className="h-3 w-3 animate-spin" /> : <CheckCircle2 className="h-3 w-3" />}
              {t("tutor.finishGrade")}
            </button>
            {gradeError && (
              <p className="text-xs text-red-500">{t("tutor.gradingFailed")}</p>
            )}
          </div>
        )}
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
              {msg.content}
            </div>
          </div>
        ))}
        {isPending && (
          <div className="flex justify-start">
            <div className="rounded-[var(--radius-lg)] bg-[var(--bg-soft)] px-3 py-2">
              <Loader2 className="h-4 w-4 animate-spin text-[var(--text-secondary)]" />
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="border-t border-[var(--border)] p-3">
        <div className="flex items-center gap-2">
          <VoiceInput
            onTranscript={(text) => setInput((prev) => prev ? `${prev} ${text}` : text)}
            disabled={isPending || userMsgCount >= 15}
          />
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSend()}
            placeholder={t("tutor.inputPlaceholder")}
            disabled={isPending || userMsgCount >= 15}
            className="flex-1 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--bg-surface)] px-3 py-2 text-sm outline-none focus:border-[var(--primary)] disabled:opacity-50"
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || isPending || userMsgCount >= 15}
            className="flex h-9 w-9 items-center justify-center rounded-[var(--radius-md)] bg-[var(--primary)] text-white disabled:opacity-40 hover:opacity-90 transition-opacity"
          >
            <Send className="h-4 w-4" />
          </button>
        </div>
        {userMsgCount >= 15 && (
          <p className="mt-2 text-xs text-amber-600">{t("tutor.maxExchanges")}</p>
        )}
      </div>
    </div>
  );
}
