"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import type { SentenceReorderItem } from "@/types/lesson";
import { checkSentenceOrder } from "@/lib/lesson/check";

interface Token {
  text: string;
  origIdx: number;
}

interface Props {
  item: SentenceReorderItem;
  onAnswer: (correct: boolean, userAnswer: string) => void;
}

export function SentenceReorder({ item, onAnswer }: Props) {
  const [shuffled] = useState<Token[]>(() => {
    const arr: Token[] = item.tokens.map((text, i) => ({ text, origIdx: i }));
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  });

  const [placed, setPlaced] = useState<Token[]>([]);
  const [answered, setAnswered] = useState(false);
  const [correct, setCorrect] = useState(false);

  function isInPool(origIdx: number) {
    return !placed.some((p) => p.origIdx === origIdx);
  }

  function addToken(token: Token) {
    if (answered) return;
    setPlaced((prev) => [...prev, token]);
  }

  function removeToken(placedIdx: number) {
    if (answered) return;
    setPlaced((prev) => prev.filter((_, i) => i !== placedIdx));
  }

  function handleCheck() {
    const userOrder = placed.map((p) => p.origIdx);
    const isCorrect = checkSentenceOrder(userOrder, item.correctOrder);
    setCorrect(isCorrect);
    setAnswered(true);
    onAnswer(isCorrect, placed.map((p) => p.text).join(" "));
  }

  const correctSentence = item.correctOrder
    .map((i) => item.tokens[i])
    .join(" ");

  return (
    <div>
      {/* Answer area */}
      <div className="mb-4 min-h-[52px] flex flex-wrap gap-2 rounded-xl border-2 border-dashed border-[var(--border)] bg-[var(--bg-soft)] p-3">
        {placed.length === 0 && (
          <span className="self-center text-xs text-[var(--text-muted)]">
            Tap words below to build the sentence…
          </span>
        )}
        {placed.map((token, i) => (
          <button
            key={i}
            onClick={() => removeToken(i)}
            disabled={answered}
            className="rounded-lg bg-[var(--primary)] px-3 py-1.5 text-sm font-medium text-white transition-transform hover:scale-105 active:scale-95"
          >
            {token.text}
          </button>
        ))}
      </div>

      {/* Token pool */}
      <div className="flex flex-wrap gap-2">
        {shuffled.map((token) => {
          if (!isInPool(token.origIdx)) return null;
          return (
            <button
              key={token.origIdx}
              onClick={() => addToken(token)}
              disabled={answered}
              className="rounded-lg border border-[var(--border)] bg-[var(--bg-surface)] px-3 py-1.5 text-sm font-medium text-[var(--text-primary)] transition-all hover:border-[var(--primary)] active:scale-95"
            >
              {token.text}
            </button>
          );
        })}
      </div>

      {!answered && placed.length > 0 && (
        <Button className="mt-4 w-full" onClick={handleCheck}>
          Check Answer
        </Button>
      )}

      {answered && !correct && (
        <div className="mt-3 rounded-xl bg-emerald-500/10 p-3 text-sm text-emerald-600">
          ✅ Correct order: <strong>{correctSentence}</strong>
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
