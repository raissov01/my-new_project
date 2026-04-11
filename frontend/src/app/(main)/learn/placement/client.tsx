"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Brain, CheckCircle2, Loader2, XCircle, Sparkles, BookOpen, PenLine } from "lucide-react";
import { Button } from "@/components/ui/button";
import { startPlacement, submitPlacement } from "@/features/learn/api";

type Question = {
  id: number;
  level: string;
  section: string;
  question: string;
  options: string[];
  correct: number;
  explanation: string;
};

type Phase = "intro" | "loading" | "vocab" | "grammar" | "submitting" | "result";

export function PlacementClient() {
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>("intro");
  const [allQuestions, setAllQuestions] = useState<Question[]>([]);
  const [vocabQuestions, setVocabQuestions] = useState<Question[]>([]);
  const [grammarQuestions, setGrammarQuestions] = useState<Question[]>([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [answers, setAnswers] = useState<Map<number, number>>(new Map());
  const [selected, setSelected] = useState<number | null>(null);
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
      const qs: Question[] = res.questions as Question[];
      setAllQuestions(qs);
      setVocabQuestions(qs.filter(q => q.section === "vocabulary"));
      setGrammarQuestions(qs.filter(q => q.section === "grammar"));
      setPhase("vocab");
    } catch {
      setPhase("intro");
    }
  }

  const currentQuestions = phase === "vocab" ? vocabQuestions : grammarQuestions;
  const q = currentQuestions[currentIdx];
  const sectionLabel = phase === "vocab" ? "📚 Vocabulary" : "✏️ Grammar";
  const totalAnswered = answers.size;

  function handleAnswer(optionIdx: number) {
    if (selected !== null) return;
    setSelected(optionIdx);

    const newAnswers = new Map(answers);
    newAnswers.set(q.id, optionIdx);
    setAnswers(newAnswers);

    setTimeout(() => {
      if (currentIdx + 1 < currentQuestions.length) {
        setCurrentIdx(currentIdx + 1);
        setSelected(null);
      } else if (phase === "vocab") {
        // Switch to grammar section
        setPhase("grammar");
        setCurrentIdx(0);
        setSelected(null);
      } else {
        // Both sections done
        finishTest(newAnswers);
      }
    }, 1000);
  }

  async function finishTest(finalAnswers: Map<number, number>) {
    setPhase("submitting");

    const levelScores: Record<string, number> = {};
    let correct = 0;

    allQuestions.forEach(q => {
      const userAnswer = finalAnswers.get(q.id);
      const isCorrect = userAnswer === q.correct;
      if (isCorrect) {
        correct++;
        levelScores[q.level] = (levelScores[q.level] || 0) + 1;
      } else {
        levelScores[q.level] = levelScores[q.level] || 0;
      }
    });

    try {
      const res = await submitPlacement({
        answers: Array.from(finalAnswers.values()),
        totalQuestions: allQuestions.length,
        correctAnswers: correct,
        levelScores,
      });
      setResultLevel(res.level);
      setResultScore(Math.round((correct / allQuestions.length) * 100));
      setPhase("result");
    } catch {
      setPhase("grammar");
    }
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      {/* ── Intro ── */}
      {phase === "intro" && (
        <div className="text-center">
          <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-3xl bg-[var(--primary-soft)]">
            <Brain className="h-10 w-10 text-[var(--primary)]" />
          </div>
          <h1 className="text-3xl font-bold text-[var(--text-primary)]">🎯 Placement Test</h1>
          <p className="mt-3 text-[var(--text-secondary)]">
            60 questions to determine your English level (A1–C2)
          </p>

          <div className="mt-6 grid grid-cols-2 gap-4 text-left">
            <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-elevated)] p-4">
              <div className="flex items-center gap-2 text-sm font-semibold text-[var(--text-primary)]">
                <BookOpen className="h-4 w-4 text-blue-500" /> Vocabulary
              </div>
              <p className="mt-1 text-xs text-[var(--text-muted)]">30 questions — word meanings, synonyms, context usage</p>
            </div>
            <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-elevated)] p-4">
              <div className="flex items-center gap-2 text-sm font-semibold text-[var(--text-primary)]">
                <PenLine className="h-4 w-4 text-emerald-500" /> Grammar
              </div>
              <p className="mt-1 text-xs text-[var(--text-muted)]">30 questions — tenses, articles, conditionals, structures</p>
            </div>
          </div>

          <div className="mt-5 flex flex-wrap justify-center gap-2">
            {["A1", "A2", "B1", "B2", "C1", "C2"].map(lvl => (
              <span key={lvl} className="rounded-full border border-[var(--border)] px-3 py-1 text-xs font-medium text-[var(--text-secondary)]">{lvl}</span>
            ))}
          </div>

          <Button className="mt-8" size="lg" onClick={handleStart}>
            <Sparkles className="h-5 w-5" /> Start Test
          </Button>
          <p className="mt-2 text-xs text-[var(--text-muted)]">Takes about 15-20 minutes</p>
        </div>
      )}

      {/* ── Loading ── */}
      {phase === "loading" && (
        <div className="flex flex-col items-center justify-center py-20">
          <Loader2 className="h-12 w-12 animate-spin text-[var(--primary)]" />
          <p className="mt-4 text-sm text-[var(--text-secondary)]">Loading questions...</p>
        </div>
      )}

      {/* ── Quiz (Vocab or Grammar) ── */}
      {(phase === "vocab" || phase === "grammar") && q && (
        <div>
          {/* Section header */}
          <div className="mb-4 flex items-center justify-between">
            <span className="rounded-full bg-[var(--bg-soft)] px-3 py-1.5 text-sm font-semibold text-[var(--text-primary)]">
              {sectionLabel}
            </span>
            <span className="text-xs text-[var(--text-muted)]">
              {totalAnswered}/60 answered
            </span>
          </div>

          {/* Progress bar */}
          <div className="mb-5">
            <div className="flex items-center justify-between text-xs text-[var(--text-secondary)]">
              <span>{currentIdx + 1} / {currentQuestions.length}</span>
              <span className="rounded-full border border-[var(--border)] px-2 py-0.5 font-semibold">{q.level}</span>
            </div>
            <div className="mt-2 h-2 w-full rounded-full bg-[var(--bg-muted)]">
              <div
                className="h-2 rounded-full bg-[var(--primary)] transition-all duration-300"
                style={{ width: `${((currentIdx + 1) / currentQuestions.length) * 100}%` }}
              />
            </div>
            {/* Overall progress */}
            <div className="mt-1 h-1 w-full rounded-full bg-[var(--bg-muted)]">
              <div
                className="h-1 rounded-full bg-emerald-500 transition-all duration-500"
                style={{ width: `${(totalAnswered / 60) * 100}%` }}
              />
            </div>
          </div>

          {/* Question */}
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-elevated)] p-6">
            <p className="text-lg font-semibold text-[var(--text-primary)]">{q.question}</p>
            <div className="mt-5 space-y-2.5">
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
            {selected !== null && q.explanation && (
              <div className="mt-4 rounded-xl border border-[var(--border)] bg-[var(--bg-soft)] p-3 text-xs text-[var(--text-secondary)]">
                💡 {q.explanation}
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
          <h2 className="text-2xl font-bold text-[var(--text-primary)]">🎉 Your Level: {resultLevel}</h2>
          <p className="mt-2 text-[var(--text-secondary)]">You scored {resultScore}% ({Math.round(resultScore * 60 / 100)}/60 correct)</p>

          <div className="mx-auto mt-6 max-w-xs space-y-2 text-left">
            {["A1", "A2", "B1", "B2", "C1", "C2"].map(lvl => {
              const isYours = lvl === resultLevel;
              return (
                <div key={lvl} className={`flex items-center justify-between rounded-lg px-3 py-2 text-sm ${isYours ? "bg-[var(--primary-soft)] font-bold text-[var(--primary)]" : "text-[var(--text-muted)]"}`}>
                  <span>{lvl}</span>
                  <span>{isYours ? "← Your level" : ""}</span>
                </div>
              );
            })}
          </div>

          <Button className="mt-8" size="lg" onClick={() => router.push("/learn/map")}>
            🚀 Start Learning
          </Button>
        </div>
      )}
    </div>
  );
}
