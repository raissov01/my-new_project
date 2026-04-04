"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Headphones, Pause, Play, Volume2, VolumeX } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { ReadingPassage } from "@/features/ielts/api";
import { QuestionRenderer } from "./question-renderers";
import { QuestionPalette } from "./question-palette";

type ListeningSectionPlayerProps = {
  sections: ReadingPassage[];
  answers: Record<string, string>;
  flagged: Set<string>;
  revealed: boolean;
  onAnswer: (questionId: string, value: string) => void;
  onFlag: (questionId: string) => void;
};

export function ListeningSectionPlayer({
  sections,
  answers,
  flagged,
  revealed,
  onAnswer,
  onFlag,
}: ListeningSectionPlayerProps) {
  const [activeSection, setActiveSection] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [showTranscript, setShowTranscript] = useState(false);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const speechSupported =
    typeof window !== "undefined" && "speechSynthesis" in window;

  const currentSection = sections[activeSection];

  // Build flat question list for palette
  const allQuestions = sections.flatMap((s, si) =>
    s.questions.map((q, qi) => ({
      id: q.id,
      index:
        sections.slice(0, si).reduce((acc, prev) => acc + prev.questions.length, 0) +
        qi +
        1,
      sectionIndex: si,
    }))
  );

  const navigateToQuestion = useCallback(
    (questionId: string) => {
      const target = allQuestions.find((q) => q.id === questionId);
      if (!target) return;
      if (target.sectionIndex !== activeSection) {
        setActiveSection(target.sectionIndex);
      }
      setTimeout(() => {
        const el = document.getElementById(`lq-${questionId}`);
        if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
      }, 100);
    },
    [activeSection, allQuestions]
  );

  // Stop speech on section change or unmount
  useEffect(() => {
    return () => {
      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, [activeSection]);

  const handlePlay = useCallback(() => {
    if (!speechSupported || !currentSection) return;

    if (isPlaying) {
      window.speechSynthesis.cancel();
      setIsPlaying(false);
      return;
    }

    // Use audioScript from the first question (all questions in a section share it)
    const script = currentSection.questions[0]?.audioScript;
    if (!script) return;

    const utterance = new SpeechSynthesisUtterance(script);
    utterance.rate = 0.9;
    utterance.onend = () => setIsPlaying(false);
    utterance.onerror = () => setIsPlaying(false);
    utteranceRef.current = utterance;
    window.speechSynthesis.speak(utterance);
    setIsPlaying(true);
  }, [speechSupported, currentSection, isPlaying]);

  if (!currentSection) {
    return (
      <div className="rounded-[var(--radius-xl)] border border-[var(--border)] bg-[var(--bg-surface)] p-8 text-center">
        <p className="text-[var(--text-muted)]">No listening sections available.</p>
      </div>
    );
  }

  const questionOffset = sections
    .slice(0, activeSection)
    .reduce((acc, s) => acc + s.questions.length, 0);

  return (
    <div className="space-y-4">
      {/* Section tabs */}
      <div className="flex flex-wrap items-center gap-2">
        {sections.map((s, i) => {
          const sAnswered = s.questions.filter(
            (q) => (answers[q.id] ?? "").trim() !== ""
          ).length;
          return (
            <button
              key={s.passageNumber}
              onClick={() => {
                if (isPlaying) {
                  window.speechSynthesis.cancel();
                  setIsPlaying(false);
                }
                setActiveSection(i);
                setShowTranscript(false);
              }}
              className={`flex items-center gap-2 rounded-[var(--radius-md)] border px-4 py-2.5 text-sm font-semibold transition-all ${
                activeSection === i
                  ? "border-cyan-500/30 bg-cyan-500/10 text-cyan-400"
                  : "border-[var(--border)] text-[var(--text-secondary)] hover:border-[var(--border-strong)]"
              }`}
            >
              <Headphones className="h-4 w-4" />
              Section {s.passageNumber}
              <span className="rounded-full bg-[var(--bg-muted)] px-2 py-0.5 text-[11px] font-medium text-[var(--text-muted)]">
                {sAnswered}/{s.questions.length}
              </span>
            </button>
          );
        })}
      </div>

      {/* Audio player bar */}
      <div className="flex items-center gap-3 rounded-[var(--radius-lg)] border border-cyan-500/20 bg-cyan-500/5 px-4 py-3">
        <div className="flex items-center gap-2">
          {speechSupported ? (
            <Button size="sm" variant="secondary" onClick={handlePlay}>
              {isPlaying ? (
                <Pause className="h-4 w-4" />
              ) : (
                <Play className="h-4 w-4" />
              )}
              {isPlaying ? "Pause" : "Play Section"}
            </Button>
          ) : (
            <p className="text-sm text-[var(--text-muted)]">
              Audio playback not supported in this browser
            </p>
          )}

          {!revealed && (
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setShowTranscript((prev) => !prev)}
            >
              {showTranscript ? (
                <VolumeX className="h-4 w-4" />
              ) : (
                <Volume2 className="h-4 w-4" />
              )}
              {showTranscript ? "Hide transcript" : "Show transcript"}
            </Button>
          )}
        </div>

        <div className="ml-auto text-xs text-[var(--text-muted)]">
          Section {currentSection.passageNumber} of {sections.length}
          {isPlaying && (
            <span className="ml-2 inline-flex items-center gap-1 text-cyan-400">
              <span className="h-2 w-2 animate-pulse rounded-full bg-cyan-400" />
              Playing
            </span>
          )}
        </div>
      </div>

      {/* Transcript (hidden during exam unless toggled) */}
      {(showTranscript || revealed) && currentSection.questions[0]?.audioScript && (
        <div className="rounded-[var(--radius-lg)] border border-amber-500/20 bg-amber-500/5 p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.1em] text-amber-400">
            Audio Transcript
          </p>
          <div className="mt-3 whitespace-pre-wrap text-sm leading-7 text-[var(--text-secondary)]">
            {currentSection.questions[0].audioScript}
          </div>
        </div>
      )}

      {/* Questions */}
      <div className="space-y-3">
        {currentSection.questions.map((question, qi) => (
          <div key={question.id} id={`lq-${question.id}`}>
            <QuestionRenderer
              question={question}
              index={questionOffset + qi + 1}
              value={answers[question.id] ?? ""}
              revealed={revealed}
              onChange={onAnswer}
            />
          </div>
        ))}
      </div>

      {/* Question palette */}
      <QuestionPalette
        questions={allQuestions}
        answers={answers}
        flagged={flagged}
        onNavigate={navigateToQuestion}
        onFlag={onFlag}
      />
    </div>
  );
}
