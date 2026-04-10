"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  Clock3,
  Loader2,
  MessageSquareQuote,
  Mic,
  RotateCcw,
  Sparkles,
  Target,
} from "lucide-react";
import { useLocale } from "@/components/providers/locale-provider";
import { Button } from "@/components/ui/button";
import { SpeakingRecorderPanel } from "@/features/ielts/components/speaking-recorder-panel";
import type { IELTSQuestion } from "@/features/ielts/api";
import { fetchIELTSQuestions } from "@/features/ielts/api";
import { evaluateSpeaking, type SpeakingResult } from "./actions";

type Phase = "select" | "practice" | "evaluating" | "results";
type PartKey = "part1" | "part2" | "part3";

const PART_DURATIONS: Record<PartKey, number> = {
  part1: 5 * 60,
  part2: 2 * 60,
  part3: 5 * 60,
};

export function SpeakingPracticeClient() {
  const { t } = useLocale();
  const [phase, setPhase] = useState<Phase>("select");
  const [part, setPart] = useState<PartKey>("part1");
  const [mockType, setMockType] = useState<"all" | IELTSQuestion["mockType"]>("all");
  const [difficulty, setDifficulty] = useState<"all" | IELTSQuestion["difficulty"]>("all");
  const [topic, setTopic] = useState("all");
  const [bandTarget, setBandTarget] = useState("all");
  const [questions, setQuestions] = useState<IELTSQuestion[]>([]);
  const [loadingQuestions, setLoadingQuestions] = useState(true);
  const [loadingError, setLoadingError] = useState<string | null>(null);
  const [activeQuestion, setActiveQuestion] = useState<IELTSQuestion | null>(null);
  const [currentPrompt, setCurrentPrompt] = useState("");
  const [cuePoints, setCuePoints] = useState<string[]>([]);
  const [transcript, setTranscript] = useState("");
  const [result, setResult] = useState<SpeakingResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [timeLeft, setTimeLeft] = useState(0);
  const [prepTime, setPrepTime] = useState(0);
  const [activeFollowUps, setActiveFollowUps] = useState<string[]>([]);
  const [progressMessage, setProgressMessage] = useState("");
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const stopTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  useEffect(() => () => stopTimer(), [stopTimer]);

  useEffect(() => {
    if (phase !== "evaluating") {
      setProgressMessage("");
      return;
    }

    setProgressMessage(t("ielts.speakEvalStep1"));

    const t1 = setTimeout(() => setProgressMessage(t("ielts.evalStep2")), 5000);
    const t2 = setTimeout(() => setProgressMessage(t("ielts.evalStep3")), 15000);
    const t3 = setTimeout(() => setProgressMessage(t("ielts.evalStep4")), 30000);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, [phase, t]);

  useEffect(() => {
    let cancelled = false;

    async function loadQuestions() {
      setLoadingQuestions(true);
      setLoadingError(null);

      try {
        const response = await fetchIELTSQuestions({
          section: "speaking",
          limit: 120,
        });

        if (!cancelled) {
          setQuestions(response.items ?? []);
        }
      } catch (loadError) {
        if (!cancelled) {
          setLoadingError(
            loadError instanceof Error
              ? loadError.message
              : "Failed to load speaking prompts."
          );
        }
      } finally {
        if (!cancelled) {
          setLoadingQuestions(false);
        }
      }
    }

    void loadQuestions();

    return () => {
      cancelled = true;
    };
  }, []);

  const filteredQuestions = useMemo(() => {
    return questions.filter((question) => {
      if (question.questionType !== part) return false;
      if (mockType !== "all" && question.mockType !== mockType) return false;
      if (difficulty !== "all" && question.difficulty !== difficulty) return false;
      if (topic !== "all" && question.topic !== topic) return false;
      if (bandTarget !== "all" && question.bandTarget !== bandTarget) return false;
      return true;
    });
  }, [bandTarget, difficulty, mockType, part, questions, topic]);

  const topics = useMemo(
    () =>
      Array.from(
        new Set(
          questions
            .filter((question) => question.questionType === part)
            .map((question) => question.topic)
            .filter(Boolean)
        )
      ).sort(),
    [part, questions]
  );

  const bands = useMemo(
    () =>
      Array.from(
        new Set(
          questions
            .filter((question) => question.questionType === part)
            .map((question) => question.bandTarget)
            .filter((item): item is string => Boolean(item))
        )
      ).sort(),
    [part, questions]
  );

  const startMainTimer = useCallback(
    (duration: number) => {
      stopTimer();
      setTimeLeft(duration);
      timerRef.current = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            stopTimer();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    },
    [stopTimer]
  );

  const beginPrompt = useCallback(
    (question: IELTSQuestion, overridePrompt?: string) => {
      const prompt = (overridePrompt ?? question.prompt).trim();
      const nextCuePoints =
        question.questionType === "part2" ? parseCuePoints(question.content) : [];

      setActiveQuestion(question);
      setCurrentPrompt(prompt);
      setCuePoints(nextCuePoints);
      setTranscript("");
      setResult(null);
      setError(null);
      setActiveFollowUps([]);
      setPhase("practice");

      if (question.questionType === "part2") {
        stopTimer();
        setPrepTime(60);
        setTimeLeft(PART_DURATIONS.part2);
        timerRef.current = setInterval(() => {
          setPrepTime((prev) => {
            if (prev <= 1) {
              stopTimer();
              setPrepTime(0);
              startMainTimer(PART_DURATIONS.part2);
              return 0;
            }
            return prev - 1;
          });
        }, 1000);
        return;
      }

      setPrepTime(0);
      startMainTimer(PART_DURATIONS[question.questionType as PartKey]);
    },
    [startMainTimer, stopTimer]
  );

  async function handleSubmit() {
    if (!activeQuestion) {
      setError("Choose a speaking prompt first.");
      return;
    }

    if (!transcript.trim()) {
      setError(t("ielts.sp.errorEmpty"));
      return;
    }

    stopTimer();
    setError(null);
    setPhase("evaluating");

    const { result: response, error: submitError } = await evaluateSpeaking(
      activeQuestion.questionType,
      currentPrompt,
      transcript
    );

    if (submitError) {
      setError(t("ielts.evalError"));
      setPhase("practice");
      return;
    }

    setResult(response ?? null);
    setActiveFollowUps(extractFollowUps(response?.feedback));
    setPhase("results");
  }

  function handleRetry() {
    setError(null);
  }

  function handleReset() {
    stopTimer();
    setPhase("select");
    setActiveQuestion(null);
    setCurrentPrompt("");
    setCuePoints([]);
    setTranscript("");
    setResult(null);
    setError(null);
    setPrepTime(0);
    setTimeLeft(0);
    setActiveFollowUps([]);
  }

  function handleFollowUp(nextPrompt: string) {
    if (!activeQuestion || !nextPrompt.trim()) {
      return;
    }

    const followUpQuestion: IELTSQuestion = {
      ...activeQuestion,
      id: `${activeQuestion.id}-follow-up-${nextPrompt}`,
      prompt: nextPrompt.trim(),
      questionType: "part3",
      title: "Examiner follow-up",
    };

    setPart("part3");
    void beginPrompt(followUpQuestion, nextPrompt);
  }

  const formatTime = (secs: number) =>
    `${Math.floor(secs / 60)}:${(secs % 60).toString().padStart(2, "0")}`;

  if (phase === "select") {
    return (
      <div className="space-y-6">
        <div className="grid gap-4 rounded-[1.75rem] border border-[var(--border)] bg-[var(--bg-elevated)] p-5 shadow-[var(--surface-shadow)] lg:grid-cols-5">
          <FilterSelect
            label="Speaking part"
            value={part}
            onChange={(value) => setPart(value as PartKey)}
            options={[
              { value: "part1", label: t("ielts.speakingPart1") },
              { value: "part2", label: t("ielts.speakingPart2") },
              { value: "part3", label: t("ielts.speakingPart3") },
            ]}
          />
          <FilterSelect
            label="Question source"
            value={mockType}
            onChange={(value) =>
              setMockType(value as "all" | IELTSQuestion["mockType"])
            }
            options={[
              { value: "all", label: "All" },
              { value: "original", label: "Practice" },
              { value: "cambridge_style", label: "Cambridge" },
              { value: "predictions", label: "Predictions" },
            ]}
          />
          <FilterSelect
            label="Topic"
            value={topic}
            onChange={setTopic}
            options={[
              { value: "all", label: "All topics" },
              ...topics.map((item) => ({ value: item, label: item })),
            ]}
          />
          <FilterSelect
            label="Difficulty"
            value={difficulty}
            onChange={(value) =>
              setDifficulty(value as "all" | IELTSQuestion["difficulty"])
            }
            options={[
              { value: "all", label: "All" },
              { value: "easy", label: "Easy" },
              { value: "medium", label: "Medium" },
              { value: "hard", label: "Hard" },
            ]}
          />
          <FilterSelect
            label="Band level"
            value={bandTarget}
            onChange={setBandTarget}
            options={[
              { value: "all", label: "All bands" },
              ...bands.map((item) => ({ value: item, label: `Band ${item}` })),
            ]}
          />
        </div>

        <div className="rounded-[1.75rem] border border-[var(--border)] bg-[var(--bg-elevated)] p-5 shadow-[var(--surface-shadow)]">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-base font-semibold text-[var(--text-primary)]">
                Dynamic speaking pool
              </h3>
              <p className="mt-1 text-sm text-[var(--text-secondary)]">
                Pick a question by part, topic, difficulty, and target band from the IELTS question bank.
              </p>
            </div>
            <span className="rounded-full border border-violet-500/20 bg-violet-500/10 px-3 py-1.5 text-xs font-medium text-violet-400">
              {filteredQuestions.length} prompts
            </span>
          </div>

          {loadingQuestions ? (
            <div className="mt-5 space-y-3">
              {Array.from({ length: 4 }).map((_, index) => (
                <div
                  key={index}
                  className="h-28 animate-pulse rounded-2xl border border-[var(--border)] bg-[var(--bg-surface)]"
                />
              ))}
            </div>
          ) : loadingError ? (
            <div className="mt-5">
              <ErrorBanner message={loadingError} />
            </div>
          ) : filteredQuestions.length > 0 ? (
            <div className="mt-5 space-y-3">
              {filteredQuestions.map((question) => {
                const nextCuePoints =
                  question.questionType === "part2"
                    ? parseCuePoints(question.content)
                    : [];

                return (
                  <button
                    key={question.id}
                    onClick={() => beginPrompt(question)}
                    className="w-full rounded-2xl border border-[var(--border)] bg-[var(--bg-surface)] p-4 text-left transition-all hover:border-violet-500/30 hover:bg-violet-500/5"
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-full border border-[var(--border)] bg-[var(--bg-elevated)] px-2.5 py-1 text-[11px] font-medium uppercase tracking-[0.14em] text-[var(--text-muted)]">
                        {question.mockType.replace("_", " ")}
                      </span>
                      <span className="rounded-full border border-[var(--border)] bg-[var(--bg-elevated)] px-2.5 py-1 text-[11px] font-medium uppercase tracking-[0.14em] text-[var(--text-muted)]">
                        {question.difficulty}
                      </span>
                      {question.bandTarget ? (
                        <span className="rounded-full border border-violet-500/20 bg-violet-500/10 px-2.5 py-1 text-[11px] font-medium text-violet-400">
                          Band {question.bandTarget}
                        </span>
                      ) : null}
                      {question.topic ? (
                        <span className="rounded-full border border-[var(--border)] px-2.5 py-1 text-[11px] font-medium text-[var(--text-secondary)]">
                          {question.topic}
                        </span>
                      ) : null}
                    </div>

                    <p className="mt-3 text-sm font-semibold text-[var(--text-primary)]">
                      {question.title}
                    </p>
                    <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
                      {question.prompt}
                    </p>

                    {nextCuePoints.length > 0 ? (
                      <ul className="mt-3 grid gap-1 sm:grid-cols-2">
                        {nextCuePoints.map((item, index) => (
                          <li
                            key={`${question.id}-cue-${index}`}
                            className="flex items-start gap-2 text-xs text-[var(--text-muted)]"
                          >
                            <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-violet-400" />
                            {item}
                          </li>
                        ))}
                      </ul>
                    ) : null}

                    <div className="mt-4 flex items-center gap-1.5 text-sm font-medium text-violet-400">
                      {t("ielts.sp.startPractice")}
                      <ArrowRight className="h-4 w-4" />
                    </div>
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="mt-5 rounded-2xl border border-dashed border-[var(--border)] bg-[var(--bg-surface)] px-5 py-8 text-center">
              <Target className="mx-auto h-6 w-6 text-[var(--text-muted)]" />
              <p className="mt-3 text-sm font-medium text-[var(--text-primary)]">
                No prompts match the current filters
              </p>
              <p className="mt-1 text-sm text-[var(--text-secondary)]">
                Try another topic, band, difficulty, or question source.
              </p>
            </div>
          )}
        </div>

        {error ? <ErrorBanner message={error} /> : null}
      </div>
    );
  }

  if (phase === "practice" && activeQuestion) {
    return (
      <div className="space-y-4">
        <div className="rounded-2xl border border-violet-500/20 bg-violet-500/5 p-5">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-medium uppercase tracking-wider text-violet-400">
              {part === "part1"
                ? t("ielts.speakingPart1")
                : part === "part2"
                  ? t("ielts.speakingPart2")
                  : t("ielts.speakingPart3")}
            </span>
            {activeQuestion.topic ? (
              <span className="rounded-full border border-violet-500/20 bg-violet-500/10 px-2.5 py-1 text-[11px] font-medium text-violet-300">
                {activeQuestion.topic}
              </span>
            ) : null}
          </div>

          <h3 className="mt-3 text-base font-semibold text-[var(--text-primary)]">
            {activeQuestion.title}
          </h3>

          {cuePoints.length > 0 && prepTime > 0 ? (
            <div className="mt-3">
              <p className="text-sm font-medium text-[var(--text-primary)]">
                {currentPrompt}
              </p>
              <p className="mt-2 text-xs text-[var(--text-muted)]">
                {t("ielts.sp.youShouldSay")}
              </p>
              <ul className="mt-2 space-y-1.5">
                {cuePoints.map((item, index) => (
                  <li
                    key={`cue-${index}`}
                    className="flex items-start gap-2 text-sm text-[var(--text-secondary)]"
                  >
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-violet-400" />
                    {item}
                  </li>
                ))}
              </ul>
              <div className="mt-4 flex items-center gap-2 text-sm font-medium text-amber-400">
                <Clock3 className="h-4 w-4" />
                {t("ielts.sp.prepTime")}: {formatTime(prepTime)}
              </div>
            </div>
          ) : (
            <p className="mt-2 text-sm leading-6 text-[var(--text-primary)]">
              {currentPrompt}
            </p>
          )}
        </div>

        {(prepTime === 0 || activeQuestion.questionType !== "part2") && (
          <>
            <div className="flex items-center justify-between rounded-2xl border border-[var(--border)] bg-[var(--bg-surface)] px-4 py-3">
              <span
                className={`flex items-center gap-1.5 text-sm font-medium ${
                  timeLeft < 30 ? "text-red-400" : "text-[var(--text-secondary)]"
                }`}
              >
                <Clock3 className="h-4 w-4" />
                {formatTime(timeLeft)}
              </span>
              <Button onClick={handleSubmit} size="sm" disabled={!transcript.trim()}>
                <Sparkles className="h-4 w-4" />
                {t("ielts.sp.getEvaluation")}
              </Button>
            </div>

            <SpeakingRecorderPanel onUseTranscript={setTranscript} />

            <div>
              <label className="mb-2 flex items-center gap-2 text-sm font-medium text-[var(--text-primary)]">
                <Mic className="h-4 w-4 text-[var(--text-muted)]" />
                {t("ielts.sp.yourResponse")}
              </label>
              <textarea
                value={transcript}
                onChange={(event) => setTranscript(event.target.value)}
                rows={10}
                autoFocus
                placeholder={t("ielts.sp.responsePlaceholder")}
                className="w-full rounded-2xl border border-[var(--border)] bg-[var(--bg-elevated)] px-5 py-4 text-sm leading-7 text-[var(--text-primary)] outline-none placeholder:text-[var(--text-muted)] focus:border-violet-400 focus:ring-2 focus:ring-violet-500/50"
              />
            </div>
          </>
        )}

        {error ? (
          <div className="space-y-3">
            <ErrorBanner message={error} />
            <Button onClick={handleRetry} variant="outline" size="sm">
              <RotateCcw className="h-4 w-4" />
              {t("ielts.retryBtn")}
            </Button>
          </div>
        ) : null}
      </div>
    );
  }

  if (phase === "evaluating") {
    return (
      <div className="flex flex-col items-center justify-center rounded-2xl border border-[var(--border)] bg-[var(--bg-elevated)] px-6 py-20 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-gradient-to-br from-violet-500 to-fuchsia-600 shadow-lg shadow-violet-500/25">
          <Loader2 className="h-8 w-8 animate-spin text-white" />
        </div>
        <h2 className="mt-6 text-xl font-semibold text-[var(--text-primary)]">
          {t("ielts.sp.evaluating")}
        </h2>
        <p className="mt-2 text-sm text-[var(--text-secondary)]">
          {progressMessage || t("ielts.sp.evaluatingHint")}
        </p>
      </div>
    );
  }

  if (phase === "results" && result) {
    const criteria = [
      {
        label: t("ielts.sp.fluency"),
        score: result.fluencyCoherence,
        color: "bg-blue-500",
      },
      {
        label: t("ielts.sp.lexical"),
        score: result.lexicalResource,
        color: "bg-emerald-500",
      },
      {
        label: t("ielts.sp.grammarScore"),
        score: result.grammar,
        color: "bg-violet-500",
      },
      {
        label: t("ielts.sp.pronunciation"),
        score: result.pronunciation,
        color: "bg-amber-500",
      },
    ];

    return (
      <div className="space-y-6">
        <div className="flex flex-col items-center rounded-2xl border border-[var(--border)] bg-[var(--bg-elevated)] p-6 text-center sm:p-8">
          <div className="flex h-24 w-24 items-center justify-center rounded-full border-4 border-violet-500 bg-violet-500/10">
            <span className="text-3xl font-bold text-violet-400">
              {result.overallBand}
            </span>
          </div>
          <h2 className="mt-4 text-xl font-semibold text-[var(--text-primary)]">
            {t("ielts.wr.overallBand")}
          </h2>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          {criteria.map((criterion) => (
            <div
              key={criterion.label}
              className="rounded-2xl border border-[var(--border)] bg-[var(--bg-elevated)] p-4"
            >
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium text-[var(--text-primary)]">
                  {criterion.label}
                </span>
                <span className="text-lg font-bold text-[var(--text-primary)]">
                  {criterion.score}
                </span>
              </div>
              <div className="mt-3 h-2 rounded-full bg-[var(--border)]">
                <div
                  className={`h-full rounded-full ${criterion.color} transition-all`}
                  style={{ width: `${(criterion.score / 9) * 100}%` }}
                />
              </div>
            </div>
          ))}
        </div>

        <FeedbackSection
          icon={CheckCircle2}
          title={t("ielts.wr.strengths")}
          items={result.feedback.strengths}
          color="text-emerald-400"
        />
        <FeedbackSection
          icon={AlertCircle}
          title={t("ielts.wr.weaknesses")}
          items={result.feedback.weaknesses}
          color="text-red-400"
        />
        <FeedbackSection
          icon={Sparkles}
          title={t("ielts.wr.suggestions")}
          items={result.feedback.suggestions}
          color="text-violet-400"
        />
        <FeedbackSection
          icon={Target}
          title="Improvement plan"
          items={result.feedback.improvementPlan ?? []}
          color="text-amber-400"
        />

        {result.feedback.bandExplanation ? (
          <TextPanel
            title="Why this band was awarded"
            body={result.feedback.bandExplanation}
          />
        ) : null}
        {result.feedback.detailedFeedback ? (
          <TextPanel
            title={t("ielts.wr.detailedFeedback")}
            body={result.feedback.detailedFeedback}
          />
        ) : null}
        {result.feedback.rewrittenResponse ? (
          <TextPanel
            title="Improved version of your response"
            body={result.feedback.rewrittenResponse}
          />
        ) : null}
        {result.feedback.modelAnswer ? (
          <TextPanel
            title="Band 7-9 model answer"
            body={result.feedback.modelAnswer}
          />
        ) : null}

        <IssueSection
          title="Grammar highlights"
          items={result.feedback.grammarHighlights ?? []}
          tone="text-red-400"
        />
        <IssueSection
          title="Vocabulary upgrades"
          items={result.feedback.vocabularyHighlights ?? []}
          tone="text-sky-400"
        />

        {activeFollowUps.length > 0 ? (
          <div className="rounded-2xl border border-violet-500/20 bg-violet-500/5 p-5">
            <h3 className="flex items-center gap-2 text-sm font-semibold text-violet-400">
              <MessageSquareQuote className="h-4 w-4" />
              Dynamic examiner follow-ups
            </h3>
            <div className="mt-3 space-y-2">
              {activeFollowUps.map((question, index) => (
                <button
                  key={`${question}-${index}`}
                  onClick={() => handleFollowUp(question)}
                  className="flex w-full items-center justify-between gap-3 rounded-xl border border-[var(--border)] bg-[var(--bg-surface)] px-4 py-3 text-left text-sm text-[var(--text-primary)] transition-all hover:border-violet-500/30 hover:bg-violet-500/5"
                >
                  <span>{question}</span>
                  <ArrowRight className="h-4 w-4 shrink-0 text-violet-400" />
                </button>
              ))}
            </div>
          </div>
        ) : null}

        <div className="flex flex-wrap gap-3">
          <Button onClick={handleReset}>
            <RotateCcw className="h-4 w-4" />
            {t("ielts.wr.tryAgain")}
          </Button>
        </div>
      </div>
    );
  }

  return null;
}

function parseCuePoints(content?: string) {
  if (!content) {
    return [];
  }

  return content
    .split("\n")
    .map((item) => item.trim())
    .filter(Boolean);
}

function extractFollowUps(
  feedback?: SpeakingResult["feedback"]
): string[] {
  if (!feedback) {
    return [];
  }

  const items = [
    ...(feedback.followUpQuestions ?? []),
    feedback.followUpQuestion,
  ]
    .map((item) => item?.trim())
    .filter(Boolean) as string[];

  return Array.from(new Set(items));
}

function FilterSelect({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: Array<{ value: string; label: string }>;
}) {
  return (
    <label>
      <span className="mb-1.5 block text-sm font-medium text-[var(--text-primary)]">
        {label}
      </span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-2xl border border-[var(--border)] bg-[var(--bg-surface)] px-4 py-3 text-sm text-[var(--text-primary)] outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-500/50"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function FeedbackSection({
  icon: Icon,
  title,
  items,
  color,
}: {
  icon: typeof CheckCircle2;
  title: string;
  items: string[];
  color: string;
}) {
  if (!items || items.length === 0) return null;

  return (
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-elevated)] p-5">
      <h3 className={`flex items-center gap-2 text-sm font-semibold ${color}`}>
        <Icon className="h-4 w-4" />
        {title}
      </h3>
      <ul className="mt-3 space-y-2">
        {items.map((item, index) => (
          <li
            key={`${title}-${index}`}
            className="flex items-start gap-2 text-sm leading-6 text-[var(--text-secondary)]"
          >
            <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--text-muted)]" />
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}

function TextPanel({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-elevated)] p-5">
      <h3 className="text-sm font-semibold text-[var(--text-primary)]">{title}</h3>
      <p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-[var(--text-secondary)]">
        {body}
      </p>
    </div>
  );
}

function IssueSection({
  title,
  items,
  tone,
}: {
  title: string;
  items: Array<{
    original: string;
    issue: string;
    suggestion: string;
    explanation: string;
  }>;
  tone: string;
}) {
  if (items.length === 0) return null;

  return (
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-elevated)] p-5">
      <h3 className={`text-sm font-semibold ${tone}`}>{title}</h3>
      <div className="mt-3 space-y-3">
        {items.map((item, index) => (
          <div
            key={`${title}-${index}`}
            className="rounded-xl border border-[var(--border)] bg-[var(--bg-surface)] p-4"
          >
            <p className="text-xs font-medium uppercase tracking-[0.16em] text-[var(--text-muted)]">
              Original
            </p>
            <p className="mt-1 text-sm text-[var(--text-primary)]">{item.original}</p>
            <p className="mt-3 text-xs font-medium uppercase tracking-[0.16em] text-[var(--text-muted)]">
              Fix
            </p>
            <p className="mt-1 text-sm text-[var(--text-primary)]">{item.suggestion}</p>
            <p className="mt-3 text-sm leading-6 text-[var(--text-secondary)]">
              {item.issue}. {item.explanation}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

function ErrorBanner({ message }: { message: string }) {
  return (
    <div className="flex items-start gap-2.5 rounded-2xl border border-red-500/20 bg-red-500/8 px-4 py-3 text-sm text-red-500 dark:text-red-300">
      <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
      <span>{message}</span>
    </div>
  );
}
