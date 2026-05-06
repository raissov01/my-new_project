"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowDown,
  ArrowUp,
  Check,
  Flame,
  Lightbulb,
  LogOut,
  Timer,
  Volume2,
  VolumeX,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createTranslator, type Locale } from "@/lib/shared/i18n";
import { useQuizSounds } from "@/features/quizzes/use-sounds";
import { AnswerAnimation } from "@/features/quizzes/components/answer-animation";
import { usePowerUps, type PowerUpKey } from "@/features/quizzes/use-power-ups";
import { PowerUpBar } from "@/features/quizzes/components/power-up-bar";
import { trackQuizUsageEvent } from "@/features/quizzes/analytics";
import type {
  ComprehensionData,
  ComprehensionSubQuestion,
  HotspotZone,
  MatchPair,
  QuizDetail,
  QuizQuestionDTO,
  QuizQuestionType,
} from "@/server/services/quizzes";

type OptionLetter = "a" | "b" | "c" | "d" | "e";
type TrueFalseLetter = "t" | "f";

type DisplayOption = {
  letter: OptionLetter;
  text: string;
};

// RecordedAnswer is what we send to the backend. Only one of the value
// fields is populated per row, depending on the question type.
// selectedOption is a string to accommodate mcq_multi (comma-separated, e.g. "a,c").
type RecordedAnswer = {
  questionId: string;
  selectedOption: string | null;
  textAnswer: string | null;
  orderAnswer: string[] | null;
  timeSpent: number;
};

type Phase = "asking" | "revealed" | "submitting";

const POSITION_LABELS = ["A", "B", "C", "D", "E"] as const;

const ACCENT_BY_POSITION = [
  "from-indigo-500/25 to-indigo-500/5 border-indigo-400/30",
  "from-rose-500/25 to-rose-500/5 border-rose-400/30",
  "from-amber-500/25 to-amber-500/5 border-amber-400/30",
  "from-emerald-500/25 to-emerald-500/5 border-emerald-400/30",
] as const;

function normalizeBlank(value: string): string {
  return value.trim().toLowerCase();
}

function buildBaseOptions(question: QuizQuestionDTO): DisplayOption[] {
  const all: Array<{ letter: OptionLetter; text: string }> = [
    { letter: "a", text: question.optionA ?? "" },
    { letter: "b", text: question.optionB ?? "" },
    { letter: "c", text: question.optionC ?? "" },
    { letter: "d", text: question.optionD ?? "" },
    { letter: "e", text: question.optionE ?? "" },
  ];
  return all.filter((o) => o.text !== "");
}

function shuffleOptions(base: DisplayOption[]): DisplayOption[] {
  // Fisher-Yates; re-shuffle on the rare identity permutation so the
  // canonical order is never shown when shuffle is enabled.
  const copy = [...base];
  do {
    for (let i = copy.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
  } while (copy.every((opt, idx) => opt.letter === base[idx].letter));
  return copy;
}

function shuffleArray<T>(items: T[]): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function arraysEqual(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) return false;
  }
  return true;
}

// mcqMultiMatch: order-independent comparison of comma-separated option sets.
function mcqMultiMatch(submitted: string, correct: string): boolean {
  const parse = (s: string) =>
    s.split(",").map((v) => v.trim().toLowerCase()).filter(Boolean).sort();
  const s = parse(submitted);
  const c = parse(correct);
  if (s.length !== c.length) return false;
  return s.every((v, i) => v === c[i]);
}

interface PlayQuizClientProps {
  quiz: QuizDetail;
  locale: Locale;
  // "play" — default graded attempt, timer enabled, submits to /attempts.
  // "practice" — no timer, no submission; on completion route to returnHref.
  mode?: "play" | "practice";
  // Where to send the student when practice completes. Ignored in play mode.
  returnHref?: string;
  // True when the visitor is not logged in. Guest attempts are scored
  // locally and tracked in localStorage; no backend submission is made.
  isGuest?: boolean;
  // Stable scope for saved progress/results when the same quiz is played in parts.
  progressKey?: string;
  partLabel?: string;
}

const GUEST_ATTEMPTS_KEY = "guest_quiz_attempts";
const GUEST_ATTEMPT_LIMIT = 15;

// localStorage key for quiz progress persistence (play mode only).
// Clears on successful submit or explicit exit.
function quizStorageKey(quizId: string) {
  return `quiz_progress_${quizId}`;
}

type SavedProgress = {
  currentIdx: number;
  answers: RecordedAnswer[];
  streak: number;
  quizStartedAt: number;
};

function loadProgress(quizId: string): SavedProgress | null {
  try {
    const raw = localStorage.getItem(quizStorageKey(quizId));
    if (!raw) return null;
    return JSON.parse(raw) as SavedProgress;
  } catch {
    return null;
  }
}

function saveProgress(quizId: string, data: SavedProgress) {
  try {
    localStorage.setItem(quizStorageKey(quizId), JSON.stringify(data));
  } catch {
    // storage quota exceeded or private browsing — silently ignore
  }
}

function clearProgress(quizId: string) {
  try {
    localStorage.removeItem(quizStorageKey(quizId));
  } catch {}
}

export function PlayQuizClient({
  quiz,
  locale,
  mode = "play",
  returnHref,
  isGuest = false,
  progressKey,
  partLabel,
}: PlayQuizClientProps) {
  const isPractice = mode === "practice";
  const sounds = useQuizSounds();
  // Power-ups are disabled in practice mode (it's a focused review, not a
  // gamified run) and when the quiz owner has turned them off.
  const powerUpsEnabled = !isPractice && (quiz.powerUpsEnabled ?? true);
  const powerUps = usePowerUps(powerUpsEnabled);
  // Client-only coin counter so Double Points has something to multiply.
  // Kept separate from the backend's authoritative % score so grading
  // stays pure on the server.
  const [coins, setCoins] = useState(0);
  // Counter ticks up on every answer so the AnswerAnimation overlay gets a
  // fresh `key` and remounts even if the same phase fires twice in a row.
  const [animationTick, setAnimationTick] = useState(0);
  const t = useMemo(() => createTranslator(locale), [locale]);
  const router = useRouter();
  const progressScope = progressKey ?? quiz.id;

  const totalQuestions = quiz.questions.length;

  // Restore saved progress on mount (play mode only — practice is ephemeral)
  const savedProgress = !isPractice ? loadProgress(progressScope) : null;
  const restoredProgress = Boolean(savedProgress);

  const [currentIdx, setCurrentIdx] = useState(savedProgress?.currentIdx ?? 0);
  const [phase, setPhase] = useState<Phase>("asking");
  const [timeLeft, setTimeLeft] = useState(quiz.timePerQuestion);
  const [streak, setStreak] = useState(savedProgress?.streak ?? 0);
  const [showExit, setShowExit] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Per-type transient answer state. Only one is meaningful at a time; the
  // renderer picks which to surface based on question.questionType.
  const [selectedLetter, setSelectedLetter] = useState<
    OptionLetter | TrueFalseLetter | null
  >(null);
  const [mcqMultiSelected, setMcqMultiSelected] = useState<Set<OptionLetter>>(
    () => new Set()
  );
  const [blankInput, setBlankInput] = useState("");
  const [drawnDataUrl, setDrawnDataUrl] = useState<string | null>(null);
  const [reorderDraft, setReorderDraft] = useState<string[]>([]);
  // matchDraft: for matching/categorization, maps left item → selected right item ("" = unselected).
  const [matchDraft, setMatchDraft] = useState<Record<string, string>>({});
  const [hotspotSelected, setHotspotSelected] = useState<string | null>(null);
  // labelingDraft: zoneId → typed label; submitted as JSON via textAnswer.
  const [labelingDraft, setLabelingDraft] = useState<Record<string, string>>({});
  // comprehensionDraft: subQuestionId → chosen answer string.
  const [comprehensionDraft, setComprehensionDraft] = useState<Record<string, string>>({});
  // pollSelected / dropdownSelected reuse selectedLetter slot visually but kept separate for clarity.
  const [pollSelected, setPollSelected] = useState<string | null>(null);
  const [lastCorrect, setLastCorrect] = useState<boolean | null>(null);
  const [hintVisible, setHintVisible] = useState(false);

  const answersRef = useRef<RecordedAnswer[]>(savedProgress?.answers ?? []);
  // Tracks whether each answer was correct — parallel array to answersRef.
  // Used only in guest mode to compute the final score locally.
  const correctnessRef = useRef<boolean[]>([]);
  const questionStartRef = useRef<number>(0);
  const quizStartRef = useRef<number>(savedProgress?.quizStartedAt ?? 0);
  const advanceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Set to true when the user confirms exit so submitAttempt's router.push
  // doesn't race against the exit navigation.
  const isExitingRef = useRef(false);
  const finishedRef = useRef(false);
  const abandonedRef = useRef(false);

  // Guest attempt counter — read once on mount; gate renders before the quiz.
  const [guestAttemptsUsed] = useState<number>(() => {
    if (typeof window === "undefined") return 0;
    return parseInt(localStorage.getItem(GUEST_ATTEMPTS_KEY) ?? "0", 10);
  });

  // Refs for values read inside recordAnswer's stable closure. Using refs
  // avoids adding fast-changing state to the useCallback dep array (which
  // would recreate the callback on every answer and break timing).
  const streakRef = useRef(streak);
  useEffect(() => { streakRef.current = streak; }, [streak]);
  const currentIdxRef = useRef(currentIdx);
  useEffect(() => { currentIdxRef.current = currentIdx; }, [currentIdx]);

  const trackAbandoned = useCallback(
    (reason: string) => {
      if (isPractice || finishedRef.current || abandonedRef.current || answersRef.current.length === 0) {
        return;
      }
      abandonedRef.current = true;
      trackQuizUsageEvent({
        quizId: quiz.id,
        eventType: "quiz_abandoned",
        metadata: {
          mode,
          guest: isGuest,
          answeredCount: answersRef.current.length,
          currentIndex: currentIdxRef.current,
          reason,
        },
      });
    },
    [isPractice, quiz.id, mode, isGuest]
  );

  const question = quiz.questions[currentIdx];
  const questionType: QuizQuestionType = question.questionType ?? "mcq";

  // MCQ display order: SSR renders the base order so hydration matches,
  // then useEffect below replaces it with a randomized order on mount and
  // on each question transition. Only meaningful for mcq questions.
  const [displayOptions, setDisplayOptions] = useState<DisplayOption[]>(() =>
    buildBaseOptions(question)
  );

  // Client-only shuffle: Math.random() during render produces an SSR/client
  // hydration mismatch, so we seed the base order on first render and replace
  // it here on mount and each question transition. The setDisplayOptions call
  // is the intentional violation of the set-state-in-effect rule — shuffling
  // during render is precisely the bug this fix exists for.
  useEffect(() => {
    const q = quiz.questions[currentIdx];
    const qt = q.questionType ?? "mcq";
    if (qt === "mcq" || qt === "mcq_multi" || qt === "poll" || qt === "dropdown" || qt === "audio" || qt === "video") {
      const base = buildBaseOptions(q);
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setDisplayOptions(quiz.shuffleOptions && (qt === "mcq" || qt === "mcq_multi" || qt === "audio" || qt === "video") ? shuffleOptions(base) : base);
    }
    if (qt === "reorder") {
      const items = q.reorderItems ?? [];
      setReorderDraft(quiz.shuffleOptions ? shuffleArray(items) : [...items]);
    } else {
      setReorderDraft([]);
    }
    if (qt === "matching" || qt === "categorization") {
      const pairs = q.matchPairs ?? [];
      const draft: Record<string, string> = {};
      for (const p of pairs) draft[p.left] = "";
      setMatchDraft(draft);
    } else {
      setMatchDraft({});
    }
    setHotspotSelected(null);
    setLabelingDraft({});
    setComprehensionDraft({});
    setPollSelected(null);
    setBlankInput("");
    setDrawnDataUrl(null);
    setMcqMultiSelected(new Set());
  }, [currentIdx, quiz.questions, quiz.shuffleOptions]);

  const clearAdvanceTimer = () => {
    if (advanceTimerRef.current) {
      clearTimeout(advanceTimerRef.current);
      advanceTimerRef.current = null;
    }
  };

  const submitAttempt = useCallback(async () => {
    setPhase("submitting");
    setSubmitError(null);
    sounds.play("complete");

    if (isGuest) {
      // Compute results locally — no backend call needed.
      const correct = correctnessRef.current.filter(Boolean).length;
      const total = quiz.questions.length;
      const pct = total > 0 ? Math.round((correct / total) * 100) : 0;
      const timeSpent = Math.max(0, Math.round((Date.now() - quizStartRef.current) / 1000));
      const guestResult = {
        score: correct,
        totalQuestions: total,
        percentage: pct,
        timeSpent,
        answers: answersRef.current.map((a, i) => {
          const q = quiz.questions[i];
          return {
            questionId: a.questionId,
            questionText: q?.questionText ?? "",
            questionType: q?.questionType ?? "mcq",
            selectedOption: a.selectedOption,
            textAnswer: a.textAnswer,
            orderAnswer: a.orderAnswer,
            correctOption: q?.correctOption ?? "",
            isCorrect: correctnessRef.current[i] ?? false,
            timeSpent: a.timeSpent,
            optionA: q?.optionA,
            optionB: q?.optionB,
            optionC: q?.optionC,
            optionD: q?.optionD,
            optionE: q?.optionE,
          };
        }),
      };
      try {
        sessionStorage.setItem(`guest_quiz_result_${progressScope}`, JSON.stringify(guestResult));
        const prev = parseInt(localStorage.getItem(GUEST_ATTEMPTS_KEY) ?? "0", 10);
        localStorage.setItem(GUEST_ATTEMPTS_KEY, String(prev + 1));
      } catch {
        // storage unavailable — proceed anyway
      }
      if (!isExitingRef.current) {
        finishedRef.current = true;
        trackQuizUsageEvent({
          quizId: quiz.id,
          eventType: "quiz_finished",
          metadata: {
            mode,
            guest: true,
            score: correct,
            totalQuestions: total,
            percentage: pct,
            timeSpent,
          },
        });
        router.push(
          `/quizzes/${encodeURIComponent(quiz.id)}/results?guest=1&part=${encodeURIComponent(progressScope)}`
        );
      }
      return;
    }

    try {
      const response = await fetch(
        `/api/quizzes/${encodeURIComponent(quiz.id)}/attempts`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            startedAt: new Date(quizStartRef.current).toISOString(),
            questionIds: quiz.questions.map((q) => q.id),
            answers: answersRef.current,
          }),
        }
      );
      const data = (await response.json().catch(() => null)) as
        | { id?: string; error?: string }
        | null;

      if (!response.ok || !data?.id) {
        setSubmitError(data?.error ?? t("quiz.play.submitFailed"));
        setPhase("revealed");
        return;
      }
      // Don't navigate to results if the user has already chosen to exit.
      if (isExitingRef.current) return;
      finishedRef.current = true;
      trackQuizUsageEvent({
        quizId: quiz.id,
        eventType: "quiz_finished",
        attemptId: data.id,
        metadata: {
          mode,
          guest: false,
          answeredCount: answersRef.current.length,
        },
      });
      clearProgress(progressScope);
      router.push(
        `/quizzes/${encodeURIComponent(quiz.id)}/results?attempt=${encodeURIComponent(data.id)}`
      );
    } catch {
      setSubmitError(t("quiz.play.submitFailed"));
      setPhase("revealed");
    }
  }, [quiz.id, quiz.questions, progressScope, router, t, sounds, isGuest, mode]);

  const advance = useCallback(() => {
    clearAdvanceTimer();
    if (currentIdx + 1 >= totalQuestions) {
      if (isPractice) {
        router.push(returnHref ?? `/quizzes/${encodeURIComponent(quiz.id)}`);
        return;
      }
      void submitAttempt();
      return;
    }
    setCurrentIdx((i) => i + 1);
    setSelectedLetter(null);
    setMcqMultiSelected(new Set());
    setMatchDraft({});
    setHotspotSelected(null);
    setLabelingDraft({});
    setPollSelected(null);
    setLastCorrect(null);
    setHintVisible(false);
    setPhase("asking");
    setTimeLeft(quiz.timePerQuestion);
    powerUps.resetPerQuestion();
    questionStartRef.current = Date.now();
  }, [
    currentIdx,
    quiz.id,
    quiz.timePerQuestion,
    submitAttempt,
    totalQuestions,
    isPractice,
    router,
    returnHref,
    powerUps,
  ]);

  // recordAnswer is the single chokepoint for every question type. Callers
  // build the record shape appropriate for their type; this function handles
  // grading, streak, phase transition, and the auto-advance timer.
  const recordAnswer = useCallback(
    (record: Omit<RecordedAnswer, "questionId" | "timeSpent">, isCorrect: boolean) => {
      if (phase !== "asking") return;
      const timeSpent = Math.max(
        0,
        Math.round((Date.now() - questionStartRef.current) / 1000)
      );
      correctnessRef.current.push(isCorrect);
      answersRef.current.push({
        questionId: question.id,
        selectedOption: record.selectedOption,
        textAnswer: record.textAnswer,
        orderAnswer: record.orderAnswer,
        timeSpent,
      });
      trackQuizUsageEvent({
        quizId: quiz.id,
        eventType: "question_answered",
        questionId: question.id,
        metadata: {
          mode,
          guest: isGuest,
          questionIndex: currentIdxRef.current,
          questionType,
          isCorrect,
          timeSpent,
        },
      });

      // Persist progress so a page refresh doesn't lose answered questions.
      // Practice mode is ephemeral — no persistence needed.
      if (!isPractice) {
        saveProgress(progressScope, {
          currentIdx: currentIdxRef.current,
          answers: answersRef.current,
          streak: isCorrect ? streakRef.current + 1 : 0,
          quizStartedAt: quizStartRef.current,
        });
      }

      // Consume per-answer power-up effects (Double Points gain, Streak
      // Saver preservation). Returns the coin gain for this answer and
      // whether a wrong answer should keep the streak intact.
      const { coinsEarned, streakSaved } = powerUps.consumeOnAnswer(isCorrect);
      if (coinsEarned > 0) {
        setCoins((c) => c + coinsEarned);
      }

      if (isCorrect) {
        setStreak((s) => {
          const next = s + 1;
          // Fire the streak flourish at 5, 10, 15… so early correct
          // answers get the ordinary chime, not the bigger cue.
          if (next > 1 && next % 5 === 0) {
            sounds.play("streak");
          } else {
            sounds.play("correct");
          }
          // Grant a new power-up every 3-streak.
          powerUps.grant(next);
          return next;
        });
      } else if (streakSaved) {
        // Streak Saver ate the loss — keep the streak and play the
        // success chime to underline that the save happened.
        sounds.play("streak");
      } else {
        setStreak(0);
        sounds.play("wrong");
      }
      setAnimationTick((n) => n + 1);
      // For UI purposes (green overlay + reveal colors), treat a saved
      // wrong answer as "still wrong" but the streak reset is skipped.
      setLastCorrect(isCorrect);
      setPhase("revealed");

      advanceTimerRef.current = setTimeout(() => {
        advance();
      }, 1800);
    },
    [advance, phase, question.id, sounds, powerUps, isPractice, quiz.id, progressScope, mode, isGuest, questionType]
  );

  const recordMcq = useCallback(
    (letter: OptionLetter | null) => {
      const isCorrect = letter !== null && letter === question.correctOption;
      setSelectedLetter(letter);
      recordAnswer(
        { selectedOption: letter, textAnswer: null, orderAnswer: null },
        isCorrect
      );
    },
    [question.correctOption, recordAnswer]
  );

  const recordTrueFalse = useCallback(
    (letter: TrueFalseLetter | null) => {
      const isCorrect = letter !== null && letter === question.correctOption;
      setSelectedLetter(letter);
      recordAnswer(
        { selectedOption: letter, textAnswer: null, orderAnswer: null },
        isCorrect
      );
    },
    [question.correctOption, recordAnswer]
  );

  const recordMcqMulti = useCallback(
    (selected: Set<OptionLetter>) => {
      const sorted = (["a", "b", "c", "d", "e"] as OptionLetter[]).filter((k) =>
        selected.has(k)
      );
      const submitted = sorted.join(",");
      const correct = question.correctOption ?? "";
      const isCorrect = submitted !== "" && mcqMultiMatch(submitted, correct);
      recordAnswer(
        { selectedOption: submitted || null, textAnswer: null, orderAnswer: null },
        isCorrect
      );
    },
    [question.correctOption, recordAnswer]
  );

  const recordBlank = useCallback(
    (value: string | null) => {
      const submitted = value === null ? null : value.trim();
      const isCorrect =
        submitted !== null &&
        submitted !== "" &&
        question.blankAnswer != null &&
        normalizeBlank(submitted) === normalizeBlank(question.blankAnswer);
      recordAnswer(
        { selectedOption: null, textAnswer: submitted, orderAnswer: null },
        isCorrect
      );
    },
    [question.blankAnswer, recordAnswer]
  );

  const recordReorder = useCallback(
    (items: string[] | null) => {
      const canonical = question.reorderItems ?? [];
      const isCorrect =
        items !== null && items.length > 0 && arraysEqual(items, canonical);
      recordAnswer(
        { selectedOption: null, textAnswer: null, orderAnswer: items },
        isCorrect
      );
    },
    [question.reorderItems, recordAnswer]
  );

  const recordHotspot = useCallback(
    (zoneId: string | null) => {
      const isCorrect = zoneId !== null && zoneId === question.correctOption;
      setHotspotSelected(zoneId);
      recordAnswer(
        { selectedOption: zoneId, textAnswer: null, orderAnswer: null },
        isCorrect
      );
    },
    [question.correctOption, recordAnswer]
  );

  const recordLabeling = useCallback(
    (draft: Record<string, string>) => {
      const zones = question.hotspotZones ?? [];
      const allFilled = zones.every((z) => (draft[String(z.id)] ?? "").trim() !== "");
      if (!allFilled) return;
      const isCorrect = zones.every(
        (z) =>
          (draft[String(z.id)] ?? "").trim().toLowerCase() ===
          (z.correctLabel ?? "").trim().toLowerCase()
      );
      const textAnswer = JSON.stringify(draft);
      recordAnswer({ selectedOption: null, textAnswer, orderAnswer: null }, isCorrect);
    },
    [question.hotspotZones, recordAnswer]
  );

  const recordMatching = useCallback(
    (draft: Record<string, string> | null) => {
      const pairs = question.matchPairs ?? [];
      let isCorrect = false;
      let textAnswer: string | null = null;
      if (draft !== null && pairs.length > 0) {
        // All pairs must be matched (no empty selections)
        const allSelected = pairs.every((p) => draft[p.left] && draft[p.left] !== "");
        if (allSelected) {
          isCorrect = pairs.every((p) => draft[p.left] === p.right);
          textAnswer = JSON.stringify(draft);
        }
      }
      recordAnswer(
        { selectedOption: null, textAnswer, orderAnswer: null },
        isCorrect
      );
    },
    [question.matchPairs, recordAnswer]
  );

  const recordPoll = useCallback(
    (letter: string | null) => {
      setPollSelected(letter);
      // Poll is non-graded — always treated as "correct" for UX (no red flash).
      recordAnswer(
        { selectedOption: letter, textAnswer: null, orderAnswer: null },
        true
      );
    },
    [recordAnswer]
  );

  const recordDropdown = useCallback(
    (letter: OptionLetter | null) => {
      const isCorrect = letter !== null && letter === question.correctOption;
      setSelectedLetter(letter);
      recordAnswer(
        { selectedOption: letter, textAnswer: null, orderAnswer: null },
        isCorrect
      );
    },
    [question.correctOption, recordAnswer]
  );

  const recordCategorization = useCallback(
    (draft: Record<string, string> | null) => {
      const pairs = question.matchPairs ?? [];
      let isCorrect = false;
      let textAnswer: string | null = null;
      if (draft !== null && pairs.length > 0) {
        const allSelected = pairs.every((p) => draft[p.left] && draft[p.left] !== "");
        if (allSelected) {
          isCorrect = pairs.every((p) => draft[p.left] === p.right);
          textAnswer = JSON.stringify(draft);
        }
      }
      recordAnswer(
        { selectedOption: null, textAnswer, orderAnswer: null },
        isCorrect
      );
    },
    [question.matchPairs, recordAnswer]
  );

  const recordComprehension = useCallback(
    (draft: Record<string, string>) => {
      const cd = question.comprehensionData;
      if (!cd || cd.subQuestions.length === 0) return;
      const allAnswered = cd.subQuestions.every((sq) => (draft[sq.id] ?? "").trim() !== "");
      if (!allAnswered) return;
      const correct = cd.subQuestions.every((sq) => {
        const given = (draft[sq.id] ?? "").trim().toLowerCase();
        const expected = sq.correct.trim().toLowerCase();
        return given === expected;
      });
      const textAnswer = JSON.stringify(draft);
      recordAnswer({ selectedOption: null, textAnswer, orderAnswer: null }, correct);
    },
    [question.comprehensionData, recordAnswer]
  );

  const recordDrawing = useCallback(
    (dataUrl: string | null) => {
      // Drawing is non-graded — always treated as "correct" for UX (no red flash).
      recordAnswer({ selectedOption: null, textAnswer: dataUrl, orderAnswer: null }, true);
    },
    [recordAnswer]
  );

  const recordVoiceResponse = useCallback(
    (audioUrl: string | null) => {
      // Voice response is non-graded (IELTS speaking practice). The audio URL
      // is stored for later teacher review; we mark it "correct" to avoid the
      // red flash that would imply automatic grading.
      recordAnswer({ selectedOption: null, textAnswer: audioUrl, orderAnswer: null }, true);
    },
    [recordAnswer]
  );

  // Timeout handler: fires a "null" answer of the right shape for the
  // current question type so the backend still gets a row per question.
  const handleTimeout = useCallback(() => {
    switch (questionType) {
      case "mcq":
        recordMcq(null);
        return;
      case "mcq_multi":
        recordMcqMulti(new Set());
        return;
      case "true_false":
        recordTrueFalse(null);
        return;
      case "fill_blank":
        recordBlank(null);
        return;
      case "reorder":
        recordReorder(null);
        return;
      case "matching":
        recordMatching(null);
        return;
      case "hotspot":
        recordHotspot(null);
        return;
      case "poll":
        recordPoll(null);
        return;
      case "dropdown":
        recordDropdown(null);
        return;
      case "categorization":
        recordCategorization(null);
        return;
      case "comprehension":
        recordAnswer({ selectedOption: null, textAnswer: null, orderAnswer: null }, false);
        return;
      case "audio":
        recordMcq(null);
        return;
      case "video":
        recordMcq(null);
        return;
      case "drawing":
        recordDrawing(null);
        return;
      case "voice_response":
        recordVoiceResponse(null);
        return;
    }
  }, [questionType, recordMcq, recordMcqMulti, recordTrueFalse, recordBlank, recordReorder, recordMatching, recordHotspot, recordPoll, recordDropdown, recordCategorization, recordDrawing, recordVoiceResponse, recordAnswer]);

  // Countdown timer; auto-skips via handleTimeout when it hits 0.
  // Practice mode disables the timer entirely so students can dwell on
  // questions they previously got wrong.
  const handleTimeoutRef = useRef(handleTimeout);
  useEffect(() => {
    handleTimeoutRef.current = handleTimeout;
  });
  const timeFrozen = powerUps.effects.timeFrozen;
  useEffect(() => {
    if (phase !== "asking" || isPractice || timeFrozen) return;
    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          queueMicrotask(() => handleTimeoutRef.current());
          return 0;
        }
        // Tick on the final five seconds (5 → 1) so the student hears a
        // ramp before timeout fires. No tick at 0 because that frame is
        // the timeout itself.
        const next = prev - 1;
        if (next <= 5 && next > 0) {
          sounds.play("tick");
        }
        return next;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [phase, currentIdx, isPractice, timeFrozen, sounds]);

  useEffect(() => {
    return () => clearAdvanceTimer();
  }, []);

  useEffect(() => {
    // Only reset start time if there's no saved progress to restore.
    if (quizStartRef.current === 0) {
      quizStartRef.current = Date.now();
    }
    questionStartRef.current = Date.now();
    if (!isPractice) {
      trackQuizUsageEvent({
        quizId: quiz.id,
        eventType: "quiz_started",
        metadata: {
          mode,
          guest: isGuest,
          restored: restoredProgress,
          totalQuestions,
        },
      });
    }
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
      trackAbandoned("unmount");
    };
  }, [isPractice, quiz.id, mode, isGuest, restoredProgress, totalQuestions, trackAbandoned]);

  useEffect(() => {
    const handlePageHide = () => trackAbandoned("pagehide");
    window.addEventListener("pagehide", handlePageHide);
    return () => window.removeEventListener("pagehide", handlePageHide);
  }, [trackAbandoned]);

  useEffect(() => {
    if (isPractice) return;
    const interval = setInterval(() => {
      if (finishedRef.current || abandonedRef.current) return;
      trackQuizUsageEvent({
        quizId: quiz.id,
        eventType: "heartbeat",
        metadata: {
          mode,
          guest: isGuest,
          currentIndex: currentIdxRef.current,
          answeredCount: answersRef.current.length,
        },
      });
    }, 30_000);

    return () => clearInterval(interval);
  }, [isPractice, quiz.id, mode, isGuest]);

  // Keyboard shortcuts: 1-4 / A-D for MCQ, T/F or 1/2 for TrueFalse,
  // Space/Enter to advance after reveal, Enter submits fill_blank via form.
  const advanceRef = useRef(advance);
  useEffect(() => { advanceRef.current = advance; });

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      // Don't capture when user is typing in an input or textarea
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      if (phase === "revealed") {
        if (e.key === " " || e.key === "Enter") {
          e.preventDefault();
          clearAdvanceTimer();
          advanceRef.current();
        }
        return;
      }

      if (phase !== "asking") return;

      if (questionType === "mcq") {
        const keyToIndex: Record<string, number> = {
          "1": 0, "2": 1, "3": 2, "4": 3,
          a: 0, b: 1, c: 2, d: 3,
        };
        const idx = keyToIndex[e.key.toLowerCase()];
        if (idx !== undefined && idx < displayOptions.length) {
          recordMcq(displayOptions[idx].letter);
        }
      }

      if (questionType === "true_false") {
        if (e.key === "1" || e.key.toLowerCase() === "t") recordTrueFalse("t");
        if (e.key === "2" || e.key.toLowerCase() === "f") recordTrueFalse("f");
      }
    };

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [phase, questionType, displayOptions, recordMcq, recordTrueFalse]);

  const progress = (currentIdx + 1) / totalQuestions;
  const timerProgress = Math.max(0, timeLeft / quiz.timePerQuestion);
  const timerBarColor =
    timerProgress > 0.5
      ? "bg-emerald-500"
      : timerProgress > 0.25
        ? "bg-amber-400"
        : "bg-red-500";
  const revealed = phase !== "asking";

  // Gate: guest has used all free attempts — block play and ask to sign up.
  if (isGuest && !isPractice && guestAttemptsUsed >= GUEST_ATTEMPT_LIMIT) {
    return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[var(--bg-base)] px-4">
        <div
          style={{
            maxWidth: 440,
            width: "100%",
            background: "var(--bg-surface)",
            border: "1.5px solid var(--border)",
            borderRadius: 20,
            padding: "40px 36px",
            textAlign: "center",
          }}
        >
          <div style={{ fontSize: 48, marginBottom: 16 }}>🎓</div>
          <h1
            style={{
              fontSize: 22,
              fontWeight: 700,
              color: "var(--ink)",
              marginBottom: 10,
              letterSpacing: "-0.03em",
            }}
          >
            Тегін квиздер аяқталды
          </h1>
          <p style={{ fontSize: 14, color: "var(--ink-soft)", lineHeight: 1.6, marginBottom: 28 }}>
            {GUEST_ATTEMPT_LIMIT} квизді тіркелмей өттіңіз. Нәтижелеріңізді сақтау және шексіз квиздер үшін тіркеліңіз — тегін!
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <a
              href={`/signup?redirect=${encodeURIComponent(`/quizzes/${quiz.id}/play`)}`}
              className="nd-btn-primary"
              style={{ justifyContent: "center" }}
            >
              Тіркелу — тегін
            </a>
            <a
              href={`/login?redirect=${encodeURIComponent(`/quizzes/${quiz.id}/play`)}`}
              className="nd-btn-soft"
              style={{ justifyContent: "center" }}
            >
              Кіру
            </a>
          </div>
        </div>
      </div>
    );
  }

  const questionNumberLabel = t("quiz.play.questionOf")
    .replace("{n}", String(currentIdx + 1))
    .replace("{total}", String(totalQuestions));

  return (
    <div className="fixed inset-0 z-[100] flex flex-col overflow-y-auto bg-[var(--bg-base)]">
      <div className="sticky top-0 z-10 border-b border-[var(--border)] bg-[var(--bg-base)]/95 backdrop-blur-xl">
        <div className="mx-auto flex max-w-4xl items-center gap-3 px-4 py-3 sm:px-6">
          <div className="flex-1">
            <div className="flex items-center justify-between text-xs font-medium uppercase tracking-[0.16em] text-[var(--text-muted)]">
              <span>{partLabel ? `${partLabel} · ${questionNumberLabel}` : questionNumberLabel}</span>
              {isPractice ? (
                <span className="inline-flex items-center gap-1.5 text-[var(--primary)]">
                  {t("quiz.practice.label")}
                </span>
              ) : (
                <span className="inline-flex items-center gap-2.5">
                  {powerUpsEnabled && coins > 0 ? (
                    <span className="inline-flex items-center gap-1 text-amber-300">
                      ★ {coins}
                    </span>
                  ) : null}
                  <span
                    className={`inline-flex items-center gap-1.5 ${
                      timeFrozen ? "text-sky-300" : "text-[var(--text-primary)]"
                    }`}
                  >
                    <Timer className="h-3.5 w-3.5" />
                    {timeLeft}
                    {t("quiz.secondsShort")}
                  </span>
                </span>
              )}
            </div>
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-[var(--bg-soft)]">
              <div
                className="h-full rounded-full bg-[var(--primary)] transition-[width] duration-300 ease-out"
                style={{ width: `${progress * 100}%` }}
              />
            </div>
          </div>
          <button
            type="button"
            onClick={sounds.toggle}
            className="inline-flex h-10 w-10 items-center justify-center rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--bg-surface)] text-[var(--text-secondary)] transition-colors hover:text-[var(--text-primary)]"
            aria-label={sounds.enabled ? t("quiz.play.soundOff") : t("quiz.play.soundOn")}
            title={sounds.enabled ? t("quiz.play.soundOff") : t("quiz.play.soundOn")}
          >
            {sounds.enabled ? (
              <Volume2 className="h-4 w-4" />
            ) : (
              <VolumeX className="h-4 w-4" />
            )}
          </button>
          <button
            type="button"
            onClick={() => { clearAdvanceTimer(); setShowExit(true); }}
            className="inline-flex h-10 items-center justify-center gap-1.5 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--bg-surface)] px-3 text-sm font-medium text-[var(--text-secondary)] transition-colors hover:text-[var(--text-primary)]"
            aria-label={t("quiz.play.exit")}
          >
            <LogOut className="h-4 w-4" />
            <span className="hidden sm:inline">{t("quiz.play.exit")}</span>
          </button>
        </div>
        {isPractice ? null : (
          <div className="h-1.5 bg-[var(--bg-soft)]">
            <div
              className={`h-full transition-[width,background-color] duration-1000 ease-linear ${timerBarColor}${timerProgress < 0.2 ? " animate-pulse" : ""}`}
              style={{ width: `${timerProgress * 100}%` }}
            />
          </div>
        )}
      </div>

      <div className="flex flex-1 flex-col items-center justify-start px-3 py-5 sm:px-6 sm:py-10">
        <div
          key={currentIdx}
          role="main"
          aria-live="polite"
          className="relative w-full max-w-3xl animate-fade-in-up"
        >
          {quiz.showAnswerAnimations && revealed && lastCorrect !== null ? (
            <AnswerAnimation
              key={animationTick}
              phase={lastCorrect ? "correct" : "wrong"}
              encourageText={t("quiz.play.encouragement")}
            />
          ) : null}
          <div className="nd-mock-shell">
            {/* Question header bar */}
            <div className="nd-mock-bar">
              <span className="nd-mock-qn">{currentIdx + 1}</span>
              <span style={{ flex: 1, fontFamily: "'JetBrains Mono',monospace", fontSize: 11, letterSpacing: ".08em", color: "var(--ink-mute)", textTransform: "uppercase" }}>
                {partLabel ? `${partLabel} · ${questionNumberLabel}` : questionNumberLabel}
              </span>
              {streak > 1 ? (
                <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 12, fontWeight: 700, color: "#f97316" }}>
                  <Flame className="h-3.5 w-3.5" /> {streak}
                </span>
              ) : null}
            </div>

            {/* Question content */}
            <div style={{ padding: "20px 24px 16px" }}>
              {question.imageUrl && questionType !== "hotspot" ? (
                <div style={{ marginBottom: 14, overflow: "hidden", borderRadius: 10, border: "1px solid var(--line)", background: "var(--paper-2)" }}>
                  {/* Images are relative paths served via nginx/backend — next/image not usable here */}
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={question.imageUrl}
                    alt=""
                    loading="lazy"
                    decoding="async"
                    style={{ display: "block", margin: "0 auto", maxHeight: 280, width: "auto", objectFit: "contain" }}
                  />
                </div>
              ) : null}
              {question.audioUrl ? (
                <div style={{ marginBottom: 14 }}>
                  <audio src={question.audioUrl} controls style={{ width: "100%", height: 40 }} />
                </div>
              ) : null}
              {question.videoUrl ? (
                <div style={{ marginBottom: 14, overflow: "hidden", borderRadius: 10, border: "1px solid var(--line)", background: "#000" }}>
                  <VideoEmbed url={question.videoUrl} />
                </div>
              ) : null}
              <h1 style={{ fontSize: "clamp(18px, 3vw, 28px)", fontWeight: 800, letterSpacing: "-.025em", color: "var(--ink)", lineHeight: 1.3, wordBreak: "break-word", margin: 0 }}>
                {question.questionText}
              </h1>
            </div>

            {/* Options area */}
            <div style={{ padding: "0 24px 24px" }}>

          {questionType === "mcq" ? (
            <McqBody
              displayOptions={displayOptions}
              selectedLetter={selectedLetter as OptionLetter | null}
              correctLetter={question.correctOption as OptionLetter | null | undefined}
              hiddenLetters={powerUps.effects.hiddenLetters}
              revealed={revealed}
              onPick={recordMcq}
            />
          ) : questionType === "mcq_multi" ? (
            <McqMultiBody
              t={t}
              displayOptions={displayOptions}
              selected={mcqMultiSelected}
              correctOption={question.correctOption ?? ""}
              revealed={revealed}
              lastCorrect={lastCorrect}
              onToggle={(letter) => {
                if (revealed) return;
                setMcqMultiSelected((prev) => {
                  const next = new Set(prev);
                  if (next.has(letter)) {
                    next.delete(letter);
                  } else {
                    next.add(letter);
                  }
                  return next;
                });
              }}
              onSubmit={() => recordMcqMulti(mcqMultiSelected)}
            />
          ) : questionType === "true_false" ? (
            <TrueFalseBody
              t={t}
              selected={selectedLetter as TrueFalseLetter | null}
              correct={question.correctOption as TrueFalseLetter | null | undefined}
              revealed={revealed}
              onPick={recordTrueFalse}
            />
          ) : questionType === "fill_blank" ? (
            <FillBlankBody
              t={t}
              value={blankInput}
              onChange={setBlankInput}
              correctAnswer={question.blankAnswer ?? null}
              revealed={revealed}
              lastCorrect={lastCorrect}
              onSubmit={() => recordBlank(blankInput)}
            />
          ) : questionType === "hotspot" ? (
            <HotspotPlayBody
              t={t}
              imageUrl={question.imageUrl ?? null}
              zones={question.hotspotZones ?? []}
              correctOption={question.correctOption ?? null}
              selected={hotspotSelected}
              revealed={revealed}
              onPick={recordHotspot}
            />
          ) : questionType === "labeling" ? (
            <LabelingPlayBody
              t={t}
              imageUrl={question.imageUrl ?? null}
              zones={question.hotspotZones ?? []}
              draft={labelingDraft}
              onDraftChange={setLabelingDraft}
              revealed={revealed}
              lastCorrect={lastCorrect}
              onSubmit={recordLabeling}
            />
          ) : questionType === "matching" ? (
            <MatchingBody
              t={t}
              pairs={question.matchPairs ?? []}
              draft={matchDraft}
              onDraftChange={setMatchDraft}
              revealed={revealed}
              lastCorrect={lastCorrect}
              onSubmit={() => recordMatching(matchDraft)}
            />
          ) : questionType === "poll" ? (
            <PollPlayBody
              t={t}
              options={displayOptions}
              selected={pollSelected}
              revealed={revealed}
              onPick={recordPoll}
            />
          ) : questionType === "dropdown" ? (
            <DropdownPlayBody
              t={t}
              options={displayOptions}
              selected={selectedLetter as OptionLetter | null}
              correct={question.correctOption as OptionLetter | null | undefined}
              revealed={revealed}
              onPick={recordDropdown}
            />
          ) : questionType === "categorization" ? (
            <CategorizationPlayBody
              t={t}
              pairs={question.matchPairs ?? []}
              draft={matchDraft}
              onDraftChange={setMatchDraft}
              revealed={revealed}
              lastCorrect={lastCorrect}
              onSubmit={() => recordCategorization(matchDraft)}
            />
          ) : questionType === "comprehension" ? (
            <ComprehensionPlayBody
              t={t}
              cd={question.comprehensionData ?? { passage: "", subQuestions: [] }}
              draft={comprehensionDraft}
              onDraftChange={setComprehensionDraft}
              revealed={revealed}
              lastCorrect={lastCorrect}
              onSubmit={() => recordComprehension(comprehensionDraft)}
            />
          ) : questionType === "audio" || questionType === "video" ? (
            <McqBody
              displayOptions={displayOptions}
              selectedLetter={selectedLetter as OptionLetter | null}
              correctLetter={question.correctOption as OptionLetter | null | undefined}
              hiddenLetters={powerUps.effects.hiddenLetters}
              revealed={revealed}
              onPick={recordMcq}
            />
          ) : questionType === "drawing" ? (
            <DrawingPlayBody
              t={t}
              revealed={revealed}
              submittedDrawing={drawnDataUrl}
              onSubmit={(dataUrl) => {
                setDrawnDataUrl(dataUrl);
                recordDrawing(dataUrl);
              }}
            />
          ) : questionType === "voice_response" ? (
            <VoiceResponsePlayBody
              t={t}
              revealed={revealed}
              onSubmit={recordVoiceResponse}
            />
          ) : (
            <ReorderBody
              t={t}
              items={reorderDraft}
              onReorder={setReorderDraft}
              canonical={question.reorderItems ?? []}
              revealed={revealed}
              onSubmit={() => recordReorder(reorderDraft)}
            />
          )}

          {!revealed && question.hint ? (
            <div className="mt-4">
              <button
                type="button"
                onClick={() => setHintVisible((v) => !v)}
                className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/30 bg-amber-500/8 px-3.5 py-1.5 text-xs font-medium text-amber-400 transition-colors hover:bg-amber-500/15"
              >
                <Lightbulb className="h-3.5 w-3.5" />
                {hintVisible ? t("quiz.play.hideHint") : t("quiz.play.showHint")}
              </button>
              {hintVisible ? (
                <div className="mt-2 rounded-[var(--radius-md)] border border-amber-500/20 bg-amber-500/8 px-4 py-3 text-sm text-amber-200">
                  {question.hint}
                </div>
              ) : null}
            </div>
          ) : null}

          {revealed && question.explanation ? (
            <div className="mt-4 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--bg-surface)] px-4 py-3 text-sm italic text-[var(--text-secondary)]">
              {question.explanation}
            </div>
          ) : null}

          {powerUpsEnabled ? (
            <PowerUpBar
              inventory={powerUps.inventory}
              activeEffects={powerUps.effects}
              disabled={revealed}
              onActivate={(key: PowerUpKey) => {
                powerUps.activate(
                  key,
                  (question.correctOption as string | null | undefined) ?? null
                );
              }}
            />
          ) : null}

          {phase === "submitting" ? (
            <div style={{ marginTop: 16, textAlign: "center", fontSize: 13, color: "var(--ink-mute)", fontFamily: "'JetBrains Mono',monospace", letterSpacing: ".06em" }}>
              {t("quiz.play.submitting")}
            </div>
          ) : null}

          {submitError ? (
            <div style={{ marginTop: 16, borderRadius: 12, border: "1.5px solid #f87171", background: "#fff1f2", padding: 16, fontSize: 13 }}>
              <p style={{ fontWeight: 600, color: "#be123c", margin: "0 0 8px" }}>{submitError}</p>
              <button
                type="button"
                onClick={() => void submitAttempt()}
                style={{ display: "inline-flex", alignItems: "center", height: 34, padding: "0 14px", borderRadius: 99, background: "#ef4444", color: "#fff", fontSize: 12, fontWeight: 700, border: "none", cursor: "pointer" }}
              >
                {t("quiz.play.retrySubmit")}
              </button>
            </div>
          ) : null}
            </div>{/* end options area */}
          </div>{/* end nd-mock-shell */}
        </div>
      </div>

      {showExit ? (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-[1.6rem] border border-[var(--border)] bg-[var(--bg-elevated)] p-6 shadow-[var(--surface-shadow-strong)]">
            <h2 className="text-lg font-semibold text-[var(--text-primary)]">
              {t("quiz.play.exitConfirmTitle")}
            </h2>
            <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
              {t("quiz.play.exitConfirmBody")}
            </p>
            <div className="mt-5 flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  setShowExit(false);
                  // Re-arm the auto-advance timer we cleared when opening the dialog.
                  if (phase === "revealed") {
                    advanceTimerRef.current = setTimeout(() => advance(), 1800);
                  }
                }}
              >
                {t("quiz.play.exitConfirmCancel")}
              </Button>
              <Button
                type="button"
                variant="danger"
                size="sm"
                onClick={() => {
                  isExitingRef.current = true;
                  trackAbandoned("exit_confirmed");
                  clearAdvanceTimer();
                  clearProgress(quiz.id);
                  router.push(`/quizzes/${encodeURIComponent(quiz.id)}`);
                }}
              >
                {t("quiz.play.exitConfirmYes")}
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function toYouTubeEmbedURL(url: string): string | null {
  try {
    const u = new URL(url);
    if (u.hostname === "youtu.be") return `https://www.youtube.com/embed/${u.pathname.slice(1)}`;
    if (u.hostname.includes("youtube.com") && u.searchParams.has("v"))
      return `https://www.youtube.com/embed/${u.searchParams.get("v")}`;
    if (u.hostname.includes("youtube.com") && u.pathname.startsWith("/embed/"))
      return url;
  } catch { /* not a URL */ }
  return null;
}

function VideoEmbed({ url }: { url: string }) {
  const embed = toYouTubeEmbedURL(url);
  if (embed) {
    return (
      <iframe
        src={embed}
        className="aspect-video w-full"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
      />
    );
  }
  return <video src={url} controls className="aspect-video w-full" />;
}

function McqBody({
  displayOptions,
  selectedLetter,
  correctLetter,
  hiddenLetters,
  revealed,
  onPick,
}: {
  displayOptions: DisplayOption[];
  selectedLetter: OptionLetter | null;
  correctLetter: OptionLetter | null | undefined;
  hiddenLetters: string[];
  revealed: boolean;
  onPick: (letter: OptionLetter) => void;
}) {
  const hidden = new Set(hiddenLetters);
  return (
    <div className="nd-mock-opts">
      {displayOptions.map((opt, index) => {
        const positionLabel = POSITION_LABELS[index];
        const isSelected = selectedLetter === opt.letter;
        const isCorrectOption = correctLetter === opt.letter;
        const isHidden = hidden.has(opt.letter);

        let extraStyle: React.CSSProperties = {};
        let letterStyle: React.CSSProperties = {};
        let icon: React.ReactNode = null;
        let optClass = "nd-mock-opt";

        if (isHidden && !revealed) {
          extraStyle = { opacity: 0.3, pointerEvents: "none" };
        } else if (!revealed && isSelected) {
          optClass += " on";
        }

        if (revealed) {
          if (isCorrectOption) {
            extraStyle = { background: "var(--green-soft)", borderColor: "var(--green)", color: "var(--green)" };
            letterStyle = { background: "var(--green)", borderColor: "var(--green)", color: "#fff" };
            icon = <Check className="h-4 w-4" style={{ flexShrink: 0, color: "var(--green)" }} />;
          } else if (isSelected) {
            extraStyle = { background: "#fff1f2", borderColor: "#f87171", color: "#be123c" };
            letterStyle = { background: "#ef4444", borderColor: "#ef4444", color: "#fff" };
            icon = <X className="h-4 w-4" style={{ flexShrink: 0, color: "#ef4444" }} />;
          } else {
            extraStyle = { opacity: 0.45 };
          }
        }

        return (
          <button
            key={opt.letter}
            type="button"
            onClick={() => onPick(opt.letter)}
            disabled={revealed || isHidden}
            className={optClass}
            style={extraStyle}
          >
            <span className="nd-mock-letter" style={letterStyle}>
              {positionLabel}
            </span>
            <span style={{ flex: 1, textAlign: "left", wordBreak: "break-word", fontSize: 14 }}>
              {opt.text}
            </span>
            {icon}
          </button>
        );
      })}
    </div>
  );
}

function McqMultiBody({
  t,
  displayOptions,
  selected,
  correctOption,
  revealed,
  lastCorrect,
  onToggle,
  onSubmit,
}: {
  t: (key: string) => string;
  displayOptions: DisplayOption[];
  selected: Set<OptionLetter>;
  correctOption: string;
  revealed: boolean;
  lastCorrect: boolean | null;
  onToggle: (letter: OptionLetter) => void;
  onSubmit: () => void;
}) {
  const correctSet = new Set(
    correctOption
      .split(",")
      .map((v) => v.trim().toLowerCase())
      .filter(Boolean)
  );

  return (
    <div>
      <p style={{ fontSize: 12, color: "var(--ink-mute)", fontFamily: "'JetBrains Mono',monospace", letterSpacing: ".06em", marginBottom: 10 }}>
        {t("quiz.play.selectMultiple")}
      </p>
      <div className="nd-mock-opts">
        {displayOptions.map((opt, index) => {
          const positionLabel = POSITION_LABELS[index];
          const isSelected = selected.has(opt.letter);
          const isCorrectOption = correctSet.has(opt.letter);

          let extraStyle: React.CSSProperties = {};
          let letterStyle: React.CSSProperties = {};
          let icon: React.ReactNode = null;
          let optClass = "nd-mock-opt";

          if (!revealed && isSelected) {
            optClass += " on";
          }

          if (revealed) {
            if (isCorrectOption) {
              extraStyle = { background: "var(--green-soft)", borderColor: "var(--green)", color: "var(--green)" };
              letterStyle = { background: "var(--green)", borderColor: "var(--green)", color: "#fff" };
              icon = <Check className="h-4 w-4" style={{ flexShrink: 0, color: "var(--green)" }} />;
            } else if (isSelected) {
              extraStyle = { background: "#fff1f2", borderColor: "#f87171", color: "#be123c" };
              letterStyle = { background: "#ef4444", borderColor: "#ef4444", color: "#fff" };
              icon = <X className="h-4 w-4" style={{ flexShrink: 0, color: "#ef4444" }} />;
            } else {
              extraStyle = { opacity: 0.45 };
            }
          }

          return (
            <button
              key={opt.letter}
              type="button"
              onClick={() => onToggle(opt.letter)}
              disabled={revealed}
              className={optClass}
              style={extraStyle}
            >
              <span className="nd-mock-letter" style={letterStyle}>
                {positionLabel}
              </span>
              <span style={{ flex: 1, textAlign: "left", wordBreak: "break-word", fontSize: 14 }}>
                {opt.text}
              </span>
              {icon}
            </button>
          );
        })}
      </div>
      {!revealed ? (
        <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 12 }}>
          <button
            type="button"
            onClick={onSubmit}
            disabled={selected.size === 0}
            className="nd-btn-primary"
            style={{ fontSize: 13, padding: "10px 20px", opacity: selected.size === 0 ? 0.5 : 1 }}
          >
            {t("quiz.play.submitSelection")}
          </button>
        </div>
      ) : null}
      {revealed && lastCorrect !== null ? (
        <div
          style={{
            marginTop: 12,
            borderRadius: 10,
            border: `1.5px solid ${lastCorrect ? "var(--green)" : "#f87171"}`,
            background: lastCorrect ? "var(--green-soft)" : "#fff1f2",
            padding: "10px 14px",
            fontSize: 13,
            fontWeight: 700,
            color: lastCorrect ? "var(--green)" : "#be123c",
          }}
        >
          {lastCorrect ? t("quiz.play.correct") : t("quiz.play.wrong")}
        </div>
      ) : null}
    </div>
  );
}

function TrueFalseBody({
  t,
  selected,
  correct,
  revealed,
  onPick,
}: {
  t: (key: string) => string;
  selected: TrueFalseLetter | null;
  correct: TrueFalseLetter | null | undefined;
  revealed: boolean;
  onPick: (letter: TrueFalseLetter) => void;
}) {
  const choices: Array<{ key: TrueFalseLetter; labelKey: string }> = [
    { key: "t", labelKey: "quiz.true" },
    { key: "f", labelKey: "quiz.false" },
  ];
  return (
    <div className="nd-mock-opts">
      {choices.map((c) => {
        const isSelected = selected === c.key;
        const isCorrect = correct === c.key;

        let extraStyle: React.CSSProperties = {};
        let letterStyle: React.CSSProperties = {};
        let icon: React.ReactNode = null;
        let optClass = "nd-mock-opt";

        if (!revealed && isSelected) {
          optClass += " on";
        }

        if (revealed) {
          if (isCorrect) {
            extraStyle = { background: "var(--green-soft)", borderColor: "var(--green)", color: "var(--green)" };
            letterStyle = { background: "var(--green)", borderColor: "var(--green)", color: "#fff" };
            icon = <Check className="h-4 w-4" style={{ flexShrink: 0, color: "var(--green)" }} />;
          } else if (isSelected) {
            extraStyle = { background: "#fff1f2", borderColor: "#f87171", color: "#be123c" };
            letterStyle = { background: "#ef4444", borderColor: "#ef4444", color: "#fff" };
            icon = <X className="h-4 w-4" style={{ flexShrink: 0, color: "#ef4444" }} />;
          } else {
            extraStyle = { opacity: 0.45 };
          }
        }

        return (
          <button
            key={c.key}
            type="button"
            onClick={() => onPick(c.key)}
            disabled={revealed}
            className={optClass}
            style={{ ...extraStyle, justifyContent: "center", minHeight: 56, fontSize: 16, fontWeight: 700 }}
          >
            <span className="nd-mock-letter" style={letterStyle}>
              {c.key.toUpperCase()}
            </span>
            {t(c.labelKey)}
            {icon}
          </button>
        );
      })}
    </div>
  );
}

function FillBlankBody({
  t,
  value,
  onChange,
  correctAnswer,
  revealed,
  lastCorrect,
  onSubmit,
}: {
  t: (key: string) => string;
  value: string;
  onChange: (v: string) => void;
  correctAnswer: string | null;
  revealed: boolean;
  lastCorrect: boolean | null;
  onSubmit: () => void;
}) {
  return (
    <div className="mt-4 space-y-3 sm:mt-6">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (!revealed && value.trim()) onSubmit();
        }}
      >
        <Input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={t("quiz.play.blankPlaceholder")}
          disabled={revealed}
          autoFocus
          className="h-14 text-lg"
        />
        <div className="mt-3 flex justify-end">
          <Button
            type="submit"
            disabled={revealed || !value.trim()}
            isLoading={false}
          >
            {t("quiz.play.submitAnswer")}
          </Button>
        </div>
      </form>

      {revealed ? (
        <div
          className={`rounded-[var(--radius-md)] border-2 px-4 py-3 text-sm ${
            lastCorrect
              ? "border-emerald-400/60 bg-emerald-500/10 text-emerald-200"
              : "border-rose-400/60 bg-rose-500/10 text-rose-200"
          }`}
        >
          <p className="font-semibold">
            {lastCorrect ? t("quiz.play.correct") : t("quiz.play.wrong")}
          </p>
          {!lastCorrect && correctAnswer ? (
            <p className="mt-1">
              {t("quiz.play.correctAnswerLabel")}{" "}
              <span className="font-semibold">{correctAnswer}</span>
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function ReorderBody({
  t,
  items,
  onReorder,
  canonical,
  revealed,
  onSubmit,
}: {
  t: (key: string) => string;
  items: string[];
  onReorder: (next: string[]) => void;
  canonical: string[];
  revealed: boolean;
  onSubmit: () => void;
}) {
  const move = (idx: number, direction: -1 | 1) => {
    if (revealed) return;
    const target = idx + direction;
    if (target < 0 || target >= items.length) return;
    const next = [...items];
    [next[idx], next[target]] = [next[target], next[idx]];
    onReorder(next);
  };

  return (
    <div className="mt-4 space-y-3 sm:mt-6">
      <p className="text-sm text-[var(--text-muted)]">{t("quiz.play.reorderHint")}</p>
      <div className="space-y-2">
        {items.map((item, idx) => {
          const expected = canonical[idx];
          const correctSpot = revealed && item === expected;
          const wrongSpot = revealed && item !== expected;
          let rowClasses =
            "border-[var(--border)] bg-[var(--bg-surface)] text-[var(--text-primary)]";
          if (correctSpot) {
            rowClasses = "border-emerald-400/60 bg-emerald-500/10 text-emerald-100";
          } else if (wrongSpot) {
            rowClasses = "border-rose-400/60 bg-rose-500/10 text-rose-100";
          }
          return (
            <div
              key={`${idx}-${item}`}
              className={`flex items-center gap-2 rounded-[var(--radius-md)] border-2 px-3 py-3 transition-colors ${rowClasses}`}
            >
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[var(--bg-soft)] text-xs font-semibold text-[var(--text-secondary)]">
                {idx + 1}
              </span>
              <span className="min-w-0 flex-1 break-words text-sm font-medium sm:text-base">
                {item}
              </span>
              <button
                type="button"
                onClick={() => move(idx, -1)}
                disabled={revealed || idx === 0}
                className="inline-flex h-8 w-8 items-center justify-center rounded-[var(--radius-sm)] text-[var(--text-secondary)] transition-colors hover:bg-[var(--bg-soft)] hover:text-[var(--text-primary)] disabled:opacity-30"
                aria-label={t("quiz.moveUp")}
              >
                <ArrowUp className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => move(idx, 1)}
                disabled={revealed || idx === items.length - 1}
                className="inline-flex h-8 w-8 items-center justify-center rounded-[var(--radius-sm)] text-[var(--text-secondary)] transition-colors hover:bg-[var(--bg-soft)] hover:text-[var(--text-primary)] disabled:opacity-30"
                aria-label={t("quiz.moveDown")}
              >
                <ArrowDown className="h-4 w-4" />
              </button>
            </div>
          );
        })}
      </div>
      <div className="flex justify-end">
        <Button
          type="button"
          onClick={onSubmit}
          disabled={revealed || items.length === 0}
        >
          {t("quiz.play.submitAnswer")}
        </Button>
      </div>
    </div>
  );
}

// ── Hotspot body ──────────────────────────────────────────────────────────────

function HotspotPlayBody({
  t,
  imageUrl,
  zones,
  correctOption,
  selected,
  revealed,
  onPick,
}: {
  t: (key: string) => string;
  imageUrl: string | null;
  zones: HotspotZone[];
  correctOption: string | null;
  selected: string | null;
  revealed: boolean;
  onPick: (zoneId: string | null) => void;
}) {
  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (revealed) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    // Find the closest zone whose center is within its radius
    let hitZone: HotspotZone | null = null;
    let minDist = Infinity;
    for (const z of zones) {
      const dx = x - z.x;
      const dy = y - z.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist <= z.r && dist < minDist) {
        minDist = dist;
        hitZone = z;
      }
    }
    if (hitZone) {
      onPick(String(hitZone.id));
    }
  };

  if (!imageUrl) {
    return (
      <div className="mt-4 rounded-[var(--radius-md)] border border-dashed border-[var(--border)] p-4 text-center text-sm text-[var(--text-muted)]">
        {t("quiz.hotspot.noImage")}
      </div>
    );
  }

  return (
    <div className="mt-4 space-y-3 sm:mt-6">
      {!revealed ? (
        <p className="text-sm text-[var(--text-muted)]">{t("quiz.hotspot.clickToAnswer")}</p>
      ) : null}
      <div
        className={`relative select-none overflow-hidden rounded-[var(--radius-xl)] border-2 border-[var(--border)] ${
          revealed ? "cursor-default" : "cursor-crosshair"
        }`}
        onClick={handleClick}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={imageUrl} alt="" loading="lazy" decoding="async" className="pointer-events-none w-full" />
        {zones.map((zone) => {
          const zoneIdStr = String(zone.id);
          const isSelected = selected === zoneIdStr;
          const isCorrect = correctOption === zoneIdStr;
          let circleClasses =
            "border-white/70 bg-[var(--primary)]/80 text-white";
          if (revealed) {
            if (isCorrect) {
              circleClasses =
                "border-emerald-300 bg-emerald-500 text-white animate-success-glow";
            } else if (isSelected) {
              circleClasses =
                "border-rose-300 bg-rose-500 text-white animate-shake";
            } else {
              circleClasses =
                "border-white/30 bg-white/15 text-white/50";
            }
          } else if (isSelected) {
            circleClasses =
              "border-[var(--primary)] bg-[var(--primary)] text-white scale-110";
          }
          return (
            <div
              key={zone.id}
              style={{ left: `${zone.x}%`, top: `${zone.y}%` }}
              className={`pointer-events-none absolute -translate-x-1/2 -translate-y-1/2 flex h-10 w-10 items-center justify-center rounded-full border-2 text-sm font-bold transition-transform ${circleClasses}`}
            >
              {zone.label || zoneIdStr}
            </div>
          );
        })}
      </div>
      {revealed ? (
        <div
          className={`rounded-[var(--radius-md)] border-2 px-4 py-3 text-sm ${
            selected !== null && selected === correctOption
              ? "border-emerald-400/60 bg-emerald-500/10 text-emerald-200"
              : "border-rose-400/60 bg-rose-500/10 text-rose-200"
          }`}
        >
          <p className="font-semibold">
            {selected !== null && selected === correctOption
              ? t("quiz.play.correct")
              : t("quiz.play.wrong")}
          </p>
          {(selected === null || selected !== correctOption) && correctOption ? (
            <p className="mt-1">
              {t("quiz.play.correctAnswerLabel")}{" "}
              <span className="font-semibold">
                {zones.find((z) => String(z.id) === correctOption)?.label ?? correctOption}
              </span>
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

// ── Labeling body ─────────────────────────────────────────────────────────────

function LabelingPlayBody({
  t,
  imageUrl,
  zones,
  draft,
  onDraftChange,
  revealed,
  lastCorrect,
  onSubmit,
}: {
  t: (key: string) => string;
  imageUrl: string | null;
  zones: HotspotZone[];
  draft: Record<string, string>;
  onDraftChange: (d: Record<string, string>) => void;
  revealed: boolean;
  lastCorrect: boolean | null;
  onSubmit: (d: Record<string, string>) => void;
}) {
  const allFilled = zones.every((z) => (draft[String(z.id)] ?? "").trim() !== "");

  return (
    <div className="space-y-4">
      {imageUrl && (
        <div className="relative select-none overflow-hidden rounded-[var(--radius-md)] border border-[var(--border)]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={imageUrl} alt="" className="pointer-events-none w-full" draggable={false} />
          {zones.map((zone) => (
            <div
              key={zone.id}
              style={{ left: `${zone.x}%`, top: `${zone.y}%` }}
              className="pointer-events-none absolute -translate-x-1/2 -translate-y-1/2 flex h-8 w-8 items-center justify-center rounded-full border-2 border-white bg-[var(--primary)] text-xs font-bold text-white"
            >
              {zone.id}
            </div>
          ))}
        </div>
      )}

      <div className="space-y-2">
        {zones.map((zone) => {
          const val = draft[String(zone.id)] ?? "";
          const isCorrectZone = val.trim().toLowerCase() === (zone.correctLabel ?? "").trim().toLowerCase();
          return (
            <div key={zone.id} className="flex items-center gap-3">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[var(--primary)] text-xs font-bold text-white">
                {zone.id}
              </span>
              <input
                disabled={revealed}
                value={val}
                onChange={(e) => onDraftChange({ ...draft, [String(zone.id)]: e.target.value })}
                placeholder={t("quiz.labeling.typeLabel")}
                className={`flex-1 rounded-[var(--radius-md)] border px-3 py-2 text-sm outline-none transition-colors ${
                  revealed
                    ? isCorrectZone
                      ? "border-emerald-400/60 bg-emerald-500/10 text-emerald-200"
                      : "border-rose-400/60 bg-rose-500/10 text-rose-300"
                    : "border-[var(--border)] bg-[var(--bg-surface)] text-[var(--text-primary)]"
                }`}
              />
              {revealed && !isCorrectZone && (
                <span className="text-xs text-emerald-400">{zone.correctLabel}</span>
              )}
            </div>
          );
        })}
      </div>

      {!revealed && (
        <button
          type="button"
          disabled={!allFilled}
          onClick={() => allFilled && onSubmit(draft)}
          className="mt-1 w-full rounded-[var(--radius-md)] bg-[var(--primary)] py-2 text-sm font-semibold text-white transition-opacity disabled:opacity-40"
        >
          {t("quiz.play.submit")}
        </button>
      )}

      {revealed && (
        <div
          className={`rounded-[var(--radius-md)] border-2 px-4 py-3 text-sm ${
            lastCorrect
              ? "border-emerald-400/60 bg-emerald-500/10 text-emerald-200"
              : "border-rose-400/60 bg-rose-500/10 text-rose-200"
          }`}
        >
          <p className="font-semibold">
            {lastCorrect ? t("quiz.play.correct") : t("quiz.play.wrong")}
          </p>
        </div>
      )}
    </div>
  );
}

// ── Matching body ─────────────────────────────────────────────────────────────

function MatchingBody({
  t,
  pairs,
  draft,
  onDraftChange,
  revealed,
  onSubmit,
}: {
  t: ReturnType<typeof createTranslator>;
  pairs: MatchPair[];
  draft: Record<string, string>;
  onDraftChange: (next: Record<string, string>) => void;
  revealed: boolean;
  lastCorrect: boolean | null;
  onSubmit: () => void;
}) {
  // Right-side options for each dropdown (all right items from pairs).
  const rightOptions = pairs.map((p) => p.right);
  const allSelected = pairs.length > 0 && pairs.every((p) => draft[p.left] && draft[p.left] !== "");

  return (
    <div className="mt-4 space-y-2.5 sm:mt-6">
      {pairs.map((pair) => {
        const selected = draft[pair.left] ?? "";
        const isCorrectPair = revealed && selected === pair.right;
        const isWrongPair = revealed && selected !== "" && selected !== pair.right;
        return (
          <div
            key={pair.left}
            className={`flex flex-col gap-2 rounded-[var(--radius-md)] border p-3 transition-colors sm:flex-row sm:items-center ${
              revealed
                ? isCorrectPair
                  ? "border-emerald-500/40 bg-emerald-500/8"
                  : isWrongPair
                    ? "border-red-500/40 bg-red-500/8"
                    : "border-[var(--border)] bg-[var(--bg-surface)] opacity-60"
                : "border-[var(--border)] bg-[var(--bg-surface)]"
            }`}
          >
            <span className="flex-1 text-sm font-medium text-[var(--text-primary)]">
              {pair.left}
            </span>
            <div className="flex items-center gap-2 sm:w-52">
              <select
                value={selected}
                onChange={(e) => {
                  if (revealed) return;
                  onDraftChange({ ...draft, [pair.left]: e.target.value });
                }}
                disabled={revealed}
                className={`w-full rounded-[var(--radius-sm)] border px-2 py-1.5 text-sm outline-none transition-colors ${
                  revealed
                    ? isCorrectPair
                      ? "border-emerald-500 bg-emerald-500/10 text-emerald-300"
                      : isWrongPair
                        ? "border-red-500 bg-red-500/10 text-red-300"
                        : "border-[var(--border)] bg-[var(--bg-base)] text-[var(--text-muted)]"
                    : "border-[var(--border)] bg-[var(--bg-base)] text-[var(--text-primary)] focus:border-[var(--primary)]"
                }`}
              >
                <option value="">{t("quiz.matching.selectMatch")}</option>
                {rightOptions.map((opt) => (
                  <option key={opt} value={opt}>{opt}</option>
                ))}
              </select>
              {revealed ? (
                isCorrectPair ? (
                  <Check className="h-4 w-4 shrink-0 text-emerald-400" />
                ) : isWrongPair ? (
                  <X className="h-4 w-4 shrink-0 text-red-400" />
                ) : null
              ) : null}
            </div>
            {revealed && isWrongPair ? (
              <span className="text-xs text-emerald-400 sm:hidden">
                ✓ {pair.right}
              </span>
            ) : null}
          </div>
        );
      })}
      {revealed && (
        <div className="mt-1 space-y-1">
          {pairs.filter((p) => draft[p.left] !== "" && draft[p.left] !== p.right).map((p) => (
            <p key={p.left} className="hidden text-xs text-emerald-400 sm:block">
              {p.left} → <strong>{p.right}</strong>
            </p>
          ))}
        </div>
      )}
      {!revealed && (
        <div className="flex justify-end">
          <Button
            type="button"
            onClick={onSubmit}
            disabled={!allSelected}
          >
            {t("quiz.matching.submitAll")}
          </Button>
        </div>
      )}
    </div>
  );
}

function PollPlayBody({
  t,
  options,
  selected,
  revealed,
  onPick,
}: {
  t: ReturnType<typeof createTranslator>;
  options: DisplayOption[];
  selected: string | null;
  revealed: boolean;
  onPick: (letter: string) => void;
}) {
  const nonEmpty = options.filter((o) => o.text !== "");
  return (
    <div className="mt-4 grid gap-3 sm:mt-6 sm:grid-cols-2">
      {nonEmpty.map((opt, index) => {
        const isSelected = selected === opt.letter;
        return (
          <button
            key={opt.letter}
            type="button"
            disabled={revealed}
            onClick={() => !revealed && onPick(opt.letter)}
            className={`relative flex min-h-[80px] items-center gap-3 overflow-hidden rounded-[var(--radius-lg)] border bg-gradient-to-br p-4 text-left font-medium transition-all ${
              revealed && isSelected
                ? "border-indigo-400/50 from-indigo-500/20 to-indigo-500/5 text-white"
                : revealed
                  ? "border-[var(--border)]/40 from-transparent to-transparent opacity-50 text-[var(--text-muted)]"
                  : isSelected
                    ? `border-indigo-400/50 ${ACCENT_BY_POSITION[index % 4]} text-white`
                    : `border-[var(--border)]/50 ${ACCENT_BY_POSITION[index % 4]} text-[var(--text-secondary)] hover:border-white/30 hover:text-white`
            }`}
          >
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-current/20 bg-white/10 text-sm font-bold uppercase">
              {POSITION_LABELS[index]}
            </span>
            <span className="flex-1 text-sm leading-snug">{opt.text}</span>
          </button>
        );
      })}
      {revealed ? (
        <p className="col-span-full mt-1 text-center text-sm text-[var(--text-muted)]">
          {t("quiz.poll.resultLabel")}
        </p>
      ) : null}
    </div>
  );
}

function DropdownPlayBody({
  t,
  options,
  selected,
  correct,
  revealed,
  onPick,
}: {
  t: ReturnType<typeof createTranslator>;
  options: DisplayOption[];
  selected: OptionLetter | null;
  correct: OptionLetter | null | undefined;
  revealed: boolean;
  onPick: (letter: OptionLetter) => void;
}) {
  const nonEmpty = options.filter((o) => o.text !== "");
  const isCorrect = revealed && selected !== null && selected === correct;
  const isWrong = revealed && selected !== null && selected !== correct;

  return (
    <div className="mt-4 sm:mt-6">
      <div className={`rounded-[var(--radius-md)] border p-4 transition-colors ${
        revealed
          ? isCorrect
            ? "border-emerald-500/40 bg-emerald-500/8"
            : isWrong
              ? "border-red-500/40 bg-red-500/8"
              : "border-[var(--border)] bg-[var(--bg-surface)]"
          : "border-[var(--border)] bg-[var(--bg-surface)]"
      }`}>
        <label className="mb-2 block text-xs font-medium uppercase tracking-[0.14em] text-[var(--text-muted)]">
          {t("quiz.dropdown.selectLabel")}
        </label>
        <select
          value={selected ?? ""}
          onChange={(e) => {
            if (revealed) return;
            onPick(e.target.value as OptionLetter);
          }}
          disabled={revealed}
          className="w-full rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--bg-base)] px-3 py-2 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--primary)]"
        >
          <option value="">{t("quiz.dropdown.selectPlaceholder")}</option>
          {nonEmpty.map((opt) => (
            <option key={opt.letter} value={opt.letter}>{opt.text}</option>
          ))}
        </select>
      </div>
      {revealed && correct && (
        <p className="mt-2 text-sm text-emerald-400">
          ✓ {nonEmpty.find((o) => o.letter === correct)?.text}
        </p>
      )}
    </div>
  );
}

function CategorizationPlayBody({
  t,
  pairs,
  draft,
  onDraftChange,
  revealed,
  onSubmit,
}: {
  t: ReturnType<typeof createTranslator>;
  pairs: MatchPair[];
  draft: Record<string, string>;
  onDraftChange: (next: Record<string, string>) => void;
  revealed: boolean;
  lastCorrect: boolean | null;
  onSubmit: () => void;
}) {
  const categories = Array.from(new Set(pairs.map((p) => p.right)));
  const allSelected = pairs.length > 0 && pairs.every((p) => draft[p.left] && draft[p.left] !== "");

  return (
    <div className="mt-4 space-y-2.5 sm:mt-6">
      {pairs.map((pair) => {
        const selected = draft[pair.left] ?? "";
        const isCorrectPair = revealed && selected === pair.right;
        const isWrongPair = revealed && selected !== "" && selected !== pair.right;
        return (
          <div
            key={pair.left}
            className={`flex flex-col gap-2 rounded-[var(--radius-md)] border p-3 transition-colors sm:flex-row sm:items-center ${
              revealed
                ? isCorrectPair
                  ? "border-emerald-500/40 bg-emerald-500/8"
                  : isWrongPair
                    ? "border-red-500/40 bg-red-500/8"
                    : "border-[var(--border)] bg-[var(--bg-surface)] opacity-60"
                : "border-[var(--border)] bg-[var(--bg-surface)]"
            }`}
          >
            <span className="flex-1 text-sm font-medium text-[var(--text-primary)]">
              {pair.left}
            </span>
            <div className="flex items-center gap-2 sm:w-52">
              <select
                value={selected}
                onChange={(e) => {
                  if (revealed) return;
                  onDraftChange({ ...draft, [pair.left]: e.target.value });
                }}
                disabled={revealed}
                className={`w-full rounded-[var(--radius-sm)] border px-2 py-1.5 text-sm outline-none transition-colors ${
                  revealed
                    ? isCorrectPair
                      ? "border-emerald-500 bg-emerald-500/10 text-emerald-300"
                      : isWrongPair
                        ? "border-red-500 bg-red-500/10 text-red-300"
                        : "border-[var(--border)] bg-[var(--bg-base)] text-[var(--text-muted)]"
                    : "border-[var(--border)] bg-[var(--bg-base)] text-[var(--text-primary)] focus:border-[var(--primary)]"
                }`}
              >
                <option value="">{t("quiz.categorization.selectCategory")}</option>
                {categories.map((cat) => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
              {revealed ? (
                isCorrectPair ? (
                  <Check className="h-4 w-4 shrink-0 text-emerald-400" />
                ) : isWrongPair ? (
                  <X className="h-4 w-4 shrink-0 text-red-400" />
                ) : null
              ) : null}
            </div>
            {revealed && isWrongPair ? (
              <span className="text-xs text-emerald-400 sm:hidden">
                ✓ {pair.right}
              </span>
            ) : null}
          </div>
        );
      })}
      {revealed && (
        <div className="mt-1 space-y-1">
          {pairs.filter((p) => draft[p.left] !== "" && draft[p.left] !== p.right).map((p) => (
            <p key={p.left} className="hidden text-xs text-emerald-400 sm:block">
              {p.left} → <strong>{p.right}</strong>
            </p>
          ))}
        </div>
      )}
      {!revealed && (
        <div className="flex justify-end">
          <Button
            type="button"
            onClick={onSubmit}
            disabled={!allSelected}
          >
            {t("quiz.matching.submitAll")}
          </Button>
        </div>
      )}
    </div>
  );
}

function ComprehensionPlayBody({
  t,
  cd,
  draft,
  onDraftChange,
  revealed,
  onSubmit,
}: {
  t: ReturnType<typeof createTranslator>;
  cd: ComprehensionData;
  draft: Record<string, string>;
  onDraftChange: (d: Record<string, string>) => void;
  revealed: boolean;
  lastCorrect: boolean | null;
  onSubmit: () => void;
}) {
  const allAnswered = cd.subQuestions.every((sq) => (draft[sq.id] ?? "").trim() !== "");

  return (
    <div className="mt-4 space-y-4">
      {cd.passage ? (
        <div className="max-h-56 overflow-y-auto rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--bg-surface)] px-4 py-3 text-sm leading-relaxed text-[var(--text-primary)]">
          <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--text-muted)]">
            {t("quiz.comprehension.passage")}
          </p>
          {cd.passage}
        </div>
      ) : null}

      <div className="space-y-3">
        {cd.subQuestions.map((sq: ComprehensionSubQuestion, idx: number) => {
          const given = (draft[sq.id] ?? "").trim().toLowerCase();
          const expected = sq.correct.trim().toLowerCase();
          const isCorrect = given === expected;
          const isWrong = revealed && given !== "" && !isCorrect;

          return (
            <div
              key={sq.id}
              className={`rounded-[var(--radius-md)] border p-3 transition-colors ${
                revealed
                  ? isCorrect
                    ? "border-emerald-500/50 bg-emerald-500/8"
                    : isWrong
                      ? "border-red-500/40 bg-red-500/8"
                      : "border-[var(--border)] bg-[var(--bg-surface)]"
                  : "border-[var(--border)] bg-[var(--bg-surface)]"
              }`}
            >
              <p className="mb-2 text-sm font-medium text-[var(--text-primary)]">
                {idx + 1}. {sq.prompt}
              </p>

              {sq.type === "mcq" ? (
                <div className="grid gap-1.5 sm:grid-cols-2">
                  {(["a", "b", "c", "d"] as const).map((letter) => {
                    const optKey = `option${letter.toUpperCase()}` as "optionA" | "optionB" | "optionC" | "optionD";
                    const optText = sq[optKey];
                    if (!optText) return null;
                    const sel = draft[sq.id] === letter;
                    const isCorrectOpt = revealed && letter === sq.correct.toLowerCase();
                    const isWrongSel = revealed && sel && letter !== sq.correct.toLowerCase();
                    return (
                      <button
                        key={letter}
                        type="button"
                        disabled={revealed}
                        onClick={() => onDraftChange({ ...draft, [sq.id]: letter })}
                        className={`flex items-center gap-2 rounded-[var(--radius-sm)] border px-3 py-2 text-left text-sm transition-colors ${
                          isCorrectOpt
                            ? "border-emerald-500 bg-emerald-500/15 text-emerald-300"
                            : isWrongSel
                              ? "border-red-500 bg-red-500/15 text-red-300"
                              : sel
                                ? "border-[var(--primary)] bg-[var(--primary)]/15 text-[var(--primary)]"
                                : "border-[var(--border)] text-[var(--text-secondary)] hover:border-[var(--primary)]/50"
                        }`}
                      >
                        <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border text-[10px] font-bold uppercase ${
                          isCorrectOpt ? "border-emerald-500 bg-emerald-500 text-white" : isWrongSel ? "border-red-500 bg-red-500 text-white" : sel ? "border-[var(--primary)] bg-[var(--primary)] text-white" : "border-[var(--border)]"
                        }`}>
                          {letter}
                        </span>
                        {optText}
                      </button>
                    );
                  })}
                </div>
              ) : sq.type === "true_false" ? (
                <div className="flex gap-2">
                  {(["t", "f"] as const).map((val) => {
                    const sel = draft[sq.id] === val;
                    const isCorrectOpt = revealed && val === sq.correct.toLowerCase();
                    const isWrongSel = revealed && sel && val !== sq.correct.toLowerCase();
                    return (
                      <button
                        key={val}
                        type="button"
                        disabled={revealed}
                        onClick={() => onDraftChange({ ...draft, [sq.id]: val })}
                        className={`flex-1 rounded-[var(--radius-sm)] border py-2 text-sm font-medium transition-colors ${
                          isCorrectOpt
                            ? "border-emerald-500 bg-emerald-500/15 text-emerald-300"
                            : isWrongSel
                              ? "border-red-500 bg-red-500/15 text-red-300"
                              : sel
                                ? "border-[var(--primary)] bg-[var(--primary)]/15 text-[var(--primary)]"
                                : "border-[var(--border)] text-[var(--text-secondary)] hover:border-[var(--primary)]/50"
                        }`}
                      >
                        {val === "t" ? "True" : "False"}
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <input
                    value={draft[sq.id] ?? ""}
                    onChange={(e) => onDraftChange({ ...draft, [sq.id]: e.target.value })}
                    disabled={revealed}
                    placeholder={t("quiz.comprehension.subQCorrect")}
                    className={`flex-1 rounded-[var(--radius-sm)] border px-3 py-1.5 text-sm outline-none transition-colors ${
                      revealed
                        ? isCorrect
                          ? "border-emerald-500 bg-emerald-500/8 text-emerald-300"
                          : isWrong
                            ? "border-red-500 bg-red-500/8 text-red-300"
                            : "border-[var(--border)] text-[var(--text-muted)]"
                        : "border-[var(--border)] bg-[var(--bg-surface)] text-[var(--text-primary)] focus:border-[var(--primary)]"
                    }`}
                  />
                  {revealed ? (
                    isCorrect ? (
                      <Check className="h-4 w-4 shrink-0 text-emerald-400" />
                    ) : isWrong ? (
                      <X className="h-4 w-4 shrink-0 text-red-400" />
                    ) : null
                  ) : null}
                </div>
              )}

              {revealed && !isCorrect && given !== "" ? (
                <p className="mt-1.5 text-xs text-emerald-400">
                  ✓ {sq.correct}
                </p>
              ) : null}
            </div>
          );
        })}
      </div>

      {!revealed && (
        <div className="flex justify-end">
          <Button
            type="button"
            onClick={onSubmit}
            disabled={!allAnswered}
          >
            {t("quiz.comprehension.submitAll")}
          </Button>
        </div>
      )}
    </div>
  );
}

const DRAW_COLORS = ["#111827", "#ef4444", "#3b82f6", "#22c55e", "#f59e0b", "#a855f7"];

function DrawingPlayBody({
  t,
  revealed,
  submittedDrawing,
  onSubmit,
}: {
  t: (key: string) => string;
  revealed: boolean;
  submittedDrawing: string | null;
  onSubmit: (dataUrl: string | null) => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isDrawingRef = useRef(false);
  const lastPosRef = useRef<{ x: number; y: number } | null>(null);
  const [color, setColor] = useState("#111827");
  const [lineWidth, setLineWidth] = useState(4);
  const [mode, setMode] = useState<"pen" | "eraser">("pen");
  const [hasDrawn, setHasDrawn] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }, []);

  const getPos = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    if ("touches" in e) {
      const touch = e.touches[0];
      if (!touch) return null;
      return { x: (touch.clientX - rect.left) * scaleX, y: (touch.clientY - rect.top) * scaleY };
    }
    return { x: (e.clientX - rect.left) * scaleX, y: (e.clientY - rect.top) * scaleY };
  };

  const startDraw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (revealed) return;
    e.preventDefault();
    const pos = getPos(e);
    if (!pos) return;
    isDrawingRef.current = true;
    lastPosRef.current = pos;
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawingRef.current || revealed) return;
    e.preventDefault();
    const pos = getPos(e);
    const last = lastPosRef.current;
    if (!pos || !last) return;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!ctx) return;
    ctx.beginPath();
    ctx.moveTo(last.x, last.y);
    ctx.lineTo(pos.x, pos.y);
    ctx.strokeStyle = mode === "eraser" ? "#ffffff" : color;
    ctx.lineWidth = mode === "eraser" ? lineWidth * 4 : lineWidth;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.stroke();
    lastPosRef.current = pos;
    setHasDrawn(true);
  };

  const endDraw = () => { isDrawingRef.current = false; lastPosRef.current = null; };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!ctx || !canvas) return;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    setHasDrawn(false);
  };

  const handleSubmit = () => {
    const canvas = canvasRef.current;
    if (!canvas) { onSubmit(null); return; }
    const dataUrl = canvas.toDataURL("image/jpeg", 0.65);
    onSubmit(dataUrl);
  };

  if (revealed) {
    return (
      <div className="mt-4 space-y-2">
        <p className="text-xs font-medium uppercase tracking-wider text-[var(--text-muted)]">{t("quiz.drawing.yourDrawing")}</p>
        {submittedDrawing ? (
          <img src={submittedDrawing} alt="" className="w-full rounded-[var(--radius-md)] border border-[var(--border)]" />
        ) : (
          <div className="flex h-24 items-center justify-center rounded-[var(--radius-md)] border border-dashed border-[var(--border)] text-sm text-[var(--text-muted)]">
            {t("quiz.drawing.noSubmission")}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="mt-4 space-y-3">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex gap-1">
          {DRAW_COLORS.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => { setColor(c); setMode("pen"); }}
              className={`h-7 w-7 rounded-full border-2 transition-transform ${mode === "pen" && color === c ? "scale-125 border-white shadow-md" : "border-transparent"}`}
              style={{ backgroundColor: c }}
            />
          ))}
        </div>
        <div className="flex items-center gap-1.5">
          {[2, 4, 8].map((w) => (
            <button
              key={w}
              type="button"
              onClick={() => setLineWidth(w)}
              className={`flex h-7 w-7 items-center justify-center rounded-full border transition-colors ${lineWidth === w && mode === "pen" ? "border-[var(--primary)] bg-[var(--primary)]/10" : "border-[var(--border)]"}`}
            >
              <span className="rounded-full bg-current" style={{ width: w * 2, height: w * 2 }} />
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={() => setMode(mode === "eraser" ? "pen" : "eraser")}
          className={`rounded-[var(--radius-md)] border px-2.5 py-1 text-xs font-medium transition-colors ${mode === "eraser" ? "border-[var(--primary)] bg-[var(--primary)]/10 text-[var(--primary)]" : "border-[var(--border)] text-[var(--text-secondary)]"}`}
        >
          {t("quiz.drawing.eraser")}
        </button>
        <button
          type="button"
          onClick={clearCanvas}
          className="rounded-[var(--radius-md)] border border-[var(--border)] px-2.5 py-1 text-xs font-medium text-[var(--text-secondary)] transition-colors hover:border-[var(--danger)] hover:text-[var(--danger)]"
        >
          {t("quiz.drawing.clear")}
        </button>
      </div>

      {/* Canvas */}
      <canvas
        ref={canvasRef}
        width={720}
        height={400}
        className="w-full cursor-crosshair touch-none rounded-[var(--radius-md)] border border-[var(--border)] bg-white"
        onMouseDown={startDraw}
        onMouseMove={draw}
        onMouseUp={endDraw}
        onMouseLeave={endDraw}
        onTouchStart={startDraw}
        onTouchMove={draw}
        onTouchEnd={endDraw}
      />

      <Button type="button" onClick={handleSubmit} disabled={!hasDrawn}>
        {t("quiz.drawing.submit")}
      </Button>
    </div>
  );
}

// VoiceResponsePlayBody is the IELTS-style speaking-practice recorder. The
// student records audio via MediaRecorder, plays it back to verify, then
// uploads the blob to the existing /quizzes/audio endpoint. The returned URL
// is stored in the attempt's text_answer for later teacher review — there is
// no automatic grading.
function VoiceResponsePlayBody({
  t,
  revealed,
  onSubmit,
}: {
  t: (key: string) => string;
  revealed: boolean;
  onSubmit: (audioUrl: string | null) => void;
}) {
  const [recState, setRecState] = useState<"idle" | "recording" | "recorded" | "uploading" | "submitted" | "error">("idle");
  const [error, setError] = useState<string | null>(null);
  const [blob, setBlob] = useState<Blob | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [seconds, setSeconds] = useState(0);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Release object URLs and any active mic stream when the component unmounts
  // so we don't keep the device's recording indicator on after the question advances.
  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      streamRef.current?.getTracks().forEach((tr) => tr.stop());
      if (tickRef.current) clearInterval(tickRef.current);
    };
  }, [previewUrl]);

  async function startRec() {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const rec = new MediaRecorder(stream);
      chunksRef.current = [];
      rec.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      rec.onstop = () => {
        const b = new Blob(chunksRef.current, { type: rec.mimeType || "audio/webm" });
        setBlob(b);
        const url = URL.createObjectURL(b);
        setPreviewUrl(url);
        setRecState("recorded");
        streamRef.current?.getTracks().forEach((tr) => tr.stop());
        streamRef.current = null;
        if (tickRef.current) {
          clearInterval(tickRef.current);
          tickRef.current = null;
        }
      };
      recorderRef.current = rec;
      setSeconds(0);
      tickRef.current = setInterval(() => setSeconds((s) => s + 1), 1000);
      rec.start();
      setRecState("recording");
    } catch (err) {
      setError(err instanceof Error ? err.message : "microphone unavailable");
      setRecState("error");
    }
  }

  function stopRec() {
    recorderRef.current?.stop();
  }

  function reset() {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setBlob(null);
    setPreviewUrl(null);
    setSeconds(0);
    setRecState("idle");
  }

  async function submit() {
    if (!blob) return;
    setRecState("uploading");
    try {
      const form = new FormData();
      form.append("audio", blob, `voice-${Date.now()}.webm`);
      const res = await fetch("/api/v1/quizzes/audio", { method: "POST", body: form });
      if (!res.ok) throw new Error(`upload failed: ${res.status}`);
      const data = (await res.json()) as { url?: string };
      if (!data.url) throw new Error("missing url");
      setRecState("submitted");
      onSubmit(data.url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "upload failed");
      setRecState("error");
    }
  }

  if (revealed) {
    return (
      <div className="mt-4 space-y-2">
        <p className="text-xs font-medium uppercase tracking-wider text-[var(--text-muted)]">
          {t("quiz.voice.submitted") || "Recording submitted (non-graded)"}
        </p>
        {previewUrl && <audio src={previewUrl} controls className="w-full" />}
      </div>
    );
  }

  return (
    <div className="mt-4 space-y-3">
      <p className="text-xs text-[var(--text-muted)]">
        {t("quiz.voice.hint") || "Speak your answer. Recording is non-graded — for IELTS speaking practice."}
      </p>
      {recState === "idle" && (
        <Button type="button" onClick={startRec}>
          {t("quiz.voice.start") || "🎤 Start recording"}
        </Button>
      )}
      {recState === "recording" && (
        <div className="flex items-center gap-3">
          <span className="inline-flex h-2.5 w-2.5 animate-pulse rounded-full bg-rose-500" />
          <span className="font-mono tabular-nums text-sm">{seconds}s</span>
          <Button type="button" variant="outline" onClick={stopRec}>
            {t("quiz.voice.stop") || "Stop"}
          </Button>
        </div>
      )}
      {recState === "recorded" && previewUrl && (
        <div className="space-y-2">
          <audio src={previewUrl} controls className="w-full" />
          <div className="flex gap-2">
            <Button type="button" variant="outline" onClick={reset}>
              {t("quiz.voice.retake") || "Re-record"}
            </Button>
            <Button type="button" onClick={submit}>
              {t("quiz.voice.submit") || "Submit"}
            </Button>
          </div>
        </div>
      )}
      {recState === "uploading" && <p className="text-sm">{t("quiz.voice.uploading") || "Uploading..."}</p>}
      {recState === "submitted" && (
        <p className="text-sm text-emerald-600">{t("quiz.voice.done") || "Submitted ✓"}</p>
      )}
      {error && <p className="text-sm text-rose-600">{error}</p>}
    </div>
  );
}
