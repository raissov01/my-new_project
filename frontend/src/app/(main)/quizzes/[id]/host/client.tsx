"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Copy, Eye, EyeOff, Play, SkipForward, Square, Users, Wifi, WifiOff, Trophy, BarChart3, CheckCircle } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { useLocale } from "@/components/providers/locale-provider";
import { Button } from "@/components/ui/button";

// ─── WebSocket message types ──────────────────────────────────

type WsMsg =
  | { type: "session_state"; data: SessionState }
  | { type: "player_joined"; data: { participant: Participant; count: number } }
  | { type: "player_left"; data: { participantId: string; displayName: string } }
  | { type: "game_started"; data: { totalQuestions: number; mode: string } }
  | { type: "question"; data: QuestionEvt }
  | { type: "answer_stats"; data: AnswerStats }
  | { type: "question_ended"; data: QuestionEndedEvt }
  | { type: "game_ended"; data: { finalLeaderboard: LeaderEntry[] } }
  | { type: "error"; data: { message: string } };

type Participant = { id: string; displayName: string; score: number; streak: number; rank: number };
type LeaderEntry = { id: string; displayName: string; score: number; streak: number; rank: number };

type SessionState = {
  status: string;
  mode: string;
  joinCode: string;
  quizTitle: string;
  totalQuestions: number;
  currentQuestion: number;
  participants: Participant[];
};

type QuestionEvt = {
  index: number;
  total: number;
  deadlineMs: number;
  question: {
    id: string;
    questionText: string;
    questionType: string;
    optionA?: string;
    optionB?: string;
    optionC?: string;
    optionD?: string;
    timeLimit: number;
  };
};

type AnswerStats = {
  counts: Record<string, number>;
  answered: number;
  total: number;
  questionIndex: number;
};

type QuestionEndedEvt = {
  questionIndex: number;
  correctOption?: string;
  blankAnswer?: string;
  leaderboard: LeaderEntry[];
};

// ─── Host phases ──────────────────────────────────────────────

type Phase =
  | "setup"       // mode + settings selection
  | "lobby"       // waiting for players
  | "question"    // question is live
  | "result"      // question ended, showing leaderboard
  | "finished";   // game over

interface Props {
  quizId: string;
  quizTitle: string;
  locale: string;
}

export function HostLiveClient({ quizId, quizTitle, locale }: Props) {
  const { t } = useLocale();

  // ── Setup state ──
  const [mode, setMode] = useState<"teacher_paced" | "self_paced">("teacher_paced");
  const [allowAnon, setAllowAnon] = useState(true);
  const [showLeaderboard, setShowLeaderboard] = useState(true);

  // ── Session state ──
  const [phase, setPhase] = useState<Phase>("setup");
  const [sessionId, setSessionId] = useState("");
  const [joinCode, setJoinCode] = useState("");
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [totalQ, setTotalQ] = useState(0);
  const [currentQ, setCurrentQ] = useState(0);
  const [currentQData, setCurrentQData] = useState<QuestionEvt | null>(null);
  const [answerStats, setAnswerStats] = useState<AnswerStats | null>(null);
  const [leaderboard, setLeaderboard] = useState<LeaderEntry[]>([]);
  const [finalLeaderboard, setFinalLeaderboard] = useState<LeaderEntry[]>([]);
  const [timeLeft, setTimeLeft] = useState(0);
  const [copied, setCopied] = useState(false);
  const [wsStatus, setWsStatus] = useState<"disconnected" | "connected">("disconnected");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");

  const wsRef = useRef<WebSocket | null>(null);
  // Tracks the last-known rank for each player so we can show rank deltas.
  const prevRanksRef = useRef<Map<string, number>>(new Map());
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const joinUrl = typeof window !== "undefined" ? `${window.location.origin}/quizzes/join?code=${joinCode}` : "";

  // ── WebSocket connection ──
  const connectWS = useCallback((code: string, sId: string) => {
    const backendWsUrl = process.env.NEXT_PUBLIC_API_URL?.replace("/api/v1", "").replace("http://", "ws://").replace("https://", "wss://") ?? "ws://localhost:5000";
    const url = `${backendWsUrl}/api/v1/live/${code}/ws?role=host&token=${sId}`;
    const ws = new WebSocket(url);
    wsRef.current = ws;

    ws.onopen = () => setWsStatus("connected");
    ws.onclose = () => setWsStatus("disconnected");

    ws.onmessage = (e) => {
      try {
        const msg = JSON.parse(e.data) as WsMsg;
        handleServerMsg(msg);
      } catch {}
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleServerMsg = useCallback((msg: WsMsg) => {
    switch (msg.type) {
      case "session_state":
        setParticipants(msg.data.participants ?? []);
        setTotalQ(msg.data.totalQuestions);
        setCurrentQ(msg.data.currentQuestion);
        if (msg.data.status === "lobby") setPhase("lobby");
        else if (msg.data.status === "active") setPhase("question");
        else if (msg.data.status === "finished") setPhase("finished");
        break;

      case "player_joined":
        setParticipants((prev) => {
          const exists = prev.find((p) => p.id === msg.data.participant.id);
          if (exists) return prev;
          return [...prev, { ...msg.data.participant, score: 0, streak: 0, rank: 0 }];
        });
        break;

      case "player_left":
        setParticipants((prev) => prev.filter((p) => p.id !== msg.data.participantId));
        break;

      case "game_started":
        setTotalQ(msg.data.totalQuestions);
        setPhase("question");
        break;

      case "question":
        setCurrentQData(msg.data);
        setCurrentQ(msg.data.index);
        setAnswerStats(null);
        setPhase("question");
        startTimer(msg.data.deadlineMs);
        break;

      case "answer_stats":
        setAnswerStats(msg.data);
        break;

      case "question_ended":
        stopTimer();
        setLeaderboard((prev) => {
          // Capture prev ranks before the new leaderboard lands.
          prevRanksRef.current = new Map(prev.map((e) => [e.id, e.rank]));
          return msg.data.leaderboard;
        });
        setCurrentQData(null);
        setPhase("result");
        break;

      case "game_ended":
        stopTimer();
        setLeaderboard((prev) => {
          // Capture final question's leaderboard ranks for the finished screen.
          prevRanksRef.current = new Map(prev.map((e) => [e.id, e.rank]));
          return prev; // unchanged — just snapshotting ranks
        });
        setFinalLeaderboard(msg.data.finalLeaderboard);
        setPhase("finished");
        break;
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

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

  useEffect(() => () => stopTimer(), []);
  useEffect(() => () => wsRef.current?.close(), []);

  // ── Actions ──
  const sendCmd = (type: string) => {
    wsRef.current?.send(JSON.stringify({ type }));
  };

  const handleCreateSession = async () => {
    setCreating(true);
    setError("");
    try {
      const res = await fetch(`/api/quizzes/${quizId}/live-sessions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode, allowAnonymous: allowAnon }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Failed to create session");
        return;
      }
      setSessionId(data.id);
      setJoinCode(data.joinCode);
      setPhase("lobby");
      connectWS(data.joinCode, data.id);
    } catch {
      setError("Network error");
    } finally {
      setCreating(false);
    }
  };

  const copyCode = () => {
    navigator.clipboard.writeText(joinCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // ── Render ────────────────────────────────────────────────────

  if (phase === "setup") {
    return (
      <div className="space-y-8">
        <div className="flex items-center gap-3">
          <Link href={`/quizzes/${quizId}`} className="inline-flex items-center gap-1.5 text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors">
            <ArrowLeft className="h-4 w-4" />
            {t("quiz.backToQuiz")}
          </Link>
        </div>

        <div className="rounded-[2rem] border border-[var(--border)] bg-[var(--bg-elevated)] p-6 shadow-[var(--surface-shadow-strong)] sm:p-8">
          <p className="text-xs font-medium uppercase tracking-[0.22em] text-[var(--text-muted)]">
            {t("quiz.liveMode")}
          </p>
          <h1 className="mt-3 text-3xl font-semibold tracking-[-0.04em] text-[var(--text-primary)]">
            {quizTitle}
          </h1>
          <p className="mt-2 text-sm text-[var(--text-secondary)]">{t("quiz.live.createSubtitle")}</p>
        </div>

        {/* Mode selector */}
        <div className="grid gap-4 sm:grid-cols-2">
          {(["teacher_paced", "self_paced"] as const).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setMode(m)}
              className={`rounded-[1.5rem] border-2 p-5 text-left transition-all ${
                mode === m
                  ? "border-[var(--primary)] bg-[var(--primary)]/8"
                  : "border-[var(--border)] bg-[var(--bg-surface)] hover:border-[var(--primary)]/50"
              }`}
            >
              <p className="font-semibold text-[var(--text-primary)]">
                {t(m === "teacher_paced" ? "quiz.live.modePaced" : "quiz.live.modeSelf")}
              </p>
              <p className="mt-1 text-sm text-[var(--text-secondary)]">
                {t(m === "teacher_paced" ? "quiz.live.modePacedDesc" : "quiz.live.modeSelfDesc")}
              </p>
            </button>
          ))}
        </div>

        {/* Anonymous toggle */}
        <label className="flex cursor-pointer items-start gap-3 rounded-[1.2rem] border border-[var(--border)] bg-[var(--bg-surface)] p-4">
          <input
            type="checkbox"
            checked={allowAnon}
            onChange={(e) => setAllowAnon(e.target.checked)}
            className="mt-0.5 h-4 w-4 accent-[var(--primary)]"
          />
          <div>
            <p className="text-sm font-medium text-[var(--text-primary)]">{t("quiz.live.allowAnon")}</p>
            <p className="text-xs text-[var(--text-muted)]">{t("quiz.live.allowAnonDesc")}</p>
          </div>
        </label>

        {/* Hide leaderboard toggle */}
        <label className="flex cursor-pointer items-start gap-3 rounded-[1.2rem] border border-[var(--border)] bg-[var(--bg-surface)] p-4">
          <input
            type="checkbox"
            checked={!showLeaderboard}
            onChange={(e) => setShowLeaderboard(!e.target.checked)}
            className="mt-0.5 h-4 w-4 accent-[var(--primary)]"
          />
          <div>
            <p className="text-sm font-medium text-[var(--text-primary)]">{t("quiz.live.hideLeaderboard")}</p>
            <p className="text-xs text-[var(--text-muted)]">{t("quiz.live.hideLeaderboardDesc")}</p>
          </div>
        </label>

        {error ? <p className="text-sm text-red-400">{error}</p> : null}

        <Button size="lg" onClick={handleCreateSession} disabled={creating} className="w-full sm:w-auto">
          {creating ? "…" : t("quiz.live.startSession")}
        </Button>
      </div>
    );
  }

  if (phase === "lobby") {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between gap-3">
          <h1 className="text-2xl font-semibold tracking-[-0.04em] text-[var(--text-primary)]">
            {t("quiz.live.lobbyTitle")}
          </h1>
          <ConnectionBadge status={wsStatus} />
        </div>

        <div className="grid gap-6 sm:grid-cols-2">
          {/* Code panel */}
          <div className="flex flex-col gap-4 rounded-[1.5rem] border border-[var(--border)] bg-[var(--bg-elevated)] p-6">
            <p className="text-xs font-medium uppercase tracking-[0.18em] text-[var(--text-muted)]">
              {t("quiz.live.joinCode")}
            </p>
            <div className="flex items-center gap-3">
              <span className="font-mono text-5xl font-bold tracking-[0.15em] text-[var(--text-primary)]">
                {joinCode}
              </span>
              <button type="button" onClick={copyCode} className="ml-auto rounded-full p-2 hover:bg-[var(--bg-surface)] transition-colors">
                {copied ? <CheckCircle className="h-5 w-5 text-emerald-400" /> : <Copy className="h-5 w-5 text-[var(--text-muted)]" />}
              </button>
            </div>
            <p className="text-xs text-[var(--text-muted)]">{t("quiz.live.joinUrl")}</p>
            <p className="break-all text-xs text-[var(--primary)]">{joinUrl}</p>
          </div>

          {/* QR */}
          <div className="flex flex-col items-center justify-center gap-2 rounded-[1.5rem] border border-[var(--border)] bg-[var(--bg-elevated)] p-6">
            <p className="text-xs font-medium uppercase tracking-[0.18em] text-[var(--text-muted)]">
              {t("quiz.live.scanQR")}
            </p>
            {joinUrl ? (
              <div className="mt-2 rounded-xl bg-white p-3">
                <QRCodeSVG value={joinUrl} size={140} />
              </div>
            ) : null}
          </div>
        </div>

        {/* Participants */}
        <div className="rounded-[1.5rem] border border-[var(--border)] bg-[var(--bg-elevated)] p-5">
          <div className="flex items-center gap-2 text-sm font-medium text-[var(--text-secondary)]">
            <Users className="h-4 w-4" />
            {t("quiz.live.participants")} — {participants.length}
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {participants.map((p) => (
              <span
                key={p.id}
                className="inline-flex items-center rounded-full border border-[var(--border)] bg-[var(--bg-surface)] px-3 py-1 text-sm text-[var(--text-primary)]"
              >
                {p.displayName}
              </span>
            ))}
            {participants.length === 0 ? (
              <p className="text-sm text-[var(--text-muted)]">{t("quiz.live.waitingPlayers")}</p>
            ) : null}
          </div>
        </div>

        <Button
          size="lg"
          onClick={() => sendCmd("start_game")}
          disabled={participants.length === 0}
          className="w-full sm:w-auto"
        >
          <Play className="h-4 w-4" />
          {t("quiz.live.startGame")}
        </Button>
      </div>
    );
  }

  if (phase === "question" && currentQData) {
    const q = currentQData.question;
    const answered = answerStats?.answered ?? 0;
    const total = participants.length;
    const opts = ["a", "b", "c", "d"] as const;
    const optLabels: Record<string, string | undefined> = {
      a: q.optionA, b: q.optionB, c: q.optionC, d: q.optionD,
    };

    return (
      <div className="space-y-5">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium text-[var(--text-muted)]">
              {t("quiz.live.question")} {currentQ + 1} / {totalQ}
            </span>
            <ConnectionBadge status={wsStatus} />
          </div>
          <div className="flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-[var(--border)] font-mono font-bold text-[var(--text-primary)]">
              {timeLeft}
            </div>
            <Button variant="outline" size="sm" onClick={() => sendCmd("end_game")}>
              <Square className="h-3.5 w-3.5" />
              {t("quiz.live.endGame")}
            </Button>
          </div>
        </div>

        <div className="rounded-[1.5rem] border border-[var(--border)] bg-[var(--bg-elevated)] p-6">
          <p className="text-lg font-semibold text-[var(--text-primary)]">{q.questionText}</p>
        </div>

        {/* Answer stats bar */}
        {q.questionType === "mcq" ? (
          <div className="rounded-[1.5rem] border border-[var(--border)] bg-[var(--bg-elevated)] p-5">
            <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-[0.14em] text-[var(--text-muted)]">
              <BarChart3 className="h-3.5 w-3.5" />
              {t("quiz.live.answerStats")} — {answered}/{total} {t("quiz.live.answered")}
            </div>
            <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
              {opts.map((opt) => {
                const count = answerStats?.counts[opt] ?? 0;
                const pct = total > 0 ? Math.round((count / total) * 100) : 0;
                const colors = { a: "bg-blue-500", b: "bg-amber-500", c: "bg-rose-500", d: "bg-emerald-500" };
                return (
                  <div key={opt} className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-medium uppercase text-[var(--text-secondary)]">{opt.toUpperCase()}</span>
                      <span className="text-[var(--text-muted)]">{count}</span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-[var(--bg-base)]">
                      <div
                        className={`h-full rounded-full transition-all duration-300 ${colors[opt]}`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <p className="truncate text-xs text-[var(--text-muted)]">{optLabels[opt]}</p>
                  </div>
                );
              })}
            </div>
          </div>
        ) : null}

        {mode === "teacher_paced" ? (
          <Button size="lg" onClick={() => sendCmd("next_question")} className="w-full sm:w-auto">
            <SkipForward className="h-4 w-4" />
            {t("quiz.live.nextQuestion")}
          </Button>
        ) : null}
      </div>
    );
  }

  if (phase === "result") {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-xl font-semibold text-[var(--text-primary)]">{t("quiz.live.leaderboard")}</h2>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowLeaderboard((v) => !v)}
              className="inline-flex items-center gap-1.5 rounded-full border border-[var(--border)] bg-[var(--bg-surface)] px-3 py-1.5 text-xs font-medium text-[var(--text-secondary)] transition-colors hover:text-[var(--text-primary)]"
            >
              {showLeaderboard
                ? <><EyeOff className="h-3.5 w-3.5" />{t("quiz.live.hideLeaderboardBtn")}</>
                : <><Eye className="h-3.5 w-3.5" />{t("quiz.live.showLeaderboardBtn")}</>}
            </button>
            <ConnectionBadge status={wsStatus} />
          </div>
        </div>
        {showLeaderboard ? (
          <LeaderboardTable entries={leaderboard} prevRanks={prevRanksRef.current} />
        ) : (
          <div className="flex min-h-[160px] items-center justify-center rounded-[1.5rem] border border-dashed border-[var(--border)] text-sm text-[var(--text-muted)]">
            <EyeOff className="mr-2 h-4 w-4" />
            {t("quiz.live.hideLeaderboard")}
          </div>
        )}
        {mode === "teacher_paced" ? (
          <div className="flex flex-wrap gap-3">
            {currentQ + 1 < totalQ ? (
              <Button size="lg" onClick={() => sendCmd("next_question")}>
                <SkipForward className="h-4 w-4" />
                {t("quiz.live.nextQuestion")}
              </Button>
            ) : (
              <Button size="lg" onClick={() => sendCmd("end_game")}>
                <Square className="h-4 w-4" />
                {t("quiz.live.endGame")}
              </Button>
            )}
          </div>
        ) : null}
      </div>
    );
  }

  if (phase === "finished") {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 text-amber-400">
            <Trophy className="h-7 w-7" />
            <h1 className="text-2xl font-semibold tracking-[-0.04em]">{t("quiz.live.finalResults")}</h1>
          </div>
          <button
            type="button"
            onClick={() => setShowLeaderboard((v) => !v)}
            className="inline-flex items-center gap-1.5 rounded-full border border-[var(--border)] bg-[var(--bg-surface)] px-3 py-1.5 text-xs font-medium text-[var(--text-secondary)] transition-colors hover:text-[var(--text-primary)]"
          >
            {showLeaderboard
              ? <><EyeOff className="h-3.5 w-3.5" />{t("quiz.live.hideLeaderboardBtn")}</>
              : <><Eye className="h-3.5 w-3.5" />{t("quiz.live.showLeaderboardBtn")}</>}
          </button>
        </div>
        {showLeaderboard ? (
          <LeaderboardTable entries={finalLeaderboard} medal prevRanks={prevRanksRef.current} />
        ) : (
          <div className="flex min-h-[160px] items-center justify-center rounded-[1.5rem] border border-dashed border-[var(--border)] text-sm text-[var(--text-muted)]">
            <EyeOff className="mr-2 h-4 w-4" />
            {t("quiz.live.hideLeaderboard")}
          </div>
        )}
        <Link href={`/quizzes/${quizId}`}>
          <Button variant="outline" size="lg">
            <ArrowLeft className="h-4 w-4" />
            {t("quiz.backToQuiz")}
          </Button>
        </Link>
      </div>
    );
  }

  return null;
}

// ─── Sub-components ────────────────────────────────────────────

function ConnectionBadge({ status }: { status: "connected" | "disconnected" }) {
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${
      status === "connected"
        ? "border border-emerald-500/20 bg-emerald-500/10 text-emerald-400"
        : "border border-[var(--border)] bg-[var(--bg-surface)] text-[var(--text-muted)]"
    }`}>
      {status === "connected" ? <Wifi className="h-3 w-3" /> : <WifiOff className="h-3 w-3" />}
      {status}
    </span>
  );
}

function LeaderboardTable({
  entries,
  medal,
  prevRanks,
  highlightId,
}: {
  entries: { id: string; displayName: string; score: number; streak: number; rank: number }[];
  medal?: boolean;
  prevRanks?: Map<string, number>;
  highlightId?: string;
}) {
  const medals = ["🥇", "🥈", "🥉"];
  return (
    <div className="overflow-hidden rounded-[1.5rem] border border-[var(--border)] bg-[var(--bg-elevated)]">
      {entries.length === 0 ? (
        <p className="p-5 text-sm text-[var(--text-muted)]">—</p>
      ) : (
        <ul className="divide-y divide-[var(--border)]">
          {entries.map((e, i) => {
            const prevRank = prevRanks?.get(e.id);
            // positive delta = moved up in ranking
            const delta = prevRank != null ? prevRank - e.rank : null;
            const isHighlighted = e.id === highlightId;
            return (
              <li
                key={e.id}
                className={`flex items-center gap-3 px-5 py-3.5 ${isHighlighted ? "bg-[var(--primary)]/6" : ""}`}
                style={{ animation: `leader-enter 0.38s cubic-bezier(0.16,1,0.3,1) ${i * 55}ms both` }}
              >
                <span className="w-7 shrink-0 text-center text-sm font-bold text-[var(--text-muted)]">
                  {medal && i < 3 ? medals[i] : e.rank}
                </span>
                <span className={`flex-1 text-sm font-medium ${isHighlighted ? "text-[var(--primary)]" : "text-[var(--text-primary)]"}`}>
                  {e.displayName}
                </span>
                {delta !== null && delta !== 0 ? (
                  <span
                    className={`animate-rank-badge-pop text-xs font-bold tabular-nums ${
                      delta > 0 ? "text-emerald-400" : "text-rose-400"
                    }`}
                    style={{ animationDelay: `${i * 55 + 160}ms` }}
                  >
                    {delta > 0 ? `▲${delta}` : `▼${Math.abs(delta)}`}
                  </span>
                ) : null}
                <span className="text-sm font-semibold text-[var(--primary)] tabular-nums">{e.score}</span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
