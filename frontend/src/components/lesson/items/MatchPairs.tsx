"use client";

import { useState } from "react";
import type { MatchPairsItem } from "@/types/lesson";

interface MatchEntry {
  leftIdx: number;
  rightIdx: number;
}

interface Props {
  item: MatchPairsItem;
  onAnswer: (correct: boolean, userAnswer: string) => void;
}

export function MatchPairs({ item, onAnswer }: Props) {
  const [selectedLeft, setSelectedLeft] = useState<number | null>(null);
  const [matched, setMatched] = useState<MatchEntry[]>([]);
  const [wrongFlash, setWrongFlash] = useState<number | null>(null);
  const [done, setDone] = useState(false);

  const [shuffledRight] = useState(() => {
    const arr = item.pairs.map((p, i) => ({ text: p.right, origIdx: i }));
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  });

  function isLeftMatched(idx: number) {
    return matched.some((m) => m.leftIdx === idx);
  }
  function isRightMatched(shuffledIdx: number) {
    return matched.some((m) => m.rightIdx === shuffledIdx);
  }

  function handleLeft(idx: number) {
    if (done || isLeftMatched(idx)) return;
    setSelectedLeft(idx === selectedLeft ? null : idx);
  }

  function handleRight(shuffledIdx: number) {
    if (done || isRightMatched(shuffledIdx) || selectedLeft === null) return;

    const isCorrect = shuffledRight[shuffledIdx].origIdx === selectedLeft;

    if (!isCorrect) {
      setWrongFlash(shuffledIdx);
      setTimeout(() => setWrongFlash(null), 600);
      setSelectedLeft(null);
      return;
    }

    const newMatched = [...matched, { leftIdx: selectedLeft, rightIdx: shuffledIdx }];
    setMatched(newMatched);
    setSelectedLeft(null);

    if (newMatched.length === item.pairs.length) {
      setDone(true);
      onAnswer(true, "matched");
    }
  }

  return (
    <div>
      <p className="mb-3 text-xs font-medium text-[var(--text-muted)]">
        Match each word with its translation
      </p>
      <div className="grid grid-cols-2 gap-2">
        {/* Left column */}
        <div className="space-y-2">
          {item.pairs.map((p, i) => {
            const isMatched = isLeftMatched(i);
            const isSelected = selectedLeft === i;
            return (
              <button
                key={i}
                onClick={() => handleLeft(i)}
                disabled={isMatched || done}
                aria-label={p.left}
                className={`min-h-[48px] w-full rounded-xl border px-3 py-2.5 text-left text-sm font-medium transition-all active:scale-95 ${
                  isMatched
                    ? "border-emerald-500 bg-emerald-500/10 text-emerald-600 opacity-70"
                    : isSelected
                      ? "border-[var(--primary)] bg-[var(--primary-soft)] text-[var(--text-primary)]"
                      : "border-[var(--border)] bg-[var(--bg-surface)] text-[var(--text-primary)] hover:border-[var(--primary)]"
                }`}
              >
                {p.left}
              </button>
            );
          })}
        </div>

        {/* Right column */}
        <div className="space-y-2">
          {shuffledRight.map((r, shuffledIdx) => {
            const isMatched = isRightMatched(shuffledIdx);
            const isWrong = wrongFlash === shuffledIdx;
            const canSelect = selectedLeft !== null && !isMatched;
            return (
              <button
                key={shuffledIdx}
                onClick={() => handleRight(shuffledIdx)}
                disabled={isMatched || done || selectedLeft === null}
                aria-label={r.text}
                className={`min-h-[48px] w-full rounded-xl border px-3 py-2.5 text-left text-sm font-medium transition-all active:scale-95 ${
                  isMatched
                    ? "border-emerald-500 bg-emerald-500/10 text-emerald-600 opacity-70"
                    : isWrong
                      ? "border-red-500 bg-red-500/10 text-red-600"
                      : canSelect
                        ? "border-amber-400/60 bg-[var(--bg-surface)] text-[var(--text-primary)] hover:border-amber-500"
                        : "border-[var(--border)] bg-[var(--bg-surface)] text-[var(--text-primary)] opacity-60"
                }`}
              >
                {r.text}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
