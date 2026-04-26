"use client";

import { useEffect, useCallback, useRef, useState } from "react";
import { Flag, RotateCcw } from "lucide-react";
import { useLocale } from "@/components/providers/locale-provider";
import { ProgressBar } from "./progress-bar";
import type { StudySession } from "@/features/study/hooks/use-study-session";

interface FlashcardViewerProps {
  session: StudySession;
  showProgress?: boolean;
}

export function FlashcardViewer({
  session,
  showProgress = true,
}: FlashcardViewerProps) {
  const { t } = useLocale();
  const {
    currentCard,
    currentIndex,
    total,
    goNext,
    goPrev,
    reset,
    generation,
    difficult,
    toggleDifficult,
  } = session;

  const currentFlipKey = `${currentIndex}:${generation}`;
  const [flippedKey, setFlippedKey] = useState<string | null>(null);
  const touchStartX = useRef<number | null>(null);
  const touchStartY = useRef<number | null>(null);

  const isDifficult = currentCard ? difficult.has(currentCard.id) : false;
  const isFlipped = flippedKey === currentFlipKey;

  const handleFlip = useCallback(() => {
    setFlippedKey((prev) => (prev === currentFlipKey ? null : currentFlipKey));
  }, [currentFlipKey]);

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === " " || e.key === "Enter") { e.preventDefault(); handleFlip(); }
      else if (e.key === "ArrowRight") goNext();
      else if (e.key === "ArrowLeft") goPrev();
      else if (e.key === "d" || e.key === "D") toggleDifficult();
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [handleFlip, goNext, goPrev, toggleDifficult]);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
  }, []);

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    if (touchStartX.current === null || touchStartY.current === null) return;
    const dx = e.changedTouches[0].clientX - touchStartX.current;
    const dy = e.changedTouches[0].clientY - touchStartY.current;
    if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.5) {
      if (dx < 0) goNext(); else goPrev();
    }
    touchStartX.current = null;
    touchStartY.current = null;
  }, [goNext, goPrev]);

  const progress = total > 0 ? Math.round(((currentIndex + 1) / total) * 100) : 0;
  if (!currentCard) return null;

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 0 }}>
      {/* Progress bar */}
      {showProgress && (
        <div className="nd-fc-progress" style={{ width: "100%", maxWidth: 560 }}>
          <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 12, color: "var(--ink-mute)" }}>
            {currentIndex + 1} / {total}
          </span>
          <div className="nd-fc-progress-bar">
            <div className="nd-fc-progress-fill" style={{ width: `${progress}%` }} />
          </div>
          <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 12, color: "var(--ink-mute)" }}>
            ~{Math.ceil((total - currentIndex) * 0.4)} МИН
          </span>
        </div>
      )}

      {/* Card stage */}
      <div
        className="nd-fc-stage"
        onClick={handleFlip}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        style={{ cursor: "pointer", userSelect: "none" }}
      >
        <div className="nd-fc-stack2" />
        <div className="nd-fc-stack1" />
        <div className={`nd-fc-card${isFlipped ? " flipped" : ""}`}>
          {/* Front */}
          <div className="nd-fc-face">
            {isDifficult && (
              <span style={{ position: "absolute", top: 18, right: 18, background: "rgba(234,179,8,0.12)", borderRadius: "50%", padding: 6 }}>
                <Flag style={{ width: 14, height: 14, color: "#E9B949" }} />
              </span>
            )}
            <span className="nd-fc-tag">TERM</span>
            <div className="nd-fc-word">{currentCard.term}</div>
            <div className="nd-fc-hint">КАРТАНЫ АЙНАЛДЫРУ ҮШІН БАСЫҢЫЗ · SPACE</div>
          </div>
          {/* Back */}
          <div className="nd-fc-face nd-fc-face-back">
            {isDifficult && (
              <span style={{ position: "absolute", top: 18, right: 18, background: "rgba(194,80,10,0.1)", borderRadius: "50%", padding: 6 }}>
                <Flag style={{ width: 14, height: 14, color: "var(--terra)" }} />
              </span>
            )}
            <span className="nd-fc-tag" style={{ color: "var(--terra-deep)" }}>DEFINITION</span>
            <div className="nd-fc-mean">{currentCard.definition}</div>
            <div className="nd-fc-hint" style={{ color: "var(--terra-deep)", opacity: 0.7 }}>БАҒАЛА ↓</div>
          </div>
        </div>
      </div>

      {/* Rating buttons */}
      <div className="nd-fc-actions">
        <button className="nd-fc-rate nd-fc-again" onClick={(e) => { e.stopPropagation(); goPrev(); }}>
          <strong>{t("study.previous")}</strong>
          <small>{t("study.prev")}</small>
        </button>
        <button
          className="nd-fc-rate nd-fc-hard"
          onClick={(e) => { e.stopPropagation(); toggleDifficult(); }}
        >
          <strong>{isDifficult ? t("study.known") : t("study.hardLabel")}</strong>
          <small>{t("study.markHint")}</small>
        </button>
        <button className="nd-fc-rate nd-fc-good" onClick={(e) => { e.stopPropagation(); handleFlip(); }}>
          <strong>{t("study.flipLabel")}</strong>
          <small>SPACE</small>
        </button>
        <button className="nd-fc-rate nd-fc-easy" onClick={(e) => { e.stopPropagation(); goNext(); }}>
          <strong>{t("study.next")}</strong>
          <small>{t("study.nextHint")}</small>
        </button>
      </div>

      {/* Bottom reset */}
      <div style={{ textAlign: "center", marginTop: 20, display: "flex", gap: 16, justifyContent: "center", alignItems: "center" }}>
        <button
          onClick={reset}
          style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12, color: "var(--ink-mute)", fontFamily: "'JetBrains Mono',monospace", letterSpacing: ".08em", cursor: "pointer", background: "none", border: "none" }}
        >
          <RotateCcw style={{ width: 13, height: 13 }} />
          ҚАЙТА БАСТАУ
        </button>
        <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 11, color: "var(--ink-fade)", letterSpacing: ".1em" }}>
          SPACED REPETITION
        </span>
      </div>

      <ProgressBar current={currentIndex + 1} total={total} percent={progress} />
    </div>
  );
}
