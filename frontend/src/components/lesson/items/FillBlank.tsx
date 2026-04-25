"use client";

import { useState, useEffect, useCallback } from "react";
import { CheckCircle2, XCircle } from "lucide-react";
import type { FillBlankItem } from "@/types/lesson";

interface Props {
  item: FillBlankItem;
  onAnswer: (correct: boolean, userAnswer: string) => void;
}

export function FillBlank({ item, onAnswer }: Props) {
  const [selected, setSelected] = useState<string | null>(null);
  const answered = selected !== null;

  const handleSelect = useCallback(
    (optId: string) => {
      if (answered) return;
      const correct = optId === item.correctOptionId;
      setSelected(optId);
      onAnswer(
        correct,
        item.options.find((o) => o.id === optId)?.text ?? optId,
      );
    },
    [answered, item, onAnswer],
  );

  // Keyboard: 1-4 to select option
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (answered) return;
      const n = parseInt(e.key);
      if (n >= 1 && n <= item.options.length) {
        handleSelect(item.options[n - 1].id);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [answered, handleSelect, item.options]);

  const [instruction, sentence] = item.prompt.includes("\n")
    ? item.prompt.split("\n")
    : [item.prompt, null];

  return (
    <div>
      <p className="mb-2 text-sm text-[var(--text-secondary)]">{instruction}</p>
      {sentence && (
        <p className="mb-4 text-base font-medium text-[var(--text-primary)]">
          {sentence}
        </p>
      )}
      <div className="grid grid-cols-2 gap-2">
        {item.options.map((opt, i) => {
          let cls =
            "border-[var(--border)] bg-[var(--bg-surface)] hover:border-[var(--primary)]";
          if (answered) {
            if (opt.id === item.correctOptionId)
              cls = "border-emerald-500 bg-emerald-500/10";
            else if (opt.id === selected)
              cls = "border-red-500 bg-red-500/10";
            else cls = "border-[var(--border)] bg-[var(--bg-surface)] opacity-50";
          }
          return (
            <button
              key={opt.id}
              onClick={() => handleSelect(opt.id)}
              disabled={answered}
              aria-label={`Option ${i + 1}: ${opt.text}`}
              className={`flex min-h-[48px] items-center justify-between rounded-xl border px-4 py-3 text-sm font-medium text-[var(--text-primary)] transition-all active:scale-95 ${cls}`}
            >
              <span>{opt.text}</span>
              {answered && opt.id === item.correctOptionId && (
                <CheckCircle2 className="ml-2 h-4 w-4 shrink-0 text-emerald-500" />
              )}
              {answered &&
                opt.id === selected &&
                opt.id !== item.correctOptionId && (
                  <XCircle className="ml-2 h-4 w-4 shrink-0 text-red-500" />
                )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
