"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  Clock3,
  Loader2,
  PenLine,
  RotateCcw,
  Sparkles,
  Target,
} from "lucide-react";
import { useLocale } from "@/components/providers/locale-provider";
import { Button } from "@/components/ui/button";
import type { IELTSQuestion } from "@/features/ielts/api";
import { fetchIELTSQuestions } from "@/features/ielts/api";
import { evaluateWriting, type WritingResult } from "./actions";

type Phase = "select" | "write" | "evaluating" | "results";
type WritingTaskType = "task1" | "task2";

export function WritingPracticeClient() {
  const { t } = useLocale();
  const [phase, setPhase] = useState<Phase>("select");
  const [taskType, setTaskType] = useState<WritingTaskType>("task2");
  const [mockType, setMockType] = useState<"all" | IELTSQuestion["mockType"]>("all");
  const [difficulty, setDifficulty] = useState<"all" | IELTSQuestion["difficulty"]>("all");
  const [topic, setTopic] = useState("all");
  const [bandTarget, setBandTarget] = useState("all");
  const [questions, setQuestions] = useState<IELTSQuestion[]>([]);
  const [loadingQuestions, setLoadingQuestions] = useState(true);
  const [loadingError, setLoadingError] = useState<string | null>(null);
  const [prompt, setPrompt] = useState("");
  const [customPrompt, setCustomPrompt] = useState("");
  const [essay, setEssay] = useState("");
  const [result, setResult] = useState<WritingResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [timeLeft, setTimeLeft] = useState(0);
  const [elapsedSecs, setElapsedSecs] = useState(0);
  const [progressMessage, setProgressMessage] = useState("");
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const wordCount = essay.trim() ? essay.trim().split(/\s+/).length : 0;
  const minWords = taskType === "task1" ? 150 : 250;
  const timeLimit = taskType === "task1" ? 20 * 60 : 40 * 60;

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

    setProgressMessage(t("ielts.evalStep1"));

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
          section: "writing",
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
              : "Failed to load writing tasks."
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

  const filteredPrompts = useMemo(() => {
    return questions.filter((question) => {
      if (question.questionType !== taskType) return false;
      if (mockType !== "all" && question.mockType !== mockType) return false;
      if (difficulty !== "all" && question.difficulty !== difficulty) return false;
      if (topic !== "all" && question.topic !== topic) return false;
      if (bandTarget !== "all" && question.bandTarget !== bandTarget) return false;
      return true;
    });
  }, [bandTarget, difficulty, mockType, questions, taskType, topic]);

  const topics = useMemo(
    () =>
      Array.from(
        new Set(
          questions
            .filter((question) => question.questionType === taskType)
            .map((question) => question.topic)
            .filter(Boolean)
        )
      ).sort(),
    [questions, taskType]
  );

  const bands = useMemo(
    () =>
      Array.from(
        new Set(
          questions
            .filter((question) => question.questionType === taskType)
            .map((question) => question.bandTarget)
            .filter((item): item is string => Boolean(item))
        )
      ).sort(),
    [questions, taskType]
  );

  function startWriting(selectedPrompt: string) {
    const finalPrompt = selectedPrompt || customPrompt.trim();
    if (!finalPrompt) {
      setError(t("ielts.wr.errorNoPrompt"));
      return;
    }

    setPrompt(finalPrompt);
    setEssay("");
    setError(null);
    setTimeLeft(timeLimit);
    setElapsedSecs(0);
    setPhase("write");

    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          stopTimer();
          return 0;
        }
        return prev - 1;
      });
      setElapsedSecs((prev) => prev + 1);
    }, 1000);
  }

  async function handleSubmit() {
    if (wordCount < Math.min(minWords, 100)) {
      setError(`Your essay is too short. ${taskType === "task1" ? "Task 1 requires at least 150 words." : "Task 2 requires at least 250 words."} You wrote ${wordCount} words.`);
      return;
    }

    stopTimer();
    setError(null);
    setPhase("evaluating");

    const { result: response, error: submitError } = await evaluateWriting(
      taskType,
      prompt,
      essay,
      elapsedSecs
    );

    if (submitError) {
      setError(t("ielts.evalError"));
      setPhase("write");
      return;
    }

    setResult(response ?? null);
    setPhase("results");
  }

  function handleRetry() {
    setError(null);
  }

  function handleReset() {
    stopTimer();
    setPhase("select");
    setEssay("");
    setPrompt("");
    setResult(null);
    setError(null);
  }

  const formatTime = (secs: number) => {
    const minutes = Math.floor(secs / 60);
    const seconds = secs % 60;
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
  };

  if (phase === "select") {
    return (
      <div className="space-y-6">
        <div className="grid gap-4 rounded-[var(--radius-2xl)] border border-[var(--border)] bg-[var(--bg-elevated)] p-5 shadow-[var(--shadow-sm)] lg:grid-cols-5">
          <FilterSelect
            label="Task type"
            value={taskType}
            onChange={(value) => setTaskType(value as WritingTaskType)}
            options={[
              { value: "task1", label: t("ielts.writingTask1") },
              { value: "task2", label: t("ielts.writingTask2") },
            ]}
          />
          <FilterSelect
            label="Mock type"
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

        <div className="rounded-[var(--radius-2xl)] border border-[var(--border)] bg-[var(--bg-elevated)] p-5 shadow-[var(--shadow-sm)]">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-base font-semibold text-[var(--text-primary)]">
                Dynamic task pool
              </h3>
              <p className="mt-1 text-sm text-[var(--text-secondary)]">
                Choose a real IELTS-style task from the question bank or paste your own prompt.
              </p>
            </div>
            <span className="rounded-full border border-[var(--border)] bg-[var(--primary-soft)] px-3 py-1.5 text-xs font-medium text-[var(--primary)]">
              {filteredPrompts.length} tasks
            </span>
          </div>

          {loadingQuestions ? (
            <div className="mt-5 space-y-3">
              {Array.from({ length: 4 }).map((_, index) => (
                <div
                  key={index}
                  className="h-24 animate-pulse rounded-2xl border border-[var(--border)] bg-[var(--bg-surface)]"
                />
              ))}
            </div>
          ) : loadingError ? (
            <ErrorBanner message={loadingError} />
          ) : filteredPrompts.length > 0 ? (
            <div className="mt-5 space-y-3">
              {filteredPrompts.map((question) => (
                <button
                  key={question.id}
                  onClick={() => startWriting(question.prompt)}
                  className="w-full rounded-2xl border border-[var(--border)] bg-[var(--bg-surface)] p-4 text-left transition-all hover:border-indigo-500/30 hover:bg-indigo-500/5"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full border border-[var(--border)] bg-[var(--bg-elevated)] px-2.5 py-1 text-[11px] font-medium uppercase tracking-[0.14em] text-[var(--text-muted)]">
                      {question.mockType.replace("_", " ")}
                    </span>
                    <span className="rounded-full border border-[var(--border)] bg-[var(--bg-elevated)] px-2.5 py-1 text-[11px] font-medium uppercase tracking-[0.14em] text-[var(--text-muted)]">
                      {question.difficulty}
                    </span>
                    {question.bandTarget ? (
                      <span className="rounded-full border border-[var(--border)] bg-[var(--primary-soft)] px-2.5 py-1 text-[11px] font-medium text-[var(--primary)]">
                        Band {question.bandTarget}
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-3 text-sm font-semibold text-[var(--text-primary)]">
                    {question.title}
                  </p>
                  <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
                    {question.prompt}
                  </p>
                </button>
              ))}
            </div>
          ) : (
            <div className="mt-5 rounded-2xl border border-dashed border-[var(--border)] bg-[var(--bg-surface)] px-5 py-8 text-center">
              <Target className="mx-auto h-6 w-6 text-[var(--text-muted)]" />
              <p className="mt-3 text-sm font-medium text-[var(--text-primary)]">
                No tasks match the current filters
              </p>
              <p className="mt-1 text-sm text-[var(--text-secondary)]">
                Try another topic, band, or mock type.
              </p>
            </div>
          )}
        </div>

        <div className="rounded-2xl border border-dashed border-[var(--border)] p-5">
          <h3 className="text-sm font-medium text-[var(--text-primary)]">
            {t("ielts.wr.customPrompt")}
          </h3>
          <textarea
            value={customPrompt}
            onChange={(event) => setCustomPrompt(event.target.value)}
            rows={4}
            placeholder={t("ielts.wr.customPlaceholder")}
            className="mt-3 w-full rounded-xl border border-[var(--border)] bg-[var(--bg-surface)] px-4 py-3 text-sm text-[var(--text-primary)] outline-none placeholder:text-[var(--text-muted)] focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/50"
          />
          <Button
            onClick={() => startWriting("")}
            className="mt-3"
            disabled={!customPrompt.trim()}
          >
            {t("ielts.wr.startCustom")}
          </Button>
        </div>

        {error ? <ErrorBanner message={error} /> : null}
      </div>
    );
  }

  if (phase === "write") {
    return (
      <div className="space-y-4">
        <button
          type="button"
          onClick={handleReset}
          className="flex items-center gap-1.5 text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          {t("ielts.wr.backToTasks")}
        </button>

        <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-soft)] p-4">
          <p className="text-xs font-medium uppercase tracking-wider text-[var(--primary)]">
            {taskType === "task1" ? t("ielts.writingTask1") : t("ielts.writingTask2")}
          </p>
          <p className="mt-2 text-sm leading-6 text-[var(--text-primary)]">{prompt}</p>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[var(--border)] bg-[var(--bg-surface)] px-4 py-3">
          <div className="flex items-center gap-4 text-sm">
            <span
              className={`flex items-center gap-1.5 font-medium ${
                timeLeft < 120 ? "text-red-400" : "text-[var(--text-secondary)]"
              }`}
            >
              <Clock3 className="h-4 w-4" />
              {formatTime(timeLeft)}
            </span>
            <span
              className={`font-medium ${
                wordCount >= minWords ? "text-emerald-400" : "text-[var(--text-secondary)]"
              }`}
            >
              {wordCount} / {minWords}+ {t("ielts.wr.words")}
            </span>
          </div>
          <Button onClick={handleSubmit} size="sm" disabled={wordCount < 20}>
            <Sparkles className="h-4 w-4" />
            {t("ielts.wr.submitForEval")}
          </Button>
        </div>

        {taskType === "task2" && (
          <p className="text-xs leading-5 text-[var(--text-muted)]">
            {t("ielts.wr.wordCountHint")}
          </p>
        )}

        <textarea
          value={essay}
          onChange={(event) => setEssay(event.target.value)}
          rows={18}
          autoFocus
          placeholder={t("ielts.wr.essayPlaceholder")}
          className="w-full rounded-2xl border border-[var(--border)] bg-[var(--bg-elevated)] px-5 py-4 text-sm leading-7 text-[var(--text-primary)] outline-none placeholder:text-[var(--text-muted)] focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/50"
        />

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
        <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-[var(--bg-surface)] shadow-[var(--shadow-lg)]">
          <Loader2 className="h-8 w-8 animate-spin text-[var(--primary)]" />
        </div>
        <h2 className="mt-6 text-xl font-semibold text-[var(--text-primary)]">
          {t("ielts.wr.evaluating")}
        </h2>
        <p className="mt-2 text-sm text-[var(--text-secondary)]">
          {progressMessage || t("ielts.wr.evaluatingHint")}
        </p>
      </div>
    );
  }

  if (phase === "results" && result) {
    const criteria = [
      { label: t("ielts.wr.taskAchievement"), score: result.taskAchievement, color: "bg-blue-500" },
      { label: t("ielts.wr.coherence"), score: result.coherence, color: "bg-emerald-500" },
      { label: t("ielts.wr.lexicalResource"), score: result.lexicalResource, color: "bg-violet-500" },
      { label: t("ielts.wr.grammar"), score: result.grammar, color: "bg-amber-500" },
    ];

    return (
      <div className="space-y-6">
        <div className="flex flex-col items-center rounded-2xl border border-[var(--border)] bg-[var(--bg-elevated)] p-6 text-center sm:p-8">
          <div className="flex h-24 w-24 items-center justify-center rounded-full border-4 border-[var(--primary)] bg-[var(--primary-soft)]">
            <span className="text-3xl font-bold text-[var(--primary)]">{result.overallBand}</span>
          </div>
          <h2 className="mt-4 text-xl font-semibold text-[var(--text-primary)]">
            {t("ielts.wr.overallBand")}
          </h2>
          <p className="mt-1 text-sm text-[var(--text-secondary)]">
            {result.wordCount} {t("ielts.wr.words")}
          </p>
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

        <FeedbackSection icon={CheckCircle2} title={t("ielts.wr.strengths")} items={result.feedback.strengths} color="text-emerald-400" />
        <FeedbackSection icon={AlertCircle} title={t("ielts.wr.weaknesses")} items={result.feedback.weaknesses} color="text-red-400" />
        <FeedbackSection icon={Sparkles} title={t("ielts.wr.suggestions")} items={result.feedback.suggestions} color="text-[var(--primary)]" />
        <FeedbackSection icon={Target} title="Improvement plan" items={result.feedback.improvementPlan ?? []} color="text-amber-400" />

        {result.feedback.bandExplanation ? (
          <TextPanel title="Why this band was given" body={result.feedback.bandExplanation} />
        ) : null}
        {result.feedback.detailedFeedback ? (
          <TextPanel title={t("ielts.wr.detailedFeedback")} body={result.feedback.detailedFeedback} />
        ) : null}
        {result.feedback.rewrittenResponse ? (
          <TextPanel title="Improved version of your response" body={result.feedback.rewrittenResponse} />
        ) : null}
        {result.feedback.modelAnswer ? (
          <TextPanel title="Band 7-9 model answer" body={result.feedback.modelAnswer} />
        ) : null}

        <IssueSection
          title="Grammar highlights"
          items={result.feedback.grammarHighlights ?? []}
          tone="text-red-400"
        />
        <IssueSection
          title="Vocabulary upgrades"
          items={result.feedback.vocabularyHighlights ?? []}
          tone="text-[var(--text-secondary)]"
        />

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
        className="w-full rounded-2xl border border-[var(--border)] bg-[var(--bg-surface)] px-4 py-3 text-sm text-[var(--text-primary)] outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/50"
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
          <div key={`${title}-${index}`} className="rounded-xl border border-[var(--border)] bg-[var(--bg-surface)] p-4">
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
