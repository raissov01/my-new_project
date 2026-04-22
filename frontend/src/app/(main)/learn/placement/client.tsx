"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Brain,
  CheckCircle2,
  Loader2,
  XCircle,
  Sparkles,
  BookOpen,
  PenLine,
  Clock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { startPlacement, submitPlacement, type PlacementQuestion } from "@/features/learn/api";
import { calculateCEFR, CEFR_LEVELS, type CEFRLevel } from "@/features/learn/cefr";

// ── Types ────────────────────────────────────────────────────────────────────

type Category = "vocabulary" | "grammar";
type Phase = "intro" | "loading" | "testing" | "submitting";

const LEVELS = CEFR_LEVELS;
const TIMER_KEY = "placement_started_at_v2";
const TIMER_SECS = 15 * 60;
const MAX_PER_CATEGORY = 15;
const MIN_PER_CATEGORY = 8;

type HistoryEntry = { questionId: string; level: CEFRLevel; correct: boolean };

type CategoryState = {
  currentLevel: CEFRLevel;
  consecCorrect: number;
  consecWrong: number;
  answered: string[];
  history: HistoryEntry[];
  done: boolean;
  finalLevel: CEFRLevel | null;
};

type AdaptiveState = {
  vocab: CategoryState;
  grammar: CategoryState;
  currentCategory: Category;
};

// ── Pure helpers ─────────────────────────────────────────────────────────────

function levelUp(l: CEFRLevel): CEFRLevel {
  return LEVELS[Math.min(LEVELS.indexOf(l) + 1, LEVELS.length - 1)];
}
function levelDown(l: CEFRLevel): CEFRLevel {
  return LEVELS[Math.max(LEVELS.indexOf(l) - 1, 0)];
}

function overallLevel(v: CEFRLevel, g: CEFRLevel): CEFRLevel {
  return LEVELS[Math.round((LEVELS.indexOf(v) + LEVELS.indexOf(g)) / 2)];
}

function pickQuestion(
  questions: PlacementQuestion[],
  category: Category,
  level: CEFRLevel,
  answered: Set<string>,
): PlacementQuestion | null {
  // Current level first, then adjacent
  for (const l of [level, levelUp(level), levelDown(level)]) {
    const pool = questions.filter(
      (q) => q.category === category && q.level === l && !answered.has(q.id),
    );
    if (pool.length > 0) return pool[Math.floor(Math.random() * pool.length)];
  }
  // Any remaining level
  const pool = questions.filter(
    (q) => q.category === category && !answered.has(q.id),
  );
  return pool.length > 0 ? pool[Math.floor(Math.random() * pool.length)] : null;
}

function shouldStop(state: CategoryState): boolean {
  const n = state.answered.length;
  if (n >= MAX_PER_CATEGORY) return true;
  if (n < MIN_PER_CATEGORY) return false;
  // Stable if last 4 questions are all at same level
  const last4 = state.history.slice(-4);
  if (last4.length === 4 && new Set(last4.map((h) => h.level)).size === 1) return true;
  return false;
}

function initCategory(): CategoryState {
  return {
    currentLevel: "A2",
    consecCorrect: 0,
    consecWrong: 0,
    answered: [],
    history: [],
    done: false,
    finalLevel: null,
  };
}

function formatTime(secs: number): string {
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

// ── Component ─────────────────────────────────────────────────────────────────

export function PlacementClient({ retake = false }: { retake?: boolean }) {
  const router = useRouter();
  const { toast } = useToast();

  const [phase, setPhase] = useState<Phase>("intro");
  const [currentQuestion, setCurrentQuestion] = useState<PlacementQuestion | null>(null);
  const [currentCategory, setCurrentCategory] = useState<Category>("vocabulary");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [totalAnswered, setTotalAnswered] = useState(0);
  const [timeLeft, setTimeLeft] = useState(TIMER_SECS);

  // Mutable state — not React state to avoid stale closures in timer
  const questionsRef = useRef<PlacementQuestion[]>([]);
  const adaptiveRef = useRef<AdaptiveState>({
    vocab: initCategory(),
    grammar: initCategory(),
    currentCategory: "vocabulary",
  });
  const submittingRef = useRef(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const warningShownRef = useRef(false);
  const doSubmitRef = useRef<(() => Promise<void>) | null>(null);

  const stopTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  useEffect(() => () => stopTimer(), [stopTimer]);

  // ── Submit ──────────────────────────────────────────────────────────────

  const doSubmit = useCallback(async () => {
    if (submittingRef.current) return;
    submittingRef.current = true;
    stopTimer();
    localStorage.removeItem(TIMER_KEY);
    setPhase("submitting");

    const state = adaptiveRef.current;
    const vocabCorrect = state.vocab.history.filter((h) => h.correct).length;
    const grammarCorrect = state.grammar.history.filter((h) => h.correct).length;
    const vocabFinal =
      state.vocab.finalLevel ??
      calculateCEFR(vocabCorrect, state.vocab.history.length);
    const grammarFinal =
      state.grammar.finalLevel ??
      calculateCEFR(grammarCorrect, state.grammar.history.length);
    const overall = overallLevel(vocabFinal, grammarFinal);

    const allHistory = [...state.vocab.history, ...state.grammar.history];
    const levelScores: Record<string, number> = {};
    let correctCount = 0;
    for (const h of allHistory) {
      levelScores[h.level] = levelScores[h.level] ?? 0;
      if (h.correct) {
        correctCount++;
        levelScores[h.level]++;
      }
    }

    try {
      await submitPlacement({
        level: overall,
        vocabLevel: vocabFinal,
        grammarLevel: grammarFinal,
        correctAnswers: correctCount,
        totalQuestions: allHistory.length,
        levelScores,
        totalAnswered: allHistory.length,
      });
      router.push("/learn/placement/result");
    } catch {
      toast("error", "Failed to save results. Please try again.");
      submittingRef.current = false;
      setPhase("testing");
    }
  }, [router, stopTimer, toast]);

  // Keep ref up-to-date so timer can call latest version
  useEffect(() => {
    doSubmitRef.current = doSubmit;
  }, [doSubmit]);

  // ── Timer ────────────────────────────────────────────────────────────────

  const startTimer = useCallback(() => {
    const stored = localStorage.getItem(TIMER_KEY);
    const startedAt = stored ? parseInt(stored) : Date.now();
    if (!stored) localStorage.setItem(TIMER_KEY, startedAt.toString());

    stopTimer();
    timerRef.current = setInterval(() => {
      const remaining = Math.max(0, TIMER_SECS - (Date.now() - startedAt) / 1000);
      setTimeLeft(Math.floor(remaining));
      if (remaining <= 0) {
        stopTimer();
        void doSubmitRef.current?.();
      }
    }, 1000);
  }, [stopTimer]);

  // 2-minute warning
  useEffect(() => {
    if (phase === "testing" && timeLeft === 120 && !warningShownRef.current) {
      warningShownRef.current = true;
      toast("error", "⏰ 2 minutes remaining!");
    }
  }, [timeLeft, phase, toast]);

  // ── Start ────────────────────────────────────────────────────────────────

  async function handleStart() {
    setPhase("loading");
    try {
      const res = await startPlacement({ retake });
      if (res.alreadyDone && !retake) {
        router.push("/learn/placement/result");
        return;
      }
      const qs = (res.questions ?? []) as PlacementQuestion[];
      questionsRef.current = qs;

      const initVocab = initCategory();
      const initGrammar = initCategory();
      adaptiveRef.current = {
        vocab: initVocab,
        grammar: initGrammar,
        currentCategory: "vocabulary",
      };
      submittingRef.current = false;
      warningShownRef.current = false;

      const firstQ = pickQuestion(qs, "vocabulary", "A2", new Set());
      setCurrentQuestion(firstQ);
      setCurrentCategory("vocabulary");
      setSelectedId(null);
      setTotalAnswered(0);
      setPhase("testing");
      startTimer();
    } catch {
      toast("error", "Failed to load test. Please try again.");
      setPhase("intro");
    }
  }

  // ── Answer handler ───────────────────────────────────────────────────────

  function handleAnswer(optionId: string) {
    if (selectedId !== null || !currentQuestion) return;
    setSelectedId(optionId);

    setTimeout(() => {
      if (!currentQuestion) return;

      const isCorrect = optionId === currentQuestion.correctOptionId;
      const state = adaptiveRef.current;
      const cat = state.currentCategory;
      const catState = cat === "vocabulary" ? state.vocab : state.grammar;

      // Update consecutive counters + level
      let cCorrect = isCorrect ? catState.consecCorrect + 1 : 0;
      let cWrong = !isCorrect ? catState.consecWrong + 1 : 0;
      let nextLevel = catState.currentLevel;
      if (cCorrect >= 2) { nextLevel = levelUp(nextLevel); cCorrect = 0; }
      else if (cWrong >= 2) { nextLevel = levelDown(nextLevel); cWrong = 0; }

      const newHistory: HistoryEntry[] = [
        ...catState.history,
        { questionId: currentQuestion.id, level: catState.currentLevel, correct: isCorrect },
      ];
      const newAnswered = [...catState.answered, currentQuestion.id];

      const updated: CategoryState = {
        currentLevel: nextLevel,
        consecCorrect: cCorrect,
        consecWrong: cWrong,
        answered: newAnswered,
        history: newHistory,
        done: false,
        finalLevel: null,
      };

      const isDone = shouldStop(updated);
      updated.done = isDone;
      // Use the adaptive engine's current stabilized level — NOT history-based weighting.
      // history-based weighting gave wrong answers +1, causing 40% correct → C2.
      updated.finalLevel = isDone ? updated.currentLevel : null;

      if (cat === "vocabulary") state.vocab = updated;
      else state.grammar = updated;

      const newTotal =
        state.vocab.answered.length + state.grammar.answered.length;
      setTotalAnswered(newTotal);
      setSelectedId(null);

      if (isDone) {
        if (cat === "vocabulary" && !state.grammar.done) {
          state.currentCategory = "grammar";
          const nextQ = pickQuestion(
            questionsRef.current,
            "grammar",
            state.grammar.currentLevel,
            new Set(state.grammar.answered),
          );
          setCurrentCategory("grammar");
          if (nextQ) { setCurrentQuestion(nextQ); return; }
          state.grammar.done = true;
          state.grammar.finalLevel = state.grammar.currentLevel;
        }
        void doSubmit();
        return;
      }

      const nextQ = pickQuestion(
        questionsRef.current,
        cat,
        nextLevel,
        new Set(newAnswered),
      );
      if (nextQ) {
        setCurrentQuestion(nextQ);
      } else {
        // No more questions for this category — mark done and continue
        updated.done = true;
        updated.finalLevel = updated.currentLevel;
        if (cat === "vocabulary" && !state.grammar.done) {
          state.currentCategory = "grammar";
          const gq = pickQuestion(
            questionsRef.current,
            "grammar",
            state.grammar.currentLevel,
            new Set(state.grammar.answered),
          );
          setCurrentCategory("grammar");
          if (gq) { setCurrentQuestion(gq); return; }
          state.grammar.done = true;
          state.grammar.finalLevel = state.grammar.currentLevel;
        }
        void doSubmit();
      }
    }, 800);
  }

  // ── Render ───────────────────────────────────────────────────────────────

  const timerColor =
    timeLeft <= 120
      ? "text-red-500"
      : timeLeft <= 300
        ? "text-amber-500"
        : "text-[var(--text-secondary)]";

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      {/* ── Intro ── */}
      {phase === "intro" && (
        <div className="text-center">
          <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-3xl bg-[var(--primary-soft)]">
            <Brain className="h-10 w-10 text-[var(--primary)]" />
          </div>
          <h1 className="text-3xl font-bold text-[var(--text-primary)]">
            🎯 Placement Test
          </h1>
          <p className="mt-3 text-[var(--text-secondary)]">
            Adaptive test — about 15–30 questions to determine your English level (A1–C2)
          </p>

          <div className="mt-6 grid grid-cols-2 gap-4 text-left">
            <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-elevated)] p-4">
              <div className="flex items-center gap-2 text-sm font-semibold text-[var(--text-primary)]">
                <BookOpen className="h-4 w-4 text-blue-500" /> Vocabulary
              </div>
              <p className="mt-1 text-xs text-[var(--text-muted)]">
                Vocabulary section (adaptive)
              </p>
            </div>
            <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-elevated)] p-4">
              <div className="flex items-center gap-2 text-sm font-semibold text-[var(--text-primary)]">
                <PenLine className="h-4 w-4 text-emerald-500" /> Grammar
              </div>
              <p className="mt-1 text-xs text-[var(--text-muted)]">
                Grammar section (adaptive)
              </p>
            </div>
          </div>

          <div className="mt-5 flex flex-wrap justify-center gap-2">
            {(["A1", "A2", "B1", "B2", "C1", "C2"] as const).map((lvl) => (
              <span
                key={lvl}
                className="rounded-full border border-[var(--border)] px-3 py-1 text-xs font-medium text-[var(--text-secondary)]"
              >
                {lvl}
              </span>
            ))}
          </div>

          <Button className="mt-8" size="lg" onClick={handleStart}>
            <Sparkles className="h-5 w-5" /> Start Test
          </Button>
          <p className="mt-2 text-xs text-[var(--text-muted)]">
            Takes about 10–15 minutes
          </p>
        </div>
      )}

      {/* ── Loading ── */}
      {phase === "loading" && (
        <div className="flex flex-col items-center justify-center py-20">
          <Loader2 className="h-12 w-12 animate-spin text-[var(--primary)]" />
          <p className="mt-4 text-sm text-[var(--text-secondary)]">
            Loading questions...
          </p>
        </div>
      )}

      {/* ── Testing ── */}
      {phase === "testing" && currentQuestion && (
        <div>
          {/* Timer + progress header */}
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="rounded-full bg-[var(--bg-soft)] px-3 py-1.5 text-sm font-semibold text-[var(--text-primary)]">
                {currentCategory === "vocabulary" ? "📚 Vocabulary" : "✏️ Grammar"}
              </span>
            </div>
            <div className={`flex items-center gap-1.5 text-sm font-mono font-semibold ${timerColor}`}>
              <Clock className="h-4 w-4" />
              {formatTime(timeLeft)}
            </div>
          </div>

          {/* Progress bar */}
          <div className="mb-5">
            <div className="flex items-center justify-between text-xs text-[var(--text-secondary)]">
              <span>Question {totalAnswered + 1}</span>
              <span className="rounded-full border border-[var(--border)] px-2 py-0.5 font-semibold">
                {currentQuestion.level}
              </span>
            </div>
            <div className="mt-2 h-2 w-full rounded-full bg-[var(--bg-muted)]">
              <div
                className="h-2 rounded-full bg-[var(--primary)] transition-all duration-300"
                style={{ width: `${Math.min((totalAnswered / 30) * 100, 100)}%` }}
              />
            </div>
          </div>

          {/* Question card */}
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-elevated)] p-6">
            <p className="text-lg font-semibold text-[var(--text-primary)]">
              {currentQuestion.prompt}
            </p>
            <div className="mt-5 space-y-2.5">
              {currentQuestion.options.map((opt) => {
                let cls =
                  "border-[var(--border)] bg-[var(--bg-surface)] hover:border-[var(--primary)]";
                if (selectedId !== null) {
                  if (opt.id === currentQuestion.correctOptionId)
                    cls = "border-emerald-500 bg-emerald-500/10";
                  else if (opt.id === selectedId)
                    cls = "border-red-500 bg-red-500/10";
                }
                return (
                  <button
                    key={opt.id}
                    onClick={() => handleAnswer(opt.id)}
                    disabled={selectedId !== null}
                    className={`flex w-full items-center gap-3 rounded-xl border px-4 py-3 text-left text-sm font-medium transition-all ${cls}`}
                  >
                    <span className="shrink-0 text-[var(--text-primary)]">{opt.text}</span>
                    {selectedId !== null && opt.id === currentQuestion.correctOptionId && (
                      <CheckCircle2 className="ml-auto h-5 w-5 shrink-0 text-emerald-500" />
                    )}
                    {selectedId !== null &&
                      opt.id === selectedId &&
                      opt.id !== currentQuestion.correctOptionId && (
                        <XCircle className="ml-auto h-5 w-5 shrink-0 text-red-500" />
                      )}
                  </button>
                );
              })}
            </div>
            {selectedId !== null && currentQuestion.explanation && (
              <div className="mt-4 rounded-xl border border-[var(--border)] bg-[var(--bg-soft)] p-3 text-xs text-[var(--text-secondary)]">
                💡 {currentQuestion.explanation}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Submitting ── */}
      {(phase === "submitting" || (phase === "testing" && !currentQuestion)) && (
        <div className="flex flex-col items-center justify-center py-20">
          <Loader2 className="h-12 w-12 animate-spin text-[var(--primary)]" />
          <p className="mt-4 text-sm text-[var(--text-secondary)]">
            Calculating your level...
          </p>
        </div>
      )}
    </div>
  );
}
