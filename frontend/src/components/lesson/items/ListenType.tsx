"use client";

import { useState, useRef } from "react";
import { Play, Volume2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { ListenTypeItem } from "@/types/lesson";
import { checkTranslate } from "@/lib/lesson/check";

interface Props {
  item: ListenTypeItem;
  onAnswer: (correct: boolean, userAnswer: string) => void;
}

export function ListenType({ item, onAnswer }: Props) {
  const [input, setInput] = useState("");
  const [answered, setAnswered] = useState(false);
  const [correct, setCorrect] = useState(false);
  const [playCount, setPlayCount] = useState(0);
  const audioRef = useRef<HTMLAudioElement>(null);

  function play(rate = 1) {
    const audio = audioRef.current;
    if (!audio) return;
    audio.playbackRate = rate;
    audio.currentTime = 0;
    audio.play().catch(() => {
      // Browser may block autoplay — user must interact first
    });
    setPlayCount((c) => c + 1);
  }

  function handleCheck() {
    if (!input.trim() || answered) return;
    const isCorrect = checkTranslate(input, item.acceptedAnswers);
    setCorrect(isCorrect);
    setAnswered(true);
    onAnswer(isCorrect, input.trim());
  }

  return (
    <div>
      {/* TODO: Generate audio via TTS pipeline (ElevenLabs / Google TTS) */}
      {/* Build-time script: `npm run generate-audio` — idempotent */}
      <audio ref={audioRef} src={item.audioUrl} preload="auto" />

      {/* Play controls */}
      <div className="mb-5 flex items-center justify-center gap-4">
        <button
          onClick={() => play(1)}
          aria-label="Play audio"
          className="flex h-16 w-16 items-center justify-center rounded-full bg-[var(--primary)] text-white shadow-lg transition-transform hover:scale-105 active:scale-95"
        >
          <Play className="h-7 w-7 fill-current" />
        </button>
        {playCount > 0 && (
          <button
            onClick={() => play(0.7)}
            aria-label="Play slower"
            title="Slow replay (0.7x)"
            className="flex h-10 w-10 items-center justify-center rounded-full border border-[var(--border)] bg-[var(--bg-surface)] text-[var(--text-secondary)] transition-all hover:border-[var(--primary)] active:scale-95"
          >
            <Volume2 className="h-4 w-4" />
          </button>
        )}
      </div>

      {playCount === 0 && (
        <p className="mb-4 text-center text-sm text-[var(--text-muted)]">
          Press ▶ to listen, then type what you hear
        </p>
      )}

      <div className="flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleCheck()}
          onPaste={(e) => e.preventDefault()}
          disabled={answered}
          placeholder="Type what you hear…"
          aria-label="Listening input — paste disabled"
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
          ✅ Correct: <strong>{item.acceptedAnswers[0]}</strong>
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
