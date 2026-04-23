"use client";

import { useState, useCallback } from "react";
import { CheckCircle2, ChevronRight, Volume2 } from "lucide-react";
import { AudioPlayer } from "./AudioPlayer";
import { TranscriptViewer } from "./TranscriptViewer";
import type { ListeningClip, ListeningQuestion, VocabItem } from "@/features/listening/api";
import { recordListeningProgress } from "@/features/listening/api";
import { recordDailyActivity } from "@/features/gamification/api";

interface Props {
  clip: ListeningClip;
  questions: ListeningQuestion[];
}

type Stage = 1 | 2 | 3 | 4 | 5;

// Pick 5-8 words from the transcript for fill-in-the-blank
function pickBlanks(transcript: string, vocab: VocabItem[]): string[] {
  const vocabWords = vocab.map((v) => v.word.toLowerCase());
  const words = transcript.split(/\s+/).map((w) => w.replace(/[^a-zA-Z']/g, "").toLowerCase());
  const candidates = [...new Set(words)].filter(
    (w) => w.length > 4 && vocabWords.includes(w)
  );
  return candidates.slice(0, Math.min(6, candidates.length));
}

export function ClipWizard({ clip, questions }: Props) {
  const [stage, setStage] = useState<Stage>(1);
  const [prediction, setPrediction] = useState("");
  const [globalAnswer, setGlobalAnswer] = useState("");
  const [blankAnswers, setBlankAnswers] = useState<string[]>([]);
  const [quizAnswers, setQuizAnswers] = useState<Record<string, string>>({});
  const [revealed, setRevealed] = useState(false);
  const [score, setScore] = useState(0);
  const [completed, setCompleted] = useState(false);

  const vocab: VocabItem[] = (() => {
    if (!clip.vocabulary) return [];
    if (typeof clip.vocabulary === "string") {
      try { return JSON.parse(clip.vocabulary); } catch { return []; }
    }
    return clip.vocabulary as VocabItem[];
  })();

  const blanks = pickBlanks(clip.transcript, vocab);

  const comprQuestions = questions.filter(
    (q) => q.questionType === "comprehension" || q.questionType === "true_false"
  );

  const xpForClip = Math.round(
    (clip.durationSeconds / 60) * (["C1", "C2"].includes(clip.level) ? 25 : ["B1", "B2"].includes(clip.level) ? 15 : 8)
  );

  const handleComplete = useCallback(async () => {
    let pts = 0;
    // score comprehension answers
    comprQuestions.forEach((q) => {
      const ans = quizAnswers[q.id] ?? "";
      const correct = typeof q.correctAnswer === "string"
        ? q.correctAnswer.replace(/"/g, "")
        : String(q.correctAnswer);
      if (ans.toLowerCase().trim() === correct.toLowerCase().trim()) pts += 20;
    });
    // score blanks
    blanks.forEach((b, i) => {
      if ((blankAnswers[i] ?? "").trim().toLowerCase() === b.toLowerCase()) pts += 10;
    });
    const finalScore = Math.min(100, pts);
    setScore(finalScore);
    setCompleted(true);
    await Promise.all([
      recordListeningProgress(clip.id, finalScore, true),
      recordDailyActivity(xpForClip, 0),
    ]);
  }, [quizAnswers, blankAnswers, blanks, comprQuestions, clip.id]);

  const next = () => {
    if (stage < 5) setStage((s) => (s + 1) as Stage);
    else handleComplete();
  };

  const STAGE_LABELS = [
    "Pre-listening",
    "First listen",
    "Listen + transcript",
    "Comprehension quiz",
    "Post-listening",
  ];

  if (completed) {
    return (
      <div className="space-y-6 text-center py-12">
        <CheckCircle2 className="mx-auto h-16 w-16 text-green-500" />
        <div>
          <p className="text-2xl font-bold text-[var(--text-primary)]">Well done!</p>
          <p className="text-[var(--text-secondary)]">You scored {score}/100 and earned +{xpForClip} XP</p>
        </div>
        <a href="/listen" className="inline-block rounded-[var(--radius-md)] bg-[var(--primary)] px-6 py-2.5 text-sm font-medium text-white hover:opacity-90">
          Back to Library
        </a>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stage progress */}
      <div className="flex items-center gap-1 overflow-x-auto pb-1">
        {([1, 2, 3, 4, 5] as Stage[]).map((s) => (
          <div key={s} className="flex shrink-0 items-center gap-1">
            <div className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold transition-colors ${
              s < stage ? "bg-green-500 text-white"
              : s === stage ? "bg-[var(--primary)] text-white"
              : "bg-[var(--bg-soft)] text-[var(--text-secondary)]"
            }`}>{s < stage ? "✓" : s}</div>
            <span className={`hidden text-xs sm:block ${s === stage ? "text-[var(--text-primary)] font-medium" : "text-[var(--text-secondary)]"}`}>
              {STAGE_LABELS[s - 1]}
            </span>
            {s < 5 && <ChevronRight className="h-3 w-3 shrink-0 text-[var(--text-secondary)]" />}
          </div>
        ))}
      </div>

      {/* ── Stage 1: Pre-listening ─────────────────────────────────── */}
      {stage === 1 && (
        <div className="space-y-6">
          <h2 className="text-lg font-semibold">Vocabulary preview</h2>
          {vocab.length > 0 ? (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {vocab.map((v) => (
                <div key={v.word} className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--bg-surface)] p-3 space-y-1">
                  <p className="font-semibold text-[var(--primary)]">{v.word}</p>
                  <p className="text-xs text-[var(--text-secondary)]">{v.definition}</p>
                  <p className="text-xs italic text-[var(--text-secondary)]">&ldquo;{v.example}&rdquo;</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-[var(--text-secondary)] text-sm">No vocabulary preview for this clip.</p>
          )}

          <div className="space-y-2">
            <p className="font-medium">What do you think this clip is about?</p>
            <div className="flex flex-wrap gap-2">
              {["Work and career", "Technology and science", "Travel and culture", "Daily life and health"].map((opt) => (
                <button
                  key={opt}
                  onClick={() => setPrediction(opt)}
                  className={`rounded-full border px-3 py-1 text-sm transition-colors ${
                    prediction === opt
                      ? "border-[var(--primary)] bg-[var(--primary-soft)] text-[var(--primary)]"
                      : "border-[var(--border)] hover:border-[var(--primary)]"
                  }`}
                >
                  {opt}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── Stage 2: First listen (no transcript) ─────────────────── */}
      {stage === 2 && (
        <div className="space-y-6">
          <h2 className="text-lg font-semibold">Listen once — no transcript</h2>
          <p className="text-sm text-[var(--text-secondary)]">You have 2 plays. Focus on the general topic.</p>
          <AudioPlayer src={clip.audioUrl} maxPlays={2} />

          <div className="space-y-3">
            <p className="font-medium">What was the main topic?</p>
            {["Work / Career", "Environment / Nature", "Technology / AI", "Health / Lifestyle"].map((opt) => (
              <button
                key={opt}
                onClick={() => setGlobalAnswer(opt)}
                className={`block w-full rounded-[var(--radius-md)] border px-4 py-2.5 text-left text-sm transition-colors ${
                  globalAnswer === opt
                    ? "border-[var(--primary)] bg-[var(--primary-soft)] text-[var(--primary)]"
                    : "border-[var(--border)] hover:border-[var(--primary)]"
                }`}
              >
                {opt}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── Stage 3: Second listen + transcript + blanks ──────────── */}
      {stage === 3 && (
        <div className="space-y-6">
          <h2 className="text-lg font-semibold">Listen with transcript — fill the blanks</h2>
          <p className="text-sm text-[var(--text-secondary)]">
            Read along and fill in the {blanks.length} missing words.
          </p>
          <AudioPlayer src={clip.audioUrl} />
          <TranscriptViewer
            transcript={clip.transcript}
            blanks={blanks}
            blankAnswers={blankAnswers}
            onBlankChange={(idx, val) =>
              setBlankAnswers((prev) => { const next = [...prev]; next[idx] = val; return next; })
            }
            revealed={revealed}
          />
          {!revealed && (
            <button
              onClick={() => setRevealed(true)}
              className="text-sm text-[var(--primary)] underline"
            >
              Show answers
            </button>
          )}
        </div>
      )}

      {/* ── Stage 4: Comprehension quiz ───────────────────────────── */}
      {stage === 4 && (
        <div className="space-y-6">
          <h2 className="text-lg font-semibold">Comprehension quiz</h2>
          {comprQuestions.length === 0 && (
            <p className="text-[var(--text-secondary)] text-sm">No quiz questions for this clip. Great listening practice!</p>
          )}
          {comprQuestions.map((q, qi) => {
            const opts: string[] = (() => {
              if (!q.options) return ["True", "False"];
              if (typeof q.options === "string") { try { return JSON.parse(q.options); } catch { return []; } }
              return q.options;
            })();

            return (
              <div key={q.id} className="space-y-3 rounded-[var(--radius-lg)] border border-[var(--border)] p-4">
                <div className="flex items-start justify-between gap-2">
                  <p className="font-medium text-sm">{qi + 1}. {q.prompt}</p>
                  {q.timestampStart !== undefined && q.timestampEnd !== undefined && (
                    <a
                      href={`#audio`}
                      className="shrink-0 flex items-center gap-1 rounded px-2 py-1 text-xs text-[var(--primary)] border border-[var(--primary)] hover:bg-[var(--primary-soft)]"
                      onClick={(e) => { e.preventDefault(); }}
                    >
                      <Volume2 className="h-3 w-3" />
                      Replay
                    </a>
                  )}
                </div>
                <div className="flex flex-wrap gap-2">
                  {opts.map((opt) => (
                    <button
                      key={opt}
                      onClick={() => setQuizAnswers((prev) => ({ ...prev, [q.id]: opt }))}
                      className={`rounded-full border px-3 py-1 text-sm transition-colors ${
                        quizAnswers[q.id] === opt
                          ? "border-[var(--primary)] bg-[var(--primary-soft)] text-[var(--primary)]"
                          : "border-[var(--border)] hover:border-[var(--primary)]"
                      }`}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Stage 5: Post-listening ───────────────────────────────── */}
      {stage === 5 && (
        <div className="space-y-6">
          <h2 className="text-lg font-semibold">Post-listening</h2>

          {/* Add words to flashcards */}
          {vocab.length > 0 && (
            <div className="rounded-[var(--radius-lg)] border border-[var(--border)] p-4 space-y-3">
              <p className="font-medium">Add vocabulary to flashcards</p>
              <div className="flex flex-wrap gap-2">
                {vocab.map((v) => (
                  <span key={v.word} className="rounded-full bg-[var(--bg-soft)] px-3 py-1 text-sm">
                    {v.word}
                  </span>
                ))}
              </div>
              <a
                href={`/sets/new?words=${encodeURIComponent(vocab.map((v) => v.word).join(","))}`}
                className="inline-block rounded-[var(--radius-md)] border border-[var(--primary)] px-4 py-2 text-sm text-[var(--primary)] hover:bg-[var(--primary-soft)] transition-colors"
              >
                Add {vocab.length} words to flashcards
              </a>
            </div>
          )}

          {/* Shadow speaking */}
          <div className="rounded-[var(--radius-lg)] border border-[var(--border)] p-4 space-y-3">
            <p className="font-medium">Shadow speaking practice</p>
            <p className="text-sm text-[var(--text-secondary)]">
              Play the audio and speak along. Try to match the speaker's rhythm and pronunciation.
            </p>
            <AudioPlayer src={clip.audioUrl} />
          </div>

          {/* Attribution */}
          {clip.license !== "Original" && (
            <p className="text-xs text-[var(--text-secondary)]">
              Source: {clip.source}
              {clip.sourceUrl && (
                <> — <a href={clip.sourceUrl} target="_blank" rel="noopener noreferrer" className="underline">View original</a></>
              )}
              {" "}(License: {clip.license})
            </p>
          )}
        </div>
      )}

      {/* Navigation */}
      <div className="flex justify-end pt-2">
        <button
          onClick={stage === 5 ? handleComplete : next}
          className="rounded-[var(--radius-md)] bg-[var(--primary)] px-6 py-2.5 text-sm font-semibold text-white hover:opacity-90 transition-opacity"
        >
          {stage === 5 ? `Finish (+${xpForClip} XP)` : "Continue"}
        </button>
      </div>
    </div>
  );
}
