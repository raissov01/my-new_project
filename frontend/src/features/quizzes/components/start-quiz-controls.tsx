"use client";

import { useState } from "react";
import Link from "next/link";
import { Play } from "lucide-react";

interface Props {
  quizId: string;
  startLabel: string;
  timerToggleLabel: string;
}

export function StartQuizControls({ quizId, startLabel, timerToggleLabel }: Props) {
  const [timerEnabled, setTimerEnabled] = useState(true);
  const href = timerEnabled
    ? `/quizzes/${quizId}/play`
    : `/quizzes/${quizId}/play?notimer=1`;

  return (
    <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 12 }}>
      <Link href={href} className="nd-btn-primary">
        <Play style={{ width: 15, height: 15 }} />
        {startLabel}
      </Link>
      <label
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 8,
          cursor: "pointer",
          fontSize: 13.5,
          color: "var(--ink-soft)",
          userSelect: "none",
        }}
      >
        <input
          type="checkbox"
          checked={timerEnabled}
          onChange={(e) => setTimerEnabled(e.target.checked)}
          style={{ width: 16, height: 16, cursor: "pointer", accentColor: "var(--terra)" }}
        />
        {timerToggleLabel}
      </label>
    </div>
  );
}
