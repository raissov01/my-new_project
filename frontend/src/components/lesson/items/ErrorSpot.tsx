"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import type { ErrorSpotItem } from "@/types/lesson";
import { checkErrorSpotCorrection } from "@/lib/lesson/check";

interface Props {
  item: ErrorSpotItem;
  onAnswer: (correct: boolean, userAnswer: string) => void;
}

export function ErrorSpot({ item, onAnswer }: Props) {
  const [tokenPhase, setTokenPhase] = useState(true);
  const [selectedToken, setSelectedToken] = useState<number | null>(null);
  const [tokenCorrect, setTokenCorrect] = useState<boolean | null>(null);
  const [correction, setCorrection] = useState("");
  const [answered, setAnswered] = useState(false);
  const [correct, setCorrect] = useState(false);

  function handleTokenSelect(idx: number) {
    if (!tokenPhase || answered) return;
    const isCorrectToken = idx === item.errorTokenIndex;
    setSelectedToken(idx);
    setTokenCorrect(isCorrectToken);

    if (!isCorrectToken) {
      setAnswered(true);
      setCorrect(false);
      onAnswer(false, item.tokens[idx] ?? "");
    } else {
      setTokenPhase(false);
    }
  }

  function handleCorrectionCheck() {
    const isCorrect = checkErrorSpotCorrection(correction, item.correction);
    setCorrect(isCorrect);
    setAnswered(true);
    onAnswer(isCorrect, correction.trim());
  }

  return (
    <div>
      {/* Token row */}
      <div className="mb-5 flex flex-wrap gap-2">
        {item.tokens.map((token, i) => {
          let cls =
            "border-[var(--border)] bg-[var(--bg-surface)] text-[var(--text-primary)]";

          if (!tokenPhase || answered) {
            if (i === item.errorTokenIndex)
              cls = "border-emerald-500 bg-emerald-500/10 text-emerald-600";
            else if (i === selectedToken && tokenCorrect === false)
              cls = "border-red-500 bg-red-500/10 text-red-600";
          } else if (i === selectedToken && tokenCorrect) {
            cls = "border-emerald-500 bg-emerald-500/10 text-emerald-600";
          }

          return (
            <button
              key={i}
              onClick={() => handleTokenSelect(i)}
              disabled={!tokenPhase || answered}
              aria-label={`Word: ${token}`}
              className={`min-h-[40px] rounded-lg border px-3 py-2 text-sm font-medium transition-all active:scale-95 ${
                tokenPhase && !answered
                  ? `${cls} hover:border-red-400`
                  : cls
              }`}
            >
              {token}
            </button>
          );
        })}
      </div>

      {tokenPhase && !answered && (
        <p className="mb-3 text-sm text-[var(--text-muted)]">
          👆 Tap the word with the mistake
        </p>
      )}

      {/* Correction input */}
      {!tokenPhase && !answered && (
        <div>
          <p className="mb-2 text-sm font-medium text-emerald-600">
            ✓ Found the error! Now type the correction for{" "}
            <strong>&ldquo;{item.tokens[item.errorTokenIndex]}&rdquo;</strong>:
          </p>
          <div className="flex gap-2">
            <input
              type="text"
              value={correction}
              onChange={(e) => setCorrection(e.target.value)}
              onKeyDown={(e) =>
                e.key === "Enter" && correction.trim() && handleCorrectionCheck()
              }
              autoFocus
              placeholder="Type correction…"
              aria-label="Correction input"
              className="flex-1 rounded-xl border border-[var(--border)] bg-[var(--bg-surface)] px-4 py-3 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:border-[var(--primary)] focus:outline-none"
            />
            <Button
              onClick={handleCorrectionCheck}
              disabled={!correction.trim()}
            >
              Check
            </Button>
          </div>
        </div>
      )}

      {/* Wrong token feedback */}
      {answered && tokenCorrect === false && (
        <div className="mt-3 rounded-xl bg-emerald-500/10 p-3 text-sm text-emerald-600">
          ✅ Error was in:{" "}
          <strong>&ldquo;{item.tokens[item.errorTokenIndex]}&rdquo;</strong> →{" "}
          <strong>{item.correction}</strong>
          {item.explanation && (
            <p className="mt-1 text-xs text-[var(--text-muted)]">
              💡 {item.explanation}
            </p>
          )}
        </div>
      )}

      {/* Wrong correction feedback */}
      {answered && tokenCorrect === true && !correct && (
        <div className="mt-3 rounded-xl bg-emerald-500/10 p-3 text-sm text-emerald-600">
          ✅ Correct correction: <strong>{item.correction}</strong>
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
