"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import {
  Heart, Star, Lock, Trophy, Zap, ChevronDown, ChevronUp,
  Gem, Info, X, RotateCcw,
} from "lucide-react";
import type { EngSimUnit, UserProgress } from "@/features/learn/api";
import type { XPEvent, DailyQuest } from "@/features/gamification/api";
import type { StudentQuizAssignment } from "@/server/services/classrooms.types";
import { XPBoostBanner } from "@/components/gamification/XPBoostBanner";
import { StreakBadge } from "@/components/gamification/StreakBadge";
import { useLocale } from "@/components/providers/locale-provider";

// ── Hearts logic ──────────────────────────────────────────────────────────────

const HEART_REFILL_MINUTES = 30;

function useHeartCountdown(refillAt: string | null, refillingLabel: string): string {
  const [label, setLabel] = useState("");

  useEffect(() => {
    if (!refillAt) { setLabel(""); return; }
    const target = new Date(refillAt).getTime();

    function tick() {
      const diff = target - Date.now();
      if (diff <= 0) { setLabel(refillingLabel); return; }
      const m = Math.floor(diff / 60_000);
      const s = Math.floor((diff % 60_000) / 1_000);
      setLabel(`${m}:${s.toString().padStart(2, "0")}`);
    }
    tick();
    const id = setInterval(tick, 1_000);
    return () => clearInterval(id);
  }, [refillAt, refillingLabel]);

  return label;
}

// ── Today's Goal widget (merges Daily Quests + Today's Tasks) ─────────────────

type GoalTask = {
  id: string;
  icon: string;
  title: string;
  subtitle: string;
  href: string;
  xp: number;
  progress?: number;
  target?: number;
  completed?: boolean;
};

function buildGoalTasks(units: EngSimUnit[], quests: DailyQuest[]): GoalTask[] {
  const tasks: GoalTask[] = [];

  // First incomplete lesson from active unit
  const activeUnit = units.find(u => u.isUnlocked && u.totalStars < u.maxStars);
  const nextLesson = activeUnit?.lessons?.find(l => !l.isCompleted);
  if (nextLesson && activeUnit) {
    tasks.push({
      id: "lesson", icon: "📚",
      title: `Complete: ${nextLesson.title}`,
      subtitle: activeUnit.title,
      href: `/learn/lessons/${nextLesson.id}`, xp: 50,
    });
  }

  // Review lesson for improvement
  const reviewLesson = units.flatMap(u => u.lessons || []).find(l => l.isCompleted && l.bestStars < 3);
  if (reviewLesson) {
    tasks.push({
      id: "review", icon: "🔄",
      title: `Review: ${reviewLesson.title}`,
      subtitle: "Improve to 3 stars!",
      href: `/learn/lessons/${reviewLesson.id}`, xp: 20,
    });
  }

  // Speaking practice
  tasks.push({
    id: "speaking", icon: "🗣️",
    title: "Speaking Practice",
    subtitle: "5 min AI conversation",
    href: "/learn/speak", xp: 30,
  });

  // Vocab building
  tasks.push({
    id: "vocab", icon: "🧠",
    title: "Learn 10 New Words",
    subtitle: "Expand your vocabulary",
    href: "/sets", xp: 25,
  });

  // Map quest progress onto tasks
  const questMap = new Map(quests.map(q => [q.questType, q]));

  return tasks.map(t => {
    if (t.id === "lesson") {
      const q = questMap.get("complete_3_lessons") ?? questMap.get("complete_5_lessons");
      if (q) return { ...t, progress: q.progress, target: q.target, completed: q.completed };
    }
    if (t.id === "speaking") {
      const q = questMap.get("listen_3_clips");
      if (q) return { ...t, progress: q.progress, target: q.target, completed: q.completed };
    }
    return t;
  });
}

// ── Tooltip component ──────────────────────────────────────────────────────────

function Tooltip({ content, children }: { content: string; children: React.ReactNode }) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative inline-flex" onMouseEnter={() => setShow(true)} onMouseLeave={() => setShow(false)}>
      {children}
      {show && (
        <div className="absolute bottom-full left-1/2 z-50 mb-2 w-56 -translate-x-1/2 rounded-xl border border-[var(--border)] bg-[var(--bg-elevated)] p-2.5 text-xs text-[var(--text-secondary)] shadow-lg">
          {content}
          <div className="absolute -bottom-1.5 left-1/2 h-3 w-3 -translate-x-1/2 rotate-45 border-b border-r border-[var(--border)] bg-[var(--bg-elevated)]" />
        </div>
      )}
    </div>
  );
}

// ── Overall progress bar ──────────────────────────────────────────────────────

function OverallProgress({ units, userLevel }: { units: EngSimUnit[]; userLevel: string }) {
  const total = units.flatMap(u => u.lessons || []).length;
  const done = units.flatMap(u => u.lessons || []).filter(l => l.isCompleted).length;
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;

  return (
    <div className="mb-3 rounded-2xl border border-[var(--border)] bg-[var(--bg-elevated)] px-4 py-3">
      <div className="mb-1.5 flex items-center justify-between">
        <span className="text-xs font-semibold text-[var(--text-primary)]">Level {userLevel} · {done}/{total} lessons</span>
        <span className="text-xs font-bold text-[var(--primary)]">{pct}%</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-[var(--bg-soft)]">
        <div
          className="h-full rounded-full bg-[var(--primary)] transition-all duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

// ── BUG-LEARN-014: Semantic unit icons keyed by ieltsSkill ───────────────────

const SKILL_ICONS: Record<string, string> = {
  vocabulary: "🔤",
  grammar: "📝",
  reading: "📖",
  listening: "🎧",
  speaking: "🎤",
  writing: "✍️",
  mixed: "🎯",
};

function unitIcon(unit: EngSimUnit): string {
  return SKILL_ICONS[unit.ieltsSkill] ?? unit.iconEmoji;
}

// ── MapClient ─────────────────────────────────────────────────────────────────

// ── BUG-LEARN-009: Teacher assignment banner ──────────────────────────────────

function AssignmentBanner({ assignments }: { assignments: StudentQuizAssignment[] }) {
  const { t } = useLocale();
  if (assignments.length === 0) return null;
  const first = assignments[0];
  const daysLeft = first.deadline
    ? Math.max(0, Math.ceil((new Date(first.deadline).getTime() - Date.now()) / 86_400_000))
    : null;

  return (
    <div className="mb-4 flex items-start gap-3 rounded-2xl border border-amber-400/40 bg-amber-400/8 px-4 py-3">
      <span className="mt-0.5 text-xl">📌</span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-bold text-[var(--text-primary)]">
          {t("learn.assignmentBanner")}
        </p>
        <p className="truncate text-xs text-[var(--text-secondary)]">
          {first.quizTitle} · {first.groupName}
          {daysLeft !== null && (
            <span className={` · ${daysLeft <= 1 ? "text-red-500 font-semibold" : "text-[var(--text-muted)]"}`}>
              {daysLeft === 0 ? t("learn.deadlineToday") : t("learn.daysLeft", { daysLeft })}
            </span>
          )}
        </p>
        {assignments.length > 1 && (
          <p className="mt-0.5 text-[11px] text-[var(--text-muted)]">
            {t("learn.moreAssignments", { count: assignments.length - 1 })}
          </p>
        )}
      </div>
      <Link
        href={`/quizzes/${first.quizId}/play`}
        className="shrink-0 rounded-xl bg-amber-500 px-3 py-2 text-xs font-bold text-white active:scale-95"
      >
        {t("learn.start")}
      </Link>
    </div>
  );
}

// ── MapClient ─────────────────────────────────────────────────────────────────

export function MapClient({
  units, progress, userLevel, initialLevel, xpEvent, quests, assignments,
}: {
  units: EngSimUnit[];
  progress: UserProgress | null;
  userLevel: string;
  initialLevel?: string;
  xpEvent?: XPEvent | null;
  quests?: DailyQuest[];
  assignments?: StudentQuizAssignment[];
}) {
  // BUG-LEARN-003: Scroll to user's level unit — use initialLevel (from URL) or userLevel fallback
  const targetLevel = initialLevel ?? userLevel;
  const scrollTargetId = (
    units.find(u => u.level === targetLevel && u.isUnlocked) ??
    units.find(u => u.level === targetLevel)
  )?.id ?? null;

  const { t } = useLocale();
  const [expandedUnit, setExpandedUnit] = useState<string | null>(scrollTargetId);
  const [showBadgeModal, setShowBadgeModal] = useState(false);
  const [showHeartsInfo, setShowHeartsInfo] = useState(false);
  const firstVisitShownRef = useRef(false);

  // BUG-LEARN-003: Auto-scroll to the target level unit on mount
  useEffect(() => {
    if (!scrollTargetId) return;
    const timer = setTimeout(() => {
      document.getElementById(`unit-${scrollTargetId}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 350);
    return () => clearTimeout(timer);
  }, [scrollTargetId]);

  // BUG-LEARN-004: First-visit hearts explanation modal
  useEffect(() => {
    if (firstVisitShownRef.current) return;
    const key = "learn_hearts_explained_v1";
    if (!localStorage.getItem(key)) {
      setShowHeartsInfo(true);
      localStorage.setItem(key, "1");
    }
    firstVisitShownRef.current = true;
  }, []);

  const hearts = progress?.hearts ?? 5;
  const totalXp = progress?.totalXp ?? 0;
  const streak = progress?.currentStreak ?? 0;
  const gems = progress?.gems ?? 0;
  const refillAt = progress?.heartsRefillAt ?? null;
  const countdown = useHeartCountdown(refillAt, t("map.refilling"));

  const goalTasks = buildGoalTasks(units, quests ?? []);
  const totalGoalXp = goalTasks.reduce((s, task) => s + task.xp, 0);

  return (
    <div className="mx-auto max-w-lg px-3 pb-32 pt-4 sm:px-4 sm:pt-6">

      {/* ── BUG-LEARN-004/018: Hearts Info Modal ── */}
      {showHeartsInfo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-sm rounded-2xl border border-[var(--border)] bg-[var(--bg-elevated)] p-6 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-bold text-[var(--text-primary)]">{t("map.heartsSystem")}</h2>
              <button onClick={() => setShowHeartsInfo(false)} className="rounded-lg p-1 text-[var(--text-muted)] hover:bg-[var(--bg-soft)]">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="space-y-3 text-sm text-[var(--text-secondary)]">
              <p>{t("map.heartsInfo1")}</p>
              <p>{t("map.heartsInfo2")}</p>
              <p>{t("map.heartsInfo3")}</p>
              <p className="text-xs text-[var(--text-muted)]">{t("map.heartsInfo4")}</p>
            </div>
            <button
              onClick={() => setShowHeartsInfo(false)}
              className="mt-5 w-full rounded-xl bg-[var(--primary)] py-2.5 text-sm font-bold text-white"
            >
              {t("map.gotIt")}
            </button>
          </div>
        </div>
      )}

      {/* ── BUG-LEARN-003: Level Badge Modal ── */}
      {showBadgeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-sm rounded-2xl border border-[var(--border)] bg-[var(--bg-elevated)] p-6 shadow-xl">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-base font-bold text-[var(--text-primary)]">{t("map.yourLevel")}</h2>
              <button onClick={() => setShowBadgeModal(false)} className="rounded-lg p-1 text-[var(--text-muted)] hover:bg-[var(--bg-soft)]">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[var(--primary-soft)] text-2xl font-black text-[var(--primary)]">
              {userLevel}
            </div>
            <p className="mb-4 text-sm text-[var(--text-secondary)]">
              {t("map.levelInfo", { level: userLevel })}
            </p>
            <Link
              href="/learn/placement?retake=true"
              onClick={() => setShowBadgeModal(false)}
              className="flex items-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--bg-soft)] px-4 py-3 text-sm font-semibold text-[var(--text-primary)] transition-colors hover:bg-[var(--bg-muted)]"
            >
              <RotateCcw className="h-4 w-4" />
              {t("map.retakePlacement")}
            </Link>
          </div>
        </div>
      )}

      {/* ── BUG-LEARN-004: Sticky top stats bar ── */}
      <div className="sticky top-14 z-30 -mx-3 mb-4 border-b border-[var(--border)] bg-[var(--bg-base)] px-3 py-2.5 sm:-mx-4 sm:top-16 sm:px-4">
        <div className="flex items-center justify-between gap-2">

          {/* Hearts with tooltip + empty countdown */}
          <Tooltip content={hearts === 0
            ? `Hearts empty! Next heart in ${countdown || "…"}. Wrong answers cost 1 heart; 1 refills every ${HEART_REFILL_MINUTES} min.`
            : `${hearts}/5 hearts. Each wrong answer costs 1 heart. Refills 1 per ${HEART_REFILL_MINUTES} min.`
          }>
            <button
              onClick={() => hearts === 0 && setShowHeartsInfo(true)}
              className="flex items-center gap-1 rounded-lg px-1 py-0.5"
            >
              {Array.from({ length: 5 }).map((_, i) => (
                <Heart key={i} className={`h-5 w-5 sm:h-6 sm:w-6 ${i < hearts ? "fill-red-500 text-red-500" : "fill-none text-[var(--text-muted)] opacity-30"}`} />
              ))}
              {hearts === 0 && countdown && (
                <span className="ml-1 text-xs font-bold text-red-500">{countdown}</span>
              )}
            </button>
          </Tooltip>

          <div className="flex items-center gap-2 sm:gap-3">
            {/* Streak */}
            <StreakBadge streak={streak} />
            <span className="flex items-center gap-1 text-sm font-bold text-orange-500">
              <Zap className="h-4 w-4 fill-orange-500 sm:h-5 sm:w-5" /> {streak}
            </span>

            {/* XP */}
            <span className="flex items-center gap-1 text-sm font-bold text-[var(--primary)]">
              <Star className="h-4 w-4 fill-current sm:h-5 sm:w-5" /> {totalXp}
            </span>

            {/* BUG-LEARN-011: Gems with tooltip */}
            <Tooltip content="Gems 💎 — earn by completing quests & streaks. Spend to refill hearts or freeze streaks (coming soon).">
              <span className="flex cursor-default items-center gap-1 text-sm font-bold text-sky-500">
                <Gem className="h-4 w-4 sm:h-5 sm:w-5" /> {gems}
              </span>
            </Tooltip>

            {/* BUG-LEARN-003: Level badge — clickable modal */}
            <button
              onClick={() => setShowBadgeModal(true)}
              className="inline-flex items-center gap-1.5 rounded-full border border-[var(--primary)]/20 bg-[var(--primary-soft)] px-3 py-1.5 text-xs font-bold text-[var(--primary)] transition-transform active:scale-95"
            >
              🎓 {userLevel}
              <Info className="h-3 w-3 opacity-60" />
            </button>
          </div>
        </div>
      </div>

      {/* ── BUG-LEARN-017: Overall Progress ── */}
      <OverallProgress units={units} userLevel={userLevel} />

      {/* ── BUG-LEARN-009: Teacher Assignment Banner ── */}
      <AssignmentBanner assignments={assignments ?? []} />

      {/* ── XP Boost Banner ── */}
      {xpEvent && (
        <div className="mb-3">
          <XPBoostBanner event={xpEvent} />
        </div>
      )}

      {/* ── BUG-LEARN-006: Merged Today's Goal widget ── */}
      <div className="mb-5 rounded-2xl border border-[var(--border)] bg-[var(--bg-elevated)] p-3 sm:p-4">
        <div className="mb-2.5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-base">🎯</span>
            <h3 className="text-sm font-bold text-[var(--text-primary)] sm:text-base">{t("map.todayGoal")}</h3>
          </div>
          <span className="text-xs text-[var(--text-muted)]">+{totalGoalXp} XP</span>
        </div>
        <div className="space-y-1.5">
          {goalTasks.map(task => (
            <Link
              key={task.id}
              href={task.href}
              className={`flex min-h-[52px] items-center gap-3 rounded-xl border px-3 py-2.5 transition-all active:scale-[0.98] sm:px-4 sm:py-3 ${
                task.completed
                  ? "border-emerald-500/20 bg-emerald-500/5 opacity-60"
                  : "border-[var(--border)] bg-[var(--bg-surface)]"
              }`}
            >
              <span className="text-xl">{task.completed ? "✅" : task.icon}</span>
              <div className="min-w-0 flex-1">
                <p className={`truncate text-[13px] font-semibold sm:text-sm ${task.completed ? "line-through text-[var(--text-muted)]" : "text-[var(--text-primary)]"}`}>
                  {task.title}
                </p>
                {task.progress !== undefined && task.target !== undefined && !task.completed && (
                  <div className="mt-1 flex items-center gap-2">
                    <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-[var(--bg-soft)]">
                      <div
                        className="h-full rounded-full bg-indigo-500 transition-all"
                        style={{ width: `${Math.min(100, (task.progress / task.target) * 100)}%` }}
                      />
                    </div>
                    <span className="shrink-0 text-[10px] text-[var(--text-muted)] tabular-nums">{task.progress}/{task.target}</span>
                  </div>
                )}
                {(!task.progress || task.completed) && (
                  <p className="text-[11px] text-[var(--text-muted)] sm:text-xs">{task.subtitle}</p>
                )}
              </div>
              <span className="shrink-0 rounded-full bg-[var(--primary-soft)] px-2.5 py-1 text-[11px] font-bold text-[var(--primary)] sm:text-xs">
                +{task.xp}
              </span>
            </Link>
          ))}
        </div>
      </div>

      {/* ── BUG-LEARN-013: Zigzag Road map ── */}
      <div className="relative">
        {/* Vertical path line */}
        <div className="absolute left-1/2 top-0 h-full w-0.5 -translate-x-1/2 bg-[var(--border)]" />

        <div className="relative space-y-4 sm:space-y-5">
          {units.map((unit, idx) => {
            const isExpanded = expandedUnit === unit.id;
            const starsPercent = unit.maxStars > 0 ? Math.round((unit.totalStars / unit.maxStars) * 100) : 0;
            const isComplete = unit.totalStars > 0 && unit.totalStars >= unit.maxStars;

            // BUG-LEARN-013: Zigzag offset — alternate left/right
            const zigzagOffset = idx % 2 === 0 ? "-translate-x-10 sm:-translate-x-14" : "translate-x-10 sm:translate-x-14";

            return (
              <div key={unit.id} id={`unit-${unit.id}`} className="relative">
                {/* ── Unit bubble ── */}
                <div
                  className={`relative z-10 mx-auto flex w-fit cursor-pointer flex-col items-center transition-transform ${zigzagOffset} ${!unit.isUnlocked ? "opacity-40" : ""}`}
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
                    {unit.isUnlocked ? unitIcon(unit) : <Lock className="h-7 w-7 text-[var(--text-muted)]" />}
                  </div>

                  {/* Stars */}
                  {unit.isUnlocked && (
                    <div className="mt-1.5 flex gap-0.5">
                      {[1, 2, 3].map((s) => (
                        <Star key={s} className={`h-3.5 w-3.5 ${starsPercent >= s * 33 ? "fill-yellow-400 text-yellow-400" : "text-[var(--text-muted)] opacity-30"}`} />
                      ))}
                    </div>
                  )}

                  <p className="mt-1 max-w-[130px] text-center text-[12px] font-bold text-[var(--text-primary)] sm:max-w-[140px] sm:text-[13px]">
                    {unit.title}
                  </p>
                  <span className="text-[10px] font-semibold text-[var(--text-muted)] sm:text-[11px]">{unit.level}</span>

                  {unit.isUnlocked && (
                    isExpanded
                      ? <ChevronUp className="mt-0.5 h-4 w-4 text-[var(--text-muted)]" />
                      : <ChevronDown className="mt-0.5 h-4 w-4 text-[var(--text-muted)]" />
                  )}
                </div>

                {/* ── BUG-LEARN-008: Expanded lessons with locked tooltip ── */}
                {isExpanded && unit.isUnlocked && (
                  <div className="mt-3 rounded-2xl border border-[var(--border)] bg-[var(--bg-elevated)] p-3 shadow-[var(--shadow-md)] sm:p-4">
                    <p className="mb-3 text-xs text-[var(--text-secondary)] sm:text-sm">{unit.description}</p>
                    <div className="space-y-1.5">
                      {(unit.lessons || []).map((lesson, li) => {
                        // BUG-LEARN-015: Boss lesson = last lesson with lessonType='boss'
                        const isBoss = lesson.lessonType === "boss";
                        const prevLesson = unit.lessons[li - 1];
                        const prevCompleted = li === 0 || (prevLesson?.bestStars ?? 0) > 0;

                        const cardContent = (
                          <div className={`flex min-h-[48px] items-center gap-3 rounded-xl border px-3 py-2.5 ${
                            isBoss
                              ? isComplete
                                ? "border-yellow-400/40 bg-yellow-400/5"
                                : prevCompleted
                                  ? "border-amber-400/60 bg-amber-400/8"
                                  : "border-amber-400/20 bg-[var(--bg-soft)] opacity-50"
                              : "border-[var(--border)] bg-[var(--bg-surface)]"
                          }`}>
                            {/* BUG-LEARN-015: Boss lesson icon */}
                            <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-sm font-bold ${
                              lesson.isCompleted
                                ? "bg-emerald-500/15 text-emerald-500"
                                : isBoss
                                  ? "bg-amber-500/15 text-amber-500"
                                  : "bg-[var(--bg-soft)] text-[var(--text-secondary)]"
                            }`}>
                              {isBoss ? <Trophy className="h-5 w-5" /> : `${li + 1}`}
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-1.5">
                                <p className="truncate text-[13px] font-semibold text-[var(--text-primary)] sm:text-sm">
                                  {lesson.title}
                                </p>
                                {isBoss && (
                                  <span className="shrink-0 rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-bold text-amber-600">
                                    Boss
                                  </span>
                                )}
                              </div>
                              <div className="mt-0.5 flex gap-0.5">
                                {[1, 2, 3].map((s) => (
                                  <Star key={s} className={`h-3 w-3 ${s <= lesson.bestStars ? "fill-yellow-400 text-yellow-400" : "text-[var(--text-muted)] opacity-20"}`} />
                                ))}
                              </div>
                            </div>
                            {prevCompleted ? (
                              <Link
                                href={`/learn/lessons/${lesson.id}`}
                                className="flex min-h-[36px] min-w-[60px] items-center justify-center rounded-xl bg-[var(--primary)] px-4 py-2 text-xs font-bold text-white transition-transform active:scale-95"
                              >
                                {lesson.isCompleted ? t("map.retry") : t("map.play")}
                              </Link>
                            ) : (
                              <div className="flex h-10 w-10 items-center justify-center">
                                <Lock className="h-4 w-4 text-[var(--text-muted)]" />
                              </div>
                            )}
                          </div>
                        );

                        // BUG-LEARN-008: Tooltip for locked lessons
                        if (!prevCompleted) {
                          return (
                            <Tooltip
                              key={lesson.id}
                              content={`Complete "${prevLesson?.title ?? "previous lesson"}" to unlock this lesson.`}
                            >
                              <div className="w-full opacity-60 cursor-not-allowed">{cardContent}</div>
                            </Tooltip>
                          );
                        }

                        return <div key={lesson.id}>{cardContent}</div>;
                      })}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* ── BUG-LEARN-012: Quick Practice — moved to bottom ── */}
      <div className="mt-8 rounded-2xl border border-[var(--border)] bg-[var(--bg-elevated)] p-3 sm:p-4">
        <h3 className="mb-3 text-sm font-bold text-[var(--text-primary)]">{t("map.quickPractice")}</h3>
        <div className="flex flex-wrap gap-2">
          <Link
            href="/learn/speak"
            className="inline-flex items-center gap-2 rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-2.5 text-sm font-bold text-emerald-600 transition-colors active:scale-95"
          >
            {t("map.speaking5min")}
          </Link>
          <Link
            href="/chat"
            className="inline-flex items-center gap-2 rounded-xl border border-blue-500/20 bg-blue-500/10 px-4 py-2.5 text-sm font-bold text-blue-600 transition-colors active:scale-95"
          >
            {t("map.aiTutor")}
          </Link>
          <Link
            href="/sets"
            className="inline-flex items-center gap-2 rounded-xl border border-violet-500/20 bg-violet-500/10 px-4 py-2.5 text-sm font-bold text-violet-600 transition-colors active:scale-95"
          >
            {t("map.wordBuilder")}
          </Link>
        </div>
      </div>
    </div>
  );
}
