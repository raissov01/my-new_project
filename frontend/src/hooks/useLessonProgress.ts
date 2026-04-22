"use client";

import { useState, useCallback } from "react";

export interface LessonProgressState {
  hearts: number;
  combo: number;
  comboMax: number;
  correctCount: number;
  totalAnswered: number;
}

export function useLessonProgress(initialHearts = 5) {
  const [hearts, setHearts] = useState(initialHearts);
  const [combo, setCombo] = useState(0);
  const [comboMax, setComboMax] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [totalAnswered, setTotalAnswered] = useState(0);

  const recordAnswer = useCallback((correct: boolean) => {
    setTotalAnswered((t) => t + 1);
    if (correct) {
      setCorrectCount((c) => c + 1);
      setCombo((c) => {
        const next = c + 1;
        setComboMax((m) => Math.max(m, next));
        return next;
      });
    } else {
      setCombo(0);
      setHearts((h) => Math.max(0, h - 1));
    }
  }, []);

  const syncHearts = useCallback((h: number) => setHearts(h), []);

  return {
    hearts,
    combo,
    comboMax,
    correctCount,
    totalAnswered,
    recordAnswer,
    syncHearts,
  };
}
