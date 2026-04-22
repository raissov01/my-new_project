"use client";

import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import type { TranslateItem } from "@/types/lesson";
import { checkTranslate } from "@/lib/lesson/check";

const DIR_LABELS: Record<TranslateItem["direction"], string> = {
  en_to_kk: "Translate to Kazakh 🇰🇿",
  kk_to_en: "Translate to English 🇬🇧",
  en_to_ru: "Translate to Russian 🇷🇺",
  ru_to_en: "Translate to English 🇬🇧",
};

interface Props {
  item: TranslateItem;
  onAnswer: (correct: boolean, userAnswer: string) => void;
}

export function Translate({ item, onAnswer }: Props) {
  const [input, setInput] = useState("");
  const [answered, setAnswered] = useState(false);
  const [correct, setCorrect] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  function handleCheck() {
    if (!input.trim() || answered) return;
    const isCorrect = checkTranslate(input, item.acceptedAnswers);
    setCorrect(isCorrect);
    setAnswered(true);
    onAnswer(isCorrect, input.trim());
  }

  return (
    <div>
      <div className="mb-5 rounded-xl border border-blue-500/20 bg-blue-500/5 p-5 text-center">
        <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-blue-500">
          {DIR_LABELS[item.direction]}
        </p>
        <p className="text-2xl font-bold text-[var(--text-primary)]">
          {item.source}
        </p>
        {item.hint && !answered && (
          <p className="mt-2 text-xs text-[var(--text-muted)]">
            💡 {item.hint}
          </p>
        )}
      </div>

      <div className="flex gap-2">
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleCheck()}
          disabled={answered}
          placeholder="Type your answer…"
          aria-label="Translation input"
          className="flex-1 rounded-xl border border-[var(--border)] bg-[var(--bg-surface)] px-4 py-3 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:border-[var(--primary)] focus:outline-none disabled:opacity-60"
        />
        {!answered && (
          <Button onClick={handleCheck} disabled={!input.trim()}>
            Check
          </Button>
        )}
      </div>

      {answered && !correct && (
        <div className="mt-3 rounded-xl bg-emerald-500/10 p-3 text-sm text-emerald-600">
          ✅ Correct:{" "}
          <strong>{item.acceptedAnswers[0]}</strong>
          {item.explanation && (
            <p className="mt-1 text-xs text-[var(--text-muted)]">
              💡 {item.explanation}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
