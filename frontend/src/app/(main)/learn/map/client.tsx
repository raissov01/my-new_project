"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Heart, Star, Lock, Trophy, Zap, ChevronDown, ChevronUp,
} from "lucide-react";
import type { EngSimUnit, UserProgress } from "@/features/learn/api";

export function MapClient({
  units,
  progress,
  userLevel,
}: {
  units: EngSimUnit[];
  progress: UserProgress | null;
  userLevel: string;
}) {
  const [expandedUnit, setExpandedUnit] = useState<string | null>(null);

  const hearts = progress?.hearts ?? 5;
  const totalXp = progress?.totalXp ?? 0;
  const streak = progress?.currentStreak ?? 0;

  return (
    <div className="mx-auto max-w-lg px-4 py-6">
      {/* ── Top bar ── */}
      <div className="mb-6 flex items-center justify-between rounded-2xl border border-[var(--border)] bg-[var(--bg-elevated)] px-4 py-3">
        <div className="flex items-center gap-1.5 text-sm font-semibold text-red-500">
          {Array.from({ length: 5 }).map((_, i) => (
            <Heart
              key={i}
              className={`h-5 w-5 ${i < hearts ? "fill-red-500" : "fill-none opacity-30"}`}
            />
          ))}
        </div>
        <div className="flex items-center gap-4 text-sm font-semibold">
          <span className="flex items-center gap-1 text-orange-500">
            <Zap className="h-4 w-4 fill-orange-500" /> {streak}
          </span>
          <span className="flex items-center gap-1 text-[var(--primary)]">
            <Star className="h-4 w-4 fill-current" /> {totalXp} XP
          </span>
        </div>
      </div>

      {/* ── Level badge ── */}
      <div className="mb-6 text-center">
        <span className="inline-flex items-center gap-2 rounded-full border border-[var(--primary)]/20 bg-[var(--primary-soft)] px-4 py-1.5 text-sm font-bold text-[var(--primary)]">
          Level {userLevel}
        </span>
      </div>

      {/* ── Road map ── */}
      <div className="relative">
        {/* Vertical line */}
        <div className="absolute left-1/2 top-0 h-full w-0.5 -translate-x-1/2 bg-[var(--border)]" />

        <div className="relative space-y-4">
          {units.map((unit, idx) => {
            const isExpanded = expandedUnit === unit.id;
            const starsPercent = unit.maxStars > 0 ? Math.round((unit.totalStars / unit.maxStars) * 100) : 0;
            const isComplete = unit.totalStars > 0 && unit.totalStars >= unit.maxStars;
            const side = idx % 2 === 0 ? "left" : "right";

            return (
              <div key={unit.id} className="relative">
                {/* ── Unit bubble ── */}
                <div
                  className={`relative z-10 mx-auto flex w-fit cursor-pointer flex-col items-center ${
                    !unit.isUnlocked ? "opacity-40" : ""
                  }`}
                  onClick={() => unit.isUnlocked && setExpandedUnit(isExpanded ? null : unit.id)}
                >
                  <div
                    className={`flex h-16 w-16 items-center justify-center rounded-full border-[3px] text-2xl shadow-lg transition-transform hover:scale-110 ${
                      isComplete
                        ? "border-yellow-400 bg-yellow-400/10"
                        : unit.isUnlocked
                          ? "border-[var(--primary)] bg-[var(--bg-elevated)]"
                          : "border-[var(--border)] bg-[var(--bg-surface)]"
                    }`}
                    style={unit.isUnlocked && !isComplete ? { borderColor: unit.color } : {}}
                  >
                    {unit.isUnlocked ? (
                      <span>{unit.iconEmoji}</span>
                    ) : (
                      <Lock className="h-6 w-6 text-[var(--text-muted)]" />
                    )}
                  </div>

                  {/* Stars under bubble */}
                  {unit.isUnlocked && (
                    <div className="mt-1.5 flex gap-0.5">
                      {[1, 2, 3].map((s) => (
                        <Star
                          key={s}
                          className={`h-3.5 w-3.5 ${
                            starsPercent >= s * 33
                              ? "fill-yellow-400 text-yellow-400"
                              : "text-[var(--text-muted)] opacity-30"
                          }`}
                        />
                      ))}
                    </div>
                  )}

                  <p className="mt-1 max-w-[120px] text-center text-xs font-semibold text-[var(--text-primary)]">
                    {unit.title}
                  </p>
                  <span className="text-[10px] font-medium text-[var(--text-muted)]">{unit.level}</span>

                  {unit.isUnlocked && (
                    <div className="mt-0.5">
                      {isExpanded ? (
                        <ChevronUp className="h-4 w-4 text-[var(--text-muted)]" />
                      ) : (
                        <ChevronDown className="h-4 w-4 text-[var(--text-muted)]" />
                      )}
                    </div>
                  )}
                </div>

                {/* ── Expanded lessons ── */}
                {isExpanded && unit.isUnlocked && (
                  <div className="mt-3 rounded-2xl border border-[var(--border)] bg-[var(--bg-elevated)] p-4 shadow-[var(--shadow-md)]">
                    <p className="mb-3 text-xs text-[var(--text-secondary)]">{unit.description}</p>
                    <div className="space-y-2">
                      {(unit.lessons || []).map((lesson, li) => {
                        const isBoss = lesson.lessonType === "boss";
                        // Lesson is playable if: first lesson OR previous lesson has stars > 0
                        const prevCompleted = li === 0 || (unit.lessons[li - 1]?.bestStars ?? 0) > 0;
                        const canPlay = prevCompleted;

                        return (
                          <div key={lesson.id} className="flex items-center gap-3">
                            <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-sm ${
                              lesson.isCompleted
                                ? "bg-emerald-500/15 text-emerald-500"
                                : isBoss
                                  ? "bg-amber-500/15 text-amber-500"
                                  : "bg-[var(--bg-soft)] text-[var(--text-secondary)]"
                            }`}>
                              {isBoss ? <Trophy className="h-4 w-4" /> : `${li + 1}`}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-[var(--text-primary)] truncate">
                                {lesson.title}
                              </p>
                              <div className="flex gap-0.5 mt-0.5">
                                {[1, 2, 3].map((s) => (
                                  <Star
                                    key={s}
                                    className={`h-3 w-3 ${
                                      s <= lesson.bestStars
                                        ? "fill-yellow-400 text-yellow-400"
                                        : "text-[var(--text-muted)] opacity-20"
                                    }`}
                                  />
                                ))}
                              </div>
                            </div>
                            {canPlay ? (
                              <Link
                                href={`/learn/lessons/${lesson.id}`}
                                className="rounded-lg bg-[var(--primary)] px-3 py-1.5 text-xs font-semibold text-white transition-transform hover:scale-105"
                              >
                                {lesson.isCompleted ? "Retry" : "Play"}
                              </Link>
                            ) : (
                              <Lock className="h-4 w-4 text-[var(--text-muted)]" />
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
