"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Copy, Eye, EyeOff, Pause, Play, SkipForward, Square, UserX, Users, Wifi, WifiOff, Trophy, BarChart3, CheckCircle, ShieldHalf } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { useLocale } from "@/components/providers/locale-provider";
import { Button } from "@/components/ui/button";

// ─── WebSocket message types ──────────────────────────────────

type WsMsg =
  | { type: "session_state"; data: SessionState }
  | { type: "player_joined"; data: { participant: Participant; count: number } }
  | { type: "player_left"; data: { participantId: string; displayName: string; reason?: string } }
  | { type: "player_online"; data: { participantId: string; isOnline: boolean } }
  | { type: "game_started"; data: { totalQuestions: number; mode: string } }
  | { type: "question"; data: QuestionEvt }
  | { type: "answer_stats"; data: AnswerStats }
  | { type: "question_ended"; data: QuestionEndedEvt }
  | { type: "game_ended"; data: { finalLeaderboard: LeaderEntry[]; teamLeaderboard?: TeamScore[] } }
  | { type: "team_score_updated"; data: { teamId: number; score: number; teamLeaderboard: TeamScore[] } }
  | { type: "session_paused"; data: { questionIndex: number } }
  | { type: "session_resumed"; data: { questionIndex: number; deadlineMs: number } }
  | { type: "force_next"; data: { questionIndex: number } }
  | { type: "participant_kicked"; data: { participantId: string; displayName?: string } }
  | { type: "error"; data: { message: string } };

type Participant = { id: string; displayName: string; score: number; streak: number; rank: number; teamId: number; isOnline?: boolean };
type LeaderEntry = { id: string; displayName: string; score: number; streak: number; rank: number; teamId: number };
type TeamScore = { teamId: number; score: number };

type SessionState = {
  status: string;
  mode: string;
  teamMode: boolean;
  teamCount: number;
  joinCode: string;
  quizTitle: string;
  totalQuestions: number;
  currentQuestion: number;
  participants: Participant[];
  teamScores?: TeamScore[];
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
    optionE?: string;
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
  teamLeaderboard?: TeamScore[];
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
  const [teamMode, setTeamMode] = useState(false);
  const [teamCount, setTeamCount] = useState<2 | 3 | 4>(2);

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
  const [teamLeaderboard, setTeamLeaderboard] = useState<TeamScore[]>([]);
  const [timeLeft, setTimeLeft] = useState(0);
  const [copied, setCopied] = useState(false);
  const [wsStatus, setWsStatus] = useState<"disconnected" | "connected">("disconnected");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");
  const [paused, setPaused] = useState(false);
  const [actionBusy, setActionBusy] = useState(false);

  const wsRef = useRef<WebSocket | null>(null);
  // Tracks the last-known rank for each player so we can show rank deltas.
  const prevRanksRef = useRef<Map<string, number>>(new Map());
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [joinUrl, setJoinUrl] = useState("");
  useEffect(() => {
    if (joinCode) setJoinUrl(`${window.location.origin}/quizzes/join?code=${joinCode}`);
  }, [joinCode]);

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
        if (msg.data.teamMode) setTeamMode(true);
        if (msg.data.teamScores) setTeamLeaderboard(msg.data.teamScores);
        if (msg.data.status === "lobby") setPhase("lobby");
        else if (msg.data.status === "active") setPhase("question");
        else if (msg.data.status === "finished") setPhase("finished");
        break;

      case "player_joined":
        setParticipants((prev) => {
          const exists = prev.find((p) => p.id === msg.data.participant.id);
          if (exists) return prev.map((p) => p.id === msg.data.participant.id ? { ...p, isOnline: true } : p);
          return [...prev, { ...msg.data.participant, score: 0, streak: 0, rank: 0, isOnline: true }];
        });
        break;

      case "player_left":
        setParticipants((prev) => prev.filter((p) => p.id !== msg.data.participantId));
        break;

      case "player_online":
        setParticipants((prev) =>
          prev.map((p) => p.id === msg.data.participantId ? { ...p, isOnline: msg.data.isOnline } : p)
        );
        break;

      case "session_paused":
        setPaused(true);
        stopTimer();
        break;

      case "session_resumed":
        setPaused(false);
        if (msg.data.deadlineMs) startTimer(msg.data.deadlineMs);
        break;

      case "force_next":
        // Server has already advanced — UI reacts to the next "question" event.
        break;

      case "participant_kicked":
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
          prevRanksRef.current = new Map(prev.map((e) => [e.id, e.rank]));
          return msg.data.leaderboard;
        });
        if (msg.data.teamLeaderboard) setTeamLeaderboard(msg.data.teamLeaderboard);
        setCurrentQData(null);
        setPhase("result");
        break;

      case "game_ended":
        stopTimer();
        setLeaderboard((prev) => {
          prevRanksRef.current = new Map(prev.map((e) => [e.id, e.rank]));
          return prev;
        });
        setFinalLeaderboard(msg.data.finalLeaderboard);
        if (msg.data.teamLeaderboard) setTeamLeaderboard(msg.data.teamLeaderboard);
        setPhase("finished");
        break;

      case "team_score_updated":
        // Real-time tick after each correct answer in team mode.
        setTeamLeaderboard(msg.data.teamLeaderboard);
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

  // postHostAction calls the authenticated REST endpoint that drives a host-only
  // action (force-next, pause, resume, kick, end). The server broadcasts a WS
  // event so we update local UI on receipt rather than optimistically here.
  const postHostAction = useCallback(
    async (action: "force-next" | "pause" | "resume" | "kick" | "end", body?: object) => {
      if (!joinCode || actionBusy) return;
      setActionBusy(true);
      try {
        await fetch(`/api/quizzes/live-sessions/${joinCode}/${action}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: body ? JSON.stringify(body) : "{}",
        });
      } catch {
        // Errors are surfaced to the user via the error state if needed.
      } finally {
        setActionBusy(false);
      }
    },
    [joinCode, actionBusy]
  );

  const handleCreateSession = async () => {
    setCreating(true);
    setError("");
    try {
      const res = await fetch(`/api/quizzes/${quizId}/live-sessions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode, allowAnonymous: allowAnon, teamMode, teamCount: teamMode ? teamCount : 0 }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? t("quiz.errNetwork"));
        return;
      }
      setSessionId(data.id);
      setJoinCode(data.joinCode);
      setPhase("lobby");
      connectWS(data.joinCode, data.id);
    } catch {
      setError(t("quiz.errNetwork"));
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

        {/* Team mode toggle */}
        <label className="flex cursor-pointer items-start gap-3 rounded-[1.2rem] border border-[var(--border)] bg-[var(--bg-surface)] p-4">
          <input
            type="checkbox"
            checked={teamMode}
            onChange={(e) => setTeamMode(e.target.checked)}
            className="mt-0.5 h-4 w-4 accent-[var(--primary)]"
          />
          <div className="flex-1">
            <p className="text-sm font-medium text-[var(--text-primary)]">{t("quiz.live.teamMode")}</p>
            <p className="text-xs text-[var(--text-muted)]">{t("quiz.live.teamModeDesc")}</p>
          </div>
        </label>

        {/* Team count picker */}
        {teamMode && (
          <div className="flex items-center gap-4 rounded-[1.2rem] border border-[var(--border)] bg-[var(--bg-surface)] px-4 py-3">
            <p className="text-sm font-medium text-[var(--text-primary)]">{t("quiz.live.teamCount")}</p>
            <div className="flex gap-2">
              {([2, 3, 4] as const).map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setTeamCount(n)}
                  className={`h-9 w-9 rounded-xl border text-sm font-bold transition-all ${
                    teamCount === n
                      ? "border-[var(--primary)] bg-[var(--primary)] text-white"
                      : "border-[var(--border)] bg-[var(--bg-elevated)] text-[var(--text-secondary)] hover:border-[var(--primary)]/50"
                  }`}
                >
                  {n}
                </button>
              ))}
            </div>
            <div className="ml-auto flex gap-1.5">
              {Array.from({ length: teamCount }, (_, i) => (
                <span
                  key={i}
                  className="inline-flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold text-white"
                  style={{ backgroundColor: TEAM_COLORS[i] }}
                >
                  {i + 1}
                </span>
              ))}
            </div>
          </div>
        )}

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
            {participants.length > 0 ? (
              <span className="ml-auto text-xs font-semibold text-emerald-400">
                {t("quiz.live.playersReady").replace("{n}", String(participants.length))}
              </span>
            ) : null}
          </div>
          {teamMode ? (
            <LobbyTeamCards
              teamCount={teamCount}
              participants={participants}
              t={t}
            />
          ) : (
            <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
              {participants.map((p) => (
                <LobbyPlayerCard
                  key={p.id}
                  name={p.displayName}
                  online={p.isOnline ?? true}
                  onKick={() => postHostAction("kick", { participantId: p.id })}
                  t={t}
                />
              ))}
              {participants.length === 0 ? (
                <p className="col-span-full text-sm text-[var(--text-muted)]">{t("quiz.live.waitingPlayers")}</p>
              ) : null}
            </div>
          )}
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
    const opts = ["a", "b", "c", "d", "e"] as const;
    const optLabels: Record<string, string | undefined> = {
      a: q.optionA, b: q.optionB, c: q.optionC, d: q.optionD, e: q.optionE,
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
            <div className={`flex h-10 w-10 items-center justify-center rounded-full border-2 font-mono font-bold text-[var(--text-primary)] ${paused ? "border-amber-500/60 bg-amber-500/10" : "border-[var(--border)]"}`}>
              {paused ? <Pause className="h-4 w-4" /> : timeLeft}
            </div>
          </div>
        </div>

        {/* Host control bar — force-next, pause/resume, end. Always visible
            during a live question; uses authenticated REST endpoints rather
            than the WS so each call is host-only at the server boundary. */}
        <HostControlBar
          paused={paused}
          actionBusy={actionBusy}
          onForceNext={() => postHostAction("force-next")}
          onPause={() => postHostAction("pause")}
          onResume={() => postHostAction("resume")}
          onEnd={() => postHostAction("end")}
          t={t}
        />

        {teamMode && teamLeaderboard.length > 0 ? (
          <TeamScoresBar teams={teamLeaderboard} t={t} />
        ) : null}

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
                const colors: Record<string, string> = { a: "bg-blue-500", b: "bg-amber-500", c: "bg-rose-500", d: "bg-emerald-500", e: "bg-purple-500" };
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
        {teamMode && teamLeaderboard.length > 0 && (
          <TeamLeaderboardPanel teams={teamLeaderboard} t={t} />
        )}
        {showLeaderboard ? (
          <LeaderboardTable entries={leaderboard} prevRanks={prevRanksRef.current} teamMode={teamMode} />
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
        {teamMode && teamLeaderboard.length > 0 && (
          <>
            <TeamWinnerBanner teams={teamLeaderboard} t={t} />
            <TeamLeaderboardPanel teams={teamLeaderboard} t={t} />
          </>
        )}
        {showLeaderboard ? (
          <LeaderboardTable entries={finalLeaderboard} medal prevRanks={prevRanksRef.current} teamMode={teamMode} />
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

const TEAM_COLORS = ["#ef4444", "#3b82f6", "#22c55e", "#eab308"];
const TEAM_NAMES_KEY = ["quiz.live.teamRed", "quiz.live.teamBlue", "quiz.live.teamGreen", "quiz.live.teamYellow"];

function TeamLeaderboardPanel({ teams, t }: { teams: { teamId: number; score: number }[]; t: (k: string) => string }) {
  return (
    <div className="overflow-hidden rounded-[1.5rem] border border-[var(--border)] bg-[var(--bg-elevated)]">
      <div className="flex items-center gap-2 border-b border-[var(--border)] px-5 py-3 text-xs font-medium uppercase tracking-[0.14em] text-[var(--text-muted)]">
        <ShieldHalf className="h-3.5 w-3.5" />
        {t("quiz.live.teamScores")}
      </div>
      <ul className="divide-y divide-[var(--border)]">
        {teams.map((team, i) => (
          <li key={team.teamId} className="flex items-center gap-3 px-5 py-3">
            <span className="w-5 shrink-0 text-center text-xs font-bold text-[var(--text-muted)]">{i + 1}</span>
            <span
              className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold text-white"
              style={{ backgroundColor: TEAM_COLORS[team.teamId] ?? "#888" }}
            >
              {team.teamId + 1}
            </span>
            <span className="flex-1 text-sm font-medium text-[var(--text-primary)]">
              {t(TEAM_NAMES_KEY[team.teamId] ?? "quiz.live.teamRed")}
            </span>
            <span className="font-semibold text-[var(--primary)] tabular-nums">{team.score}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function LobbyTeamCards({
  teamCount,
  participants,
  t,
}: {
  teamCount: number;
  participants: Participant[];
  t: (k: string) => string;
}) {
  const teams = Array.from({ length: teamCount }, (_, i) => ({
    id: i,
    members: participants.filter((p) => p.teamId === i),
  }));
  return (
    <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
      {teams.map((team) => {
        const overflow = Math.max(0, team.members.length - 8);
        const visible = team.members.slice(0, 8);
        return (
          <div
            key={team.id}
            className="flex h-[120px] w-full flex-col rounded-[1.2rem] border-2 p-3"
            style={{ borderColor: TEAM_COLORS[team.id] ?? "#888", minWidth: 200 }}
          >
            <div className="flex items-center gap-1.5">
              <span
                className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold text-white"
                style={{ backgroundColor: TEAM_COLORS[team.id] ?? "#888" }}
              >
                {team.id + 1}
              </span>
              <span className="truncate text-sm font-semibold text-[var(--text-primary)]">
                {t(TEAM_NAMES_KEY[team.id] ?? "quiz.live.teamRed")}
              </span>
              <span className="ml-auto text-xs font-medium text-[var(--text-muted)]">
                {team.members.length}
              </span>
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-1">
              {visible.map((m) => (
                <span
                  key={m.id}
                  title={m.displayName}
                  className="inline-flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-semibold text-white"
                  style={{ backgroundColor: TEAM_COLORS[team.id] ?? "#888", opacity: 0.85 }}
                >
                  {m.displayName.slice(0, 1).toUpperCase()}
                </span>
              ))}
              {overflow > 0 ? (
                <span className="inline-flex h-6 items-center justify-center rounded-full bg-[var(--bg-surface)] px-2 text-[10px] font-semibold text-[var(--text-secondary)]">
                  +{overflow}
                </span>
              ) : null}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function TeamScoresBar({
  teams,
  t,
}: {
  teams: { teamId: number; score: number }[];
  t: (k: string) => string;
}) {
  const max = Math.max(1, ...teams.map((tm) => tm.score));
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
      {teams.map((team) => {
        const pct = Math.round((team.score / max) * 100);
        return (
          <div
            key={team.teamId}
            className="rounded-[1rem] border border-[var(--border)] bg-[var(--bg-elevated)] p-3"
          >
            <div className="flex items-center gap-1.5">
              <span
                className="inline-flex h-4 w-4 shrink-0 rounded-full"
                style={{ backgroundColor: TEAM_COLORS[team.teamId] ?? "#888" }}
              />
              <span className="truncate text-xs font-medium text-[var(--text-primary)]">
                {t(TEAM_NAMES_KEY[team.teamId] ?? "quiz.live.teamRed")}
              </span>
              <span
                className="ml-auto font-mono text-sm font-bold tabular-nums text-[var(--text-primary)]"
                style={{ transition: "color 500ms" }}
              >
                {team.score}
              </span>
            </div>
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-[var(--bg-base)]">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{ width: `${pct}%`, backgroundColor: TEAM_COLORS[team.teamId] ?? "#888" }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

function TeamWinnerBanner({
  teams,
  t,
}: {
  teams: { teamId: number; score: number }[];
  t: (k: string) => string;
}) {
  const sorted = [...teams].sort((a, b) => b.score - a.score);
  const winner = sorted[0];
  if (!winner || winner.score === 0) return null;
  const tied = sorted.filter((s) => s.score === winner.score).length > 1;
  const teamName = t(TEAM_NAMES_KEY[winner.teamId] ?? "quiz.live.teamRed");
  const winLine = tied
    ? t("quiz.live.team.tie")
    : t("quiz.live.team.winner").replace("{name}", teamName);

  return (
    <div
      className="flex items-center gap-3 rounded-[1.5rem] border-2 p-5"
      style={{
        borderColor: TEAM_COLORS[winner.teamId] ?? "#888",
        backgroundColor: `${TEAM_COLORS[winner.teamId] ?? "#888"}14`,
      }}
    >
      <span
        className="flex h-12 w-12 items-center justify-center rounded-full text-white"
        style={{ backgroundColor: TEAM_COLORS[winner.teamId] ?? "#888" }}
      >
        <Trophy className="h-6 w-6" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-xs font-medium uppercase tracking-[0.14em] text-[var(--text-muted)]">
          {t("quiz.live.team.totalScore")}
        </p>
        <p className="truncate text-xl font-semibold tracking-[-0.02em] text-[var(--text-primary)]">
          {winLine}
        </p>
      </div>
      <span className="font-mono text-2xl font-bold tabular-nums text-[var(--text-primary)]">
        {winner.score}
      </span>
    </div>
  );
}

function LeaderboardTable({
  entries,
  medal,
  prevRanks,
  highlightId,
  teamMode,
}: {
  entries: { id: string; displayName: string; score: number; streak: number; rank: number; teamId: number }[];
  medal?: boolean;
  prevRanks?: Map<string, number>;
  highlightId?: string;
  teamMode?: boolean;
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
                <span className={`flex-1 flex items-center gap-1.5 text-sm font-medium ${isHighlighted ? "text-[var(--primary)]" : "text-[var(--text-primary)]"}`}>
                  {teamMode && (
                    <span
                      className="inline-flex h-3.5 w-3.5 shrink-0 rounded-full"
                      style={{ backgroundColor: TEAM_COLORS[e.teamId] ?? "#888" }}
                    />
                  )}
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

function HostControlBar({
  paused,
  actionBusy,
  onForceNext,
  onPause,
  onResume,
  onEnd,
  t,
}: {
  paused: boolean;
  actionBusy: boolean;
  onForceNext: () => void;
  onPause: () => void;
  onResume: () => void;
  onEnd: () => void;
  t: (k: string) => string;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2 rounded-[1.2rem] border border-[var(--border)] bg-[var(--bg-elevated)] px-3 py-2">
      <Button
        type="button"
        size="sm"
        variant="outline"
        disabled={actionBusy}
        onClick={onForceNext}
      >
        <SkipForward className="h-3.5 w-3.5" />
        {t("quiz.live.host.forceNext")}
      </Button>
      {paused ? (
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={actionBusy}
          onClick={onResume}
        >
          <Play className="h-3.5 w-3.5" />
          {t("quiz.live.host.resume")}
        </Button>
      ) : (
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={actionBusy}
          onClick={onPause}
        >
          <Pause className="h-3.5 w-3.5" />
          {t("quiz.live.host.pause")}
        </Button>
      )}
      <Button
        type="button"
        size="sm"
        variant="outline"
        disabled={actionBusy}
        onClick={onEnd}
        className="ml-auto"
      >
        <Square className="h-3.5 w-3.5" />
        {t("quiz.live.host.end")}
      </Button>
    </div>
  );
}

function LobbyPlayerCard({
  name,
  online,
  onKick,
  t,
}: {
  name: string;
  online: boolean;
  onKick: () => void;
  t: (k: string) => string;
}) {
  return (
    <div
      className="group relative flex items-center gap-2 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--bg-surface)] px-3 py-2.5 text-sm text-[var(--text-primary)]"
      style={{ animation: "leader-enter 0.32s cubic-bezier(0.16,1,0.3,1) both" }}
    >
      <span
        className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white ${online ? "bg-emerald-500" : "bg-rose-500"}`}
        aria-hidden
      >
        {name.charAt(0).toUpperCase()}
      </span>
      <span className="flex-1 truncate font-medium">{name}</span>
      <button
        type="button"
        onClick={onKick}
        title={t("quiz.live.host.kick")}
        aria-label={t("quiz.live.host.kick")}
        className="shrink-0 rounded-full p-1.5 text-[var(--text-muted)] opacity-0 transition-all hover:bg-rose-500/20 hover:text-rose-400 group-hover:opacity-100 focus:opacity-100"
      >
        <UserX className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
