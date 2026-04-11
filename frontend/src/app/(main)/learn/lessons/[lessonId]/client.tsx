"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  Heart, Star, Zap, Loader2, CheckCircle2, XCircle,
  ArrowRight, Trophy, X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { startLesson, submitAnswer, completeLesson, type Exercise } from "@/features/learn/api";

type Phase = "loading" | "playing" | "result";

export function LessonClient({ lessonId }: { lessonId: string }) {
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>("loading");
  const [sessionId, setSessionId] = useState("");
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [hearts, setHearts] = useState(5);
  const [combo, setCombo] = useState(0);
  const [comboMax, setComboMax] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [selected, setSelected] = useState<any>(null);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  const [result, setResult] = useState<any>(null);
  const startTime = useRef(Date.now());

  useEffect(() => {
    async function init() {
      try {
        const res = await startLesson(lessonId);
        setSessionId(res.session.id);
        const exData = typeof res.exercises === "string" ? JSON.parse(res.exercises) : res.exercises;
        setExercises(exData.exercises || exData || []);
        setHearts(5);
        setPhase("playing");
        startTime.current = Date.now();
      } catch (err: any) {
        alert(err.message || "Failed to start lesson");
        router.push("/learn/map");
      }
    }
    init();
  }, [lessonId, router]);

  const ex = exercises[currentIdx];

  function checkAnswer(answer: any) {
    if (isCorrect !== null) return;

    let correct = false;

    if (ex.type === "fill_blank") {
      correct = answer === ex.data.correctWord;
    } else if (ex.type === "grammar_choice") {
      correct = answer === ex.data.correct;
    } else if (ex.type === "word_order") {
      const userSentence = typeof answer === "string" ? answer : answer.join(" ");
      correct = userSentence.toLowerCase().trim() === ex.data.correctSentence.toLowerCase().trim();
    } else if (ex.type === "matching") {
      // answer is an array of matched pairs — check all correct
      correct = answer === true; // matching component passes true/false
    } else if (ex.type === "error_correction") {
      correct = typeof answer === "string" && answer.toLowerCase().trim() === ex.data.correction.toLowerCase().trim();
    } else if (ex.type === "translation") {
      const userText = (typeof answer === "string" ? answer : "").toLowerCase().trim();
      correct = (ex.data.acceptedAnswers || []).some(
        (a: string) => a.toLowerCase().trim() === userText
      );
    }

    setIsCorrect(correct);
    setSelected(answer);

    if (correct) {
      setCorrectCount((c) => c + 1);
      setCombo((c) => {
        const next = c + 1;
        setComboMax((m) => Math.max(m, next));
        return next;
      });
    } else {
      setCombo(0);
      setHearts((h) => Math.max(0, h - 1));
    }

    // Report to backend
    submitAnswer(lessonId, {
      sessionId,
      exerciseIndex: currentIdx,
      isCorrect: correct,
    }).then((res) => {
      if (res.heartsRemaining !== undefined) {
        setHearts(res.heartsRemaining);
      }
    });
  }

  function nextExercise() {
    if (currentIdx + 1 < exercises.length && hearts > 0) {
      setCurrentIdx(currentIdx + 1);
      setSelected(null);
      setIsCorrect(null);
    } else {
      finishLesson();
    }
  }

  async function finishLesson() {
    setPhase("loading");
    try {
      const elapsed = Math.floor((Date.now() - startTime.current) / 1000);
      const res = await completeLesson(lessonId, {
        sessionId,
        timeTakenSecs: elapsed,
        comboMax,
      });
      setResult(res);
      setPhase("result");
    } catch {
      router.push("/learn/map");
    }
  }

  // ── Loading ──
  if (phase === "loading") {
    return (
      <div className="flex h-[60vh] flex-col items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-[var(--primary)]" />
        <p className="mt-4 text-sm text-[var(--text-secondary)]">
          {result ? "Calculating results..." : "Preparing your lesson..."}
        </p>
      </div>
    );
  }

  // ── Result ──
  if (phase === "result" && result) {
    return (
      <div className="mx-auto max-w-md px-4 py-12 text-center">
        <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-[var(--primary-soft)]">
          <Trophy className="h-10 w-10 text-[var(--primary)]" />
        </div>
        <h2 className="text-2xl font-bold text-[var(--text-primary)]">Lesson Complete!</h2>

        {/* Stars */}
        <div className="mt-4 flex justify-center gap-2">
          {[1, 2, 3].map((s) => (
            <Star
              key={s}
              className={`h-10 w-10 transition-all duration-500 ${
                s <= result.stars
                  ? "fill-yellow-400 text-yellow-400 scale-110"
                  : "text-[var(--text-muted)] opacity-20"
              }`}
              style={{ transitionDelay: `${s * 200}ms` }}
            />
          ))}
        </div>

        <div className="mt-6 grid grid-cols-2 gap-3">
          <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-surface)] p-3">
            <p className="text-2xl font-bold text-[var(--primary)]">+{result.xpEarned}</p>
            <p className="text-xs text-[var(--text-muted)]">XP Earned</p>
          </div>
          <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-surface)] p-3">
            <p className="text-2xl font-bold text-emerald-500">{result.accuracy}%</p>
            <p className="text-xs text-[var(--text-muted)]">Accuracy</p>
          </div>
          <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-surface)] p-3">
            <p className="text-2xl font-bold text-orange-500">{result.comboMax}x</p>
            <p className="text-xs text-[var(--text-muted)]">Best Combo</p>
          </div>
          <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-surface)] p-3">
            <p className="text-2xl font-bold text-amber-500">{result.streak}</p>
            <p className="text-xs text-[var(--text-muted)]">Day Streak</p>
          </div>
        </div>

        <Button className="mt-8 w-full" size="lg" onClick={() => router.push("/learn/map")}>
          Continue
        </Button>
      </div>
    );
  }

  // ── Playing ──
  if (!ex) return null;

  const progress = ((currentIdx + 1) / exercises.length) * 100;

  return (
    <div className="mx-auto max-w-2xl px-3 py-4 sm:px-4 sm:py-6">
      {/* ── Top bar (sticky on mobile) ── */}
      <div className="sticky top-14 z-20 -mx-3 mb-3 flex items-center gap-3 border-b border-[var(--border)] bg-[var(--bg-base)]/95 px-3 py-2.5 backdrop-blur-md sm:-mx-4 sm:static sm:mb-4 sm:border-0 sm:bg-transparent sm:px-0 sm:py-0 sm:backdrop-blur-none">
        <button onClick={() => router.push("/learn/map")} className="flex h-10 w-10 items-center justify-center rounded-xl text-[var(--text-secondary)] active:scale-95">
          <X className="h-5 w-5" />
        </button>
        <div className="flex-1">
          <div className="h-3 w-full rounded-full bg-[var(--bg-muted)]">
            <div className="h-3 rounded-full bg-[var(--primary)] transition-all" style={{ width: `${progress}%` }} />
          </div>
        </div>
        <div className="flex items-center gap-0.5">
          {Array.from({ length: 5 }).map((_, i) => (
            <Heart key={i} className={`h-5 w-5 ${i < hearts ? "fill-red-500 text-red-500" : "fill-none text-[var(--text-muted)] opacity-30"}`} />
          ))}
        </div>
        {combo >= 2 && (
          <span className="flex items-center gap-1 rounded-full bg-orange-500/15 px-2.5 py-1 text-xs font-bold text-orange-500">
            <Zap className="h-3.5 w-3.5 fill-orange-500" /> {combo}x
          </span>
        )}
      </div>

      {/* ── Exercise card ── */}
      <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-elevated)] p-4 shadow-[var(--shadow-md)] sm:p-6">
        <p className="mb-1 text-xs font-medium uppercase text-[var(--text-muted)]">
          {ex.type.replace("_", " ")}
        </p>
        <p className="mb-5 text-lg font-semibold text-[var(--text-primary)]">{ex.prompt}</p>

        {/* ── Fill Blank ── */}
        {ex.type === "fill_blank" && (
          <div>
            <p className="mb-4 text-base text-[var(--text-secondary)]">
              {ex.data.sentence}
            </p>
            <div className="grid grid-cols-2 gap-2">
              {(ex.data.options || []).map((opt: string, i: number) => {
                let cls = "border-[var(--border)] bg-[var(--bg-surface)] hover:border-[var(--primary)]";
                if (isCorrect !== null) {
                  if (opt === ex.data.correctWord) cls = "border-emerald-500 bg-emerald-500/10";
                  else if (opt === selected) cls = "border-red-500 bg-red-500/10";
                }
                return (
                  <button
                    key={i}
                    onClick={() => checkAnswer(opt)}
                    disabled={isCorrect !== null}
                    className={`rounded-xl border px-4 py-3 text-sm font-medium transition-all ${cls}`}
                  >
                    {opt}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* ── Grammar Choice ── */}
        {ex.type === "grammar_choice" && (
          <div>
            <p className="mb-4 text-base text-[var(--text-secondary)]">{ex.data.sentence}</p>
            <div className="space-y-2">
              {(ex.data.options || []).map((opt: string, i: number) => {
                let cls = "border-[var(--border)] bg-[var(--bg-surface)] hover:border-[var(--primary)]";
                if (isCorrect !== null) {
                  if (i === ex.data.correct) cls = "border-emerald-500 bg-emerald-500/10";
                  else if (i === selected) cls = "border-red-500 bg-red-500/10";
                }
                return (
                  <button
                    key={i}
                    onClick={() => checkAnswer(i)}
                    disabled={isCorrect !== null}
                    className={`flex w-full items-center gap-3 rounded-xl border px-4 py-3 text-left text-sm font-medium transition-all ${cls}`}
                  >
                    {opt}
                    {isCorrect !== null && i === ex.data.correct && <CheckCircle2 className="ml-auto h-5 w-5 text-emerald-500" />}
                    {isCorrect !== null && i === selected && i !== ex.data.correct && <XCircle className="ml-auto h-5 w-5 text-red-500" />}
                  </button>
                );
              })}
            </div>
            {isCorrect !== null && ex.data.rule && (
              <div className="mt-3 rounded-xl border border-[var(--border)] bg-[var(--bg-soft)] p-3 text-xs text-[var(--text-secondary)]">
                {ex.data.rule}
              </div>
            )}
          </div>
        )}

        {/* ── Word Order ── */}
        {ex.type === "word_order" && (
          <WordOrderExercise
            words={ex.data.words || []}
            correctSentence={ex.data.correctSentence || ""}
            isCorrect={isCorrect}
            onSubmit={checkAnswer}
          />
        )}

        {/* ── Matching ── */}
        {ex.type === "matching" && (
          <MatchingExercise
            pairs={ex.data.pairs || []}
            isCorrect={isCorrect}
            onSubmit={checkAnswer}
          />
        )}

        {/* ── Error Correction ── */}
        {ex.type === "error_correction" && (
          <ErrorCorrectionExercise
            sentence={ex.data.sentence || ""}
            errorWord={ex.data.errorWord || ""}
            correction={ex.data.correction || ""}
            rule={ex.data.rule || ""}
            isCorrect={isCorrect}
            onSubmit={checkAnswer}
          />
        )}

        {/* ── Translation ── */}
        {ex.type === "translation" && (
          <TranslationExercise
            sourceText={ex.data.sourceText || ""}
            sourceLang={ex.data.sourceLang || "Russian"}
            acceptedAnswers={ex.data.acceptedAnswers || []}
            hint={ex.data.hint || ""}
            isCorrect={isCorrect}
            onSubmit={checkAnswer}
          />
        )}

        {/* ── Feedback + Next ── */}
        {isCorrect !== null && (
          <div className={`mt-4 flex items-center justify-between rounded-xl p-3 ${
            isCorrect ? "bg-emerald-500/10" : "bg-red-500/10"
          }`}>
            <div className="flex items-center gap-2">
              {isCorrect ? (
                <CheckCircle2 className="h-5 w-5 text-emerald-500" />
              ) : (
                <XCircle className="h-5 w-5 text-red-500" />
              )}
              <span className={`text-sm font-semibold ${isCorrect ? "text-emerald-500" : "text-red-500"}`}>
                {isCorrect ? "Correct!" : "Wrong!"}
                {isCorrect && combo >= 2 && ` (${combo}x combo!)`}
              </span>
            </div>
            <Button size="sm" onClick={nextExercise}>
              {currentIdx + 1 < exercises.length ? (
                <>Continue <ArrowRight className="h-4 w-4" /></>
              ) : (
                "Finish"
              )}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Word Order sub-component ──

function WordOrderExercise({
  words,
  correctSentence,
  isCorrect,
  onSubmit,
}: {
  words: string[];
  correctSentence: string;
  isCorrect: boolean | null;
  onSubmit: (answer: string) => void;
}) {
  const [available, setAvailable] = useState(words);
  const [placed, setPlaced] = useState<string[]>([]);

  function addWord(word: string, idx: number) {
    if (isCorrect !== null) return;
    setPlaced([...placed, word]);
    setAvailable(available.filter((_, i) => i !== idx));
  }

  function removeWord(idx: number) {
    if (isCorrect !== null) return;
    const word = placed[idx];
    setAvailable([...available, word]);
    setPlaced(placed.filter((_, i) => i !== idx));
  }

  function handleCheck() {
    onSubmit(placed.join(" "));
  }

  return (
    <div>
      {/* Placed area */}
      <div className="mb-4 min-h-[48px] flex flex-wrap gap-2 rounded-xl border border-dashed border-[var(--border)] bg-[var(--bg-soft)] p-3">
        {placed.length === 0 && (
          <span className="text-xs text-[var(--text-muted)]">Tap words below to build the sentence...</span>
        )}
        {placed.map((w, i) => (
          <button
            key={i}
            onClick={() => removeWord(i)}
            className="rounded-lg bg-[var(--primary)] px-3 py-1.5 text-sm font-medium text-white transition-transform hover:scale-105"
          >
            {w}
          </button>
        ))}
      </div>

      {/* Available words */}
      <div className="flex flex-wrap gap-2">
        {available.map((w, i) => (
          <button
            key={i}
            onClick={() => addWord(w, i)}
            disabled={isCorrect !== null}
            className="rounded-lg border border-[var(--border)] bg-[var(--bg-surface)] px-3 py-1.5 text-sm font-medium text-[var(--text-primary)] transition-all hover:border-[var(--primary)]"
          >
            {w}
          </button>
        ))}
      </div>

      {/* Submit */}
      {isCorrect === null && placed.length > 0 && (
        <Button className="mt-4 w-full" onClick={handleCheck}>
          Check Answer
        </Button>
      )}

      {/* Show correct answer if wrong */}
      {isCorrect === false && (
        <div className="mt-3 rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-3 text-sm text-emerald-500">
          Correct: <strong>{correctSentence}</strong>
        </div>
      )}
    </div>
  );
}

// ── Matching Exercise ──

function MatchingExercise({
  pairs,
  isCorrect,
  onSubmit,
}: {
  pairs: { term: string; definition: string }[];
  isCorrect: boolean | null;
  onSubmit: (answer: any) => void;
}) {
  const [selectedTerm, setSelectedTerm] = useState<number | null>(null);
  const [matched, setMatched] = useState<Map<number, number>>(new Map());
  const [shuffledDefs] = useState(() => {
    const defs = pairs.map((p, i) => ({ def: p.definition, origIdx: i }));
    for (let i = defs.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [defs[i], defs[j]] = [defs[j], defs[i]];
    }
    return defs;
  });

  function handleTermClick(idx: number) {
    if (isCorrect !== null) return;
    setSelectedTerm(idx);
  }

  function handleDefClick(defIdx: number) {
    if (isCorrect !== null || selectedTerm === null) return;
    const newMatched = new Map(matched);
    newMatched.set(selectedTerm, defIdx);
    setMatched(newMatched);
    setSelectedTerm(null);

    // Check if all matched
    if (newMatched.size === pairs.length) {
      const allCorrect = Array.from(newMatched.entries()).every(
        ([termIdx, dIdx]) => shuffledDefs[dIdx].origIdx === termIdx
      );
      onSubmit(allCorrect);
    }
  }

  return (
    <div className="grid grid-cols-2 gap-3">
      <div className="space-y-2">
        <p className="text-xs font-semibold text-[var(--text-muted)]">📝 Terms</p>
        {pairs.map((p, i) => {
          const isMatched = matched.has(i);
          const isSelected = selectedTerm === i;
          return (
            <button
              key={i}
              onClick={() => handleTermClick(i)}
              disabled={isCorrect !== null || isMatched}
              className={`w-full rounded-lg border px-3 py-2 text-left text-sm transition-all ${
                isSelected ? "border-[var(--primary)] bg-[var(--primary-soft)]" :
                isMatched ? "border-emerald-500/30 bg-emerald-500/5 opacity-60" :
                "border-[var(--border)] bg-[var(--bg-surface)] hover:border-[var(--primary)]"
              }`}
            >
              {p.term}
            </button>
          );
        })}
      </div>
      <div className="space-y-2">
        <p className="text-xs font-semibold text-[var(--text-muted)]">📖 Definitions</p>
        {shuffledDefs.map((d, i) => {
          const isUsed = Array.from(matched.values()).includes(i);
          return (
            <button
              key={i}
              onClick={() => handleDefClick(i)}
              disabled={isCorrect !== null || isUsed || selectedTerm === null}
              className={`w-full rounded-lg border px-3 py-2 text-left text-xs leading-relaxed transition-all ${
                isUsed ? "border-emerald-500/30 bg-emerald-500/5 opacity-60" :
                selectedTerm !== null ? "border-[var(--border)] bg-[var(--bg-surface)] hover:border-amber-500" :
                "border-[var(--border)] bg-[var(--bg-surface)] opacity-70"
              }`}
            >
              {d.def}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ── Error Correction Exercise ──

function ErrorCorrectionExercise({
  sentence,
  errorWord,
  correction,
  rule,
  isCorrect,
  onSubmit,
}: {
  sentence: string;
  errorWord: string;
  correction: string;
  rule: string;
  isCorrect: boolean | null;
  onSubmit: (answer: string) => void;
}) {
  const [input, setInput] = useState("");

  return (
    <div>
      <div className="mb-4 rounded-xl border border-amber-500/20 bg-amber-500/5 p-4">
        <p className="text-sm text-[var(--text-primary)]">
          {sentence.split(errorWord).map((part, i, arr) => (
            <span key={i}>
              {part}
              {i < arr.length - 1 && (
                <span className="rounded bg-red-500/20 px-1 font-bold text-red-500 underline">{errorWord}</span>
              )}
            </span>
          ))}
        </p>
      </div>
      <div className="flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && input.trim() && onSubmit(input)}
          placeholder={`Replace "${errorWord}" with...`}
          disabled={isCorrect !== null}
          className="flex-1 rounded-xl border border-[var(--border)] bg-[var(--bg-surface)] px-4 py-2.5 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:border-[var(--primary)] focus:outline-none"
        />
        {isCorrect === null && (
          <Button onClick={() => onSubmit(input)} disabled={!input.trim()}>Check</Button>
        )}
      </div>
      {isCorrect === false && (
        <div className="mt-3 space-y-2">
          <div className="rounded-xl bg-emerald-500/10 p-3 text-sm text-emerald-600">
            ✅ Correct answer: <strong>{correction}</strong>
          </div>
          <div className="rounded-xl bg-[var(--bg-soft)] p-3 text-xs text-[var(--text-secondary)]">
            💡 {rule}
          </div>
        </div>
      )}
      {isCorrect === true && rule && (
        <div className="mt-3 rounded-xl bg-[var(--bg-soft)] p-3 text-xs text-[var(--text-secondary)]">
          💡 {rule}
        </div>
      )}
    </div>
  );
}

// ── Translation Exercise ──

function TranslationExercise({
  sourceText,
  sourceLang,
  acceptedAnswers,
  hint,
  isCorrect,
  onSubmit,
}: {
  sourceText: string;
  sourceLang: string;
  acceptedAnswers: string[];
  hint: string;
  isCorrect: boolean | null;
  onSubmit: (answer: string) => void;
}) {
  const [input, setInput] = useState("");

  return (
    <div>
      <div className="mb-4 rounded-xl border border-blue-500/20 bg-blue-500/5 p-4">
        <p className="text-xs font-medium text-blue-500 mb-1">🌐 {sourceLang}</p>
        <p className="text-lg font-semibold text-[var(--text-primary)]">{sourceText}</p>
        {hint && <p className="mt-2 text-xs text-[var(--text-muted)]">💡 Hint: {hint}</p>}
      </div>
      <div className="flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && input.trim() && onSubmit(input)}
          placeholder="Type the English translation..."
          disabled={isCorrect !== null}
          className="flex-1 rounded-xl border border-[var(--border)] bg-[var(--bg-surface)] px-4 py-2.5 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:border-[var(--primary)] focus:outline-none"
        />
        {isCorrect === null && (
          <Button onClick={() => onSubmit(input)} disabled={!input.trim()}>Check</Button>
        )}
      </div>
      {isCorrect === false && acceptedAnswers.length > 0 && (
        <div className="mt-3 rounded-xl bg-emerald-500/10 p-3 text-sm text-emerald-600">
          ✅ Accepted answers:
          <ul className="mt-1 list-inside list-disc">
            {acceptedAnswers.map((a, i) => <li key={i}>{a}</li>)}
          </ul>
        </div>
      )}
    </div>
  );
}
