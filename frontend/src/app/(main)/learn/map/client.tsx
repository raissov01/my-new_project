"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Heart, Star, Lock, Trophy, Zap, ChevronDown, ChevronUp, Mic,
  CalendarDays, Flame,
} from "lucide-react";
import type { EngSimUnit, UserProgress } from "@/features/learn/api";

// ── Daily Tasks ──

type DailyTask = {
  id: string;
  emoji: string;
  title: string;
  desc: string;
  href: string;
  xp: number;
};

function getDailyTasks(units: EngSimUnit[]): DailyTask[] {
  const activeUnit = units.find(u => u.isUnlocked && u.totalStars < u.maxStars);
  const nextLesson = activeUnit?.lessons?.find(l => !l.isCompleted);
  const tasks: DailyTask[] = [];

  if (nextLesson && activeUnit) {
    tasks.push({
      id: "lesson", emoji: "📚",
      title: `Complete: ${nextLesson.title}`,
      desc: activeUnit.title,
      href: `/learn/lessons/${nextLesson.id}`, xp: 50,
    });
  }
  tasks.push({
    id: "speaking", emoji: "🗣️",
    title: "Speaking Practice",
    desc: "5 min conversation with AI",
    href: "/learn/speak", xp: 30,
  });
  const reviewLesson = units.flatMap(u => u.lessons || []).find(l => l.isCompleted && l.bestStars < 3);
  if (reviewLesson) {
    tasks.push({
      id: "review", emoji: "🔄",
      title: `Review: ${reviewLesson.title}`,
      desc: "Get 3 stars!",
      href: `/learn/lessons/${reviewLesson.id}`, xp: 20,
    });
  }
  tasks.push({
    id: "vocab", emoji: "🧠",
    title: "Learn 10 New Words",
    desc: "Expand your vocabulary",
    href: "/learn/speak", xp: 25,
  });
  return tasks;
}

export function MapClient({
  units, progress, userLevel,
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
    <div className="mx-auto max-w-lg px-3 pb-24 pt-4 sm:px-4 sm:pt-6">
      {/* ── Sticky top stats bar (Duolingo-style) ── */}
      <div className="sticky top-14 z-30 -mx-3 mb-4 border-b border-[var(--border)] bg-[var(--bg-base)] px-3 py-2.5 sm:-mx-4 sm:top-16 sm:px-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1">
            {Array.from({ length: 5 }).map((_, i) => (
              <Heart key={i} className={`h-5 w-5 sm:h-6 sm:w-6 ${i < hearts ? "fill-red-500 text-red-500" : "fill-none text-[var(--text-muted)] opacity-30"}`} />
            ))}
          </div>
          <div className="flex items-center gap-3 sm:gap-4">
            <span className="flex items-center gap-1 text-sm font-bold text-orange-500 sm:text-base">
              <Zap className="h-5 w-5 fill-orange-500" /> {streak}
            </span>
            <span className="flex items-center gap-1 text-sm font-bold text-[var(--primary)] sm:text-base">
              <Star className="h-5 w-5 fill-current" /> {totalXp}
            </span>
          </div>
        </div>
      </div>

      {/* ── Quick actions ── */}
      <div className="mb-4 flex gap-2 overflow-x-auto pb-1 sm:justify-center sm:gap-3">
        <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-[var(--primary)]/20 bg-[var(--primary-soft)] px-3.5 py-2 text-sm font-bold text-[var(--primary)]">
          🎓 {userLevel}
        </span>
        <Link
          href="/learn/speak"
          className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3.5 py-2 text-sm font-bold text-emerald-600 transition-colors active:scale-95"
        >
          <Mic className="h-4 w-4" /> Speaking
        </Link>
        <Link
          href="/chat"
          className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-blue-500/20 bg-blue-500/10 px-3.5 py-2 text-sm font-bold text-blue-600 transition-colors active:scale-95"
        >
          💬 AI Tutor
        </Link>
      </div>

      {/* ── Daily Tasks ── */}
      <div className="mb-5 rounded-2xl border border-[var(--border)] bg-[var(--bg-elevated)] p-3 sm:p-4">
        <div className="mb-2.5 flex items-center gap-2">
          <CalendarDays className="h-5 w-5 text-amber-500" />
          <h3 className="text-sm font-bold text-[var(--text-primary)] sm:text-base">Today&apos;s Tasks</h3>
          <Flame className="h-4 w-4 text-orange-500" />
        </div>
        <div className="space-y-1.5">
          {getDailyTasks(units).map(task => (
            <Link
              key={task.id}
              href={task.href}
              className="flex min-h-[52px] items-center gap-3 rounded-xl border border-[var(--border)] bg-[var(--bg-surface)] px-3 py-2.5 transition-all active:scale-[0.98] sm:px-4 sm:py-3"
            >
              <span className="text-2xl">{task.emoji}</span>
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-semibold text-[var(--text-primary)] truncate sm:text-sm">{task.title}</p>
                <p className="text-[11px] text-[var(--text-muted)] sm:text-xs">{task.desc}</p>
              </div>
              <span className="shrink-0 rounded-full bg-[var(--primary-soft)] px-2.5 py-1 text-[11px] font-bold text-[var(--primary)] sm:text-xs">
                +{task.xp}
              </span>
            </Link>
          ))}
        </div>
      </div>

      {/* ── Road map ── */}
      <div className="relative">
        {/* Vertical path line */}
        <div className="absolute left-1/2 top-0 h-full w-0.5 -translate-x-1/2 bg-[var(--border)]" />

        <div className="relative space-y-3 sm:space-y-4">
          {units.map((unit, idx) => {
            const isExpanded = expandedUnit === unit.id;
            const starsPercent = unit.maxStars > 0 ? Math.round((unit.totalStars / unit.maxStars) * 100) : 0;
            const isComplete = unit.totalStars > 0 && unit.totalStars >= unit.maxStars;

            return (
              <div key={unit.id} className="relative">
                {/* ── Unit bubble ── */}
                <div
                  className={`relative z-10 mx-auto flex w-fit cursor-pointer flex-col items-center ${!unit.isUnlocked ? "opacity-40" : ""}`}
                  onClick={() => unit.isUnlocked && setExpandedUnit(isExpanded ? null : unit.id)}
                >
                  <div
                    className={`flex h-[72px] w-[72px] items-center justify-center rounded-full border-[3px] text-[28px] shadow-lg transition-transform active:scale-95 sm:h-20 sm:w-20 sm:text-3xl ${
                      isComplete
                        ? "border-yellow-400 bg-yellow-400/10"
                        : unit.isUnlocked
                          ? "border-[var(--primary)] bg-[var(--bg-elevated)]"
                          : "border-[var(--border)] bg-[var(--bg-surface)]"
                    }`}
                    style={unit.isUnlocked && !isComplete ? { borderColor: unit.color } : {}}
                  >
                    {unit.isUnlocked ? unit.iconEmoji : <Lock className="h-7 w-7 text-[var(--text-muted)]" />}
                  </div>

                  {/* Stars */}
                  {unit.isUnlocked && (
                    <div className="mt-1.5 flex gap-0.5">
                      {[1, 2, 3].map((s) => (
                        <Star key={s} className={`h-4 w-4 ${starsPercent >= s * 33 ? "fill-yellow-400 text-yellow-400" : "text-[var(--text-muted)] opacity-30"}`} />
                      ))}
                    </div>
                  )}

                  <p className="mt-1 max-w-[140px] text-center text-[13px] font-bold text-[var(--text-primary)] sm:text-sm">
                    {unit.title}
                  </p>
                  <span className="text-[11px] font-semibold text-[var(--text-muted)]">{unit.level}</span>

                  {unit.isUnlocked && (
                    isExpanded
                      ? <ChevronUp className="mt-0.5 h-5 w-5 text-[var(--text-muted)]" />
                      : <ChevronDown className="mt-0.5 h-5 w-5 text-[var(--text-muted)]" />
                  )}
                </div>

                {/* ── Expanded lessons ── */}
                {isExpanded && unit.isUnlocked && (
                  <div className="mt-3 rounded-2xl border border-[var(--border)] bg-[var(--bg-elevated)] p-3 shadow-[var(--shadow-md)] sm:p-4">
                    <p className="mb-3 text-xs text-[var(--text-secondary)] sm:text-sm">{unit.description}</p>
                    <div className="space-y-1.5">
                      {(unit.lessons || []).map((lesson, li) => {
                        const isBoss = lesson.lessonType === "boss";
                        const prevCompleted = li === 0 || (unit.lessons[li - 1]?.bestStars ?? 0) > 0;

                        return (
                          <div key={lesson.id} className="flex min-h-[48px] items-center gap-3">
                            <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-sm font-bold ${
                              lesson.isCompleted
                                ? "bg-emerald-500/15 text-emerald-500"
                                : isBoss
                                  ? "bg-amber-500/15 text-amber-500"
                                  : "bg-[var(--bg-soft)] text-[var(--text-secondary)]"
                            }`}>
                              {isBoss ? <Trophy className="h-5 w-5" /> : `${li + 1}`}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-[13px] font-semibold text-[var(--text-primary)] truncate sm:text-sm">
                                {lesson.title}
                              </p>
                              <div className="flex gap-0.5 mt-0.5">
                                {[1, 2, 3].map((s) => (
                                  <Star key={s} className={`h-3.5 w-3.5 ${s <= lesson.bestStars ? "fill-yellow-400 text-yellow-400" : "text-[var(--text-muted)] opacity-20"}`} />
                                ))}
                              </div>
                            </div>
                            {prevCompleted ? (
                              <Link
                                href={`/learn/lessons/${lesson.id}`}
                                className="min-h-[40px] min-w-[64px] flex items-center justify-center rounded-xl bg-[var(--primary)] px-4 py-2 text-sm font-bold text-white transition-transform active:scale-95"
                              >
                                {lesson.isCompleted ? "Retry" : "Play"}
                              </Link>
                            ) : (
                              <div className="flex h-10 w-10 items-center justify-center">
                                <Lock className="h-5 w-5 text-[var(--text-muted)]" />
                              </div>
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
