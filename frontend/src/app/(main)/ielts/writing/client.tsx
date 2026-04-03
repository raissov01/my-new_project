"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { AlertCircle, ArrowLeft, CheckCircle2, Clock3, Loader2, PenLine, RotateCcw, Sparkles } from "lucide-react";
import { useLocale } from "@/components/providers/locale-provider";
import { Button } from "@/components/ui/button";
import { evaluateWriting, type WritingResult } from "./actions";

type Phase = "select" | "write" | "evaluating" | "results";

const TASK1_PROMPTS = [
  "The chart below shows the percentage of households in owned and rented accommodation in England and Wales between 1918 and 2011. Summarise the information by selecting and reporting the main features, and make comparisons where relevant.",
  "The table below gives information about the underground railway systems in six cities. Summarise the information by selecting and reporting the main features, and make comparisons where relevant.",
  "The graph below shows the number of tourists visiting a particular Caribbean island between 2010 and 2017. Summarise the information by selecting and reporting the main features, and make comparisons where relevant.",
];

const TASK2_PROMPTS = [
  "Some people believe that university students should pay all the cost of their education, because university education benefits individuals more than society. To what extent do you agree or disagree?",
  "In many cities, the use of video cameras in public places is being increased in order to reduce crime, but some people believe that these measures restrict our individual freedom. Do the benefits of increased security outweigh the drawbacks?",
  "Some experts believe that it is better for children to begin learning a foreign language at primary school rather than secondary school. Do the advantages of this outweigh the disadvantages?",
];

export function WritingPracticeClient() {
  const { t } = useLocale();
  const [phase, setPhase] = useState<Phase>("select");
  const [taskType, setTaskType] = useState<"task1" | "task2">("task2");
  const [prompt, setPrompt] = useState("");
  const [customPrompt, setCustomPrompt] = useState("");
  const [essay, setEssay] = useState("");
  const [result, setResult] = useState<WritingResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [timeLeft, setTimeLeft] = useState(0);
  const [elapsedSecs, setElapsedSecs] = useState(0);
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

  useEffect(() => {
    return () => stopTimer();
  }, [stopTimer]);

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
    if (wordCount < 20) {
      setError(t("ielts.wr.errorTooShort"));
      return;
    }
    stopTimer();
    setError(null);
    setPhase("evaluating");

    const { result: res, error: err } = await evaluateWriting(taskType, prompt, essay, elapsedSecs);
    if (err) {
      setError(err);
      setPhase("write");
      return;
    }
    setResult(res ?? null);
    setPhase("results");
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
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  // ── Select phase ──────────────────────────────────────────────────────
  if (phase === "select") {
    const prompts = taskType === "task1" ? TASK1_PROMPTS : TASK2_PROMPTS;
    return (
      <div className="space-y-6">
        {/* Task type toggle */}
        <div className="inline-flex rounded-2xl border border-[var(--border)] bg-[var(--bg-surface)] p-1">
          {(["task1", "task2"] as const).map((tt) => (
            <button
              key={tt}
              onClick={() => setTaskType(tt)}
              className={`rounded-xl px-5 py-2.5 text-sm font-medium transition-all ${
                taskType === tt
                  ? "bg-[var(--bg-elevated)] text-[var(--text-primary)] shadow-[var(--surface-shadow)]"
                  : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
              }`}
            >
              {tt === "task1" ? t("ielts.writingTask1") : t("ielts.writingTask2")}
            </button>
          ))}
        </div>

        {/* Pre-loaded prompts */}
        <div className="space-y-3">
          <h3 className="text-sm font-medium text-[var(--text-primary)]">{t("ielts.wr.choosePrompt")}</h3>
          {prompts.map((p, i) => (
            <button
              key={i}
              onClick={() => startWriting(p)}
              className="w-full rounded-2xl border border-[var(--border)] bg-[var(--bg-elevated)] p-4 text-left text-sm leading-6 text-[var(--text-secondary)] transition-all hover:border-indigo-500/30 hover:bg-indigo-500/5"
            >
              {p}
            </button>
          ))}
        </div>

        {/* Custom prompt */}
        <div className="rounded-2xl border border-dashed border-[var(--border)] p-5">
          <h3 className="text-sm font-medium text-[var(--text-primary)]">{t("ielts.wr.customPrompt")}</h3>
          <textarea
            value={customPrompt}
            onChange={(e) => setCustomPrompt(e.target.value)}
            rows={3}
            placeholder={t("ielts.wr.customPlaceholder")}
            className="mt-3 w-full rounded-xl border border-[var(--border)] bg-[var(--bg-surface)] px-4 py-3 text-sm text-[var(--text-primary)] outline-none placeholder:text-[var(--text-muted)] focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/50"
          />
          <Button onClick={() => startWriting("")} className="mt-3" disabled={!customPrompt.trim()}>
            {t("ielts.wr.startCustom")}
          </Button>
        </div>

        {error && <ErrorBanner message={error} />}
      </div>
    );
  }

  // ── Write phase ───────────────────────────────────────────────────────
  if (phase === "write") {
    return (
      <div className="space-y-4">
        {/* Prompt display */}
        <div className="rounded-2xl border border-indigo-500/20 bg-indigo-500/5 p-4">
          <p className="text-xs font-medium uppercase tracking-wider text-indigo-400">
            {taskType === "task1" ? t("ielts.writingTask1") : t("ielts.writingTask2")}
          </p>
          <p className="mt-2 text-sm leading-6 text-[var(--text-primary)]">{prompt}</p>
        </div>

        {/* Timer + word count bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[var(--border)] bg-[var(--bg-surface)] px-4 py-3">
          <div className="flex items-center gap-4 text-sm">
            <span className={`flex items-center gap-1.5 font-medium ${timeLeft < 120 ? "text-red-400" : "text-[var(--text-secondary)]"}`}>
              <Clock3 className="h-4 w-4" />
              {formatTime(timeLeft)}
            </span>
            <span className={`font-medium ${wordCount >= minWords ? "text-emerald-400" : "text-[var(--text-secondary)]"}`}>
              {wordCount} / {minWords}+ {t("ielts.wr.words")}
            </span>
          </div>
          <Button onClick={handleSubmit} size="sm" disabled={wordCount < 20}>
            <Sparkles className="h-4 w-4" />
            {t("ielts.wr.submitForEval")}
          </Button>
        </div>

        {/* Essay editor */}
        <textarea
          value={essay}
          onChange={(e) => setEssay(e.target.value)}
          rows={18}
          autoFocus
          placeholder={t("ielts.wr.essayPlaceholder")}
          className="w-full rounded-2xl border border-[var(--border)] bg-[var(--bg-elevated)] px-5 py-4 text-sm leading-7 text-[var(--text-primary)] outline-none placeholder:text-[var(--text-muted)] focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/50"
        />

        {error && <ErrorBanner message={error} />}
      </div>
    );
  }

  // ── Evaluating phase ──────────────────────────────────────────────────
  if (phase === "evaluating") {
    return (
      <div className="flex flex-col items-center justify-center rounded-2xl border border-[var(--border)] bg-[var(--bg-elevated)] px-6 py-20 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-gradient-to-br from-emerald-500 to-teal-600 shadow-lg shadow-emerald-500/25">
          <Loader2 className="h-8 w-8 animate-spin text-white" />
        </div>
        <h2 className="mt-6 text-xl font-semibold text-[var(--text-primary)]">{t("ielts.wr.evaluating")}</h2>
        <p className="mt-2 text-sm text-[var(--text-secondary)]">{t("ielts.wr.evaluatingHint")}</p>
      </div>
    );
  }

  // ── Results phase ─────────────────────────────────────────────────────
  if (phase === "results" && result) {
    const criteria = [
      { label: t("ielts.wr.taskAchievement"), score: result.taskAchievement, color: "bg-blue-500" },
      { label: t("ielts.wr.coherence"), score: result.coherence, color: "bg-emerald-500" },
      { label: t("ielts.wr.lexicalResource"), score: result.lexicalResource, color: "bg-violet-500" },
      { label: t("ielts.wr.grammar"), score: result.grammar, color: "bg-amber-500" },
    ];

    return (
      <div className="space-y-6">
        {/* Overall band */}
        <div className="flex flex-col items-center rounded-2xl border border-[var(--border)] bg-[var(--bg-elevated)] p-6 text-center sm:p-8">
          <div className="flex h-24 w-24 items-center justify-center rounded-full border-4 border-indigo-500 bg-indigo-500/10">
            <span className="text-3xl font-bold text-indigo-400">{result.overallBand}</span>
          </div>
          <h2 className="mt-4 text-xl font-semibold text-[var(--text-primary)]">{t("ielts.wr.overallBand")}</h2>
          <p className="mt-1 text-sm text-[var(--text-secondary)]">{result.wordCount} {t("ielts.wr.words")}</p>
        </div>

        {/* Criteria scores */}
        <div className="grid gap-3 sm:grid-cols-2">
          {criteria.map((c) => (
            <div key={c.label} className="rounded-2xl border border-[var(--border)] bg-[var(--bg-elevated)] p-4">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium text-[var(--text-primary)]">{c.label}</span>
                <span className="text-lg font-bold text-[var(--text-primary)]">{c.score}</span>
              </div>
              <div className="mt-3 h-2 rounded-full bg-[var(--border)]">
                <div className={`h-full rounded-full ${c.color} transition-all`} style={{ width: `${(c.score / 9) * 100}%` }} />
              </div>
            </div>
          ))}
        </div>

        {/* Feedback sections */}
        {result.feedback && (
          <div className="space-y-4">
            <FeedbackSection icon={CheckCircle2} title={t("ielts.wr.strengths")} items={result.feedback.strengths} color="text-emerald-400" />
            <FeedbackSection icon={AlertCircle} title={t("ielts.wr.weaknesses")} items={result.feedback.weaknesses} color="text-red-400" />
            <FeedbackSection icon={Sparkles} title={t("ielts.wr.suggestions")} items={result.feedback.suggestions} color="text-indigo-400" />

            {result.feedback.detailedFeedback && (
              <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-elevated)] p-5">
                <h3 className="flex items-center gap-2 text-sm font-semibold text-[var(--text-primary)]">
                  <PenLine className="h-4 w-4 text-[var(--text-muted)]" />
                  {t("ielts.wr.detailedFeedback")}
                </h3>
                <p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-[var(--text-secondary)]">
                  {result.feedback.detailedFeedback}
                </p>
              </div>
            )}
          </div>
        )}

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
        {items.map((item, i) => (
          <li key={i} className="flex items-start gap-2 text-sm leading-6 text-[var(--text-secondary)]">
            <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--text-muted)]" />
            {item}
          </li>
        ))}
      </ul>
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
