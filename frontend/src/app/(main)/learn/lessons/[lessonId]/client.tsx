"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Heart, Star, Zap, Loader2, Trophy, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  startLesson,
  submitAnswer,
  completeLesson,
  type Exercise,
  type LessonExercisePayload,
  type LessonResult,
} from "@/features/learn/api";
import { recordDailyActivity } from "@/features/gamification/api";
import { LessonItemRenderer } from "@/components/lesson/LessonItemRenderer";
import { FeedbackToast } from "@/components/lesson/shared/FeedbackToast";
import { useLessonProgress } from "@/hooks/useLessonProgress";
import { normalizeExercises } from "@/lib/lesson/normalize";
import type { LessonItem } from "@/types/lesson";
import { useLocale } from "@/components/providers/locale-provider";

type Phase = "loading" | "playing" | "result";

function parseExercises(
  payload: LessonExercisePayload | Exercise[],
): Exercise[] {
  return Array.isArray(payload) ? payload : (payload.exercises ?? []);
}

export function LessonClient({ lessonId }: { lessonId: string }) {
  const router = useRouter();
  const { t } = useLocale();
  const [phase, setPhase] = useState<Phase>("loading");
  const [sessionId, setSessionId] = useState("");
  const [items, setItems] = useState<LessonItem[]>([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [answeredResult, setAnsweredResult] = useState<{
    correct: boolean;
    explanation?: string;
  } | null>(null);
  const [result, setResult] = useState<LessonResult | null>(null);
  const startTime = useRef<number>(0);

  const { hearts, combo, comboMax, recordAnswer, syncHearts } =
    useLessonProgress();

  useEffect(() => {
    async function init() {
      try {
        const res = await startLesson(lessonId);
        setSessionId(res.session.id);
        const exData =
          typeof res.exercises === "string"
            ? (JSON.parse(res.exercises) as LessonExercisePayload | Exercise[])
            : res.exercises;
        setItems(normalizeExercises(parseExercises(exData)));
        setPhase("playing");
        startTime.current = Date.now();
      } catch (err: unknown) {
        alert(err instanceof Error ? err.message : t("lesson.failedToStart"));
        router.push("/learn/map");
      }
    }
    init();
  }, [lessonId, router]);

  const currentItem = items[currentIdx];

  function handleAnswer(correct: boolean, _userAnswer: string) {
    recordAnswer(correct);
    setAnsweredResult({
      correct,
      explanation: currentItem?.explanation,
    });

    submitAnswer(lessonId, {
      sessionId,
      exerciseIndex: currentIdx,
      isCorrect: correct,
    })
      .then((res) => {
        if (res.heartsRemaining !== undefined) syncHearts(res.heartsRemaining);
      })
      .catch(() => {});
  }

  function handleNext() {
    if (currentIdx + 1 < items.length && hearts > 0) {
      setCurrentIdx((i) => i + 1);
      setAnsweredResult(null);
    } else {
      finishLesson();
    }
  }

  async function finishLesson() {
    setPhase("loading");
    try {
      const elapsed = Math.floor((Date.now() - startTime.current) / 1000);
      const res = await completeLesson(lessonId, {
        sessionId,
        timeTakenSecs: elapsed,
        comboMax,
      });
      setResult(res);
      setPhase("result");
      // Fire-and-forget: update streak + league XP
      recordDailyActivity(res.xpEarned, 1).catch(() => {});
    } catch {
      router.push("/learn/map");
    }
  }

  // ── Loading ──────────────────────────────────────────────────────────────
  if (phase === "loading") {
    return (
      <div className="flex h-[60vh] flex-col items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-[var(--primary)]" />
        <p className="mt-4 text-sm text-[var(--text-secondary)]">
          {result ? t("lesson.calculating") : t("lesson.preparing")}
        </p>
      </div>
    );
  }

  // ── Result ────────────────────────────────────────────────────────────────
  if (phase === "result" && result) {
    return (
      <div className="mx-auto max-w-md px-4 py-12 text-center">
        <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-[var(--primary-soft)]">
          <Trophy className="h-10 w-10 text-[var(--primary)]" />
        </div>
        <h2 className="text-2xl font-bold text-[var(--text-primary)]">
          {t("lesson.complete")}
        </h2>

        <div className="mt-4 flex justify-center gap-2">
          {[1, 2, 3].map((s) => (
            <Star
              key={s}
              className={`h-10 w-10 transition-all duration-500 ${
                s <= result.stars
                  ? "scale-110 fill-yellow-400 text-yellow-400"
                  : "text-[var(--text-muted)] opacity-20"
              }`}
              style={{ transitionDelay: `${s * 200}ms` }}
            />
          ))}
        </div>

        <div className="mt-6 grid grid-cols-2 gap-3">
          <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-surface)] p-3">
            <p className="text-2xl font-bold text-[var(--primary)]">
              +{result.xpEarned}
            </p>
            <p className="text-xs text-[var(--text-muted)]">{t("lesson.xpEarned")}</p>
          </div>
          <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-surface)] p-3">
            <p className="text-2xl font-bold text-emerald-500">
              {result.accuracy}%
            </p>
            <p className="text-xs text-[var(--text-muted)]">{t("lesson.accuracy")}</p>
          </div>
          <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-surface)] p-3">
            <p className="text-2xl font-bold text-orange-500">
              {result.comboMax}x
            </p>
            <p className="text-xs text-[var(--text-muted)]">{t("lesson.bestCombo")}</p>
          </div>
          <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-surface)] p-3">
            <p className="text-2xl font-bold text-amber-500">
              {result.streak}
            </p>
            <p className="text-xs text-[var(--text-muted)]">{t("lesson.dayStreak")}</p>
          </div>
        </div>

        <Button
          className="mt-8 w-full"
          size="lg"
          onClick={() => router.push("/learn/map")}
        >
          {t("lesson.continue")}
        </Button>
      </div>
    );
  }

  // ── Playing ───────────────────────────────────────────────────────────────
  if (!currentItem) return null;

  const progress = ((currentIdx + 1) / items.length) * 100;

  return (
    <div className="mx-auto max-w-2xl px-3 py-4 sm:px-4 sm:py-6">
      {/* Sticky top bar */}
      <div className="sticky top-14 z-20 -mx-3 mb-3 flex items-center gap-3 border-b border-[var(--border)] bg-[var(--bg-base)] px-3 py-2.5 sm:-mx-4 sm:static sm:mb-4 sm:border-0 sm:bg-transparent sm:px-0 sm:py-0">
        <button
          onClick={() => router.push("/learn/map")}
          aria-label="Exit lesson"
          className="flex h-10 w-10 items-center justify-center rounded-xl text-[var(--text-secondary)] active:scale-95"
        >
          <X className="h-5 w-5" />
        </button>
        <div className="flex-1">
          <div
            role="progressbar"
            aria-valuenow={Math.round(progress)}
            aria-valuemin={0}
            aria-valuemax={100}
            className="h-3 w-full rounded-full bg-[var(--bg-muted)]"
          >
            <div
              className="h-3 rounded-full bg-[var(--primary)] transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
        <div className="flex items-center gap-0.5" aria-label={`${hearts} hearts remaining`}>
          {Array.from({ length: 5 }).map((_, i) => (
            <Heart
              key={i}
              className={`h-5 w-5 ${
                i < hearts
                  ? "fill-red-500 text-red-500"
                  : "fill-none text-[var(--text-muted)] opacity-30"
              }`}
            />
          ))}
        </div>
        {combo >= 2 && (
          <span
            aria-label={`${combo}x combo`}
            className="flex items-center gap-1 rounded-full bg-orange-500/15 px-2.5 py-1 text-xs font-bold text-orange-500"
          >
            <Zap className="h-3.5 w-3.5 fill-orange-500" /> {combo}x
          </span>
        )}
      </div>

      {/* Exercise card */}
      <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-elevated)] p-4 shadow-[var(--shadow-md)] sm:p-6">
        <div className="mb-4 flex items-center justify-between">
          <p className="text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">
            {t(`lesson.type.${currentItem.type}` as Parameters<typeof t>[0]) || currentItem.type}
          </p>
          <span className="rounded-full border border-[var(--border)] px-2 py-0.5 text-xs font-semibold text-[var(--text-muted)]">
            {currentIdx + 1} / {items.length}
          </span>
        </div>

        {/* Each renderer is self-contained — it renders its own prompt/source */}
        <LessonItemRenderer
          key={currentItem.id}
          item={currentItem}
          onAnswer={handleAnswer}
        />

        {answeredResult && (
          <FeedbackToast
            isCorrect={answeredResult.correct}
            combo={combo}
            explanation={answeredResult.explanation}
            onNext={handleNext}
            nextLabel={
              currentIdx + 1 < items.length ? t("lesson.continue") : t("lesson.finish")
            }
          />
        )}
      </div>
    </div>
  );
}
