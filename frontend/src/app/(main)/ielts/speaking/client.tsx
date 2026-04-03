"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { AlertCircle, ArrowRight, CheckCircle2, Clock3, Loader2, MessageSquareQuote, Mic, RotateCcw, Sparkles } from "lucide-react";
import { useLocale } from "@/components/providers/locale-provider";
import { Button } from "@/components/ui/button";
import { evaluateSpeaking, type SpeakingResult } from "./actions";

type Phase = "select" | "practice" | "evaluating" | "results";
type PartKey = "part1" | "part2" | "part3";

const PART1_QUESTIONS = [
  "Let's talk about your hometown. What do you like most about the place where you live?",
  "Do you enjoy reading? What kind of books do you prefer?",
  "Let's talk about technology. How often do you use your phone during the day?",
  "Do you prefer spending time indoors or outdoors? Why?",
  "Let's talk about food. What is your favourite meal of the day?",
];

const PART2_CUES = [
  {
    topic: "Describe a person who has influenced you in your life.",
    points: ["Who the person is", "How you know this person", "What they did that influenced you", "Explain how this person changed your life"],
  },
  {
    topic: "Describe a book you read recently that you found interesting.",
    points: ["What the book was about", "Why you decided to read it", "What you learned from it", "Explain why you found it interesting"],
  },
  {
    topic: "Describe a place you visited that left a strong impression on you.",
    points: ["Where the place was", "When you went there", "What you did there", "Explain why it made a strong impression"],
  },
];

const PART3_QUESTIONS = [
  "Some people say that education is the most important factor in a person's success. Do you agree?",
  "How has technology changed the way people communicate with each other?",
  "Do you think the government should invest more in public transport? Why or why not?",
  "In what ways do you think the role of teachers will change in the future?",
];

export function SpeakingPracticeClient() {
  const { t } = useLocale();
  const [phase, setPhase] = useState<Phase>("select");
  const [part, setPart] = useState<PartKey>("part1");
  const [currentPrompt, setCurrentPrompt] = useState("");
  const [cueCard, setCueCard] = useState<{ topic: string; points: string[] } | null>(null);
  const [transcript, setTranscript] = useState("");
  const [result, setResult] = useState<SpeakingResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [timeLeft, setTimeLeft] = useState(0);
  const [prepTime, setPrepTime] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [questionIndex, setQuestionIndex] = useState(0);

  const stopTimer = useCallback(() => {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
  }, []);

  useEffect(() => () => stopTimer(), [stopTimer]);

  function startPractice() {
    setError(null);
    setTranscript("");
    setResult(null);

    if (part === "part1") {
      const idx = Math.floor(Math.random() * PART1_QUESTIONS.length);
      setCurrentPrompt(PART1_QUESTIONS[idx]);
      setQuestionIndex(idx);
      setCueCard(null);
      setTimeLeft(5 * 60);
    } else if (part === "part2") {
      const idx = Math.floor(Math.random() * PART2_CUES.length);
      setCueCard(PART2_CUES[idx]);
      setCurrentPrompt(PART2_CUES[idx].topic);
      setPrepTime(60);
      setTimeLeft(2 * 60);
    } else {
      const idx = Math.floor(Math.random() * PART3_QUESTIONS.length);
      setCurrentPrompt(PART3_QUESTIONS[idx]);
      setQuestionIndex(idx);
      setCueCard(null);
      setTimeLeft(5 * 60);
    }

    setPhase("practice");

    if (part === "part2") {
      // Start prep timer first
      timerRef.current = setInterval(() => {
        setPrepTime((prev) => {
          if (prev <= 1) {
            stopTimer();
            // After prep, start speaking timer
            timerRef.current = setInterval(() => {
              setTimeLeft((p) => { if (p <= 1) { stopTimer(); return 0; } return p - 1; });
            }, 1000);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      timerRef.current = setInterval(() => {
        setTimeLeft((prev) => { if (prev <= 1) { stopTimer(); return 0; } return prev - 1; });
      }, 1000);
    }
  }

  async function handleSubmit() {
    if (!transcript.trim()) {
      setError(t("ielts.sp.errorEmpty"));
      return;
    }
    stopTimer();
    setError(null);
    setPhase("evaluating");

    const { result: res, error: err } = await evaluateSpeaking(part, currentPrompt, transcript);
    if (err) {
      setError(err);
      setPhase("practice");
      return;
    }
    setResult(res ?? null);
    setPhase("results");
  }

  function handleReset() {
    stopTimer();
    setPhase("select");
    setTranscript("");
    setResult(null);
    setError(null);
    setCueCard(null);
  }

  function handleFollowUp() {
    if (result?.feedback?.followUpQuestion) {
      setCurrentPrompt(result.feedback.followUpQuestion);
      setTranscript("");
      setResult(null);
      setError(null);
      setTimeLeft(3 * 60);
      setPhase("practice");
      timerRef.current = setInterval(() => {
        setTimeLeft((prev) => { if (prev <= 1) { stopTimer(); return 0; } return prev - 1; });
      }, 1000);
    }
  }

  const formatTime = (secs: number) => `${Math.floor(secs / 60)}:${(secs % 60).toString().padStart(2, "0")}`;

  // ── Select ────────────────────────────────────────────────────────────
  if (phase === "select") {
    const parts: { key: PartKey; title: string; body: string; time: string }[] = [
      { key: "part1", title: t("ielts.speakingPart1"), body: t("ielts.speakingPart1Body"), time: "4-5 min" },
      { key: "part2", title: t("ielts.speakingPart2"), body: t("ielts.speakingPart2Body"), time: "3-4 min" },
      { key: "part3", title: t("ielts.speakingPart3"), body: t("ielts.speakingPart3Body"), time: "4-5 min" },
    ];
    return (
      <div className="space-y-4">
        {parts.map((p) => (
          <button
            key={p.key}
            onClick={() => { setPart(p.key); startPractice(); }}
            className={`w-full rounded-2xl border p-5 text-left transition-all hover:border-indigo-500/30 hover:bg-indigo-500/5 ${
              part === p.key ? "border-indigo-500/30 bg-indigo-500/5" : "border-[var(--border)] bg-[var(--bg-elevated)]"
            }`}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-lg font-semibold text-[var(--text-primary)]">{p.title}</h3>
                <p className="mt-1 text-sm text-[var(--text-secondary)]">{p.body}</p>
              </div>
              <span className="shrink-0 rounded-full border border-[var(--border)] bg-[var(--bg-surface)] px-3 py-1.5 text-xs font-medium text-[var(--text-secondary)]">{p.time}</span>
            </div>
            <div className="mt-3 flex items-center gap-1.5 text-sm font-medium text-indigo-400">
              {t("ielts.sp.startPractice")} <ArrowRight className="h-4 w-4" />
            </div>
          </button>
        ))}
      </div>
    );
  }

  // ── Practice ──────────────────────────────────────────────────────────
  if (phase === "practice") {
    return (
      <div className="space-y-4">
        {/* Prompt */}
        <div className="rounded-2xl border border-indigo-500/20 bg-indigo-500/5 p-5">
          <p className="text-xs font-medium uppercase tracking-wider text-indigo-400">
            {part === "part1" ? t("ielts.speakingPart1") : part === "part2" ? t("ielts.speakingPart2") : t("ielts.speakingPart3")}
          </p>
          {cueCard && prepTime > 0 ? (
            <div className="mt-3">
              <p className="text-sm font-semibold text-[var(--text-primary)]">{cueCard.topic}</p>
              <p className="mt-2 text-xs text-[var(--text-muted)]">{t("ielts.sp.youShouldSay")}</p>
              <ul className="mt-1.5 space-y-1">
                {cueCard.points.map((pt, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-[var(--text-secondary)]">
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-indigo-400" />
                    {pt}
                  </li>
                ))}
              </ul>
              <div className="mt-4 flex items-center gap-2 text-sm font-medium text-amber-400">
                <Clock3 className="h-4 w-4" />
                {t("ielts.sp.prepTime")}: {formatTime(prepTime)}
              </div>
            </div>
          ) : (
            <p className="mt-2 text-sm leading-6 text-[var(--text-primary)]">{currentPrompt}</p>
          )}
        </div>

        {/* Timer */}
        {(prepTime === 0 || part !== "part2") && (
          <div className="flex items-center justify-between rounded-2xl border border-[var(--border)] bg-[var(--bg-surface)] px-4 py-3">
            <span className={`flex items-center gap-1.5 text-sm font-medium ${timeLeft < 30 ? "text-red-400" : "text-[var(--text-secondary)]"}`}>
              <Clock3 className="h-4 w-4" /> {formatTime(timeLeft)}
            </span>
            <Button onClick={handleSubmit} size="sm" disabled={!transcript.trim()}>
              <Sparkles className="h-4 w-4" /> {t("ielts.sp.getEvaluation")}
            </Button>
          </div>
        )}

        {/* Response area */}
        {(prepTime === 0 || part !== "part2") && (
          <div>
            <label className="mb-2 flex items-center gap-2 text-sm font-medium text-[var(--text-primary)]">
              <Mic className="h-4 w-4 text-[var(--text-muted)]" />
              {t("ielts.sp.yourResponse")}
            </label>
            <textarea
              value={transcript}
              onChange={(e) => setTranscript(e.target.value)}
              rows={10}
              autoFocus
              placeholder={t("ielts.sp.responsePlaceholder")}
              className="w-full rounded-2xl border border-[var(--border)] bg-[var(--bg-elevated)] px-5 py-4 text-sm leading-7 text-[var(--text-primary)] outline-none placeholder:text-[var(--text-muted)] focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/50"
            />
          </div>
        )}

        {error && <ErrorBanner message={error} />}
      </div>
    );
  }

  // ── Evaluating ────────────────────────────────────────────────────────
  if (phase === "evaluating") {
    return (
      <div className="flex flex-col items-center justify-center rounded-2xl border border-[var(--border)] bg-[var(--bg-elevated)] px-6 py-20 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-gradient-to-br from-violet-500 to-fuchsia-600 shadow-lg shadow-violet-500/25">
          <Loader2 className="h-8 w-8 animate-spin text-white" />
        </div>
        <h2 className="mt-6 text-xl font-semibold text-[var(--text-primary)]">{t("ielts.sp.evaluating")}</h2>
        <p className="mt-2 text-sm text-[var(--text-secondary)]">{t("ielts.sp.evaluatingHint")}</p>
      </div>
    );
  }

  // ── Results ───────────────────────────────────────────────────────────
  if (phase === "results" && result) {
    const criteria = [
      { label: t("ielts.sp.fluency"), score: result.fluencyCoherence, color: "bg-blue-500" },
      { label: t("ielts.sp.lexical"), score: result.lexicalResource, color: "bg-emerald-500" },
      { label: t("ielts.sp.grammarScore"), score: result.grammar, color: "bg-violet-500" },
      { label: t("ielts.sp.pronunciation"), score: result.pronunciation, color: "bg-amber-500" },
    ];

    return (
      <div className="space-y-6">
        <div className="flex flex-col items-center rounded-2xl border border-[var(--border)] bg-[var(--bg-elevated)] p-6 text-center sm:p-8">
          <div className="flex h-24 w-24 items-center justify-center rounded-full border-4 border-violet-500 bg-violet-500/10">
            <span className="text-3xl font-bold text-violet-400">{result.overallBand}</span>
          </div>
          <h2 className="mt-4 text-xl font-semibold text-[var(--text-primary)]">{t("ielts.wr.overallBand")}</h2>
        </div>

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

        {result.feedback && (
          <div className="space-y-4">
            <FeedbackSection icon={CheckCircle2} title={t("ielts.wr.strengths")} items={result.feedback.strengths} color="text-emerald-400" />
            <FeedbackSection icon={AlertCircle} title={t("ielts.wr.weaknesses")} items={result.feedback.weaknesses} color="text-red-400" />
            <FeedbackSection icon={Sparkles} title={t("ielts.wr.suggestions")} items={result.feedback.suggestions} color="text-indigo-400" />

            {result.feedback.detailedFeedback && (
              <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-elevated)] p-5">
                <h3 className="text-sm font-semibold text-[var(--text-primary)]">{t("ielts.wr.detailedFeedback")}</h3>
                <p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-[var(--text-secondary)]">{result.feedback.detailedFeedback}</p>
              </div>
            )}

            {result.feedback.followUpQuestion && (
              <div className="rounded-2xl border border-indigo-500/20 bg-indigo-500/5 p-5">
                <h3 className="flex items-center gap-2 text-sm font-semibold text-indigo-400">
                  <MessageSquareQuote className="h-4 w-4" />
                  {t("ielts.sp.followUp")}
                </h3>
                <p className="mt-2 text-sm text-[var(--text-primary)]">{result.feedback.followUpQuestion}</p>
                <Button onClick={handleFollowUp} size="sm" className="mt-3">
                  {t("ielts.sp.answerFollowUp")}
                </Button>
              </div>
            )}
          </div>
        )}

        <div className="flex flex-wrap gap-3">
          <Button onClick={handleReset}>
            <RotateCcw className="h-4 w-4" /> {t("ielts.wr.tryAgain")}
          </Button>
        </div>
      </div>
    );
  }

  return null;
}

function FeedbackSection({ icon: Icon, title, items, color }: { icon: typeof CheckCircle2; title: string; items: string[]; color: string }) {
  if (!items || items.length === 0) return null;
  return (
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-elevated)] p-5">
      <h3 className={`flex items-center gap-2 text-sm font-semibold ${color}`}><Icon className="h-4 w-4" />{title}</h3>
      <ul className="mt-3 space-y-2">
        {items.map((item, i) => (
          <li key={i} className="flex items-start gap-2 text-sm leading-6 text-[var(--text-secondary)]">
            <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--text-muted)]" />{item}
          </li>
        ))}
      </ul>
    </div>
  );
}

function ErrorBanner({ message }: { message: string }) {
  return (
    <div className="flex items-start gap-2.5 rounded-2xl border border-red-500/20 bg-red-500/8 px-4 py-3 text-sm text-red-500 dark:text-red-300">
      <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" /><span>{message}</span>
    </div>
  );
}
