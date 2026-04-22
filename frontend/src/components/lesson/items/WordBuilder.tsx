"use client";

import { useState, useEffect, useCallback } from "react";
import { Delete } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { WordBuilderItem } from "@/types/lesson";
import { checkWordBuilder } from "@/lib/lesson/check";

interface Letter {
  ch: string;
  idx: number;
}

interface Props {
  item: WordBuilderItem;
  onAnswer: (correct: boolean, userAnswer: string) => void;
}

export function WordBuilder({ item, onAnswer }: Props) {
  const [shuffled] = useState<Letter[]>(() => {
    const arr: Letter[] = item.letters.map((ch, i) => ({ ch, idx: i }));
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  });

  const [placed, setPlaced] = useState<Letter[]>([]);
  const [answered, setAnswered] = useState(false);
  const [correct, setCorrect] = useState(false);

  function isUsed(letterIdx: number) {
    return placed.some((p) => p.idx === letterIdx);
  }

  function addLetter(letter: Letter) {
    if (answered) return;
    setPlaced((prev) => [...prev, letter]);
  }

  const backspace = useCallback(() => {
    if (answered) return;
    setPlaced((prev) => prev.slice(0, -1));
  }, [answered]);

  const handleCheck = useCallback(() => {
    if (answered) return;
    const word = placed.map((p) => p.ch).join("");
    const isCorrect = checkWordBuilder(word, item.correctWord);
    setCorrect(isCorrect);
    setAnswered(true);
    onAnswer(isCorrect, word);
  }, [answered, placed, item.correctWord, onAnswer]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (answered) return;
      if (e.key === "Backspace") backspace();
      if (e.key === "Enter") {
        const word = placed.map((p) => p.ch).join("");
        if (word.length === item.correctWord.length) handleCheck();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [answered, backspace, handleCheck, placed, item.correctWord.length]);

  const currentWord = placed.map((p) => p.ch).join("");

  return (
    <div>
      <p className="mb-4 text-base text-[var(--text-secondary)]">{item.prompt}</p>

      {/* Letter slots */}
      <div className="mb-5 flex items-center justify-center gap-1.5 flex-wrap">
        {item.correctWord.split("").map((_, i) => {
          const ch = placed[i]?.ch;
          return (
            <div
              key={i}
              className={`flex h-12 w-10 items-center justify-center rounded-lg border-b-2 text-xl font-bold transition-all ${
                ch
                  ? answered
                    ? correct
                      ? "border-emerald-500 bg-emerald-500/10 text-emerald-600"
                      : "border-red-500 bg-red-500/10 text-red-600"
                    : "border-[var(--primary)] bg-[var(--primary-soft)] text-[var(--text-primary)]"
                  : "border-[var(--border)] bg-[var(--bg-soft)] text-[var(--text-muted)]"
              }`}
            >
              {ch ?? "·"}
            </div>
          );
        })}
        {placed.length > 0 && !answered && (
          <button
            onClick={backspace}
            aria-label="Backspace"
            className="ml-1 flex h-10 w-10 items-center justify-center rounded-xl border border-[var(--border)] text-[var(--text-secondary)] transition-all hover:border-red-400 active:scale-95"
          >
            <Delete className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Letter tiles */}
      <div className="flex flex-wrap justify-center gap-2">
        {shuffled.map((letter) => {
          const used = isUsed(letter.idx);
          return (
            <button
              key={letter.idx}
              onClick={() => addLetter(letter)}
              disabled={used || answered}
              aria-label={`Letter ${letter.ch}`}
              className={`flex h-12 w-12 items-center justify-center rounded-xl border text-xl font-bold transition-all active:scale-95 ${
                used || answered
                  ? "border-[var(--border)] bg-[var(--bg-soft)] text-[var(--text-muted)] opacity-30"
                  : "border-[var(--border)] bg-[var(--bg-surface)] text-[var(--text-primary)] hover:border-[var(--primary)] hover:bg-[var(--primary-soft)]"
              }`}
            >
              {letter.ch}
            </button>
          );
        })}
      </div>

      {!answered && currentWord.length === item.correctWord.length && (
        <Button className="mt-4 w-full" onClick={handleCheck}>
          Check
        </Button>
      )}

      {answered && !correct && (
        <div className="mt-3 rounded-xl bg-emerald-500/10 p-3 text-sm text-emerald-600">
          ✅ Correct word: <strong>{item.correctWord}</strong>
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
