"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AlertCircle, ArrowLeft, ArrowRight, CheckCircle2, Clock3, Flag, LayoutGrid, Loader2, X } from "lucide-react";
import { MathText } from "@/components/nuet/math-text";
import { useLocale } from "@/components/providers/locale-provider";
import { useScreenWakeLock } from "@/hooks/use-wake-lock";
import { Button } from "@/components/ui/button";
import {
  completeNUETMockAttempt,
  saveNUETMockAttempt,
  startNUETMockAttempt,
  type NUETMockCompleteResponse,
  type NUETMockQuestion,
} from "./actions";

const ANSWER_LETTERS = ["A", "B", "C", "D", "E", "F", "G", "H"] as const;

type Stage = "loading" | "exam" | "submitting" | "results" | "error";

type PersistedState = {
  attemptId: string;
  questions: NUETMockQuestion[];
  answers: Record<string, string>;
  marked: string[];
  currentIndex: number;
  timeLeft: number;
  durationSeconds: number;
};

export function NUETMockClient({
  testId,
  testName,
}: {
  testId: string;
  testName: string;
}) {
  const { t } = useLocale();
  const [stage, setStage] = useState<Stage>("loading");
  const [attemptId, setAttemptId] = useState<string | null>(null);
  const [questions, setQuestions] = useState<NUETMockQuestion[]>([]);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [marked, setMarked] = useState<Set<string>>(new Set());
  const [currentIndex, setCurrentIndex] = useState(0);
  const [timeLeft, setTimeLeft] = useState(120 * 60);
  const [durationSeconds, setDurationSeconds] = useState(120 * 60);
  const [error, setError] = useState<string | null>(null);
  const [saveLabel, setSaveLabel] = useState("");
  const [result, setResult] = useState<NUETMockCompleteResponse | null>(null);
  const [expandedResult, setExpandedResult] = useState<Record<string, boolean>>({});
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  useScreenWakeLock(stage === "exam");

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const autosaveRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const submittingRef = useRef(false);

  const answersRef = useRef<Record<string, string>>({});
  const markedRef = useRef<Set<string>>(new Set());
  const timeLeftRef = useRef(0);

  const storageKey = useMemo(() => `nuet:mock:${testId}`, [testId]);
  const activeQuestion = questions[currentIndex] ?? null;
  const answeredCount = useMemo(() => Object.values(answers).filter(Boolean).length, [answers]);
  const questionByID = useMemo(() => {
    const map = new Map<string, NUETMockQuestion>();
    for (const question of questions) {
      map.set(question.id, question);
    }
    return map;
  }, [questions]);

  useEffect(() => {
    answersRef.current = answers;
  }, [answers]);

  useEffect(() => {
    markedRef.current = marked;
  }, [marked]);

  useEffect(() => {
    timeLeftRef.current = timeLeft;
  }, [timeLeft]);

  const clearIntervals = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (autosaveRef.current) {
      clearInterval(autosaveRef.current);
      autosaveRef.current = null;
    }
  }, []);

  const startFreshAttempt = useCallback(async () => {
    setStage("loading");
    setError(null);
    try {
      const response = await startNUETMockAttempt(testId);
      const seconds = response.durationMinutes * 60;
      setAttemptId(response.attempt.id);
      setQuestions(response.questions);
      setAnswers({});
      setMarked(new Set());
      setCurrentIndex(0);
      setTimeLeft(seconds);
      setDurationSeconds(seconds);
      setResult(null);
      setExpandedResult({});
      setStage("exam");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to start NUET mock exam.");
      setStage("error");
    }
  }, [testId]);

  useEffect(() => {
    let active = true;

    async function bootstrap() {
      if (typeof window !== "undefined") {
        const raw = window.sessionStorage.getItem(storageKey);
        if (raw) {
          try {
            const parsed = JSON.parse(raw) as PersistedState;
            if (parsed.attemptId && parsed.questions.length > 0 && parsed.timeLeft > 0) {
              if (!active) return;
              setAttemptId(parsed.attemptId);
              setQuestions(parsed.questions);
              setAnswers(parsed.answers ?? {});
              setMarked(new Set(parsed.marked ?? []));
              setCurrentIndex(Math.min(parsed.currentIndex ?? 0, Math.max(0, parsed.questions.length - 1)));
              setTimeLeft(parsed.timeLeft);
              setDurationSeconds(parsed.durationSeconds || 120 * 60);
              setStage("exam");
              return;
            }
          } catch {
            // ignore invalid persisted payload
          }
        }
      }
      if (!active) return;
      await startFreshAttempt();
    }

    void bootstrap();
    return () => {
      active = false;
      clearIntervals();
    };
  }, [clearIntervals, startFreshAttempt, storageKey]);

  useEffect(() => {
    if (stage !== "exam") return;
    if (typeof window === "undefined" || !attemptId) return;

    const payload: PersistedState = {
      attemptId,
      questions,
      answers,
      marked: Array.from(marked),
      currentIndex,
      timeLeft,
      durationSeconds,
    };
    window.sessionStorage.setItem(storageKey, JSON.stringify(payload));
  }, [answers, attemptId, currentIndex, durationSeconds, marked, questions, stage, storageKey, timeLeft]);

  const submitAttempt = useCallback(
    async (autoReason?: string) => {
      if (!attemptId || submittingRef.current) return;
      submittingRef.current = true;
      clearIntervals();
      setStage("submitting");
      if (autoReason) setError(autoReason);

      try {
        const response = await completeNUETMockAttempt(attemptId, {
          answers: answersRef.current,
          timeTakenSecs: Math.max(0, durationSeconds - timeLeftRef.current),
        });
        setResult(response);
        setStage("results");
        if (typeof window !== "undefined") {
          window.sessionStorage.removeItem(storageKey);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to submit mock exam.");
        setStage("exam");
      } finally {
        submittingRef.current = false;
      }
    },
    [attemptId, clearIntervals, durationSeconds, storageKey]
  );

  useEffect(() => {
    if (stage !== "exam") return;
    timerRef.current = setInterval(() => {
      setTimeLeft((current) => {
        if (current <= 1) {
          window.setTimeout(() => {
            void submitAttempt("Time is up. Exam submitted automatically.");
          }, 0);
          return 0;
        }
        return current - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [stage, submitAttempt]);

  useEffect(() => {
    if (stage !== "exam" || !attemptId) return;

    autosaveRef.current = setInterval(() => {
      void saveNUETMockAttempt(attemptId, {
        answers: answersRef.current,
        timeTakenSecs: Math.max(0, durationSeconds - timeLeftRef.current),
      })
        .then(() => {
          setSaveLabel("Saved");
          window.setTimeout(() => setSaveLabel(""), 1200);
        })
        .catch(() => {
          setSaveLabel("Save failed");
        });
    }, 30_000);

    return () => {
      if (autosaveRef.current) {
        clearInterval(autosaveRef.current);
        autosaveRef.current = null;
      }
    };
  }, [attemptId, durationSeconds, stage]);

  function setAnswer(questionID: string, letter: string) {
    setAnswers((current) => ({ ...current, [questionID]: letter }));
  }

  function toggleMarked(questionID: string) {
    setMarked((current) => {
      const next = new Set(current);
      if (next.has(questionID)) {
        next.delete(questionID);
      } else {
        next.add(questionID);
      }
      return next;
    });
  }

  if (stage === "loading") {
    return (
      <div className="mt-6 flex min-h-[320px] items-center justify-center rounded-2xl border border-[var(--border)] bg-[var(--bg-surface)]">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
        Loading NUET mock...
      </div>
    );
  }

  if (stage === "error") {
    return (
      <div className="mt-6 rounded-2xl border border-rose-200 bg-rose-50 p-5 text-rose-700">
        <div className="flex items-start gap-2">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <div>
            <p className="font-semibold">Mock exam failed to start</p>
            <p className="mt-1 text-sm">{error}</p>
          </div>
        </div>
        <div className="mt-4">
          <Button onClick={() => void startFreshAttempt()}>Retry</Button>
        </div>
      </div>
    );
  }

  if (stage === "results" && result) {
    const totalCorrect = result.attempt.correctMath + result.attempt.correctCt;
    return (
      <div className="mt-6 space-y-6">
        <section className="rounded-2xl border border-[var(--border)] bg-[var(--bg-surface)] p-6">
          <p className="font-mono text-[10px] uppercase tracking-widest text-[var(--text-muted)]">{testName}</p>
          <h2 className="mt-2 text-3xl font-bold text-[var(--text-primary)]">{result.attempt.scoreTotal} / 240</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-4">
            <StatTile label="Math" value={`${result.attempt.scoreMath}/120`} />
            <StatTile label="Critical Thinking" value={`${result.attempt.scoreCt}/120`} />
            <StatTile label="Correct" value={`${totalCorrect}/60`} />
            <StatTile label="Time" value={formatTime(result.attempt.timeTakenSecs)} />
          </div>
        </section>

        <section className="rounded-2xl border border-[var(--border)] bg-[var(--bg-surface)] p-5">
          <h3 className="text-lg font-semibold text-[var(--text-primary)]">Question-by-question results</h3>
          <div className="mt-4 space-y-3">
            {result.results.map((item, index) => {
              const prompt = questionByID.get(item.questionId)?.prompt ?? "";
              const open = expandedResult[item.questionId] ?? false;
              return (
                <article key={item.questionId} className="rounded-xl border border-[var(--border)] bg-[var(--bg-base)] p-4">
                  <button
                    type="button"
                    onClick={() =>
                      setExpandedResult((current) => ({
                        ...current,
                        [item.questionId]: !open,
                      }))
                    }
                    className="flex w-full items-start justify-between gap-3 text-left"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-[var(--text-primary)]">
                        #{index + 1} {truncateSingleLine(prompt, 140)}
                      </p>
                      <p className="mt-1 text-xs text-[var(--text-secondary)]">
                        Your answer: {item.given || "—"} · Correct: {item.expected}
                      </p>
                    </div>
                    {item.correct ? (
                      <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600" />
                    ) : (
                      <AlertCircle className="h-5 w-5 shrink-0 text-amber-600" />
                    )}
                  </button>
                  {open ? (
                    <div className="mt-3 space-y-2 border-t border-[var(--border)] pt-3 text-sm text-[var(--text-secondary)]">
                      {prompt ? (
                        <div>
                          <MathText text={prompt} as="div" />
                        </div>
                      ) : null}
                      <div>
                        <p className="text-[11px] font-semibold uppercase tracking-wide text-[var(--text-muted)]">
                          {t("nuet.review.solutionTitle")}
                        </p>
                        {item.explanation && item.explanation.trim() ? (
                          <div className="mt-1">
                            <MathText text={item.explanation} as="div" />
                          </div>
                        ) : (
                          <p className="mt-1 italic text-[var(--text-muted)]">
                            {t("nuet.review.noExplanation")}
                          </p>
                        )}
                      </div>
                    </div>
                  ) : null}
                </article>
              );
            })}
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className="lg:mt-6 lg:grid lg:grid-cols-[290px_1fr] lg:gap-5">
      {/* Mobile sticky header */}
      <div className="sticky top-0 z-30 -mx-4 flex items-center gap-2 border-b border-[var(--border)] bg-[var(--bg-base)] px-4 py-2 sm:-mx-6 sm:px-6 lg:hidden">
        <button
          type="button"
          onClick={() => setMobileNavOpen(true)}
          aria-label={t("nuet.simulator.openNav")}
          className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--border)] bg-[var(--bg-surface)] px-3 py-1.5 text-xs font-semibold text-[var(--text-primary)]"
        >
          <LayoutGrid className="h-4 w-4" />
          {currentIndex + 1}/{questions.length}
        </button>
        <div className="ml-auto flex items-center gap-2 rounded-lg border border-[var(--border)] bg-[var(--bg-surface)] px-3 py-1.5 text-sm font-semibold text-[var(--text-primary)]">
          <Clock3 className="h-4 w-4" />
          {formatTime(timeLeft)}
        </div>
      </div>

      <aside
        className={`space-y-4 rounded-2xl border border-[var(--border)] bg-[var(--bg-surface)] p-4 ${
          mobileNavOpen
            ? "fixed inset-0 z-40 m-0 h-full overflow-y-auto rounded-none lg:relative lg:inset-auto lg:m-0 lg:h-auto lg:overflow-visible lg:rounded-2xl"
            : "hidden lg:block"
        }`}
      >
        <div className="flex items-center justify-between gap-3">
          <p className="truncate text-sm font-medium text-[var(--text-primary)]">{testName}</p>
          <div className="flex items-center gap-2">
            <div className="rounded-full border border-[var(--border)] bg-[var(--bg-base)] px-3 py-1.5 text-sm font-semibold text-[var(--text-primary)]">
              <Clock3 className="mr-1 inline h-4 w-4" />
              {formatTime(timeLeft)}
            </div>
            <button
              type="button"
              onClick={() => setMobileNavOpen(false)}
              aria-label={t("nuet.simulator.closeNav")}
              className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-[var(--border)] bg-[var(--bg-base)] text-[var(--text-muted)] lg:hidden"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
          <StatTile label="Answered" value={`${answeredCount}/60`} />
          <StatTile label="Marked" value={String(marked.size)} />
        </div>

        {saveLabel ? <p className="text-xs text-[var(--text-muted)]">{saveLabel}</p> : null}
        {error ? <p className="text-xs text-amber-700">{error}</p> : null}

        <div className="grid grid-cols-6 gap-2 sm:grid-cols-10">
          {questions.map((question, index) => {
            const isMarked = marked.has(question.id);
            const answered = Boolean(answers[question.id]);
            const baseClass = isMarked
              ? "border-amber-300 bg-amber-100 text-amber-800"
              : answered
                ? "border-blue-300 bg-blue-100 text-blue-800"
                : "border-slate-300 bg-slate-100 text-slate-700";
            const activeClass = currentIndex === index ? "ring-2 ring-[var(--primary)]" : "";
            return (
              <button
                key={question.id}
                type="button"
                onClick={() => {
                  setCurrentIndex(index);
                  setMobileNavOpen(false);
                }}
                className={`aspect-square rounded-md border text-xs font-semibold transition ${baseClass} ${activeClass}`}
              >
                {index + 1}
              </button>
            );
          })}
        </div>
      </aside>

      <section className="mt-4 rounded-2xl border border-[var(--border)] bg-[var(--bg-surface)] p-4 pb-24 sm:p-6 sm:pb-24 lg:mt-0 lg:pb-6">
        {activeQuestion ? (
          <>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="font-mono text-[10px] uppercase tracking-widest text-[var(--text-muted)]">
                  {activeQuestion.section === "math" ? "Math" : "Critical Thinking"}
                </p>
                <h2 className="mt-2 text-xl font-semibold text-[var(--text-primary)]">#{currentIndex + 1}</h2>
              </div>
              <button
                type="button"
                onClick={() => toggleMarked(activeQuestion.id)}
                className={`hidden items-center gap-2 rounded-full border px-3 py-2 text-sm sm:inline-flex ${
                  marked.has(activeQuestion.id)
                    ? "border-amber-300 bg-amber-50 text-amber-700"
                    : "border-[var(--border)] bg-[var(--bg-base)] text-[var(--text-primary)]"
                }`}
              >
                <Flag className="h-4 w-4" />
                {marked.has(activeQuestion.id) ? "Unmark" : "Mark"}
              </button>
            </div>

            <QuestionPrompt prompt={activeQuestion.prompt} />

            <div className="mt-6 space-y-3">
              {visibleOptions(activeQuestion.options).map((option, optionIndex) => {
                const letter = ANSWER_LETTERS[optionIndex];
                const active = answers[activeQuestion.id] === letter;
                return (
                  <button
                    key={letter}
                    type="button"
                    onClick={() => setAnswer(activeQuestion.id, letter)}
                    className={`flex w-full items-start gap-3 rounded-xl border px-4 py-3 text-left transition ${
                      active
                        ? "border-[var(--primary)] bg-[var(--primary-soft)]"
                        : "border-[var(--border)] bg-[var(--bg-base)] hover:border-[var(--primary)]"
                    }`}
                  >
                    <span className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-current text-xs font-semibold">
                      {letter}
                    </span>
                    <span className="text-sm text-[var(--text-primary)]">
                      <MathText text={option} />
                    </span>
                  </button>
                );
              })}
            </div>

            <div className="mt-8 hidden flex-wrap items-center justify-between gap-3 lg:flex">
              <Button
                variant="ghost"
                onClick={() => setCurrentIndex((current) => Math.max(0, current - 1))}
                disabled={currentIndex === 0}
              >
                <ArrowLeft className="h-4 w-4" />
                Previous
              </Button>

              <div className="flex flex-wrap gap-3">
                <Button variant="ghost" onClick={() => toggleMarked(activeQuestion.id)}>
                  <Flag className="h-4 w-4" />
                  {marked.has(activeQuestion.id) ? "Unmark" : "Mark"}
                </Button>
                {currentIndex === questions.length - 1 ? (
                  <Button onClick={() => void submitAttempt()} isLoading={stage === "submitting"}>
                    Submit
                  </Button>
                ) : (
                  <Button onClick={() => setCurrentIndex((current) => Math.min(questions.length - 1, current + 1))}>
                    Next
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
          </>
        ) : (
          <div className="flex min-h-[300px] items-center justify-center text-sm text-[var(--text-secondary)]">
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Loading question...
          </div>
        )}
      </section>

      {/* Mobile bottom action bar */}
      {activeQuestion ? (
        <div className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-3 gap-2 border-t border-[var(--border)] bg-[var(--bg-base)] p-2 lg:hidden">
          <button
            type="button"
            onClick={() => setCurrentIndex((current) => Math.max(0, current - 1))}
            disabled={currentIndex === 0}
            className="inline-flex items-center justify-center gap-1 rounded-lg border border-[var(--border)] bg-[var(--bg-surface)] px-3 py-2.5 text-sm font-medium text-[var(--text-primary)] disabled:opacity-40"
          >
            <ArrowLeft className="h-4 w-4" />
            Prev
          </button>
          <button
            type="button"
            onClick={() => toggleMarked(activeQuestion.id)}
            className={`inline-flex items-center justify-center gap-1 rounded-lg border px-3 py-2.5 text-sm font-medium ${
              marked.has(activeQuestion.id)
                ? "border-amber-300 bg-amber-50 text-amber-700"
                : "border-[var(--border)] bg-[var(--bg-surface)] text-[var(--text-primary)]"
            }`}
          >
            <Flag className="h-4 w-4" />
            {marked.has(activeQuestion.id) ? "Unmark" : "Mark"}
          </button>
          {currentIndex === questions.length - 1 ? (
            <button
              type="button"
              onClick={() => void submitAttempt()}
              disabled={stage === "submitting"}
              className="inline-flex items-center justify-center gap-1 rounded-lg bg-[var(--primary)] px-3 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
            >
              {stage === "submitting" ? <Loader2 className="h-4 w-4 animate-spin" /> : "Submit"}
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setCurrentIndex((current) => Math.min(questions.length - 1, current + 1))}
              className="inline-flex items-center justify-center gap-1 rounded-lg bg-[var(--primary)] px-3 py-2.5 text-sm font-semibold text-white"
            >
              Next
              <ArrowRight className="h-4 w-4" />
            </button>
          )}
        </div>
      ) : null}
    </div>
  );
}

function QuestionPrompt({ prompt }: { prompt: string }) {
  const { text, figure } = splitPromptAndFigure(prompt);
  return (
    <div className="mt-5">
      <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-base)] p-4 text-base leading-8 text-[var(--text-primary)]">
        <MathText text={text} as="div" />
      </div>
      {figure ? (
        <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
          <FigureContent figure={figure} />
        </div>
      ) : null}
    </div>
  );
}

function FigureContent({ figure }: { figure: string }) {
  if (isAbsoluteParabolaFigure(figure)) {
    return (
      <div className="flex justify-start">
        <CoordinateGraph />
      </div>
    );
  }
  return (
    <p>
      <span className="font-semibold">Figure:</span> {figure}
    </p>
  );
}

function CoordinateGraph() {
  return (
    <svg
      viewBox="0 0 340 260"
      role="img"
      aria-label="Coordinate graph through (-3,0), (0,9), and (3,0)"
      className="h-72 w-full max-w-sm rounded-lg bg-white"
    >
      <defs>
        <marker id="nuet-mock-x-arrow" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto">
          <path d="M0 0 L8 4 L0 8 Z" fill="#111827" />
        </marker>
        <marker id="nuet-mock-y-arrow" markerWidth="8" markerHeight="8" refX="4" refY="1" orient="auto">
          <path d="M0 8 L4 0 L8 8 Z" fill="#111827" />
        </marker>
      </defs>
      <line x1="52" y1="178" x2="300" y2="178" stroke="#111827" strokeWidth="2.4" markerEnd="url(#nuet-mock-x-arrow)" />
      <line x1="172" y1="226" x2="172" y2="34" stroke="#111827" strokeWidth="2.4" markerEnd="url(#nuet-mock-y-arrow)" />
      <path d="M74 36 C83 83 95 135 112 178" fill="none" stroke="#111827" strokeWidth="3" strokeLinecap="round" />
      <path d="M112 178 C128 86 216 86 232 178" fill="none" stroke="#111827" strokeWidth="3" strokeLinecap="round" />
      <path d="M232 178 C249 135 261 83 270 36" fill="none" stroke="#111827" strokeWidth="3" strokeLinecap="round" />
      <text x="297" y="199" fontSize="17" fontStyle="italic" fill="#111827">x</text>
      <text x="184" y="40" fontSize="17" fontStyle="italic" fill="#111827">y</text>
      <text x="70" y="203" fontSize="16" fill="#111827">(-3,0)</text>
      <text x="185" y="78" fontSize="16" fill="#111827">(0,9)</text>
      <text x="214" y="203" fontSize="16" fill="#111827">(3,0)</text>
    </svg>
  );
}

function isAbsoluteParabolaFigure(figure: string) {
  return figure.includes("(-3,0)") && figure.includes("(0,9)") && figure.includes("(3,0)");
}

function visibleOptions(options: string[]) {
  return options.map((option) => option.trim()).filter(Boolean);
}

function splitPromptAndFigure(prompt: string): { text: string; figure: string | null } {
  const match = prompt.match(/\n*\[Figure:\s*([\s\S]+?)\]\s*$/);
  if (!match) {
    return { text: prompt, figure: null };
  }
  const text = prompt.slice(0, match.index).trimEnd();
  return { text, figure: match[1].trim() };
}

function formatTime(totalSeconds: number) {
  const safe = Math.max(0, totalSeconds);
  const hours = Math.floor(safe / 3600);
  const minutes = Math.floor((safe % 3600) / 60);
  const seconds = safe % 60;
  return [hours, minutes, seconds]
    .map((value) => value.toString().padStart(2, "0"))
    .join(":");
}

function truncateSingleLine(value: string, maxLength: number) {
  const normalized = value.replace(/\s+/g, " ").trim();
  if (normalized.length <= maxLength) return normalized;
  return normalized.slice(0, maxLength - 1) + "…";
}

function StatTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-base)] px-4 py-3">
      <p className="text-[11px] uppercase tracking-wide text-[var(--text-muted)]">{label}</p>
      <p className="mt-1 text-sm font-semibold text-[var(--text-primary)]">{value}</p>
    </div>
  );
}
