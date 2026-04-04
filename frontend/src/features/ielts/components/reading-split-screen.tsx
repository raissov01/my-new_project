"use client";

import { useCallback, useRef, useState } from "react";
import { BookOpen, Flag } from "lucide-react";
import type { ReadingPassage } from "@/features/ielts/api";
import { QuestionRenderer } from "./question-renderers";
import { QuestionPalette } from "./question-palette";

type ReadingSplitScreenProps = {
  passages: ReadingPassage[];
  answers: Record<string, string>;
  flagged: Set<string>;
  revealed: boolean;
  onAnswer: (questionId: string, value: string) => void;
  onFlag: (questionId: string) => void;
};

export function ReadingSplitScreen({
  passages,
  answers,
  flagged,
  revealed,
  onAnswer,
  onFlag,
}: ReadingSplitScreenProps) {
  const [activePassage, setActivePassage] = useState(0);
  const [mobileView, setMobileView] = useState<"passage" | "questions">("passage");
  const questionsRef = useRef<HTMLDivElement>(null);

  const currentPassage = passages[activePassage];

  // Build flat question list for palette
  const allQuestions = passages.flatMap((p, pi) =>
    p.questions.map((q, qi) => ({
      id: q.id,
      index: passages.slice(0, pi).reduce((acc, prev) => acc + prev.questions.length, 0) + qi + 1,
      passageIndex: pi,
    }))
  );

  const navigateToQuestion = useCallback(
    (questionId: string) => {
      const target = allQuestions.find((q) => q.id === questionId);
      if (!target) return;

      if (target.passageIndex !== activePassage) {
        setActivePassage(target.passageIndex);
      }

      // Scroll to question in the right panel
      setTimeout(() => {
        const el = document.getElementById(`q-${questionId}`);
        if (el) {
          el.scrollIntoView({ behavior: "smooth", block: "center" });
        }
      }, 100);
    },
    [activePassage, allQuestions]
  );

  if (!currentPassage) {
    return (
      <div className="rounded-[var(--radius-xl)] border border-[var(--border)] bg-[var(--bg-surface)] p-8 text-center">
        <p className="text-[var(--text-muted)]">No reading passages available.</p>
      </div>
    );
  }

  // Calculate question offset for current passage
  const questionOffset = passages
    .slice(0, activePassage)
    .reduce((acc, p) => acc + p.questions.length, 0);

  return (
    <div className="space-y-4">
      {/* Passage tabs */}
      <div className="flex flex-wrap items-center gap-2">
        {passages.map((p, i) => {
          const pAnswered = p.questions.filter(
            (q) => (answers[q.id] ?? "").trim() !== ""
          ).length;
          return (
            <button
              key={p.passageNumber}
              onClick={() => setActivePassage(i)}
              className={`flex items-center gap-2 rounded-[var(--radius-md)] border px-4 py-2.5 text-sm font-semibold transition-all ${
                activePassage === i
                  ? "border-[var(--primary)]/30 bg-[var(--primary-soft)] text-[var(--primary)]"
                  : "border-[var(--border)] text-[var(--text-secondary)] hover:border-[var(--border-strong)]"
              }`}
            >
              <BookOpen className="h-4 w-4" />
              Passage {p.passageNumber}
              <span className="rounded-full bg-[var(--bg-muted)] px-2 py-0.5 text-[11px] font-medium text-[var(--text-muted)]">
                {pAnswered}/{p.questions.length}
              </span>
            </button>
          );
        })}
      </div>

      {/* Mobile view toggle */}
      <div className="flex gap-2 lg:hidden">
        <button
          onClick={() => setMobileView("passage")}
          className={`flex-1 rounded-[var(--radius-md)] border px-3 py-2 text-sm font-semibold ${
            mobileView === "passage"
              ? "border-[var(--primary)]/30 bg-[var(--primary-soft)] text-[var(--primary)]"
              : "border-[var(--border)] text-[var(--text-secondary)]"
          }`}
        >
          Reading Passage
        </button>
        <button
          onClick={() => setMobileView("questions")}
          className={`flex-1 rounded-[var(--radius-md)] border px-3 py-2 text-sm font-semibold ${
            mobileView === "questions"
              ? "border-[var(--primary)]/30 bg-[var(--primary-soft)] text-[var(--primary)]"
              : "border-[var(--border)] text-[var(--text-secondary)]"
          }`}
        >
          Questions
        </button>
      </div>

      {/* Split screen layout */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Left: passage */}
        <div
          className={`${mobileView === "questions" ? "hidden lg:block" : ""}`}
        >
          <div className="sticky top-20 max-h-[calc(100vh-8rem)] overflow-y-auto rounded-[var(--radius-xl)] border border-[var(--border)] bg-[var(--bg-surface)]">
            <div className="sticky top-0 z-10 border-b border-[var(--border)] bg-[var(--bg-surface)] px-5 py-3">
              <h3 className="text-base font-bold text-[var(--text-primary)]">
                {currentPassage.title}
              </h3>
              <p className="mt-0.5 text-xs text-[var(--text-muted)]">
                Passage {currentPassage.passageNumber} of {passages.length}
              </p>
            </div>
            <div className="px-5 py-4">
              <div className="prose prose-sm max-w-none text-sm leading-7 text-[var(--text-secondary)]">
                {currentPassage.content.split("\n\n").map((paragraph, i) => (
                  <p key={i} className="mb-4 last:mb-0">
                    {paragraph}
                  </p>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Right: questions */}
        <div
          ref={questionsRef}
          className={`${mobileView === "passage" ? "hidden lg:block" : ""}`}
        >
          <div className="space-y-3">
            {currentPassage.questions.map((question, qi) => (
              <div key={question.id} id={`q-${question.id}`}>
                <div className="flex items-start gap-2">
                  <div className="flex-1">
                    <QuestionRenderer
                      question={question}
                      index={questionOffset + qi + 1}
                      value={answers[question.id] ?? ""}
                      revealed={revealed}
                      onChange={onAnswer}
                    />
                  </div>
                  {!revealed && (
                    <button
                      onClick={() => onFlag(question.id)}
                      title="Flag for review"
                      className={`mt-4 shrink-0 rounded-[var(--radius-sm)] border p-2 transition-all ${
                        flagged.has(question.id)
                          ? "border-amber-500/30 bg-amber-500/10 text-amber-500"
                          : "border-[var(--border)] text-[var(--text-muted)] hover:border-amber-500/20 hover:text-amber-400"
                      }`}
                    >
                      <Flag className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
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
