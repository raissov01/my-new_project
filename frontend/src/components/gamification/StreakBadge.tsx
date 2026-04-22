"use client";

import Link from "next/link";

interface StreakBadgeProps {
  streak: number;
  className?: string;
}

export function StreakBadge({ streak, className = "" }: StreakBadgeProps) {
  const isHot = streak >= 7;

  return (
    <Link
      href="/streak"
      aria-label={`${streak}-day streak`}
      className={`flex items-center gap-1 rounded-full px-2 py-1 text-sm font-bold transition-colors hover:bg-orange-50 dark:hover:bg-orange-950 ${className}`}
    >
      <span
        className={isHot ? "animate-[flame_1.2s_ease-in-out_infinite]" : ""}
        style={isHot ? { display: "inline-block" } : {}}
      >
        🔥
      </span>
      <span className="text-orange-500 tabular-nums">{streak}</span>
      <style>{`
        @keyframes flame {
          0%,100% { transform: scale(1) rotate(-3deg); }
          50% { transform: scale(1.2) rotate(3deg); }
        }
      `}</style>
    </Link>
  );
}
