"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Brain, CheckCircle2, Loader2, XCircle, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { startPlacement, submitPlacement, type PlacementQuestion } from "@/features/learn/api";

type Phase = "intro" | "loading" | "quiz" | "submitting" | "result";

export function PlacementClient() {
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>("intro");
  const [questions, setQuestions] = useState<PlacementQuestion[]>([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [answers, setAnswers] = useState<number[]>([]);
  const [selected, setSelected] = useState<number | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [resultLevel, setResultLevel] = useState("");
  const [resultScore, setResultScore] = useState(0);

  async function handleStart() {
    setPhase("loading");
    try {
      const res = await startPlacement();
      if (res.alreadyDone) {
        router.push("/learn/map");
        return;
      }
      const data = typeof res.questions === "string" ? JSON.parse(res.questions) : res.questions;
      const qs = data.questions || data;
      setQuestions(qs);
      setPhase("quiz");
    } catch {
      setPhase("intro");
    }
  }

  function handleAnswer(optionIdx: number) {
    if (selected !== null) return;
    setSelected(optionIdx);

    const isCorrect = optionIdx === questions[currentIdx].correct;
    const newAnswers = [...answers, optionIdx];
    setAnswers(newAnswers);

    setTimeout(() => {
      if (currentIdx + 1 < questions.length) {
        setCurrentIdx(currentIdx + 1);
        setSelected(null);
      } else {
        finishTest(newAnswers);
      }
    }, 1200);
  }

  async function finishTest(allAnswers: number[]) {
    setPhase("submitting");

    const levelScores: Record<string, number> = {};
    let correct = 0;

    questions.forEach((q, i) => {
      const isCorrect = allAnswers[i] === q.correct;
      if (isCorrect) {
        correct++;
        levelScores[q.level] = (levelScores[q.level] || 0) + 1;
      } else {
        levelScores[q.level] = levelScores[q.level] || 0;
      }
    });

    try {
      const res = await submitPlacement({
        answers: allAnswers,
        totalQuestions: questions.length,
        correctAnswers: correct,
        levelScores,
      });
      setResultLevel(res.level);
      setResultScore(Math.round((correct / questions.length) * 100));
      setPhase("result");
    } catch {
      setPhase("quiz");
    }
  }

  const q = questions[currentIdx];

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      {/* ── Intro ── */}
      {phase === "intro" && (
        <div className="text-center">
          <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-3xl bg-[var(--primary-soft)]">
            <Brain className="h-10 w-10 text-[var(--primary)]" />
          </div>
          <h1 className="text-3xl font-bold text-[var(--text-primary)]">Placement Test</h1>
          <p className="mt-3 text-[var(--text-secondary)]">
            Answer 18 questions to determine your English level (A1–C2).
            This helps us create the perfect learning path for you.
          </p>
          <div className="mt-4 flex flex-wrap justify-center gap-2">
            {["A1", "A2", "B1", "B2", "C1", "C2"].map((lvl) => (
              <span key={lvl} className="rounded-full border border-[var(--border)] px-3 py-1 text-xs font-medium text-[var(--text-secondary)]">
                {lvl}
              </span>
            ))}
          </div>
          <Button className="mt-8" size="lg" onClick={handleStart}>
            <Sparkles className="h-5 w-5" />
            Start Test
          </Button>
        </div>
      )}

      {/* ── Loading ── */}
      {phase === "loading" && (
        <div className="flex flex-col items-center justify-center py-20">
          <Loader2 className="h-12 w-12 animate-spin text-[var(--primary)]" />
          <p className="mt-4 text-sm text-[var(--text-secondary)]">Generating your placement test...</p>
        </div>
      )}

      {/* ── Quiz ── */}
      {phase === "quiz" && q && (
        <div>
          {/* Progress bar */}
          <div className="mb-6">
            <div className="flex items-center justify-between text-xs text-[var(--text-secondary)]">
              <span>{currentIdx + 1} / {questions.length}</span>
              <span className="rounded-full border border-[var(--border)] px-2 py-0.5 font-semibold">{q.level}</span>
            </div>
            <div className="mt-2 h-2 w-full rounded-full bg-[var(--bg-muted)]">
              <div
                className="h-2 rounded-full bg-[var(--primary)] transition-all duration-300"
                style={{ width: `${((currentIdx + 1) / questions.length) * 100}%` }}
              />
            </div>
          </div>

          {/* Question */}
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-elevated)] p-6">
            <p className="text-lg font-semibold text-[var(--text-primary)]">{q.question}</p>
            <div className="mt-5 space-y-3">
              {q.options.map((opt, i) => {
                let cls = "border-[var(--border)] bg-[var(--bg-surface)] hover:border-[var(--primary)]";
                if (selected !== null) {
                  if (i === q.correct) cls = "border-emerald-500 bg-emerald-500/10";
                  else if (i === selected) cls = "border-red-500 bg-red-500/10";
                }
                return (
                  <button
                    key={i}
                    onClick={() => handleAnswer(i)}
                    disabled={selected !== null}
                    className={`flex w-full items-center gap-3 rounded-xl border px-4 py-3 text-left text-sm font-medium transition-all ${cls}`}
                  >
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-[var(--border)] text-xs font-bold">
                      {String.fromCharCode(65 + i)}
                    </span>
                    <span className="text-[var(--text-primary)]">{opt}</span>
                    {selected !== null && i === q.correct && <CheckCircle2 className="ml-auto h-5 w-5 text-emerald-500" />}
                    {selected !== null && i === selected && i !== q.correct && <XCircle className="ml-auto h-5 w-5 text-red-500" />}
                  </button>
                );
              })}
            </div>

            {/* Explanation */}
            {selected !== null && q.explanation && (
              <div className="mt-4 rounded-xl border border-[var(--border)] bg-[var(--bg-soft)] p-3 text-xs text-[var(--text-secondary)]">
                {q.explanation}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Submitting ── */}
      {phase === "submitting" && (
        <div className="flex flex-col items-center justify-center py-20">
          <Loader2 className="h-12 w-12 animate-spin text-[var(--primary)]" />
          <p className="mt-4 text-sm text-[var(--text-secondary)]">Calculating your level...</p>
        </div>
      )}

      {/* ── Result ── */}
      {phase === "result" && (
        <div className="text-center">
          <div className="mx-auto mb-4 flex h-24 w-24 items-center justify-center rounded-full bg-[var(--primary-soft)]">
            <span className="text-4xl font-bold text-[var(--primary)]">{resultLevel}</span>
          </div>
          <h2 className="text-2xl font-bold text-[var(--text-primary)]">Your Level: {resultLevel}</h2>
          <p className="mt-2 text-[var(--text-secondary)]">You scored {resultScore}% on the placement test.</p>
          <p className="mt-1 text-sm text-[var(--text-muted)]">
            Your learning path has been personalized for your level.
          </p>
          <Button className="mt-8" size="lg" onClick={() => router.push("/learn/map")}>
            Start Learning
          </Button>
        </div>
      )}
    </div>
  );
}
