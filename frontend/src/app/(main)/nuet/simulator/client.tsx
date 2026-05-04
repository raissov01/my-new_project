"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { AlertCircle, ArrowLeft, CheckCircle2, Clock3, ExternalLink, FileText, Loader2, Trophy } from "lucide-react";
import { useLocale } from "@/components/providers/locale-provider";
import { Button } from "@/components/ui/button";
import {
  abandonNUETAttempt,
  autosaveNUETAttempt,
  completeNUETAttempt,
  startNUETAttempt,
  type NUETAttemptActionResult,
} from "./actions";

type NUETPDFTest = {
  id: string;
  name: string;
  testType: "trial_test" | "mock_test";
  pdfPath: string;
  mathCount: number;
  ctCount: number;
  questionCount: number;
  answerKeyCount: number;
  isScorable: boolean;
};

type Stage = "configure" | "starting" | "exam" | "submitting" | "results";

const answerChoices = ["A", "B", "C", "D", "E"] as const;

export function NUETSimulatorClient({ tests }: { tests: NUETPDFTest[] }) {
  const { t } = useLocale();
  const [stage, setStage] = useState<Stage>("configure");
  const [selectedTestId, setSelectedTestId] = useState<string>(tests[0]?.id ?? "");
  const [attemptId, setAttemptId] = useState<string | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [timeTakenSecs, setTimeTakenSecs] = useState(0);
  const [result, setResult] = useState<NUETAttemptActionResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [autosaveLabel, setAutosaveLabel] = useState<string>("");
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pendingSaveRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mountedRef = useRef(true);

  const selectedTest = tests.find((item) => item.id === selectedTestId) ?? null;
  const totalQuestions = selectedTest?.questionCount ?? 60;
  const mathCount = selectedTest?.mathCount ?? 30;

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (pendingSaveRef.current) clearTimeout(pendingSaveRef.current);
    };
  }, []);

  useEffect(() => {
    if (stage !== "exam") {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }
    intervalRef.current = setInterval(() => {
      setTimeTakenSecs((current) => current + 1);
    }, 1000);
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [stage]);

  useEffect(() => {
    if (stage !== "exam" || !attemptId) {
      return;
    }
    if (pendingSaveRef.current) {
      clearTimeout(pendingSaveRef.current);
    }
    pendingSaveRef.current = setTimeout(() => {
      void autosaveNUETAttempt(attemptId, {
        answers,
        timeTakenSecs,
      })
        .then(() => {
          if (!mountedRef.current) return;
          setAutosaveLabel("Saved");
          window.setTimeout(() => {
            if (mountedRef.current) setAutosaveLabel("");
          }, 1200);
        })
        .catch(() => {
          if (mountedRef.current) setAutosaveLabel("Save failed");
        });
    }, 800);

    return () => {
      if (pendingSaveRef.current) {
        clearTimeout(pendingSaveRef.current);
      }
    };
  }, [answers, attemptId, stage, timeTakenSecs]);

  async function handleStart() {
    if (!selectedTest) {
      return;
    }
    setStage("starting");
    setError(null);
    setAnswers({});
    setTimeTakenSecs(0);
    setResult(null);

    try {
      const attempt = await startNUETAttempt({
        attemptType: "pdf_test",
        pdfTestId: selectedTest.id,
        section: "full",
      });
      if (!mountedRef.current) return;
      setAttemptId(attempt.id);
      setStage("exam");
    } catch (err) {
      if (!mountedRef.current) return;
      setError(err instanceof Error ? err.message : "Failed to start attempt");
      setStage("configure");
    }
  }

  async function handleSubmit() {
    if (!attemptId) {
      return;
    }
    setStage("submitting");
    setError(null);

    try {
      const completed = await completeNUETAttempt(attemptId, {
        answers,
        timeTakenSecs,
      });
      if (!mountedRef.current) return;
      setResult(completed);
      setStage("results");
    } catch (err) {
      if (!mountedRef.current) return;
      setError(err instanceof Error ? err.message : "Failed to submit attempt");
      setStage("exam");
    }
  }

  async function handleBackToConfig() {
    if (attemptId && stage === "exam") {
      try {
        await abandonNUETAttempt(attemptId);
      } catch {
        // Ignore cleanup failures; the user can still continue.
      }
    }
    if (!mountedRef.current) return;
    setAttemptId(null);
    setAnswers({});
    setTimeTakenSecs(0);
    setResult(null);
    setError(null);
    setAutosaveLabel("");
    setStage("configure");
  }

  function updateAnswer(question: number, letter: string) {
    setAnswers((current) => ({ ...current, [String(question)]: letter }));
  }

  if (tests.length === 0) {
    return (
      <div className="mt-6 rounded-2xl border border-dashed border-[var(--border)] bg-[var(--bg-surface)] p-6 text-sm text-[var(--text-secondary)]">
        NUET PDF tests are not seeded yet. Run `go run ./cmd/seed-nuet-pdf-tests ./nuet-materials/files` from `backend/`.
      </div>
    );
  }

  if (stage === "configure" || stage === "starting") {
    return (
      <div className="mt-6 grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <section className="rounded-2xl border border-[var(--border)] bg-[var(--bg-surface)] p-5">
          <div className="flex items-center gap-2 text-sm font-semibold text-[var(--text-primary)]">
            <FileText className="h-4 w-4 text-[var(--primary)]" />
            PDF test library
          </div>
          <div className="mt-4 grid gap-3">
            {tests.map((test) => {
              const active = test.id === selectedTestId;
              return (
                <button
                  key={test.id}
                  type="button"
                  onClick={() => setSelectedTestId(test.id)}
                  className={`rounded-xl border p-4 text-left transition ${
                    active
                      ? "border-[var(--primary)] bg-[var(--primary-soft)]"
                      : "border-[var(--border)] bg-[var(--bg-base)] hover:border-[var(--primary)]"
                  }`}
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className="text-sm font-semibold text-[var(--text-primary)]">{test.name}</p>
                      <p className="mt-1 text-xs text-[var(--text-secondary)]">
                        {test.testType === "mock_test" ? "Mock test" : "Trial test"} · {test.questionCount} questions
                      </p>
                    </div>
                    <span
                      className={`rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-widest ${
                        test.isScorable
                          ? "bg-emerald-100 text-emerald-700"
                          : "bg-amber-100 text-amber-700"
                      }`}
                    >
                      {test.isScorable ? "Scored" : "Practice only"}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </section>

        <aside className="rounded-2xl border border-[var(--border)] bg-[var(--bg-surface)] p-5">
          {selectedTest ? (
            <>
              <p className="font-mono text-[10px] uppercase tracking-widest text-[var(--text-muted)]">
                Selected test
              </p>
              <h2 className="mt-2 text-xl font-bold text-[var(--text-primary)]">{selectedTest.name}</h2>
              <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                <InfoTile label={t("nuet.sectionMath")} value={`${selectedTest.mathCount} Q`} />
                <InfoTile label={t("nuet.sectionCT")} value={`${selectedTest.ctCount} Q`} />
                <InfoTile label={t("nuet.statDuration")} value="120 min" />
                <InfoTile label={t("nuet.statMaxScore")} value="240" />
              </div>

              <div className="mt-4 rounded-xl border border-[var(--border)] bg-[var(--bg-base)] p-4 text-sm text-[var(--text-secondary)]">
                {selectedTest.isScorable ? (
                  <p>Answer key detected for all questions. Your score will be checked automatically on submit.</p>
                ) : (
                  <p>
                    This PDF can still be used for timed practice, but the stored answer key only covers {selectedTest.answerKeyCount} / {selectedTest.questionCount} questions right now.
                  </p>
                )}
              </div>

              <div className="mt-5 flex flex-wrap gap-3">
                <a
                  href={`/api/v1/files/${encodeURI(selectedTest.pdfPath)}`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--bg-base)] px-4 py-2 text-sm font-medium text-[var(--text-primary)] hover:bg-[var(--bg-soft)]"
                >
                  <ExternalLink className="h-4 w-4" />
                  Open PDF
                </a>
                <Button onClick={() => void handleStart()} isLoading={stage === "starting"}>
                  Start
                </Button>
              </div>
            </>
          ) : null}

          {error ? (
            <p className="mt-4 flex items-start gap-2 text-sm text-rose-600">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              {error}
            </p>
          ) : null}
        </aside>
      </div>
    );
  }

  if (stage === "results" && result && selectedTest) {
    const answeredCount = Object.values(answers).filter(Boolean).length;
    return (
      <div className="mt-6 space-y-6">
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-surface)] p-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="font-mono text-[10px] uppercase tracking-widest text-[var(--text-muted)]">Attempt finished</p>
              <h2 className="mt-2 text-2xl font-bold text-[var(--text-primary)]">{selectedTest.name}</h2>
            </div>
            <Trophy className="h-10 w-10 text-[var(--primary)]" />
          </div>

          <div className="mt-6 grid gap-3 sm:grid-cols-4">
            <InfoTile label="Answered" value={`${answeredCount}/${totalQuestions}`} />
            <InfoTile label={t("nuet.sectionMath")} value={`${result.scoreMath}/120`} />
            <InfoTile label={t("nuet.sectionCT")} value={`${result.scoreCt}/120`} />
            <InfoTile label="Total" value={`${result.scoreTotal}/240`} />
          </div>

          <div className="mt-4 rounded-xl border border-[var(--border)] bg-[var(--bg-base)] p-4 text-sm text-[var(--text-secondary)]">
            {result.scoreAvailable ? (
              <p>Automatic scoring completed. Review the section breakdown below.</p>
            ) : (
              <p>{result.scoreReason || "Answers were saved, but this PDF does not have a complete answer key yet."}</p>
            )}
          </div>

          <div className="mt-5 flex flex-wrap gap-3">
            <Button onClick={() => void handleBackToConfig()}>Choose another test</Button>
            <Link
              href="/nuet/dashboard"
              className="inline-flex items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--bg-base)] px-4 py-2 text-sm font-medium text-[var(--text-primary)] hover:bg-[var(--bg-soft)]"
            >
              Go to dashboard
            </Link>
          </div>
        </div>

        {result.scoreAvailable && result.evaluations?.length ? (
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-surface)] p-5">
            <h3 className="text-lg font-semibold text-[var(--text-primary)]">Answer review</h3>
            <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {result.evaluations.map((item) => (
                <div
                  key={item.question}
                  className={`rounded-xl border p-3 text-sm ${
                    item.correct
                      ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                      : "border-rose-200 bg-rose-50 text-rose-800"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-semibold">Q{item.question}</span>
                    {item.correct ? <CheckCircle2 className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
                  </div>
                  <p className="mt-2 text-xs uppercase tracking-wide">
                    {item.section === "math" ? t("nuet.sectionMath") : t("nuet.sectionCT")}
                  </p>
                  <p className="mt-1">Your answer: {item.received || "—"}</p>
                  <p>Correct: {item.expected}</p>
                </div>
              ))}
            </div>
          </div>
        ) : null}
      </div>
    );
  }

  const remainingSecs = Math.max(0, 120 * 60 - timeTakenSecs);
  const answeredCount = Object.values(answers).filter(Boolean).length;

  return (
    <div className="mt-6 space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[var(--border)] bg-[var(--bg-surface)] p-4">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => void handleBackToConfig()}
            className="inline-flex items-center gap-2 text-sm text-[var(--text-muted)] hover:text-[var(--text-primary)]"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </button>
          <div>
            <p className="text-sm font-semibold text-[var(--text-primary)]">{selectedTest?.name}</p>
            <p className="text-xs text-[var(--text-secondary)]">
              {selectedTest?.testType === "mock_test" ? "Mock test" : "Trial test"} · {answeredCount}/{totalQuestions} answered
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="rounded-full border border-[var(--border)] bg-[var(--bg-base)] px-3 py-1.5 text-sm font-semibold text-[var(--text-primary)]">
            <Clock3 className="mr-1 inline h-4 w-4" />
            {formatTime(remainingSecs)}
          </div>
          {autosaveLabel ? (
            <span className="text-xs text-[var(--text-muted)]">{autosaveLabel}</span>
          ) : null}
        </div>
      </div>

      {!selectedTest?.isScorable ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          Automatic scoring is not complete for this PDF yet. Your answers will still be saved when you submit.
        </div>
      ) : null}

      {error ? (
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
          {error}
        </div>
      ) : null}

      <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-surface)] p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-[var(--text-primary)]">Answer sheet</h2>
            <p className="mt-1 text-sm text-[var(--text-secondary)]">
              Fill every question directly here while keeping the source PDF open in another tab.
            </p>
          </div>
          {selectedTest ? (
            <a
              href={`/api/v1/files/${encodeURI(selectedTest.pdfPath)}`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--bg-base)] px-4 py-2 text-sm font-medium text-[var(--text-primary)] hover:bg-[var(--bg-soft)]"
            >
              <ExternalLink className="h-4 w-4" />
              Open PDF
            </a>
          ) : null}
        </div>

        <div className="mt-6 space-y-6">
          <QuestionSection
            title={t("nuet.sectionMath")}
            from={1}
            to={mathCount}
            answers={answers}
            onChange={updateAnswer}
          />
          <QuestionSection
            title={t("nuet.sectionCT")}
            from={mathCount + 1}
            to={totalQuestions}
            answers={answers}
            onChange={updateAnswer}
          />
        </div>

        <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-[var(--border)] pt-5">
          <p className="text-sm text-[var(--text-secondary)]">
            {answeredCount} / {totalQuestions} questions answered
          </p>
          <Button onClick={() => void handleSubmit()} isLoading={stage === "submitting"}>
            {stage === "submitting" ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Submit attempt
          </Button>
        </div>
      </div>
    </div>
  );
}

function QuestionSection({
  title,
  from,
  to,
  answers,
  onChange,
}: {
  title: string;
  from: number;
  to: number;
  answers: Record<string, string>;
  onChange: (question: number, letter: string) => void;
}) {
  return (
    <section>
      <div className="mb-3 flex items-center justify-between gap-2">
        <h3 className="text-base font-semibold text-[var(--text-primary)]">{title}</h3>
        <span className="font-mono text-[10px] uppercase tracking-widest text-[var(--text-muted)]">
          Q{from} - Q{to}
        </span>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: to - from + 1 }, (_, index) => {
          const question = from + index;
          const selected = answers[String(question)] || "";
          return (
            <div key={question} className="rounded-xl border border-[var(--border)] bg-[var(--bg-base)] p-3">
              <div className="mb-3 text-sm font-semibold text-[var(--text-primary)]">Question {question}</div>
              <div className="grid grid-cols-5 gap-2">
                {answerChoices.map((letter) => {
                  const active = selected === letter;
                  return (
                    <button
                      key={letter}
                      type="button"
                      onClick={() => onChange(question, letter)}
                      className={`aspect-square rounded-lg border text-sm font-semibold transition ${
                        active
                          ? "border-[var(--primary)] bg-[var(--primary)] text-white"
                          : "border-[var(--border)] bg-[var(--bg-surface)] text-[var(--text-primary)] hover:bg-[var(--bg-soft)]"
                      }`}
                    >
                      {letter}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function InfoTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-base)] p-3">
      <p className="font-mono text-[10px] uppercase tracking-widest text-[var(--text-muted)]">{label}</p>
      <p className="mt-1 text-lg font-semibold text-[var(--text-primary)]">{value}</p>
    </div>
  );
}

function formatTime(totalSeconds: number): string {
  const mins = Math.floor(totalSeconds / 60);
  const secs = totalSeconds % 60;
  return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
}
