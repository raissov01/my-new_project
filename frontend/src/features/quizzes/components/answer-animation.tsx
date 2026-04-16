"use client";

import { useMemo, useState, useEffect } from "react";

// AnswerAnimation is a short-lived overlay rendered above the play area on
// each answer reveal. The parent remounts it (via key) so every answer
// gets a fresh animation run. `phase` selects which visual fires:
//  - "correct"  — confetti burst + celebration reaction character
//  - "wrong"    — encouraging reaction character + text
//  - null       — renders nothing
export type AnswerAnimationPhase = "correct" | "wrong" | null;

interface AnswerAnimationProps {
  phase: AnswerAnimationPhase;
  // Localized encouragement phrase for wrong answers. Caller provides so
  // this component stays i18n-free.
  encourageText: string;
}

// A handful of warm, pastel colors for the confetti. Kept small so the
// burst looks deliberate rather than chaotic.
const CONFETTI_COLORS = [
  "#fbbf24",
  "#34d399",
  "#60a5fa",
  "#f472b6",
  "#a78bfa",
] as const;

// Pre-compute a fixed set of confetti piece offsets so their directions are
// deterministic per render. Randomizing on every render would cause SSR
// hydration drift — this module-level array is the same on both sides and
// useMemo picks a subset with a stable offset per mount below.
const PIECES = Array.from({ length: 24 }, (_, i) => ({
  id: i,
  angle: (i / 24) * Math.PI * 2,
  distance: 90 + (i % 5) * 14,
  delay: (i % 6) * 16,
  rotation: 180 + (i % 4) * 120,
  color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
}));

// Reaction characters for correct answers — celebratory
const CORRECT_REACTIONS = ["🎉", "🏆", "⭐", "🔥", "💯", "🚀", "🎯", "✨", "👑", "💪"];
// Reaction characters for wrong answers — encouraging
const WRONG_REACTIONS = ["😅", "💡", "🤔", "📚", "🌟", "💪", "🔄", "🎯"];

export function AnswerAnimation({
  phase,
  encourageText,
}: AnswerAnimationProps) {
  const pieces = useMemo(() => {
    if (phase !== "correct") return [];
    return PIECES.map((p) => ({
      ...p,
      tx: Math.cos(p.angle) * p.distance,
      ty: Math.sin(p.angle) * p.distance,
    }));
  }, [phase]);

  // Pick a random reaction on the client after mount so there's no
  // SSR/hydration mismatch (this component is purely decorative).
  const [reactionIdx, setReactionIdx] = useState(0);
  useEffect(() => {
    const arr = phase === "correct" ? CORRECT_REACTIONS : WRONG_REACTIONS;
    setReactionIdx(Math.floor(Math.random() * arr.length));
  }, [phase]);

  if (phase === null) return null;

  const reactionEmoji =
    phase === "correct"
      ? CORRECT_REACTIONS[reactionIdx % CORRECT_REACTIONS.length]
      : WRONG_REACTIONS[reactionIdx % WRONG_REACTIONS.length];

  return (
    <div
      className="pointer-events-none absolute inset-0 z-10 overflow-hidden"
      aria-hidden="true"
    >
      {phase === "correct" ? (
        <>
          {/* Confetti burst */}
          <div className="absolute left-1/2 top-1/2">
            {pieces.map((p) => (
              <span
                key={p.id}
                className="animate-confetti-piece absolute block h-2 w-2 rounded-[2px]"
                style={
                  {
                    background: p.color,
                    animationDelay: `${p.delay}ms`,
                    "--tx": `${p.tx}px`,
                    "--ty": `${p.ty}px`,
                    "--rot": `${p.rotation}deg`,
                  } as React.CSSProperties
                }
              />
            ))}
          </div>

          {/* Reaction emoji character */}
          <div
            className="animate-reaction-pop absolute left-1/2 top-6 -translate-x-1/2 select-none text-6xl leading-none drop-shadow-lg"
          >
            {reactionEmoji}
          </div>
        </>
      ) : (
        /* Wrong: emoji + encouragement text.
           encourage-rise keyframe already applies translate(-50%, …) so we
           do NOT add Tailwind's -translate-x-1/2 here. */
        <div
          className="animate-encourage-rise absolute left-1/2 top-6 flex flex-col items-center gap-2"
        >
          <span className="select-none text-5xl leading-none">{reactionEmoji}</span>
          <span className="rounded-full border border-[var(--border)] bg-[var(--bg-elevated)]/95 px-4 py-1.5 text-sm font-semibold text-[var(--text-primary)] shadow-[var(--shadow-md)]">
            {encourageText}
          </span>
        </div>
      )}
    </div>
  );
}
