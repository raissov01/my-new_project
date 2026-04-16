"use client";

import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import Link from "next/link";
import { ArrowDown, ArrowUp, Loader2, Star, Flame, Trophy, WifiOff } from "lucide-react";
import { useLocale } from "@/components/providers/locale-provider";
import { Button } from "@/components/ui/button";

// ─── WS protocol types ────────────────────────────────────────

type WsMsg =
  | { type: "session_state"; data: SessionState }
  | { type: "game_started"; data: { totalQuestions: number; mode: string } }
  | { type: "question"; data: QuestionEvt }
  | { type: "answer_accepted"; data: AnswerResult }
  | { type: "question_ended"; data: QuestionEndedEvt }
  | { type: "game_ended"; data: { finalLeaderboard: LeaderEntry[] } }
  | { type: "error"; data: { message: string } };

type SessionState = {
  status: string;
  mode: string;
  quizTitle: string;
  totalQuestions: number;
  currentQuestion: number;
};

type LiveQuestion = {
  id: string;
  questionText: string;
  questionType: string;
  optionA?: string;
  optionB?: string;
  optionC?: string;
  optionD?: string;
  reorderItems?: string[]; // shuffled display order for reorder questions
  timeLimit: number;
  imageUrl?: string;
};

type QuestionEvt = {
  index: number;
  total: number;
  deadlineMs: number;
  question: LiveQuestion;
};

type AnswerResult = {
  isCorrect: boolean;
  pointsEarned: number;
  totalScore: number;
  streak: number;
};

type QuestionEndedEvt = {
  questionIndex: number;
  correctOption?: string;
  blankAnswer?: string;
  correctOrder?: string[]; // for reorder reveal
  leaderboard: LeaderEntry[];
};

type LeaderEntry = { id: string; displayName: string; score: number; streak: number; rank: number };

type Phase =
  | "waiting"    // in lobby or waiting for next question
  | "question"   // answering
  | "answered"   // submitted, waiting for reveal
  | "revealed"   // question ended, showing result
  | "finished";  // game over

// ─── Main component ───────────────────────────────────────────

function LiveGameInner() {
  const { t } = useLocale();
  const { code } = useParams<{ code: string }>();
  const searchParams = useSearchParams();
  const pid = searchParams.get("pid") ?? "";

  const [phase, setPhase] = useState<Phase>("waiting");
  const [quizTitle, setQuizTitle] = useState("");
  const [totalQ, setTotalQ] = useState(0);
  const [currentQEvt, setCurrentQEvt] = useState<QuestionEvt | null>(null);
  const [answerResult, setAnswerResult] = useState<AnswerResult | null>(null);
  const [questionEnded, setQuestionEnded] = useState<QuestionEndedEvt | null>(null);
  const [finalLeaderboard, setFinalLeaderboard] = useState<LeaderEntry[]>([]);
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [timeLeft, setTimeLeft] = useState(0);
  const [selectedOpt, setSelectedOpt] = useState<string | null>(null);
  const [blankInput, setBlankInput] = useState("");
  const [reorderDraft, setReorderDraft] = useState<string[]>([]);
  const [reorderSubmitted, setReorderSubmitted] = useState(false);
  const [wsError, setWsError] = useState("");
  // "connected" | "reconnecting" | "disconnected"
  const [wsStatus, setWsStatus] = useState<"connected" | "reconnecting" | "disconnected">("connected");

  const wsRef = useRef<WebSocket | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startRef = useRef<number>(0); // question start time for timeSpent
  // phaseRef always holds the latest phase so ws.onclose never reads a
  // stale closure value captured when the WebSocket was first opened.
  const phaseRef = useRef<Phase>("waiting");
  const retryCountRef = useRef(0);
  const retryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Indirection so connectWs can call handleServerMsg without capturing a
  // stale reference (handleServerMsg is defined below).
  const handleServerMsgRef = useRef<(msg: WsMsg) => void>(() => {});

  useEffect(() => { phaseRef.current = phase; }, [phase]);

  // ── Connect ──
  const connectWs = useCallback((isManualRetry = false) => {
    if (!pid || !code) return;

    if (isManualRetry) {
      retryCountRef.current = 0;
      setWsError("");
      setWsStatus("reconnecting");
    }

    const backendWsUrl = (process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5000/api/v1")
      .replace("/api/v1", "")
      .replace("http://", "ws://")
      .replace("https://", "wss://");

    const url = `${backendWsUrl}/api/v1/live/${code}/ws?role=player&pid=${pid}`;
    const ws = new WebSocket(url);
    wsRef.current = ws;

    ws.onopen = () => {
      retryCountRef.current = 0;
      setWsStatus("connected");
      setWsError("");
    };

    ws.onmessage = (e) => {
      try {
        const msg = JSON.parse(e.data) as WsMsg;
        handleServerMsgRef.current(msg);
      } catch {}
    };

    ws.onerror = () => {
      // onerror always precedes onclose — just mark it; onclose handles retry.
      setWsError("error");
    };

    ws.onclose = () => {
      if (phaseRef.current === "finished") return; // game over — no reconnect
      const attempt = retryCountRef.current;
      if (attempt >= 3) {
        setWsStatus("disconnected");
        setWsError("disconnected");
        return;
      }
      retryCountRef.current += 1;
      setWsStatus("reconnecting");
      const delay = Math.pow(2, attempt) * 1000; // 1s → 2s → 4s
      retryTimerRef.current = setTimeout(() => connectWs(), delay);
    };
  }, [pid, code]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!pid || !code) return;
    connectWs();
    return () => {
      wsRef.current?.close();
      if (timerRef.current) clearInterval(timerRef.current);
      if (retryTimerRef.current) clearTimeout(retryTimerRef.current);
    };
  }, [pid, code, connectWs]);

  const handleServerMsg = useCallback((msg: WsMsg) => {
    switch (msg.type) {
      case "session_state":
        setQuizTitle(msg.data.quizTitle);
        setTotalQ(msg.data.totalQuestions);
        if (msg.data.status === "lobby" || msg.data.status === "active") {
          setPhase("waiting");
        }
        break;

      case "game_started":
        setTotalQ(msg.data.totalQuestions);
        setPhase("waiting");
        break;

      case "question":
        setCurrentQEvt(msg.data);
        setAnswerResult(null);
        setQuestionEnded(null);
        setSelectedOpt(null);
        setBlankInput("");
        setReorderDraft(msg.data.question.reorderItems ?? []);
        setReorderSubmitted(false);
        setPhase("question");
        startRef.current = Date.now();
        startTimer(msg.data.deadlineMs);
        break;

      case "answer_accepted":
        setAnswerResult(msg.data);
        setScore(msg.data.totalScore);
        setStreak(msg.data.streak);
        setPhase("answered");
        break;

      case "question_ended":
        stopTimer();
        setQuestionEnded(msg.data);
        setPhase("revealed");
        break;

      case "game_ended":
        stopTimer();
        setFinalLeaderboard(msg.data.finalLeaderboard);
        setPhase("finished");
        break;
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Keep the ref up to date so connectWs always calls the latest version.
  useEffect(() => { handleServerMsgRef.current = handleServerMsg; }, [handleServerMsg]);

  function startTimer(deadlineMs: number) {
    stopTimer();
    timerRef.current = setInterval(() => {
      const left = Math.max(0, Math.ceil((deadlineMs - Date.now()) / 1000));
      setTimeLeft(left);
    }, 250);
  }

  function stopTimer() {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setTimeLeft(0);
  }

  const submitAnswer = useCallback((option?: string, text?: string, orderAnswer?: string[]) => {
    const timeSpent = Math.round((Date.now() - startRef.current) / 1000);
    wsRef.current?.send(JSON.stringify({
      type: "submit_answer",
      data: {
        option: option ?? "",
        textAnswer: text ?? "",
        orderAnswer: orderAnswer ?? [],
        timeSpent,
      },
    }));
  }, []);

  // ── Render ────────────────────────────────────────────────────

  if (!pid) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 px-4">
        <p className="text-[var(--text-secondary)]">Invalid session link. Please join via the code page.</p>
        <Link href="/quizzes/join"><Button variant="outline">Join a game</Button></Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-6 sm:px-6">
      {/* Disconnected full-screen overlay */}
      {wsStatus === "disconnected" && phase !== "finished" ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[var(--bg-base)]/90 p-4 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-[1.6rem] border border-[var(--border)] bg-[var(--bg-elevated)] p-8 text-center shadow-[var(--surface-shadow-strong)]">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full border-2 border-rose-500/30 bg-rose-500/10">
              <WifiOff className="h-8 w-8 text-rose-400" />
            </div>
            <h2 className="mt-4 text-xl font-semibold text-[var(--text-primary)]">
              {t("quiz.live.disconnected")}
            </h2>
            <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
              {t("quiz.live.disconnectedBody")}
            </p>
            <div className="mt-6 flex flex-col gap-3">
              <Button
                type="button"
                onClick={() => connectWs(true)}
                className="w-full"
              >
                {t("quiz.live.retry")}
              </Button>
              <Link href="/quizzes/join" className="w-full">
                <Button type="button" variant="outline" className="w-full">
                  {t("quiz.live.leaveGame")}
                </Button>
              </Link>
            </div>
          </div>
        </div>
      ) : null}

      {/* Reconnecting banner */}
      {wsStatus === "reconnecting" && phase !== "finished" ? (
        <div className="mb-4 flex items-center gap-2 rounded-[var(--radius-lg)] border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-300">
          <Loader2 className="h-4 w-4 shrink-0 animate-spin" />
          <span>
            {t("quiz.live.reconnecting")}{" "}
            <span className="font-medium">
              {t("quiz.live.reconnectAttempt").replace("{n}", String(retryCountRef.current))}
            </span>
          </span>
        </div>
      ) : null}

      {/* Header */}
      <div className="mb-6 flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-[var(--text-muted)]">{quizTitle}</p>
          {currentQEvt ? (
            <p className="text-sm text-[var(--text-secondary)]">
              {t("quiz.live.question")} {currentQEvt.index + 1} / {totalQ}
            </p>
          ) : null}
        </div>
        <div className="flex items-center gap-3 text-sm">
          <span className="flex items-center gap-1 font-semibold text-amber-400">
            <Star className="h-4 w-4 fill-amber-400" />
            {score}
          </span>
          {streak > 1 ? (
            <span className="flex items-center gap-1 font-semibold text-orange-400">
              <Flame className="h-4 w-4 fill-orange-400" />
              {streak}
            </span>
          ) : null}
        </div>
      </div>

      {/* Phases */}
      {phase === "waiting" && (
        <WaitingScreen title={quizTitle} />
      )}

      {phase === "question" && currentQEvt && (
        <QuestionScreen
          evt={currentQEvt}
          timeLeft={timeLeft}
          selectedOpt={selectedOpt}
          blankInput={blankInput}
          reorderDraft={reorderDraft}
          reorderSubmitted={reorderSubmitted}
          onBlankChange={setBlankInput}
          onReorderChange={setReorderDraft}
          onSelect={(opt) => {
            setSelectedOpt(opt);
            submitAnswer(opt);
          }}
          onBlankSubmit={() => submitAnswer(undefined, blankInput)}
          onReorderSubmit={() => {
            setReorderSubmitted(true);
            submitAnswer(undefined, undefined, reorderDraft);
          }}
        />
      )}

      {phase === "answered" && answerResult && (
        <AnsweredScreen result={answerResult} t={t} />
      )}

      {phase === "revealed" && questionEnded && (
        <RevealedScreen ended={questionEnded} result={answerResult} pid={pid} t={t} />
      )}

      {phase === "finished" && (
        <FinishedScreen leaderboard={finalLeaderboard} pid={pid} t={t} />
      )}
    </div>
  );
}

// ─── Sub-screens ──────────────────────────────────────────────

function WaitingScreen({ title }: { title: string }) {
  const { t } = useLocale();
  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4 text-center">
      <div className="flex h-16 w-16 animate-pulse items-center justify-center rounded-full bg-[var(--primary)]/10">
        <Star className="h-8 w-8 text-[var(--primary)]" />
      </div>
      <h2 className="text-xl font-semibold text-[var(--text-primary)]">{t("quiz.live.waitingStart")}</h2>
      <p className="text-sm text-[var(--text-secondary)]">{t("quiz.live.hostStartsSoon")}</p>
    </div>
  );
}

const OPTION_COLORS = [
  "border-blue-500/40 bg-blue-500/10 hover:bg-blue-500/20 text-blue-300",
  "border-amber-500/40 bg-amber-500/10 hover:bg-amber-500/20 text-amber-300",
  "border-rose-500/40 bg-rose-500/10 hover:bg-rose-500/20 text-rose-300",
  "border-emerald-500/40 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300",
];
const OPTION_KEYS = ["a", "b", "c", "d"] as const;

function QuestionScreen({
  evt, timeLeft, selectedOpt, blankInput, reorderDraft, reorderSubmitted,
  onBlankChange, onReorderChange, onSelect, onBlankSubmit, onReorderSubmit,
}: {
  evt: QuestionEvt;
  timeLeft: number;
  selectedOpt: string | null;
  blankInput: string;
  reorderDraft: string[];
  reorderSubmitted: boolean;
  onBlankChange: (v: string) => void;
  onReorderChange: (items: string[]) => void;
  onSelect: (opt: string) => void;
  onBlankSubmit: () => void;
  onReorderSubmit: () => void;
}) {
  const { t } = useLocale();
  const q = evt.question;
  const pct = q.timeLimit > 0 ? (timeLeft / q.timeLimit) * 100 : 0;
  const [multiSelected, setMultiSelected] = useState<Set<string>>(() => new Set());

  const optValues: Record<string, string | undefined> = {
    a: q.optionA, b: q.optionB, c: q.optionC, d: q.optionD,
  };

  return (
    <div className="space-y-5">
      {/* Timer bar */}
      <div className="h-2 overflow-hidden rounded-full bg-[var(--bg-base)]">
        <div
          className={`h-full rounded-full transition-all duration-300 ${pct > 40 ? "bg-emerald-500" : pct > 20 ? "bg-amber-400" : "bg-rose-500"}`}
          style={{ width: `${pct}%` }}
        />
      </div>

      {/* Question */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      {q.imageUrl ? (
        <img
          src={q.imageUrl}
          alt=""
          loading="lazy"
          decoding="async"
          className="w-full rounded-[1.2rem] object-cover"
          style={{ maxHeight: 200 }}
        />
      ) : null}
      <div className="rounded-[1.5rem] border border-[var(--border)] bg-[var(--bg-elevated)] p-5">
        <p className="text-lg font-semibold leading-snug text-[var(--text-primary)]">{q.questionText}</p>
      </div>

      {/* Answer inputs */}
      {q.questionType === "mcq" && (
        <div className="grid grid-cols-2 gap-3">
          {OPTION_KEYS.map((opt, i) => {
            const val = optValues[opt];
            if (!val) return null;
            const chosen = selectedOpt === opt;
            return (
              <button
                key={opt}
                type="button"
                disabled={!!selectedOpt}
                onClick={() => onSelect(opt)}
                className={`flex items-center gap-2 rounded-[1.2rem] border-2 p-4 text-left text-sm font-medium transition-all ${
                  chosen
                    ? "border-[var(--primary)] bg-[var(--primary)]/15 text-[var(--primary)]"
                    : OPTION_COLORS[i]
                } disabled:cursor-not-allowed disabled:opacity-60`}
              >
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-current text-xs font-bold">
                  {opt.toUpperCase()}
                </span>
                {val}
              </button>
            );
          })}
        </div>
      )}

      {q.questionType === "mcq_multi" && (
        <div className="space-y-3">
          <p className="text-xs text-[var(--text-muted)]">
            {t("quiz.play.selectMultiple")}
          </p>
          <div className="grid grid-cols-2 gap-3">
            {OPTION_KEYS.map((opt, i) => {
              const val = optValues[opt];
              if (!val) return null;
              const chosen = multiSelected.has(opt);
              return (
                <button
                  key={opt}
                  type="button"
                  disabled={!!selectedOpt}
                  onClick={() => {
                    if (selectedOpt) return;
                    setMultiSelected((prev) => {
                      const next = new Set(prev);
                      if (next.has(opt)) {
                        next.delete(opt);
                      } else {
                        next.add(opt);
                      }
                      return next;
                    });
                  }}
                  className={`flex items-center gap-2 rounded-[1.2rem] border-2 p-4 text-left text-sm font-medium transition-all ${
                    chosen
                      ? "border-[var(--primary)] bg-[var(--primary)]/15 text-[var(--primary)]"
                      : OPTION_COLORS[i]
                  } disabled:cursor-not-allowed disabled:opacity-60`}
                >
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-[var(--radius-sm)] border border-current text-xs font-bold">
                    {opt.toUpperCase()}
                  </span>
                  {val}
                </button>
              );
            })}
          </div>
          <Button
            type="button"
            disabled={!!selectedOpt || multiSelected.size === 0}
            onClick={() => {
              const sorted = ["a", "b", "c", "d"].filter((k) => multiSelected.has(k));
              onSelect(sorted.join(","));
            }}
            className="w-full"
          >
            {selectedOpt ? (t("quiz.live.submitted") || "Submitted") : (t("quiz.play.submitSelection") || "Confirm")}
          </Button>
        </div>
      )}

      {q.questionType === "true_false" && (
        <div className="grid grid-cols-2 gap-3">
          {(["t", "f"] as const).map((opt, i) => {
            const label = opt === "t" ? "True" : "False";
            const chosen = selectedOpt === opt;
            return (
              <button
                key={opt}
                type="button"
                disabled={!!selectedOpt}
                onClick={() => onSelect(opt)}
                className={`rounded-[1.2rem] border-2 p-5 text-center text-base font-semibold transition-all ${
                  chosen
                    ? "border-[var(--primary)] bg-[var(--primary)]/15 text-[var(--primary)]"
                    : i === 0
                      ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20"
                      : "border-rose-500/40 bg-rose-500/10 text-rose-300 hover:bg-rose-500/20"
                } disabled:cursor-not-allowed disabled:opacity-60`}
              >
                {label}
              </button>
            );
          })}
        </div>
      )}

      {q.questionType === "fill_blank" && (
        <form
          onSubmit={(e) => { e.preventDefault(); if (blankInput.trim()) onBlankSubmit(); }}
          className="flex gap-2"
        >
          <input
            type="text"
            value={blankInput}
            onChange={(e) => onBlankChange(e.target.value)}
            placeholder={t("quiz.fillBlankPlaceholder") || "Your answer…"}
            disabled={!!selectedOpt}
            className="flex-1 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--bg-surface)] px-3.5 py-2.5 text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:border-[var(--primary)] focus:outline-none disabled:opacity-60"
          />
          <Button type="submit" disabled={!blankInput.trim() || !!selectedOpt}>
            {t("quiz.submit") || "Submit"}
          </Button>
        </form>
      )}

      {q.questionType === "reorder" && (
        <div className="space-y-3">
          <p className="text-xs text-[var(--text-muted)]">{t("quiz.play.reorderHint") || "Arrange in the correct order"}</p>
          <div className="space-y-2">
            {reorderDraft.map((item, idx) => (
              <div
                key={`${idx}-${item}`}
                className="flex items-center gap-2 rounded-[1.2rem] border border-[var(--border)] bg-[var(--bg-surface)] px-3 py-3"
              >
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[var(--bg-soft)] text-xs font-semibold text-[var(--text-secondary)]">
                  {idx + 1}
                </span>
                <span className="flex-1 text-sm font-medium text-[var(--text-primary)]">{item}</span>
                <button
                  type="button"
                  onClick={() => {
                    if (reorderSubmitted || idx === 0) return;
                    const next = [...reorderDraft];
                    [next[idx], next[idx - 1]] = [next[idx - 1], next[idx]];
                    onReorderChange(next);
                  }}
                  disabled={reorderSubmitted || idx === 0}
                  className="inline-flex h-7 w-7 items-center justify-center rounded-full text-[var(--text-secondary)] transition-colors hover:bg-[var(--bg-soft)] disabled:opacity-30"
                  aria-label="Move up"
                >
                  <ArrowUp className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (reorderSubmitted || idx === reorderDraft.length - 1) return;
                    const next = [...reorderDraft];
                    [next[idx], next[idx + 1]] = [next[idx + 1], next[idx]];
                    onReorderChange(next);
                  }}
                  disabled={reorderSubmitted || idx === reorderDraft.length - 1}
                  className="inline-flex h-7 w-7 items-center justify-center rounded-full text-[var(--text-secondary)] transition-colors hover:bg-[var(--bg-soft)] disabled:opacity-30"
                  aria-label="Move down"
                >
                  <ArrowDown className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
          <Button
            type="button"
            onClick={onReorderSubmit}
            disabled={reorderSubmitted || reorderDraft.length === 0}
            className="w-full"
          >
            {reorderSubmitted ? (t("quiz.live.submitted") || "Submitted") : (t("quiz.play.submitAnswer") || "Submit")}
          </Button>
        </div>
      )}
    </div>
  );
}

function AnsweredScreen({ result, t }: { result: AnswerResult; t: (k: string) => string }) {
  return (
    <div
      role="status"
      aria-live="polite"
      className="flex min-h-[50vh] flex-col items-center justify-center gap-4 text-center"
    >
      <div
        className={`flex h-20 w-20 items-center justify-center rounded-full border-4 ${
          result.isCorrect
            ? "border-emerald-400/60 bg-emerald-500/15"
            : "border-rose-400/60 bg-rose-500/15"
        }`}
      >
        <span className="text-4xl" aria-hidden="true">
          {result.isCorrect ? "✓" : "✗"}
        </span>
      </div>
      <h2 className={`text-2xl font-bold ${result.isCorrect ? "text-emerald-400" : "text-rose-400"}`}>
        {result.isCorrect ? t("quiz.live.correct") : t("quiz.live.wrong")}
      </h2>
      {result.isCorrect ? (
        <p className="text-lg font-semibold text-amber-400">+{result.pointsEarned} {t("quiz.live.points")}</p>
      ) : null}
      {result.streak > 1 ? (
        <p className="flex items-center gap-1.5 text-sm font-semibold text-orange-400">
          <Flame className="h-4 w-4 fill-orange-400" aria-hidden="true" />
          {result.streak}x streak
        </p>
      ) : null}
      <p className="text-sm text-[var(--text-muted)]">Waiting for next question…</p>
    </div>
  );
}

function RevealedScreen({ ended, result, pid, t }: { ended: QuestionEndedEvt; result: AnswerResult | null; pid: string; t: (k: string) => string }) {
  const myEntry = ended.leaderboard.find((e) => e.id === pid);

  return (
    <div className="space-y-5">
      {result ? (
        <div className={`flex items-center justify-between gap-3 rounded-[1.5rem] border-2 p-4 ${
          result.isCorrect
            ? "border-emerald-500/30 bg-emerald-500/8"
            : "border-rose-500/30 bg-rose-500/8"
        }`}>
          <div>
            <p className={`font-semibold ${result.isCorrect ? "text-emerald-400" : "text-rose-400"}`}>
              {result.isCorrect ? t("quiz.live.correct") : t("quiz.live.wrong")}
            </p>
            {ended.correctOption ? (
              <p className="mt-0.5 text-xs text-[var(--text-muted)]">
                Answer: {ended.correctOption.toUpperCase()}
              </p>
            ) : null}
            {ended.blankAnswer ? (
              <p className="mt-0.5 text-xs text-[var(--text-muted)]">
                Answer: <span className="font-semibold">{ended.blankAnswer}</span>
              </p>
            ) : null}
          </div>
          <div className="text-right">
            <p className="font-mono text-2xl font-bold text-[var(--text-primary)]">{result.totalScore}</p>
            <p className="text-xs text-[var(--text-muted)]">{t("quiz.live.yourScore")}</p>
          </div>
        </div>
      ) : (
        <div className="rounded-[1.5rem] border border-[var(--border)] bg-[var(--bg-surface)] p-4">
          <p className="text-sm text-[var(--text-muted)]">{t("quiz.live.tooSlow")}</p>
          {ended.correctOption ? (
            <p className="mt-1 text-sm text-[var(--text-secondary)]">Answer: {ended.correctOption.toUpperCase()}</p>
          ) : null}
          {ended.blankAnswer ? (
            <p className="mt-1 text-sm text-[var(--text-secondary)]">Answer: <span className="font-semibold">{ended.blankAnswer}</span></p>
          ) : null}
        </div>
      )}

      {/* Mini leaderboard top-3 */}
      <div className="rounded-[1.5rem] border border-[var(--border)] bg-[var(--bg-elevated)] p-4">
        <p className="mb-3 text-xs font-medium uppercase tracking-[0.14em] text-[var(--text-muted)]">
          {t("quiz.live.leaderboard")}
        </p>
        <ul className="space-y-2">
          {ended.leaderboard.slice(0, 5).map((e) => (
            <li key={e.id} className="flex items-center gap-2 text-sm">
              <span className="w-6 text-center font-bold text-[var(--text-muted)]">{e.rank}</span>
              <span className="flex-1 text-[var(--text-primary)]">{e.displayName}</span>
              <span className="font-semibold text-[var(--primary)]">{e.score}</span>
            </li>
          ))}
        </ul>
      </div>

      {ended.correctOrder && ended.correctOrder.length > 0 ? (
        <div className="rounded-[1.5rem] border border-[var(--border)] bg-[var(--bg-elevated)] p-4">
          <p className="mb-2 text-xs font-medium uppercase tracking-[0.14em] text-[var(--text-muted)]">
            Correct order
          </p>
          <ol className="space-y-1.5">
            {ended.correctOrder.map((item, i) => (
              <li key={i} className="flex items-center gap-2 text-sm">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-500/20 text-xs font-bold text-emerald-400">
                  {i + 1}
                </span>
                <span className="text-[var(--text-primary)]">{item}</span>
              </li>
            ))}
          </ol>
        </div>
      ) : null}

      <p className="text-center text-sm text-[var(--text-muted)]">Waiting for next question…</p>
    </div>
  );
}

function FinishedScreen({ leaderboard, pid, t }: { leaderboard: LeaderEntry[]; pid: string; t: (k: string) => string }) {
  const myEntry = leaderboard.find((e) => e.id === pid);
  const medals = ["🥇", "🥈", "🥉"];

  return (
    <div className="space-y-6">
      <div className="text-center">
        <Trophy className="mx-auto h-12 w-12 text-amber-400" />
        <h1 className="mt-3 text-2xl font-bold text-[var(--text-primary)]">{t("quiz.live.finalResults")}</h1>
        {myEntry ? (
          <p className="mt-1 text-[var(--text-secondary)]">
            {t("quiz.live.rank")} {myEntry.rank} — {myEntry.score} {t("quiz.live.points")}
          </p>
        ) : null}
      </div>

      <div className="overflow-hidden rounded-[1.5rem] border border-[var(--border)] bg-[var(--bg-elevated)]">
        <ul className="divide-y divide-[var(--border)]">
          {leaderboard.map((e, i) => (
            <li
              key={e.id}
              className={`flex items-center gap-3 px-5 py-3 ${e.id === pid ? "bg-[var(--primary)]/5" : ""}`}
            >
              <span className="w-7 text-center text-sm font-bold text-[var(--text-muted)]">
                {i < 3 ? medals[i] : e.rank}
              </span>
              <span className="flex-1 text-sm font-medium text-[var(--text-primary)]">{e.displayName}</span>
              <span className="font-semibold text-[var(--primary)]">{e.score}</span>
            </li>
          ))}
        </ul>
      </div>

      <Link href="/quizzes">
        <Button variant="outline" size="lg" className="w-full">
          {t("quiz.backToLibrary")}
        </Button>
      </Link>
    </div>
  );
}

// ─── Page wrapper ─────────────────────────────────────────────

export default function LiveGamePage() {
  return (
    <Suspense>
      <LiveGameInner />
    </Suspense>
  );
}
