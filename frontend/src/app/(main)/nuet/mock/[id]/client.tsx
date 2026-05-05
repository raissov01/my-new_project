"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AlertCircle, ArrowLeft, ArrowRight, CheckCircle2, Clock3, Flag, Loader2 } from "lucide-react";
import { InlineMath, BlockMath } from "react-katex";
import "katex/dist/katex.min.css";
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
                    <div>
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
                    <div className="mt-3 border-t border-[var(--border)] pt-3 text-sm text-[var(--text-secondary)]">
                      <p>{item.explanation || "No explanation provided."}</p>
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
    <div className="mt-6 grid gap-5 lg:grid-cols-[290px_1fr]">
      <aside className="space-y-4 rounded-2xl border border-[var(--border)] bg-[var(--bg-surface)] p-4">
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm font-medium text-[var(--text-primary)]">{testName}</p>
          <div className="rounded-full border border-[var(--border)] bg-[var(--bg-base)] px-3 py-1.5 text-sm font-semibold text-[var(--text-primary)]">
            <Clock3 className="mr-1 inline h-4 w-4" />
            {formatTime(timeLeft)}
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
          <StatTile label="Answered" value={`${answeredCount}/60`} />
          <StatTile label="Marked" value={String(marked.size)} />
        </div>

        {saveLabel ? <p className="text-xs text-[var(--text-muted)]">{saveLabel}</p> : null}
        {error ? <p className="text-xs text-amber-700">{error}</p> : null}

        <div className="grid grid-cols-10 gap-2">
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
                onClick={() => setCurrentIndex(index)}
                className={`aspect-square rounded-md border text-xs font-semibold transition ${baseClass} ${activeClass}`}
              >
                {index + 1}
              </button>
            );
          })}
        </div>
      </aside>

      <section className="rounded-2xl border border-[var(--border)] bg-[var(--bg-surface)] p-6">
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
                className={`inline-flex items-center gap-2 rounded-full border px-3 py-2 text-sm ${
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

            <div className="mt-8 flex flex-wrap items-center justify-between gap-3">
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
    </div>
  );
}

function QuestionPrompt({ prompt }: { prompt: string }) {
  const { text, figure } = splitPromptAndFigure(prompt);
  return (
    <div className="mt-5">
      <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-base)] p-4 text-base leading-8 text-[var(--text-primary)]">
        <MathText text={text} />
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
      <div>
        <CoordinateGraph />
        <p className="mt-2 text-xs leading-5 text-amber-800">{figure}</p>
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
    <svg viewBox="0 0 320 220" role="img" aria-label="Coordinate graph through (-3,0), (0,9), and (3,0)" className="h-56 w-full max-w-md rounded-lg bg-white">
      <line x1="35" y1="170" x2="290" y2="170" stroke="#111827" strokeWidth="2" />
      <line x1="160" y1="20" x2="160" y2="200" stroke="#111827" strokeWidth="2" />
      <path d="M285 170 L274 164 M285 170 L274 176 M160 20 L154 31 M160 20 L166 31" fill="none" stroke="#111827" strokeWidth="2" />
      <path d="M45 20 C58 88 82 145 100 170" fill="none" stroke="#111827" strokeWidth="3" />
      <path d="M100 170 C122 78 198 78 220 170" fill="none" stroke="#111827" strokeWidth="3" />
      <path d="M220 170 C238 145 262 88 275 20" fill="none" stroke="#111827" strokeWidth="3" />
      <circle cx="100" cy="170" r="4" fill="#111827" />
      <circle cx="160" cy="70" r="4" fill="#111827" />
      <circle cx="220" cy="170" r="4" fill="#111827" />
      <text x="284" y="190" fontSize="16" fill="#111827">x</text>
      <text x="172" y="34" fontSize="16" fill="#111827">y</text>
      <text x="75" y="194" fontSize="15" fill="#111827">(-3,0)</text>
      <text x="174" y="64" fontSize="15" fill="#111827">(0,9)</text>
      <text x="202" y="194" fontSize="15" fill="#111827">(3,0)</text>
    </svg>
  );
}

function isAbsoluteParabolaFigure(figure: string) {
  return figure.includes("(-3,0)") && figure.includes("(0,9)") && figure.includes("(3,0)");
}

function MathText({ text }: { text: string }) {
  const safeText = protectCurrencyDollars(text);
  const parts = safeText.split(/(\$\$[\s\S]+?\$\$|\$[^$\n]+\$|\\\([\s\S]+?\\\)|\\\[[\s\S]+?\\\])/g).filter(Boolean);
  return (
    <div className="whitespace-pre-wrap">
      {parts.map((part, index) => {
        if (part.startsWith("$$") && part.endsWith("$$")) {
          return (
            <BlockMath
              key={`block-${index}`}
              math={part.slice(2, -2)}
              renderError={() => <span className="whitespace-pre-wrap">{part}</span>}
            />
          );
        }
        if (part.startsWith("$") && part.endsWith("$")) {
          return (
            <InlineMath
              key={`inline-${index}`}
              math={part.slice(1, -1)}
              renderError={() => <span className="whitespace-pre-wrap">{part}</span>}
            />
          );
        }
        if (part.startsWith("\\(") && part.endsWith("\\)")) {
          return (
            <InlineMath
              key={`inline-paren-${index}`}
              math={part.slice(2, -2)}
              renderError={() => <span className="whitespace-pre-wrap">{part}</span>}
            />
          );
        }
        if (part.startsWith("\\[") && part.endsWith("\\]")) {
          return (
            <BlockMath
              key={`block-bracket-${index}`}
              math={part.slice(2, -2)}
              renderError={() => <span className="whitespace-pre-wrap">{part}</span>}
            />
          );
        }
        return <span key={`text-${index}`}>{restoreCurrencyDollars(part)}</span>;
      })}
    </div>
  );
}

function visibleOptions(options: string[]) {
  return options.map((option) => option.trim()).filter(Boolean);
}

function protectCurrencyDollars(text: string) {
  return text.replace(/\$(?=\d)/g, "__NUET_DOLLAR__");
}

function restoreCurrencyDollars(text: string) {
  return text.replace(/__NUET_DOLLAR__/g, "$");
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
