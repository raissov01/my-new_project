"use client";

import { useMemo } from "react";

interface Props {
  transcript: string;
  currentTime?: number; // seconds, for word highlighting
  blanks?: string[]; // words to blank out (fill-in-the-blank mode)
  onBlankChange?: (idx: number, value: string) => void;
  blankAnswers?: string[];
  revealed?: boolean; // show answers in blanks
}

export function TranscriptViewer({
  transcript,
  currentTime,
  blanks = [],
  onBlankChange,
  blankAnswers = [],
  revealed = false,
}: Props) {
  const lowerBlanks = blanks.map((b) => b.toLowerCase());

  const tokens = useMemo(() => {
    return transcript.split(/(\s+)/).map((token, i) => ({
      id: i,
      text: token,
      isWord: /\w/.test(token),
    }));
  }, [transcript]);

  // Track blank index per blank-word occurrence
  let blankCounter = 0;

  return (
    <div
      className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--bg-surface)] p-4 leading-relaxed text-sm text-[var(--text-primary)] font-serif"
      role="document"
      aria-label="Transcript"
    >
      {tokens.map((tok) => {
        if (!tok.isWord || /^\s+$/.test(tok.text)) {
          return <span key={tok.id}>{tok.text}</span>;
        }

        const clean = tok.text.replace(/[^a-zA-Z']/g, "").toLowerCase();
        const isBlank = lowerBlanks.includes(clean);

        if (isBlank) {
          const idx = blankCounter++;
          const answer = blankAnswers[idx] ?? "";
          const correct = blanks[idx] ?? "";
          const isCorrect = answer.trim().toLowerCase() === correct.toLowerCase();

          if (revealed) {
            return (
              <span
                key={tok.id}
                className={`inline-block rounded px-1 font-medium ${
                  isCorrect ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
                }`}
              >
                {correct}
              </span>
            );
          }

          return (
            <span key={tok.id} className="inline-block align-middle mx-0.5">
              <input
                type="text"
                value={answer}
                onChange={(e) => onBlankChange?.(idx, e.target.value)}
                aria-label={`Blank ${idx + 1}`}
                className="border-b-2 border-[var(--primary)] bg-transparent text-center outline-none text-sm w-20 focus:border-[var(--primary)]"
                style={{ width: `${Math.max(5, correct.length + 2)}ch` }}
              />
            </span>
          );
        }

        return <span key={tok.id}>{tok.text}</span>;
      })}
    </div>
  );
}
